package com.apihub.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "apihub.auth.jwt")
public class AuthTokenProperties {

    private String issuer = "apihub";
    private String secret = "dev-secret-change-me";
    private long accessExpiresSeconds = 900;
    private long refreshExpiresSeconds = 604800;

    public AuthTokenProperties() {
    }

    public AuthTokenProperties(String issuer, String secret, long accessExpiresSeconds, long refreshExpiresSeconds) {
        this.issuer = issuer;
        this.secret = secret;
        this.accessExpiresSeconds = accessExpiresSeconds;
        this.refreshExpiresSeconds = refreshExpiresSeconds;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getAccessExpiresSeconds() {
        return accessExpiresSeconds;
    }

    public void setAccessExpiresSeconds(long accessExpiresSeconds) {
        this.accessExpiresSeconds = accessExpiresSeconds;
    }

    public long getRefreshExpiresSeconds() {
        return refreshExpiresSeconds;
    }

    public void setRefreshExpiresSeconds(long refreshExpiresSeconds) {
        this.refreshExpiresSeconds = refreshExpiresSeconds;
    }
}
