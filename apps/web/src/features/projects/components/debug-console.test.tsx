import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { DebugConsole } from "./debug-console";

describe("DebugConsole", () => {
  it("shows policy blocked alert with message and errorCode", async () => {
    const blockedError = Object.assign(new Error("目标主机 blocked.example.com 未在调试白名单中"), {
      status: 403,
      errorCode: "DEBUG_TARGET_NOT_ALLOWED",
      data: { errorCode: "DEBUG_TARGET_NOT_ALLOWED", host: "blocked.example.com" }
    });

    const onExecute = vi.fn().mockRejectedValue(blockedError);

    render(
      <DebugConsole
        endpoint={{ id: 31, groupId: 21, name: "Get User", method: "GET", path: "/users/{id}", description: "", mockEnabled: false }}
        environment={{
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
        }}
        history={[]}
        isLoadingHistory={false}
        onExecute={onExecute}
        onReplayHistory={vi.fn()}
        onRunHistory={vi.fn()}
        replayDraft={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("DEBUG_TARGET_NOT_ALLOWED")).toBeInTheDocument();
    expect(screen.getByText("目标主机 blocked.example.com 未在调试白名单中")).toBeInTheDocument();
  });
});
