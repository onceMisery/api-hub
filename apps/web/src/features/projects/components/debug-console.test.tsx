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
});
