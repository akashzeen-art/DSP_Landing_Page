package com.zeen.lpstudio.util;

import com.zeen.lpstudio.domain.LandingPage;
import com.zeen.lpstudio.domain.PlatformType;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds live + ad-network campaign URLs from domain + URL path + platform.
 */
public final class CampaignUrls {

    private CampaignUrls() {}

    public static String normalizeHost(String domain) {
        if (domain == null) return "";
        String d = domain.trim().toLowerCase();
        d = d.replaceFirst("^https?://", "");
        int slash = d.indexOf('/');
        if (slash >= 0) d = d.substring(0, slash);
        while (d.endsWith("/")) d = d.substring(0, d.length() - 1);
        return d;
    }

    /** URL path without leading/trailing slashes. Empty = domain root. */
    public static String normalizeUrlPath(String urlPath, String slugFallback) {
        String p = urlPath;
        if (p == null || p.trim().isEmpty()) {
            p = slugFallback == null ? "" : slugFallback;
        }
        p = p.trim();
        while (p.startsWith("/")) p = p.substring(1);
        while (p.endsWith("/")) p = p.substring(0, p.length() - 1);
        return p;
    }

    public static String liveBase(LandingPage lp) {
        String host = normalizeHost(lp.getPublicDomain());
        if (host.isEmpty()) return "";
        String path = normalizeUrlPath(lp.getUrlPath(), lp.isServeAtRoot() ? "" : lp.getSlug());
        if (lp.isServeAtRoot()) path = "";
        if (path.isEmpty()) return "https://" + host;
        return "https://" + host + "/" + path;
    }

    public static String campaignUrl(LandingPage lp) {
        String base = liveBase(lp);
        if (base.isEmpty()) return "";
        PlatformType platform = lp.getPlatform() == null ? PlatformType.GOOGLE : lp.getPlatform();
        switch (platform) {
            case PROPELLER:
                return base + "?clickid=${SUBID}&zoneid={zone_id}";
            case OTHER:
                return base + "?clickid={clickid}";
            case GOOGLE:
            default:
                return base + "?clickid={gclid}";
        }
    }

    public static Map<String, String> allUrls(LandingPage lp) {
        Map<String, String> m = new LinkedHashMap<>();
        String base = liveBase(lp);
        m.put("liveBase", base);
        m.put("campaignUrl", campaignUrl(lp));
        m.put("googleExample", base.isEmpty() ? "" : base + "?clickid={gclid}");
        m.put("propellerExample", base.isEmpty() ? "" : base + "?clickid=${SUBID}&zoneid={zone_id}");
        m.put("testPhp", base.isEmpty() ? "" : base + "/php-test.php");
        m.put("thankYou", base.isEmpty() ? "" : base + "/thankyou.html");
        return m;
    }

    public static String nginxSnippet(LandingPage lp) {
        String host = normalizeHost(lp.getPublicDomain());
        String deploy = lp.getDeployPath() == null ? "/var/www/" + lp.getSlug() : lp.getDeployPath().trim();
        if (host.isEmpty()) host = "example.com";
        return "server {\n"
                + "    listen 80;\n"
                + "    listen [::]:80;\n"
                + "    server_name " + host + " www." + host + ";\n"
                + "    root " + deploy + ";\n"
                + "    index index.html;\n\n"
                + "    location / {\n"
                + "        try_files $uri $uri/ /index.html;\n"
                + "    }\n\n"
                + "    location ~ \\.php$ {\n"
                + "        include snippets/fastcgi-php.conf;\n"
                + "        fastcgi_pass unix:/run/php/php-fpm.sock;\n"
                + "    }\n"
                + "}\n";
    }
}
