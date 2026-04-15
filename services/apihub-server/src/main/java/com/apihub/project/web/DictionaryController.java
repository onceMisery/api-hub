package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateDictionaryGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateDictionaryItemRequest;
import com.apihub.project.model.ProjectDtos.DictionaryImportResult;
import com.apihub.project.model.ProjectDtos.DictionaryGroupDetail;
import com.apihub.project.model.ProjectDtos.DictionaryItemDetail;
import com.apihub.project.model.ProjectDtos.ImportDictionaryRequest;
import com.apihub.project.model.ProjectDtos.UpdateDictionaryGroupRequest;
import com.apihub.project.model.ProjectDtos.UpdateDictionaryItemRequest;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class DictionaryController {

    private final ProjectService projectService;

    public DictionaryController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/api/v1/projects/{projectId}/dictionary-groups")
    public ApiResponse<List<DictionaryGroupDetail>> listDictionaryGroups(@PathVariable Long projectId,
                                                                         Authentication authentication) {
        return ApiResponse.success(projectService.listDictionaryGroups((Long) authentication.getPrincipal(), projectId));
    }

    @PostMapping("/api/v1/projects/{projectId}/dictionary-groups")
    public ApiResponse<DictionaryGroupDetail> createDictionaryGroup(@PathVariable Long projectId,
                                                                    @RequestBody CreateDictionaryGroupRequest request,
                                                                    Authentication authentication) {
        return ApiResponse.success(projectService.createDictionaryGroup((Long) authentication.getPrincipal(), projectId, request));
    }

    @PostMapping("/api/v1/projects/{projectId}/dictionary-groups/import")
    public ApiResponse<DictionaryImportResult> importDictionaryGroups(@PathVariable Long projectId,
                                                                      @RequestBody ImportDictionaryRequest request,
                                                                      Authentication authentication) {
        return ApiResponse.success(projectService.importDictionaryGroups((Long) authentication.getPrincipal(), projectId, request));
    }

    @PatchMapping("/api/v1/dictionary-groups/{groupId}")
    public ApiResponse<DictionaryGroupDetail> updateDictionaryGroup(@PathVariable Long groupId,
                                                                    @RequestBody UpdateDictionaryGroupRequest request,
                                                                    Authentication authentication) {
        return ApiResponse.success(projectService.updateDictionaryGroup((Long) authentication.getPrincipal(), groupId, request));
    }

    @DeleteMapping("/api/v1/dictionary-groups/{groupId}")
    public ApiResponse<Void> deleteDictionaryGroup(@PathVariable Long groupId,
                                                   Authentication authentication) {
        projectService.deleteDictionaryGroup((Long) authentication.getPrincipal(), groupId);
        return ApiResponse.success(null);
    }

    @GetMapping("/api/v1/dictionary-groups/{groupId}/items")
    public ApiResponse<List<DictionaryItemDetail>> listDictionaryItems(@PathVariable Long groupId,
                                                                       Authentication authentication) {
        return ApiResponse.success(projectService.listDictionaryItems((Long) authentication.getPrincipal(), groupId));
    }

    @PostMapping("/api/v1/dictionary-groups/{groupId}/items")
    public ApiResponse<DictionaryItemDetail> createDictionaryItem(@PathVariable Long groupId,
                                                                  @RequestBody CreateDictionaryItemRequest request,
                                                                  Authentication authentication) {
        return ApiResponse.success(projectService.createDictionaryItem((Long) authentication.getPrincipal(), groupId, request));
    }

    @PatchMapping("/api/v1/dictionary-items/{itemId}")
    public ApiResponse<DictionaryItemDetail> updateDictionaryItem(@PathVariable Long itemId,
                                                                  @RequestBody UpdateDictionaryItemRequest request,
                                                                  Authentication authentication) {
        return ApiResponse.success(projectService.updateDictionaryItem((Long) authentication.getPrincipal(), itemId, request));
    }

    @DeleteMapping("/api/v1/dictionary-items/{itemId}")
    public ApiResponse<Void> deleteDictionaryItem(@PathVariable Long itemId,
                                                  Authentication authentication) {
        projectService.deleteDictionaryItem((Long) authentication.getPrincipal(), itemId);
        return ApiResponse.success(null);
    }
}
