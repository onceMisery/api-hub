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

  it("saves parameter and response rows, creates versions, and deletes the endpoint", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onSaveParameters = vi.fn().mockResolvedValue(undefined);
    const onSaveResponses = vi.fn().mockResolvedValue(undefined);
    const onSaveVersion = vi.fn().mockResolvedValue(undefined);

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
        onDelete={onDelete}
        onSaveParameters={onSaveParameters}
        onSaveResponses={onSaveResponses}
        onSaveVersion={onSaveVersion}
        parameters={[]}
        responses={[]}
        versions={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add parameter row" }));
    fireEvent.change(screen.getByLabelText("Parameter 1 name"), { target: { value: "id" } });
    fireEvent.change(screen.getByLabelText("Parameter 1 type"), { target: { value: "string" } });
    fireEvent.click(screen.getByRole("button", { name: "Save parameters" }));

    await waitFor(() =>
      expect(onSaveParameters).toHaveBeenCalledWith([
        {
          dataType: "string",
          description: "",
          exampleValue: "",
          name: "id",
          required: false,
          sectionType: "query"
        }
      ])
    );

    fireEvent.click(screen.getByRole("button", { name: "Add response row" }));
    fireEvent.change(screen.getByLabelText("Response 1 name"), { target: { value: "userId" } });
    fireEvent.change(screen.getByLabelText("Response 1 type"), { target: { value: "string" } });
    fireEvent.click(screen.getByRole("button", { name: "Save responses" }));

    await waitFor(() =>
      expect(onSaveResponses).toHaveBeenCalledWith([
        {
          dataType: "string",
          description: "",
          exampleValue: "",
          httpStatusCode: 200,
          mediaType: "application/json",
          name: "userId",
          required: false
        }
      ])
    );

    fireEvent.change(screen.getByLabelText("Version label"), { target: { value: "v2" } });
    fireEvent.change(screen.getByLabelText("Version summary"), { target: { value: "Added editable schema" } });
    fireEvent.click(screen.getByRole("button", { name: "Save version snapshot" }));

    await waitFor(() =>
      expect(onSaveVersion).toHaveBeenCalledWith({
        changeSummary: "Added editable schema",
        version: "v2"
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete endpoint" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
  });
});
