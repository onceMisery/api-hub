package com.apihub.debug.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

public class DebugSecurityException extends ResponseStatusException {

    private final int businessCode;
    private final String errorCode;
    private final String host;
    private final List<String> matchedPatterns;

    private DebugSecurityException(HttpStatus status,
                                   int businessCode,
                                   String errorCode,
                                   String reason,
                                   String host,
                                   List<String> matchedPatterns) {
        super(status, reason);
        this.businessCode = businessCode;
        this.errorCode = errorCode;
        this.host = host;
        this.matchedPatterns = matchedPatterns == null ? List.of() : List.copyOf(matchedPatterns);
    }

    public static DebugSecurityException badRequest(String errorCode, String reason) {
        return new DebugSecurityException(HttpStatus.BAD_REQUEST, 40001, errorCode, reason, null, List.of());
    }

    public static DebugSecurityException forbidden(String errorCode, String reason, String host, List<String> matchedPatterns) {
        return new DebugSecurityException(HttpStatus.FORBIDDEN, 40301, errorCode, reason, host, matchedPatterns);
    }

    public int getBusinessCode() {
        return businessCode;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getHost() {
        return host;
    }

    public List<String> getMatchedPatterns() {
        return matchedPatterns;
    }
}
