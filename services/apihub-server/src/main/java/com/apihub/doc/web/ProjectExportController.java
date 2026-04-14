package com.apihub.doc.web;

import com.apihub.doc.service.ProjectExportService;
import com.apihub.doc.service.ProjectExportService.ExportedDocument;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
public class ProjectExportController {

    private final ProjectExportService projectExportService;

    public ProjectExportController(ProjectExportService projectExportService) {
        this.projectExportService = projectExportService;
    }

    @GetMapping("/api/v1/projects/{projectId}/exports/openapi")
    public ResponseEntity<byte[]> exportOpenApi(@PathVariable Long projectId, Authentication authentication) {
        return buildDownloadResponse(projectExportService.exportOpenApi((Long) authentication.getPrincipal(), projectId));
    }

    @GetMapping("/api/v1/projects/{projectId}/exports/markdown")
    public ResponseEntity<byte[]> exportMarkdown(@PathVariable Long projectId, Authentication authentication) {
        return buildDownloadResponse(projectExportService.exportMarkdown((Long) authentication.getPrincipal(), projectId));
    }

    private ResponseEntity<byte[]> buildDownloadResponse(ExportedDocument document) {
        MediaType mediaType = MediaType.parseMediaType(document.contentType());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(document.fileName(), StandardCharsets.UTF_8)
                                .build()
                                .toString())
                .body(document.content());
    }
}
