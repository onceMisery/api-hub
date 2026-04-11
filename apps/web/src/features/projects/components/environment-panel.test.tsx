import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EnvironmentPanel } from "./environment-panel";

describe("EnvironmentPanel", () => {
  it("submits environment debug host mode and host rules", async () => {
    const onUpdateEnvironment = vi.fn().mockResolvedValue(undefined);

    render(
      <EnvironmentPanel
        canWrite
        environments={[
          {
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
          }
        ]}
        projectDebugAllowedHosts={[]}
        onCreateEnvironment={vi.fn().mockResolvedValue(undefined)}
        onDeleteEnvironment={vi.fn().mockResolvedValue(undefined)}
        onSelectEnvironment={vi.fn()}
        onUpdateEnvironment={onUpdateEnvironment}
        onUpdateProjectDebugPolicy={vi.fn().mockResolvedValue(undefined)}
        selectedEnvironmentId={41}
      />
    );

    fireEvent.change(screen.getByLabelText("Environment 41 debug host mode"), { target: { value: "append" } });
    fireEvent.change(screen.getByLabelText("Environment 41 debug rule 1 pattern"), { target: { value: "10.10.1.8" } });
    fireEvent.click(screen.getByLabelText("Environment 41 debug rule 1 allow private"));
    fireEvent.click(screen.getByRole("button", { name: "Save environment 41" }));

    await waitFor(() =>
      expect(onUpdateEnvironment).toHaveBeenCalledWith(
        41,
        expect.objectContaining({
          debugHostMode: "append",
          debugAllowedHosts: [{ pattern: "10.10.1.8", allowPrivate: true }]
        })
      )
    );
  });

  it("disables environment mutations for read-only members", () => {
    render(
      <EnvironmentPanel
        canWrite={false}
        environments={[
          {
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
          }
        ]}
        projectDebugAllowedHosts={[]}
        onCreateEnvironment={vi.fn().mockResolvedValue(undefined)}
        onDeleteEnvironment={vi.fn().mockResolvedValue(undefined)}
        onSelectEnvironment={vi.fn()}
        onUpdateEnvironment={vi.fn().mockResolvedValue(undefined)}
        onUpdateProjectDebugPolicy={vi.fn().mockResolvedValue(undefined)}
        selectedEnvironmentId={41}
      />
    );

    expect(screen.getByRole("button", { name: "Save project debug policy" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add environment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save environment 41" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete environment 41" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Use environment 41" })).not.toBeDisabled();
  });
});
