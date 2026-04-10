package com.apihub.debug.service;

import com.apihub.project.model.ProjectDtos.DebugTargetRuleEntry;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.util.List;
import java.util.Locale;

@Component
public class DebugTargetRuleValidator {

    public void validateRules(List<DebugTargetRuleEntry> rules) {
        for (DebugTargetRuleEntry rule : rules == null ? List.<DebugTargetRuleEntry>of() : rules) {
            String pattern = normalizePattern(rule.pattern());
            if (pattern.isBlank()) {
                throw DebugSecurityException.badRequest("DEBUG_RULE_PATTERN_INVALID", "调试白名单规则不能为空");
            }
            if (pattern.contains("://") || pattern.contains("/") || pattern.contains("?")) {
                throw DebugSecurityException.badRequest("DEBUG_RULE_PATTERN_INVALID", "调试白名单规则只允许填写 host 或 IP");
            }
            if (pattern.startsWith("*") && !pattern.startsWith("*.")) {
                throw DebugSecurityException.badRequest("DEBUG_RULE_PATTERN_INVALID", "通配规则只允许使用 *.<domain> 形式");
            }
            if (pattern.substring(1).contains("*")) {
                throw DebugSecurityException.badRequest("DEBUG_RULE_PATTERN_INVALID", "调试白名单规则不支持多个通配符");
            }
            if (containsPort(pattern)) {
                throw DebugSecurityException.badRequest("DEBUG_RULE_PATTERN_INVALID", "调试白名单规则不支持端口");
            }
        }
    }

    public String validateEnvironmentMode(String mode) {
        String normalizedMode = normalizeMode(mode);
        return switch (normalizedMode) {
            case "inherit", "append", "override" -> normalizedMode;
            default -> throw DebugSecurityException.badRequest("DEBUG_ENVIRONMENT_MODE_INVALID", "调试环境策略模式不合法");
        };
    }

    private String normalizePattern(String pattern) {
        return pattern == null ? "" : pattern.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return "inherit";
        }
        return mode.trim().toLowerCase(Locale.ROOT);
    }

    private boolean containsPort(String pattern) {
        if (!pattern.contains(":")) {
            return false;
        }
        try {
            InetAddress.getByName(pattern);
            return false;
        } catch (Exception ignored) {
            return true;
        }
    }
}
