import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EndpointEditor } from "./endpoint-editor";

describe("EndpointEditor", () => {
  it("renders endpoint details and versions", () => {
    render(
      <EndpointEditor
        endpoint={{
          id: 7,
          groupId: 3,
          name: "Get User",
          method: "GET",
          path: "/users/{id}",
          description: "Load a single user"
        }}
        versions={[
          {
            id: 1,
            endpointId: 7,
            version: "v1",
            changeSummary: "Initial release",
            snapshotJson: "{\"path\":\"/users/{id}\"}"
          }
        ]}
      />
    );

    expect(screen.getByDisplayValue("Get User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/users/{id}")).toBeInTheDocument();
    expect(screen.getByText("Request Parameters")).toBeInTheDocument();
    expect(screen.getByText("Versions")).toBeInTheDocument();
    expect(screen.getByText("Initial release")).toBeInTheDocument();
  });

  it("submits updated endpoint basics", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <EndpointEditor
        endpoint={{
          id: 7,
          groupId: 3,
          name: "Get User",
          method: "GET",
          path: "/users/{id}",
          description: "Load a single user"
        }}
        onSave={onSave}
        versions={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("Endpoint name"), { target: { value: "Get User Detail" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Load detailed user profile" } });
    fireEvent.click(screen.getByRole("button", { name: "Save endpoint" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        description: "Load detailed user profile",
        method: "GET",
        name: "Get User Detail",
        path: "/users/{id}"
      })
    );
  });
});
