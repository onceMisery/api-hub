import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DebugConsole } from "./debug-console";

const endpoint = { id: 31, groupId: 21, name: "Get User", method: "GET", path: "/users/{id}", description: "", mockEnabled: false } as const;
const environment = {
  id: 41,
  projectId: 1,
  name: "Local",
  baseUrl: "https://local.dev",
  isDefault: true,
  variables: [],
  defaultHeaders: [],
  defaultQuery: [],
  authMode: "none",
  authKey: "",
  authValue: "",
  debugHostMode: "inherit",
  debugAllowedHosts: []
} as const;

describe("DebugConsole", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the selected environment policy summary", () => {
    render(
      <DebugConsole
        endpoint={endpoint}
        environment={{
          ...environment,
          debugHostMode: "append",
          debugAllowedHosts: [{ pattern: "10.10.1.8", allowPrivate: true }]
        }}
        environmentOptions={[environment]}
        history={[]}
        historyFilters={{
          environmentId: null,
          statusCode: null,
          createdFrom: "",
          createdTo: ""
        }}
        isLoadingHistory={false}
        onChangeHistoryFilters={vi.fn()}
        onClearHistory={vi.fn().mockResolvedValue(undefined)}
        onExecute={vi.fn().mockResolvedValue({
          method: "GET",
          finalUrl: "https://local.dev/users/31",
          statusCode: 200,
          responseHeaders: [],
          responseBody: "{\"ok\":true}",
          durationMs: 20
        })}
        onReplayHistory={vi.fn()}
        onRunHistory={vi.fn()}
        projectDebugAllowedHosts={[
          { pattern: "*.corp.example.com", allowPrivate: false },
          { pattern: "api.partner.dev", allowPrivate: false }
        ]}
        replayDraft={null}
      />
    );

    expect(screen.getByText("Debug target policy")).toBeInTheDocument();
    expect(screen.getByText("Project rules")).toBeInTheDocument();
    expect(screen.getByText("Environment mode")).toBeInTheDocument();
    expect(screen.getByText("append")).toBeInTheDocument();
    expect(screen.getByText("Environment rules")).toBeInTheDocument();
    expect(screen.getByText("Effective policy uses global + project rules, then appends environment rules.")).toBeInTheDocument();
  });

  it("shows policy blocked alert with message and errorCode", async () => {
    const blockedError = Object.assign(new Error("Target host blocked.example.com is not allowed"), {
      status: 403,
      errorCode: "DEBUG_TARGET_NOT_ALLOWED",
      data: { errorCode: "DEBUG_TARGET_NOT_ALLOWED", host: "blocked.example.com" }
    });

    const onExecute = vi.fn().mockRejectedValue(blockedError);

    render(
      <DebugConsole
        endpoint={endpoint}
        environment={environment}
        environmentOptions={[environment]}
        history={[]}
        historyFilters={{
          environmentId: null,
          statusCode: null,
          createdFrom: "",
          createdTo: ""
        }}
        isLoadingHistory={false}
        onChangeHistoryFilters={vi.fn()}
        onClearHistory={vi.fn().mockResolvedValue(undefined)}
        onExecute={onExecute}
        onReplayHistory={vi.fn()}
        onRunHistory={vi.fn()}
        projectDebugAllowedHosts={[]}
        replayDraft={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("DEBUG_TARGET_NOT_ALLOWED")).toBeInTheDocument();
    expect(screen.getByText("Target host blocked.example.com is not allowed")).toBeInTheDocument();
  });

  it("shows blocked host and matched patterns when a debug request is denied", async () => {
    const blockedError = Object.assign(new Error("Target host 10.10.1.8 hit private network restrictions"), {
      status: 403,
      errorCode: "DEBUG_PRIVATE_TARGET_NOT_ALLOWED",
      data: {
        errorCode: "DEBUG_PRIVATE_TARGET_NOT_ALLOWED",
        host: "10.10.1.8",
        matchedPatterns: ["10.10.1.8"]
      }
    });

    render(
      <DebugConsole
        endpoint={endpoint}
        environment={environment}
        environmentOptions={[environment]}
        history={[]}
        historyFilters={{
          environmentId: null,
          statusCode: null,
          createdFrom: "",
          createdTo: ""
        }}
        isLoadingHistory={false}
        onChangeHistoryFilters={vi.fn()}
        onClearHistory={vi.fn().mockResolvedValue(undefined)}
        onExecute={vi.fn().mockRejectedValue(blockedError)}
        onReplayHistory={vi.fn()}
        onRunHistory={vi.fn()}
        projectDebugAllowedHosts={[]}
        replayDraft={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("DEBUG_PRIVATE_TARGET_NOT_ALLOWED")).toBeInTheDocument();
    expect(screen.getByText("Blocked host")).toBeInTheDocument();
    expect(screen.getAllByText("10.10.1.8").length).toBeGreaterThan(0);
    expect(screen.getByText("Matched rules")).toBeInTheDocument();
  });

  it("submits debug history filters and clear action", async () => {
    const onChangeHistoryFilters = vi.fn();
    const onClearHistory = vi.fn().mockResolvedValue(undefined);

    render(
      <DebugConsole
        endpoint={endpoint}
        environment={environment}
        environmentOptions={[
          environment,
          {
            ...environment,
            id: 42,
            isDefault: false,
            name: "Staging"
          }
        ]}
        history={[
          {
            id: 101,
            projectId: 1,
            environmentId: 41,
            endpointId: 31,
            method: "GET",
            finalUrl: "https://local.dev/users/31",
            requestHeaders: [],
            requestBody: "",
            statusCode: 200,
            responseHeaders: [],
            responseBody: "{\"ok\":true}",
            durationMs: 20,
            createdAt: "2026-04-10T12:00:00Z"
          }
        ]}
        historyFilters={{
          environmentId: null,
          statusCode: null,
          createdFrom: "",
          createdTo: ""
        }}
        isLoadingHistory={false}
        onChangeHistoryFilters={onChangeHistoryFilters}
        onClearHistory={onClearHistory}
        onExecute={vi.fn().mockResolvedValue({
          method: "GET",
          finalUrl: "https://local.dev/users/31",
          statusCode: 200,
          responseHeaders: [],
          responseBody: "{\"ok\":true}",
          durationMs: 20
        })}
        onReplayHistory={vi.fn()}
        onRunHistory={vi.fn()}
        projectDebugAllowedHosts={[]}
        replayDraft={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Debug history environment filter"), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText("Debug history status filter"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear debug history" }));

    expect(onChangeHistoryFilters).toHaveBeenCalledWith({
      environmentId: 42,
      statusCode: null,
      createdFrom: "",
      createdTo: ""
    });
    expect(onChangeHistoryFilters).toHaveBeenCalledWith({
      environmentId: null,
      statusCode: 500,
      createdFrom: "",
      createdTo: ""
    });
    await waitFor(() => expect(onClearHistory).toHaveBeenCalled());
  });

  it("saves a named preset locally and re-applies it to the draft", async () => {
    render(
      <DebugConsole
        endpoint={endpoint}
        environment={environment}
        environmentOptions={[environment]}
        history={[]}
        historyFilters={{
          environmentId: null,
          statusCode: null,
          createdFrom: "",
          createdTo: ""
        }}
        isLoadingHistory={false}
        onChangeHistoryFilters={vi.fn()}
        onClearHistory={vi.fn().mockResolvedValue(undefined)}
        onExecute={vi.fn().mockResolvedValue({
          method: "GET",
          finalUrl: "https://local.dev/users/31",
          statusCode: 200,
          responseHeaders: [],
          responseBody: "{\"ok\":true}",
          durationMs: 20
        })}
        onReplayHistory={vi.fn()}
        onRunHistory={vi.fn()}
        projectDebugAllowedHosts={[]}
        replayDraft={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Query string"), { target: { value: "mode=strict" } });
    fireEvent.change(screen.getByLabelText("Headers"), { target: { value: "X-Trace: abc" } });
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: "{\"user\":31}" } });
    fireEvent.change(screen.getByLabelText("Preset name"), { target: { value: "Strict user trace" } });
    fireEvent.click(screen.getByRole("button", { name: "Save preset" }));

    expect(await screen.findByText("Strict user trace")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Query string"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Headers"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply preset Strict user trace" }));

    expect(screen.getByLabelText("Query string")).toHaveValue("mode=strict");
    expect(screen.getByLabelText("Headers")).toHaveValue("X-Trace: abc");
    expect(screen.getByLabelText("Body")).toHaveValue("{\"user\":31}");
  });

  it("exports the current request as cURL and imports a pasted cURL command", () => {
    render(
      <DebugConsole
        endpoint={endpoint}
        environment={environment}
        environmentOptions={[environment]}
        history={[]}
        historyFilters={{
          environmentId: null,
          statusCode: null,
          createdFrom: "",
          createdTo: ""
        }}
        isLoadingHistory={false}
        onChangeHistoryFilters={vi.fn()}
        onClearHistory={vi.fn().mockResolvedValue(undefined)}
        onExecute={vi.fn().mockResolvedValue({
          method: "GET",
          finalUrl: "https://local.dev/users/31",
          statusCode: 200,
          responseHeaders: [],
          responseBody: "{\"ok\":true}",
          durationMs: 20
        })}
        onReplayHistory={vi.fn()}
        onRunHistory={vi.fn()}
        projectDebugAllowedHosts={[]}
        replayDraft={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Query string"), { target: { value: "verbose=true" } });
    fireEvent.change(screen.getByLabelText("Headers"), { target: { value: "Authorization: Bearer token" } });
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: "{\"name\":\"Alice\"}" } });

    const generatedCurl = screen.getByLabelText("Generated cURL") as HTMLTextAreaElement;
    expect(generatedCurl.value).toContain("curl");
    expect(generatedCurl.value).toContain("verbose=true");

    fireEvent.change(screen.getByLabelText("Import cURL"), {
      target: {
        value: "curl 'https://local.dev/users/{id}?mode=compact' -X GET -H 'X-Trace: imported' --data-raw '{\"from\":\"curl\"}'"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import cURL" }));

    expect(screen.getByLabelText("Query string")).toHaveValue("mode=compact");
    expect(screen.getByLabelText("Headers")).toHaveValue("X-Trace: imported");
    expect(screen.getByLabelText("Body")).toHaveValue("{\"from\":\"curl\"}");
  });
});
