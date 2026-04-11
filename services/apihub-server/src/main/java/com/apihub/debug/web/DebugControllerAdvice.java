package com.apihub.debug.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.debug.model.DebugDtos.DebugExecutionErrorDetail;
import com.apihub.debug.service.DebugSecurityException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = DebugController.class)
public class DebugControllerAdvice {

    @ExceptionHandler(DebugSecurityException.class)
    public ResponseEntity<ApiResponse<DebugExecutionErrorDetail>> handleDebugSecurity(DebugSecurityException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(new ApiResponse<>(
                        exception.getBusinessCode(),
                        exception.getReason(),
                        new DebugExecutionErrorDetail(
                                exception.getErrorCode(),
                                exception.getHost(),
                                exception.getMatchedPatterns())));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatus(ResponseStatusException exception) {
        String message = exception.getReason() == null || exception.getReason().isBlank()
                ? exception.getStatusCode().toString()
                : exception.getReason();
        return ResponseEntity.status(exception.getStatusCode())
                .body(new ApiResponse<>(exception.getStatusCode().value(), message, null));
    }
}
