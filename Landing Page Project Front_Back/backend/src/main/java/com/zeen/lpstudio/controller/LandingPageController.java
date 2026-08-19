package com.zeen.lpstudio.controller;

import com.zeen.lpstudio.dto.DeployResultDto;
import com.zeen.lpstudio.dto.LandingPageDto;
import com.zeen.lpstudio.dto.MetaResponse;
import com.zeen.lpstudio.service.DeployService;
import com.zeen.lpstudio.service.ExportService;
import com.zeen.lpstudio.service.LandingPageService;
import com.zeen.lpstudio.service.SeedDataRunner;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class LandingPageController {

    private final LandingPageService landingPageService;
    private final ExportService exportService;
    private final DeployService deployService;
    private final SeedDataRunner seedDataRunner;

    public LandingPageController(LandingPageService landingPageService,
                                 ExportService exportService,
                                 DeployService deployService,
                                 SeedDataRunner seedDataRunner) {
        this.landingPageService = landingPageService;
        this.exportService = exportService;
        this.deployService = deployService;
        this.seedDataRunner = seedDataRunner;
    }

    @GetMapping("/meta")
    public MetaResponse meta() {
        return seedDataRunner.meta();
    }

    @GetMapping("/landing-pages")
    public List<LandingPageDto> list() {
        return landingPageService.list();
    }

    @GetMapping("/landing-pages/{id}")
    public LandingPageDto get(@PathVariable Long id) {
        return landingPageService.get(id);
    }

    @GetMapping("/landing-pages/slug/{slug}")
    public LandingPageDto getBySlug(@PathVariable String slug) {
        return landingPageService.getBySlug(slug);
    }

    @PostMapping("/landing-pages")
    public LandingPageDto create(@Valid @RequestBody LandingPageDto dto) {
        return landingPageService.create(dto);
    }

    @PutMapping("/landing-pages/{id}")
    public LandingPageDto update(@PathVariable Long id, @Valid @RequestBody LandingPageDto dto) {
        return landingPageService.update(id, dto);
    }

    @DeleteMapping("/landing-pages/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        landingPageService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/landing-pages/{id}/export.zip")
    public ResponseEntity<byte[]> exportZip(@PathVariable Long id) throws Exception {
        LandingPageDto lp = landingPageService.get(id);
        byte[] zip = exportService.exportZip(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + lp.getSlug() + ".zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(zip);
    }

    @GetMapping("/landing-pages/{id}/deploy-preview")
    public DeployResultDto deployPreview(@PathVariable Long id) {
        return deployService.preview(id);
    }

    @PostMapping("/landing-pages/{id}/deploy")
    public DeployResultDto deploy(@PathVariable Long id) {
        return deployService.deploy(id);
    }

    @GetMapping("/landing-pages/{id}/preview-files")
    public Map<String, String> previewFiles(@PathVariable Long id) {
        Map<String, byte[]> files = exportService.previewFiles(id);
        Map<String, String> out = new java.util.LinkedHashMap<>();
        files.forEach((k, v) -> out.put(k, new String(v, java.nio.charset.StandardCharsets.UTF_8)));
        return out;
    }

    /** Browser-ready HTML preview (CSS inlined, scripts disabled). */
    @GetMapping(value = "/landing-pages/{id}/preview", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> previewHtml(@PathVariable Long id) {
        Map<String, byte[]> files = exportService.previewFiles(id);
        byte[] htmlBytes = files.get("index.html");
        if (htmlBytes == null) {
            return ResponseEntity.notFound().build();
        }
        String html = new String(htmlBytes, java.nio.charset.StandardCharsets.UTF_8);
        byte[] cssBytes = files.get("styles.css");
        String css = cssBytes == null ? "" : new String(cssBytes, java.nio.charset.StandardCharsets.UTF_8);
        html = html.replaceAll("(?i)<link[^>]*styles\\.css[^>]*>", "");
        html = html.replaceAll("(?i)<script[\\s\\S]*?</script>", "");
        String lower = html.toLowerCase();
        int headClose = lower.indexOf("</head>");
        if (headClose >= 0) {
            html = html.substring(0, headClose) + "<style>" + css + "</style>" + html.substring(headClose);
        } else {
            html = "<style>" + css + "</style>" + html;
        }
        return ResponseEntity.ok()
                .header(
                        "Content-Security-Policy",
                        "default-src 'none'; "
                                + "style-src 'unsafe-inline' https://fonts.googleapis.com; "
                                + "style-src-elem 'unsafe-inline' https://fonts.googleapis.com; "
                                + "img-src data: https: http:; "
                                + "font-src https://fonts.gstatic.com https: data:;"
                )
                .body(html);
    }

    @PatchMapping("/landing-pages/{id}/ui-template")
    public LandingPageDto patchUiTemplate(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return landingPageService.updateUiTemplate(id, body.get("uiTemplate"));
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("status", "UP");
        m.put("app", "lp-studio");
        return m;
    }
}
