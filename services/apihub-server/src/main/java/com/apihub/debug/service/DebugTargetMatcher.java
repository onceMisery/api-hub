package com.apihub.debug.service;

import com.apihub.project.model.ProjectDtos.DebugTargetRuleEntry;
import org.springframework.stereotype.Component;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
public class DebugTargetMatcher {

    public MatchResult match(String host, List<DebugTargetRuleEntry> rules) {
        String normalizedHost = normalizeHost(host);
        List<String> matchedPatterns = new ArrayList<>();
        boolean allowPrivate = false;
        for (DebugTargetRuleEntry rule : rules == null ? List.<DebugTargetRuleEntry>of() : rules) {
            if (matches(normalizedHost, normalizeHost(rule.pattern()))) {
                matchedPatterns.add(rule.pattern());
                allowPrivate = allowPrivate || rule.allowPrivate();
            }
        }
        return new MatchResult(!matchedPatterns.isEmpty(), isPrivateTarget(normalizedHost), allowPrivate, List.copyOf(matchedPatterns));
    }

    public boolean isPrivateTarget(String host) {
        String normalizedHost = normalizeHost(host);
        if (normalizedHost.equals("localhost")) {
            return true;
        }
        try {
            InetAddress address = InetAddress.getByName(normalizedHost);
            if (address instanceof Inet4Address ipv4) {
                byte[] octets = ipv4.getAddress();
                int first = Byte.toUnsignedInt(octets[0]);
                int second = Byte.toUnsignedInt(octets[1]);
                return first == 10
                        || first == 127
                        || (first == 169 && second == 254)
                        || (first == 172 && second >= 16 && second <= 31)
                        || (first == 192 && second == 168);
            }
            if (address instanceof Inet6Address ipv6) {
                byte[] bytes = ipv6.getAddress();
                int first = Byte.toUnsignedInt(bytes[0]);
                int second = Byte.toUnsignedInt(bytes[1]);
                return ipv6.isLoopbackAddress()
                        || (first & 0xfe) == 0xfc
                        || (first == 0xfe && (second & 0xc0) == 0x80);
            }
        } catch (Exception ignored) {
            return false;
        }
        return false;
    }

    private boolean matches(String host, String pattern) {
        if (host.isBlank() || pattern.isBlank()) {
            return false;
        }
        if (pattern.startsWith("*.")) {
            String suffix = pattern.substring(1);
            return host.endsWith(suffix) && host.length() > suffix.length();
        }
        return host.equals(pattern);
    }

    private String normalizeHost(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("[") && normalized.endsWith("]") && normalized.length() > 2) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }
        while (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    public record MatchResult(boolean matched, boolean privateTarget, boolean allowPrivate, List<String> matchedPatterns) {
    }
}
