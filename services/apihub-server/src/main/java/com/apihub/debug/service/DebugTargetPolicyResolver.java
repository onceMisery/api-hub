package com.apihub.debug.service;

import com.apihub.project.model.ProjectDtos.DebugTargetRuleEntry;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class DebugTargetPolicyResolver {

    public List<DebugTargetRuleEntry> resolveEffectiveRules(List<DebugTargetRuleEntry> globalRules,
                                                            List<DebugTargetRuleEntry> projectRules,
                                                            String environmentMode,
                                                            List<DebugTargetRuleEntry> environmentRules) {
        return switch (normalizeMode(environmentMode)) {
            case "inherit" -> concat(globalRules, projectRules);
            case "append" -> concat(globalRules, projectRules, environmentRules);
            case "override" -> concat(globalRules, environmentRules);
            default -> throw DebugSecurityException.badRequest("DEBUG_ENVIRONMENT_MODE_INVALID", "调试环境策略模式不合法");
        };
    }

    @SafeVarargs
    private final List<DebugTargetRuleEntry> concat(List<DebugTargetRuleEntry>... groups) {
        List<DebugTargetRuleEntry> merged = new ArrayList<>();
        for (List<DebugTargetRuleEntry> group : groups) {
            if (group != null) {
                merged.addAll(group);
            }
        }
        return List.copyOf(merged);
    }

    private String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return "inherit";
        }
        return mode.trim().toLowerCase();
    }
}
