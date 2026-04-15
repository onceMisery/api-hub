package com.apihub.testsuite.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.testsuite.model.TestSuiteDtos.AssertionResult;
import com.apihub.testsuite.model.TestSuiteDtos.ExtractedVariableResult;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import javax.script.Bindings;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class TestStepScriptEngine {

    public void runPreScript(String script,
                             Long endpointId,
                             Long environmentId,
                             String stepName,
                             MutableRequest request,
                             Map<String, String> variables) {
        if (script == null || script.isBlank()) {
            return;
        }
        ScriptEngine engine = requireEngine();
        executeScript(engine, script, bindings(engine, endpointId, environmentId, stepName, request, null, List.of(), List.of(), variables), "pre");
    }

    public void runPostScript(String script,
                              Long endpointId,
                              Long environmentId,
                              String stepName,
                              MutableRequest request,
                              ExecuteDebugResponse response,
                              List<AssertionResult> assertions,
                              List<ExtractedVariableResult> extractedVariables,
                              Map<String, String> variables) {
        if (script == null || script.isBlank()) {
            return;
        }
        ScriptEngine engine = requireEngine();
        executeScript(engine, script, bindings(engine, endpointId, environmentId, stepName, request, response, assertions, extractedVariables, variables), "post");
    }

    private ScriptEngine requireEngine() {
        ScriptEngine engine = new ScriptEngineManager().getEngineByName("js");
        if (engine == null) {
            throw new IllegalStateException("JavaScript engine is not available");
        }
        return engine;
    }

    private Bindings bindings(ScriptEngine engine,
                              Long endpointId,
                              Long environmentId,
                              String stepName,
                              MutableRequest request,
                              ExecuteDebugResponse response,
                              List<AssertionResult> assertions,
                              List<ExtractedVariableResult> extractedVariables,
                              Map<String, String> variables) {
        Bindings bindings = engine.createBindings();
        bindings.put("vars", new ScriptVariables(variables));
        bindings.put("request", request);
        bindings.put("response", response == null ? null : new ScriptResponse(response));
        bindings.put("assertions", assertions);
        bindings.put("extractedVariables", extractedVariables);
        bindings.put("context", new StepContext(endpointId, environmentId, stepName));
        return bindings;
    }

    private void executeScript(ScriptEngine engine, String script, Bindings bindings, String stage) {
        try {
            engine.eval(script, bindings);
        } catch (ScriptException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Test step " + stage + " script failed: " + exception.getMessage());
        }
    }

    public record StepContext(Long endpointId, Long environmentId, String stepName) {
    }

    public static final class MutableRequest {
        private String queryString;
        private String body;
        private final Map<String, String> headers;

        public MutableRequest(String queryString, String body, List<DebugHeader> headers) {
            this.queryString = queryString == null ? "" : queryString;
            this.body = body == null ? "" : body;
            this.headers = new LinkedHashMap<>();
            if (headers != null) {
                headers.forEach(header -> {
                    if (header != null && header.name() != null && !header.name().isBlank()) {
                        this.headers.put(header.name(), header.value() == null ? "" : header.value());
                    }
                });
            }
        }

        public String getQueryString() {
            return queryString;
        }

        public void setQueryString(String queryString) {
            this.queryString = queryString == null ? "" : queryString;
        }

        public String getBody() {
            return body;
        }

        public void setBody(String body) {
            this.body = body == null ? "" : body;
        }

        public Map<String, String> getHeaders() {
            return headers;
        }

        public List<DebugHeader> toHeaders() {
            List<DebugHeader> values = new ArrayList<>();
            headers.forEach((name, value) -> values.add(new DebugHeader(name, value)));
            return values;
        }
    }

    public static final class ScriptVariables {
        private final Map<String, String> variables;

        public ScriptVariables(Map<String, String> variables) {
            this.variables = variables;
        }

        public String get(String key) {
            return variables.get(key);
        }

        public void set(String key, Object value) {
            variables.put(key, value == null ? "" : String.valueOf(value));
        }

        public void remove(String key) {
            variables.remove(key);
        }

        public Map<String, String> asMap() {
            return variables;
        }
    }

    public static final class ScriptResponse {
        private final ExecuteDebugResponse response;

        public ScriptResponse(ExecuteDebugResponse response) {
            this.response = response;
        }

        public String getMethod() {
            return response.method();
        }

        public String getFinalUrl() {
            return response.finalUrl();
        }

        public Integer getStatusCode() {
            return response.statusCode();
        }

        public long getDurationMs() {
            return response.durationMs();
        }

        public String getBody() {
            return response.responseBody();
        }

        public List<DebugHeader> getHeaders() {
            return response.responseHeaders();
        }
    }
}
