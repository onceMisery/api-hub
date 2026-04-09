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
          description: "Load a single user",
          mockEnabled: true
        }}
        projectId={1}
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
    expect(screen.getAllByText("/mock/1/users/{id}")).toHaveLength(2);
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
          description: "Load a single user",
          mockEnabled: false
        }}
        projectId={1}
        onSave={onSave}
        versions={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("Endpoint name"), { target: { value: "Get User Detail" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Load detailed user profile" } });
    fireEvent.click(screen.getByLabelText("Enable mock"));
    fireEvent.click(screen.getByRole("button", { name: "Save endpoint" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        description: "Load detailed user profile",
        method: "GET",
        mockEnabled: true,
        name: "Get User Detail",
        path: "/users/{id}"
      })
    );
  });

  it("saves parameter and response rows, creates versions, and deletes the endpoint", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onSaveMockRules = vi.fn().mockResolvedValue(undefined);
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
          description: "Load a single user",
          mockEnabled: false
        }}
        projectId={1}
        onDelete={onDelete}
        onSaveMockRules={onSaveMockRules}
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

    fireEvent.click(screen.getByRole("button", { name: "Add mock rule" }));
    fireEvent.change(screen.getByLabelText("Mock rule 1 name"), { target: { value: "Unauthorized" } });
    fireEvent.change(screen.getByLabelText("Mock rule 1 query conditions"), { target: { value: "mode=strict" } });
    fireEvent.change(screen.getByLabelText("Mock rule 1 header conditions"), { target: { value: "x-scenario=unauthorized" } });
    fireEvent.change(screen.getByLabelText("Mock rule 1 response status"), { target: { value: "401" } });
    fireEvent.change(screen.getByLabelText("Mock rule 1 body"), { target: { value: "{\"error\":\"token expired\"}" } });
    fireEvent.click(screen.getByRole("button", { name: "Save mock rules" }));

    await waitFor(() =>
      expect(onSaveMockRules).toHaveBeenCalledWith([
        {
          body: "{\"error\":\"token expired\"}",
          enabled: true,
          headerConditions: [{ name: "x-scenario", value: "unauthorized" }],
          mediaType: "application/json",
          priority: 100,
          queryConditions: [{ name: "mode", value: "strict" }],
          ruleName: "Unauthorized",
          statusCode: 401
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

  it("shows a basic diff against a selected version snapshot", async () => {
    render(
      <EndpointEditor
        endpoint={{
          id: 7,
          groupId: 3,
          name: "Get User",
          method: "GET",
          path: "/users/{id}",
          description: "Load a single user",
          mockEnabled: false
        }}
        projectId={1}
        parameters={[
          {
            id: 1,
            sectionType: "query",
            name: "id",
            dataType: "string",
            required: true,
            description: "User id",
            exampleValue: "1001",
            sortOrder: 0
          }
        ]}
        responses={[
          {
            id: 1,
            httpStatusCode: 200,
            mediaType: "application/json",
            name: "userId",
            dataType: "string",
            required: true,
            description: "User identifier",
            exampleValue: "1001",
            sortOrder: 0
          }
        ]}
        versions={[
          {
            id: 1,
            endpointId: 7,
            version: "v1",
            changeSummary: "Initial release",
            snapshotJson: JSON.stringify({
              endpoint: {
                name: "Get User",
                method: "GET",
                path: "/users",
                description: "Load a user"
              },
              parameters: [],
              responses: []
            })
          }
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText("Compare against version"), { target: { value: "1" } });

    expect(await screen.findByText("Changed endpoint path")).toBeInTheDocument();
    expect(screen.getByText("/users -> /users/{id}")).toBeInTheDocument();
    expect(screen.getByText("Added request parameter")).toBeInTheDocument();
    expect(screen.getByText("query.id")).toBeInTheDocument();
    expect(screen.getByText("Added response field")).toBeInTheDocument();
    expect(screen.getByText("200 application/json userId")).toBeInTheDocument();
  });

  it("shows a live mock preview from response examples and fallback defaults", async () => {
    render(
      <EndpointEditor
        endpoint={{
          id: 7,
          groupId: 3,
          name: "Get User",
          method: "GET",
          path: "/users/{id}",
          description: "Load a single user",
          mockEnabled: true
        }}
        projectId={1}
        responses={[
          {
            id: 1,
            httpStatusCode: 200,
            mediaType: "application/json",
            name: "userId",
            dataType: "string",
            required: true,
            description: "User identifier",
            exampleValue: "u_1001",
            sortOrder: 0
          },
          {
            id: 2,
            httpStatusCode: 200,
            mediaType: "application/json",
            name: "count",
            dataType: "integer",
            required: true,
            description: "Count",
            exampleValue: "",
            sortOrder: 1
          }
        ]}
        versions={[]}
      />
    );

    expect(screen.getByText("Mock Preview")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("application/json")).toBeInTheDocument();
    const previewBody = screen.getByText("Preview Body").parentElement?.querySelector("pre");
    expect(previewBody).toHaveTextContent('"userId": "u_1001"');
    expect(previewBody).toHaveTextContent('"count": 0');

    fireEvent.change(screen.getByLabelText("Response 1 example"), { target: { value: "u_2002" } });

    await waitFor(() => {
      expect(previewBody).toHaveTextContent('"userId": "u_2002"');
    });
  });

  it("switches mock preview between response status groups", async () => {
    render(
      <EndpointEditor
        endpoint={{
          id: 7,
          groupId: 3,
          name: "Get User",
          method: "GET",
          path: "/users/{id}",
          description: "Load a single user",
          mockEnabled: true
        }}
        projectId={1}
        responses={[
          {
            id: 1,
            httpStatusCode: 200,
            mediaType: "application/json",
            name: "userId",
            dataType: "string",
            required: true,
            description: "User identifier",
            exampleValue: "u_1001",
            sortOrder: 0
          },
          {
            id: 2,
            httpStatusCode: 400,
            mediaType: "application/json",
            name: "error",
            dataType: "string",
            required: true,
            description: "Error message",
            exampleValue: "bad request",
            sortOrder: 0
          }
        ]}
        versions={[]}
      />
    );

    const previewBody = screen.getByText("Preview Body").parentElement?.querySelector("pre");
    expect(previewBody).toHaveTextContent('"userId": "u_1001"');

    const previewStatus = screen.getByLabelText("Preview status");
    fireEvent.change(previewStatus, { target: { value: "400:application/json" } });

    await waitFor(() => {
      expect(previewStatus).toHaveValue("400:application/json");
      expect(previewBody).toHaveTextContent('"error": "bad request"');
    });
  });

  it("switches mock preview between current draft and latest saved version", async () => {
    render(
      <EndpointEditor
        endpoint={{
          id: 7,
          groupId: 3,
          name: "Get User",
          method: "GET",
          path: "/users/{id}",
          description: "Load a single user",
          mockEnabled: true
        }}
        projectId={1}
        responses={[
          {
            id: 1,
            httpStatusCode: 200,
            mediaType: "application/json",
            name: "userId",
            dataType: "string",
            required: true,
            description: "User identifier",
            exampleValue: "draft-user",
            sortOrder: 0
          }
        ]}
        versions={[
          {
            id: 2,
            endpointId: 7,
            version: "v2",
            changeSummary: "Saved snapshot",
            snapshotJson: JSON.stringify({
              endpoint: {
                name: "Get User",
                method: "GET",
                path: "/users/{id}",
                description: "Load a single user"
              },
              parameters: [],
              responses: [
                {
                  httpStatusCode: 400,
                  mediaType: "application/json",
                  name: "error",
                  dataType: "string",
                  required: true,
                  description: "Error message",
                  exampleValue: "saved-error"
                }
              ]
            })
          }
        ]}
      />
    );

    const previewBody = screen.getByText("Preview Body").parentElement?.querySelector("pre");
    expect(previewBody).toHaveTextContent('"userId": "draft-user"');

    fireEvent.change(screen.getByLabelText("Preview source"), { target: { value: "latest-version" } });

    await waitFor(() => {
      expect(screen.getByLabelText("Preview source")).toHaveValue("latest-version");
      expect(previewBody).toHaveTextContent('"error": "saved-error"');
    });
  });
});
