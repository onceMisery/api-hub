package com.apihub.mock.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class MockRuntimeAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    private static final Pattern PROJECT_ID_PATTERN = Pattern.compile("^/mock/([0-9]+)(?:/.*)?$");

    private final MockRuntimeAccessEvaluator mockRuntimeAccessEvaluator;

    public MockRuntimeAuthorizationManager(MockRuntimeAccessEvaluator mockRuntimeAccessEvaluator) {
        this.mockRuntimeAccessEvaluator = mockRuntimeAccessEvaluator;
    }

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authentication, RequestAuthorizationContext context) {
        HttpServletRequest request = context.getRequest();
        Long projectId = extractProjectId(request.getRequestURI());
        if (projectId == null) {
            return new AuthorizationDecision(true);
        }
        return new AuthorizationDecision(mockRuntimeAccessEvaluator.isAuthorized(
                projectId,
                authentication.get(),
                request.getHeader("X-ApiHub-Mock-Token")));
    }

    private Long extractProjectId(String requestUri) {
        Matcher matcher = PROJECT_ID_PATTERN.matcher(requestUri);
        if (!matcher.matches()) {
            return null;
        }
        return Long.parseLong(matcher.group(1));
    }
}
