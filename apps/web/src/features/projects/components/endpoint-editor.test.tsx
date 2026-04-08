import React from "react";
import { render, screen } from "@testing-library/react";

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

    expect(screen.getByText("Get User")).toBeInTheDocument();
    expect(screen.getByText("/users/{id}")).toBeInTheDocument();
    expect(screen.getByText("Request Parameters")).toBeInTheDocument();
    expect(screen.getByText("Versions")).toBeInTheDocument();
    expect(screen.getByText("Initial release")).toBeInTheDocument();
  });
});
