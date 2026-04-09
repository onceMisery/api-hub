import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DebugConsole } from "./debug-console";

describe("DebugConsole", () => {
  it("should preview request and render debug response", async () => {
    const onExecute = vi.fn().mockResolvedValue({
      durationMs: 48,
      finalUrl: "https://local.dev/api/users/31?verbose=true",
      method: "GET",
      responseBody: "{\"ok\":true}",
      responseHeaders: [{ name: "content-type", value: "application/json" }],
      statusCode: 200
    });

    const onReplayHistory = vi.fn();

    render(
      <DebugConsole
        history={[
          {
            createdAt: "2026-04-09T12:10:00Z",
            durationMs: 35,
            endpointId: 31,
            environmentId: 41,
            finalUrl: "https://local.dev/api/users/31?cached=true",
            id: 101,
            method: "GET",
            projectId: 1,
            requestBody: "",
            requestHeaders: [{ name: "X-App", value: "ApiHub" }],
            responseBody: "{\"cached\":true}",
            responseHeaders: [{ name: "content-type", value: "application/json" }],
            statusCode: 200
          }
        ]}
        endpoint={{ description: "Load user", groupId: 21, id: 31, method: "GET", name: "Get User", path: "/users/31" }}
        environment={{
          baseUrl: "https://local.dev/api",
          defaultHeaders: [{ name: "X-App", value: "ApiHub" }],
          id: 41,
          isDefault: true,
          name: "Local",
          projectId: 1,
          variables: []
        }}
        isLoadingHistory={false}
        onExecute={onExecute}
        onReplayHistory={onReplayHistory}
        onRunHistory={vi.fn()}
        replayDraft={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Query string"), { target: { value: "verbose=true" } });
    fireEvent.change(screen.getByLabelText("Headers"), { target: { value: "X-Trace: abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(screen.getByText("https://local.dev/api/users/31?verbose=true")).toBeInTheDocument();

    await waitFor(() =>
      expect(onExecute).toHaveBeenCalledWith({
        body: "",
        endpointId: 31,
        environmentId: 41,
        headers: [{ name: "X-Trace", value: "abc" }],
        queryString: "verbose=true"
      })
    );

    await screen.findByText("{\"ok\":true}");
    expect(screen.getAllByText("200")).toHaveLength(2);
    expect(screen.getByText("{\"ok\":true}")).toBeInTheDocument();
    expect(screen.getByText("Recent history")).toBeInTheDocument();
    expect(screen.getByText("https://local.dev/api/users/31?cached=true")).toBeInTheDocument();
  });

  it("should replay a history item back into the request form", async () => {
    const historyItem = {
      createdAt: "2026-04-09T12:10:00Z",
      durationMs: 35,
      endpointId: 31,
      environmentId: 42,
      finalUrl: "https://staging.dev/api/users/31?cached=true&include=profile",
      id: 101,
      method: "GET",
      projectId: 1,
      requestBody: "{\"user\":\"31\"}",
      requestHeaders: [
        { name: "Authorization", value: "Bearer history-token" },
        { name: "X-App", value: "ApiHub" }
      ],
      responseBody: "{\"cached\":true}",
      responseHeaders: [{ name: "content-type", value: "application/json" }],
      statusCode: 200
    };
    const onReplayHistory = vi.fn();

    function ReplayHarness() {
      const [environmentId, setEnvironmentId] = React.useState(41);
      const [replayDraft, setReplayDraft] = React.useState<{
        historyId: number;
        queryString: string;
        headersText: string;
        body: string;
      } | null>(null);

      return (
        <DebugConsole
          history={[historyItem]}
          endpoint={{ description: "Load user", groupId: 21, id: 31, method: "GET", name: "Get User", path: "/users/31" }}
          environment={{
            baseUrl: environmentId === 42 ? "https://staging.dev/api" : "https://local.dev/api",
            defaultHeaders: [{ name: "X-App", value: "ApiHub" }],
            id: environmentId,
            isDefault: environmentId === 41,
            name: environmentId === 42 ? "Staging" : "Local",
            projectId: 1,
            variables: []
          }}
          isLoadingHistory={false}
          onExecute={vi.fn()}
          onReplayHistory={(item) => {
            onReplayHistory(item);
            setEnvironmentId(item.environmentId);
            setReplayDraft({
              body: item.requestBody ?? "",
              headersText: item.requestHeaders.map((header) => `${header.name}: ${header.value}`.trimEnd()).join("\n"),
              historyId: item.id,
              queryString: new URL(item.finalUrl).search.replace(/^\?/, "")
            });
          }}
          onRunHistory={vi.fn()}
          replayDraft={replayDraft}
        />
      );
    }

    render(<ReplayHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Replay history 101" }));

    await waitFor(() => expect(screen.getByLabelText("Query string")).toHaveValue("cached=true&include=profile"));
    expect(screen.getByLabelText("Headers")).toHaveValue("Authorization: Bearer history-token\nX-App: ApiHub");
    expect(screen.getByLabelText("Body")).toHaveValue("{\"user\":\"31\"}");
    expect(screen.getByText("https://staging.dev/api")).toBeInTheDocument();
    expect(onReplayHistory).toHaveBeenCalledWith(historyItem);
  });

  it("should execute a history item again and render the new response", async () => {
    const historyItem = {
      createdAt: "2026-04-09T12:10:00Z",
      durationMs: 35,
      endpointId: 31,
      environmentId: 42,
      finalUrl: "https://staging.dev/api/users/31?cached=true",
      id: 101,
      method: "GET",
      projectId: 1,
      requestBody: "{\"user\":\"31\"}",
      requestHeaders: [{ name: "Authorization", value: "Bearer history-token" }],
      responseBody: "{\"cached\":true}",
      responseHeaders: [{ name: "content-type", value: "application/json" }],
      statusCode: 200
    };
    const onRunHistory = vi.fn().mockResolvedValue({
      durationMs: 28,
      finalUrl: "https://staging.dev/api/users/31?cached=true",
      method: "GET",
      responseBody: "{\"rerun\":true}",
      responseHeaders: [{ name: "content-type", value: "application/json" }],
      statusCode: 202
    });

    render(
      <DebugConsole
        history={[historyItem]}
        endpoint={{ description: "Load user", groupId: 21, id: 31, method: "GET", name: "Get User", path: "/users/31" }}
        environment={{
          baseUrl: "https://staging.dev/api",
          defaultHeaders: [],
          id: 42,
          isDefault: false,
          name: "Staging",
          projectId: 1,
          variables: []
        }}
        isLoadingHistory={false}
        onExecute={vi.fn()}
        onReplayHistory={vi.fn()}
        onRunHistory={onRunHistory}
        replayDraft={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Run history 101" }));

    await waitFor(() => expect(onRunHistory).toHaveBeenCalledWith(historyItem));
    expect(await screen.findByText("{\"rerun\":true}")).toBeInTheDocument();
    expect(screen.getByText("202")).toBeInTheDocument();
  });
});
