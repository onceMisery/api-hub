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
        onImportEnvironmentBundle={vi.fn().mockResolvedValue(undefined)}
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
        onImportEnvironmentBundle={vi.fn().mockResolvedValue(undefined)}
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

  it("adapts auth labels for basic auth and submits the new mode", async () => {
    const onCreateEnvironment = vi.fn().mockResolvedValue(undefined);

    render(
      <EnvironmentPanel
        canWrite
        environments={[]}
        projectDebugAllowedHosts={[]}
        onCreateEnvironment={onCreateEnvironment}
        onDeleteEnvironment={vi.fn().mockResolvedValue(undefined)}
        onImportEnvironmentBundle={vi.fn().mockResolvedValue(undefined)}
        onSelectEnvironment={vi.fn()}
        onUpdateEnvironment={vi.fn().mockResolvedValue(undefined)}
        onUpdateProjectDebugPolicy={vi.fn().mockResolvedValue(undefined)}
        selectedEnvironmentId={null}
      />
    );

    fireEvent.change(screen.getByLabelText("New environment name"), { target: { value: "Partner Basic" } });
    fireEvent.change(screen.getByLabelText("New environment base URL"), { target: { value: "https://partner.example.com" } });
    fireEvent.change(screen.getByLabelText("New environment auth mode"), { target: { value: "basic" } });

    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("New environment auth key"), { target: { value: "demo-user" } });
    fireEvent.change(screen.getByLabelText("New environment auth value"), { target: { value: "s3cr3t" } });
    fireEvent.click(screen.getByRole("button", { name: "Add environment" }));

    await waitFor(() =>
      expect(onCreateEnvironment).toHaveBeenCalledWith(
        expect.objectContaining({
          authKey: "demo-user",
          authMode: "basic",
          authValue: "s3cr3t"
        })
      )
    );
  });

  it("parses environment bundles and imports non-default copies", async () => {
    const onImportEnvironmentBundle = vi.fn().mockResolvedValue(undefined);

    render(
      <EnvironmentPanel
        canWrite
        environments={[]}
        projectDebugAllowedHosts={[]}
        onCreateEnvironment={vi.fn().mockResolvedValue(undefined)}
        onDeleteEnvironment={vi.fn().mockResolvedValue(undefined)}
        onImportEnvironmentBundle={onImportEnvironmentBundle}
        onSelectEnvironment={vi.fn()}
        onUpdateEnvironment={vi.fn().mockResolvedValue(undefined)}
        onUpdateProjectDebugPolicy={vi.fn().mockResolvedValue(undefined)}
        selectedEnvironmentId={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Open environment import" }));
    fireEvent.change(screen.getByLabelText("Environment bundle import"), {
      target: {
        value: JSON.stringify({
          version: 1,
          exportedAt: "2026-04-11T12:00:00.000Z",
          environments: [
            {
              name: "Staging",
              baseUrl: "https://staging.dev",
              variables: [],
              defaultHeaders: [],
              defaultQuery: [],
              authMode: "api_key_query",
              authKey: "api_key",
              authValue: "demo",
              debugHostMode: "inherit",
              debugAllowedHosts: []
            }
          ]
        })
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import environment bundle" }));

    await waitFor(() =>
      expect(onImportEnvironmentBundle).toHaveBeenCalledWith([
        expect.objectContaining({
          name: "Staging",
          baseUrl: "https://staging.dev",
          authMode: "api_key_query",
          authKey: "api_key",
          authValue: "demo",
          isDefault: false
        })
      ])
    );
  });
});
