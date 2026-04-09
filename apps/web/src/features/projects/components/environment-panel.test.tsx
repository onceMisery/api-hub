import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EnvironmentPanel } from "./environment-panel";

describe("EnvironmentPanel", () => {
  it("creates, updates, selects, and deletes environments", async () => {
    const onCreateEnvironment = vi.fn().mockResolvedValue(undefined);
    const onDeleteEnvironment = vi.fn().mockResolvedValue(undefined);
    const onSelectEnvironment = vi.fn();
    const onUpdateEnvironment = vi.fn().mockResolvedValue(undefined);

    render(
      <EnvironmentPanel
        environments={[
          {
            id: 41,
            projectId: 1,
            name: "Local",
            baseUrl: "https://local.dev",
            isDefault: true,
            variables: [{ name: "token", value: "dev-token" }],
            defaultHeaders: [{ name: "Authorization", value: "Bearer {{token}}" }],
            defaultQuery: [{ name: "locale", value: "zh-CN" }],
            authMode: "bearer",
            authKey: "Authorization",
            authValue: "dev-token"
          }
        ]}
        onCreateEnvironment={onCreateEnvironment}
        onDeleteEnvironment={onDeleteEnvironment}
        onSelectEnvironment={onSelectEnvironment}
        onUpdateEnvironment={onUpdateEnvironment}
        selectedEnvironmentId={41}
      />
    );

    fireEvent.change(screen.getByLabelText("New environment name"), { target: { value: "Staging" } });
    fireEvent.change(screen.getByLabelText("New environment base URL"), { target: { value: "https://staging.dev" } });
    fireEvent.change(screen.getByLabelText("New environment variables"), { target: { value: "token=staging-token" } });
    fireEvent.change(screen.getByLabelText("New environment query"), { target: { value: "locale=en-US" } });
    fireEvent.change(screen.getByLabelText("New environment headers"), { target: { value: "Authorization: Bearer {{token}}" } });
    fireEvent.change(screen.getByLabelText("New environment auth mode"), { target: { value: "api_key_header" } });
    fireEvent.change(screen.getByLabelText("New environment auth key"), { target: { value: "X-API-Key" } });
    fireEvent.change(screen.getByLabelText("New environment auth value"), { target: { value: "staging-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Add environment" }));

    await waitFor(() =>
      expect(onCreateEnvironment).toHaveBeenCalledWith({
        baseUrl: "https://staging.dev",
        defaultHeaders: [{ name: "Authorization", value: "Bearer {{token}}" }],
        defaultQuery: [{ name: "locale", value: "en-US" }],
        authKey: "X-API-Key",
        authMode: "api_key_header",
        authValue: "staging-key",
        isDefault: false,
        name: "Staging",
        variables: [{ name: "token", value: "staging-token" }]
      })
    );

    fireEvent.change(screen.getByLabelText("Environment 41 name"), { target: { value: "Production" } });
    fireEvent.change(screen.getByLabelText("Environment 41 base URL"), { target: { value: "https://prod.dev" } });
    fireEvent.change(screen.getByLabelText("Environment 41 variables"), { target: { value: "token=prod-token" } });
    fireEvent.change(screen.getByLabelText("Environment 41 query"), { target: { value: "region=cn" } });
    fireEvent.change(screen.getByLabelText("Environment 41 headers"), { target: { value: "X-App: api-hub" } });
    fireEvent.change(screen.getByLabelText("Environment 41 auth mode"), { target: { value: "api_key_header" } });
    fireEvent.change(screen.getByLabelText("Environment 41 auth key"), { target: { value: "X-API-Key" } });
    fireEvent.change(screen.getByLabelText("Environment 41 auth value"), { target: { value: "prod-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Save environment 41" }));

    await waitFor(() =>
      expect(onUpdateEnvironment).toHaveBeenCalledWith(41, {
        baseUrl: "https://prod.dev",
        defaultHeaders: [{ name: "X-App", value: "api-hub" }],
        defaultQuery: [{ name: "region", value: "cn" }],
        authKey: "X-API-Key",
        authMode: "api_key_header",
        authValue: "prod-key",
        isDefault: true,
        name: "Production",
        variables: [{ name: "token", value: "prod-token" }]
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Use environment 41" }));
    expect(onSelectEnvironment).toHaveBeenCalledWith(41);

    fireEvent.click(screen.getByRole("button", { name: "Delete environment 41" }));
    await waitFor(() => expect(onDeleteEnvironment).toHaveBeenCalledWith(41));
  });
});
