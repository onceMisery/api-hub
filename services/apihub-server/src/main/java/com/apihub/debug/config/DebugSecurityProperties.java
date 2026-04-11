package com.apihub.debug.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "apihub.debug.security")
public class DebugSecurityProperties {

    private long connectTimeoutMs = 5000;
    private long readTimeoutMs = 10000;
    private int maxRequestBodyBytes = 65536;
    private int maxResponseBodyBytes = 262144;
    private List<AllowRule> globalAllowlist = List.of();

    public long getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(long connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public long getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(long readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    public int getMaxRequestBodyBytes() {
        return maxRequestBodyBytes;
    }

    public void setMaxRequestBodyBytes(int maxRequestBodyBytes) {
        this.maxRequestBodyBytes = maxRequestBodyBytes;
    }

    public int getMaxResponseBodyBytes() {
        return maxResponseBodyBytes;
    }

    public void setMaxResponseBodyBytes(int maxResponseBodyBytes) {
        this.maxResponseBodyBytes = maxResponseBodyBytes;
    }

    public List<AllowRule> getGlobalAllowlist() {
        return globalAllowlist;
    }

    public void setGlobalAllowlist(List<AllowRule> globalAllowlist) {
        this.globalAllowlist = globalAllowlist == null ? List.of() : List.copyOf(globalAllowlist);
    }

    public static class AllowRule {
        private String pattern;
        private boolean allowPrivate;

        public AllowRule() {
        }

        public AllowRule(String pattern, boolean allowPrivate) {
            this.pattern = pattern;
            this.allowPrivate = allowPrivate;
        }

        public String getPattern() {
            return pattern;
        }

        public void setPattern(String pattern) {
            this.pattern = pattern;
        }

        public boolean isAllowPrivate() {
            return allowPrivate;
        }

        public void setAllowPrivate(boolean allowPrivate) {
            this.allowPrivate = allowPrivate;
        }
    }
}
