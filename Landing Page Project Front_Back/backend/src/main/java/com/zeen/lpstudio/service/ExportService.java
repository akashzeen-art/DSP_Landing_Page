package com.zeen.lpstudio.service;

import com.zeen.lpstudio.domain.LandingPage;
import com.zeen.lpstudio.domain.Operator;
import com.zeen.lpstudio.generator.LandingPageGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ExportService {

    private final LandingPageService landingPageService;
    private final LandingPageGenerator generator;

    @Value("${lpstudio.export-dir:${user.home}/lp-studio-exports}")
    private String exportDir;

    public ExportService(LandingPageService landingPageService, LandingPageGenerator generator) {
        this.landingPageService = landingPageService;
        this.generator = generator;
    }

    @Transactional(readOnly = true)
    public byte[] exportZip(Long id) throws IOException {
        LandingPage lp = landingPageService.findEntity(id);
        List<Operator> ops = landingPageService.operatorsFor(id);
        Map<String, byte[]> files = generator.generateFiles(lp, ops);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (Map.Entry<String, byte[]> e : files.entrySet()) {
                zos.putNextEntry(new ZipEntry(lp.getSlug() + "/" + e.getKey()));
                zos.write(e.getValue());
                zos.closeEntry();
            }
        }

        Path dir = Paths.get(exportDir);
        Files.createDirectories(dir);
        Path out = dir.resolve(lp.getSlug() + ".zip");
        Files.write(out, baos.toByteArray());

        return baos.toByteArray();
    }

    @Transactional(readOnly = true)
    public Map<String, byte[]> previewFiles(Long id) {
        LandingPage lp = landingPageService.findEntity(id);
        List<Operator> ops = landingPageService.operatorsFor(id);
        return generator.generateFiles(lp, ops);
    }
}
