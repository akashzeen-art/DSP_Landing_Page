package com.zeen.lpstudio.service;

import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import com.zeen.lpstudio.domain.LandingPage;
import com.zeen.lpstudio.domain.Operator;
import com.zeen.lpstudio.dto.DeployResultDto;
import com.zeen.lpstudio.generator.LandingPageGenerator;
import com.zeen.lpstudio.util.CampaignUrls;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Properties;

@Service
public class DeployService {

    private final LandingPageService landingPageService;
    private final LandingPageGenerator generator;

    @Value("${lpstudio.deploy.enabled:false}")
    private boolean enabled;

    @Value("${lpstudio.deploy.host:}")
    private String host;

    @Value("${lpstudio.deploy.port:22}")
    private int port;

    @Value("${lpstudio.deploy.username:}")
    private String username;

    @Value("${lpstudio.deploy.password:}")
    private String password;

    @Value("${lpstudio.deploy.private-key-path:}")
    private String privateKeyPath;

    public DeployService(LandingPageService landingPageService, LandingPageGenerator generator) {
        this.landingPageService = landingPageService;
        this.generator = generator;
    }

    @Transactional(readOnly = true)
    public DeployResultDto preview(Long id) {
        LandingPage lp = landingPageService.findEntity(id);
        return buildResult(lp, false, "Preview only — files not uploaded.", null, 0);
    }

    @Transactional
    public DeployResultDto deploy(Long id) {
        if (!enabled) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Deploy disabled. Set lpstudio.deploy.enabled=true and SSH credentials in application.yml / env.");
        }
        if (isBlank(host) || isBlank(username) || (isBlank(password) && isBlank(privateKeyPath))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Deploy SSH not configured (host, username, password or private-key-path).");
        }

        LandingPage lp = landingPageService.findEntity(id);
        if (isBlank(lp.getPublicDomain())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Set Public domain first.");
        }
        String remoteDir = resolveDeployPath(lp);
        if (isBlank(remoteDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Set Server deploy path (absolute), e.g. /var/www/vaszeen/zeen_lp/georgia/ge-audiobooks");
        }
        lp.setDeployPath(remoteDir);

        List<Operator> ops = landingPageService.operatorsFor(id);
        Map<String, byte[]> files = generator.generateFiles(lp, ops);
        files.put("nginx-site.conf", CampaignUrls.nginxSnippet(lp).getBytes(StandardCharsets.UTF_8));

        Session session = null;
        ChannelSftp sftp = null;
        try {
            JSch jsch = new JSch();
            if (!isBlank(privateKeyPath)) {
                jsch.addIdentity(privateKeyPath);
            }
            session = jsch.getSession(username, host, port);
            if (!isBlank(password)) {
                session.setPassword(password);
            }
            Properties config = new Properties();
            config.put("StrictHostKeyChecking", "no");
            session.setConfig(config);
            session.connect(20000);

            sftp = (ChannelSftp) session.openChannel("sftp");
            sftp.connect(15000);

            mkdirs(sftp, remoteDir);
            sftp.cd(remoteDir);

            int count = 0;
            for (Map.Entry<String, byte[]> e : files.entrySet()) {
                String name = e.getKey();
                if ("README-DEPLOY.txt".equals(name)) continue;
                try (ByteArrayInputStream in = new ByteArrayInputStream(e.getValue())) {
                    sftp.put(in, name);
                    count++;
                }
            }

            String msg = "Deployed " + count + " files to " + remoteDir + " on " + host;
            lp.setLastDeployedAt(Instant.now());
            lp.setLastDeployMessage(msg);
            lp.setPublished(true);

            return buildResult(lp, true, msg, remoteDir, count);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            String err = "Deploy failed: " + ex.getMessage();
            lp.setLastDeployMessage(err);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, err);
        } finally {
            if (sftp != null && sftp.isConnected()) sftp.disconnect();
            if (session != null && session.isConnected()) session.disconnect();
        }
    }

    private DeployResultDto buildResult(LandingPage lp, boolean success, String message, String path, int files) {
        DeployResultDto dto = new DeployResultDto();
        dto.setSuccess(success);
        dto.setMessage(message);
        dto.setDeployPath(path != null ? path : lp.getDeployPath());
        Map<String, String> urls = CampaignUrls.allUrls(lp);
        dto.setUrls(urls);
        dto.setLiveBase(urls.get("liveBase"));
        dto.setCampaignUrl(urls.get("campaignUrl"));
        dto.setNginxSnippet(CampaignUrls.nginxSnippet(lp));
        dto.setFilesUploaded(files);
        return dto;
    }

    private String resolveDeployPath(LandingPage lp) {
        if (!isBlank(lp.getDeployPath())) {
            return trimTrailingSlash(lp.getDeployPath().trim());
        }
        return null;
    }

    private static void mkdirs(ChannelSftp sftp, String path) throws Exception {
        String[] parts = path.split("/");
        StringBuilder cur = new StringBuilder();
        for (String part : parts) {
            if (part == null || part.isEmpty()) continue;
            cur.append('/').append(part);
            String dir = cur.toString();
            try {
                sftp.cd(dir);
            } catch (Exception e) {
                sftp.mkdir(dir);
                sftp.cd(dir);
            }
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String trimTrailingSlash(String p) {
        while (p.endsWith("/") && p.length() > 1) p = p.substring(0, p.length() - 1);
        return p;
    }
}
