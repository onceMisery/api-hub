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
        replayDraft={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("DEBUG_TARGET_NOT_ALLOWED")).toBeInTheDocument();
    expect(screen.getByText("Target host blocked.example.com is not allowed")).toBeInTheDocument();
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
});
