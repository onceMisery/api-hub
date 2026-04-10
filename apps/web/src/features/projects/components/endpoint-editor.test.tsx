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

  it("shows structural diff items for removed and changed fields", async () => {
    render(
      <EndpointEditor
        endpoint={{
          id: 7,
          groupId: 3,
          name: "Get User Detail",
          method: "GET",
          path: "/users/{id}",
          description: "Load a single user with profile",
          mockEnabled: false
        }}
        projectId={1}
        parameters={[]}
        responses={[
          {
            id: 1,
            httpStatusCode: 200,
            mediaType: "application/json",
            name: "userId",
            dataType: "uuid",
            required: true,
            description: "Current user identifier",
            exampleValue: "u_2002",
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
                path: "/users/{id}",
                description: "Load a single user"
              },
              parameters: [
                {
                  sectionType: "query",
                  name: "expand",
                  dataType: "string",
                  required: false,
                  description: "Expand relations",
                  exampleValue: "team"
                }
              ],
              responses: [
                {
                  httpStatusCode: 200,
                  mediaType: "application/json",
                  name: "userId",
                  dataType: "string",
                  required: true,
                  description: "User identifier",
                  exampleValue: "u_1001"
                }
              ]
            })
          }
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText("Compare against version"), { target: { value: "1" } });

    expect(await screen.findByText("Changed endpoint name")).toBeInTheDocument();
    expect(screen.getByText("Get User -> Get User Detail")).toBeInTheDocument();
    expect(screen.getByText("Removed request parameter")).toBeInTheDocument();
    expect(screen.getByText("query.expand")).toBeInTheDocument();
    expect(screen.getByText("Changed response field type")).toBeInTheDocument();
    expect(screen.getByText("200 application/json userId: string -> uuid")).toBeInTheDocument();
    expect(screen.getByText("Changed response field description")).toBeInTheDocument();
    expect(screen.getByText("200 application/json userId: User identifier -> Current user identifier")).toBeInTheDocument();
    expect(screen.getByText("Changed response field example")).toBeInTheDocument();
    expect(screen.getByText("200 application/json userId: u_1001 -> u_2002")).toBeInTheDocument();
  });

  it("runs a draft mock simulation and renders the resolved result", async () => {
    const onSimulateMock = vi.fn().mockResolvedValue({
      source: "rule",
      matchedRuleName: "Unauthorized",
      matchedRulePriority: 100,
      explanations: ["Matched query mode=strict", "Matched header x-scenario=unauthorized"],
      statusCode: 401,
      mediaType: "application/json",
      body: "{\"error\":\"token expired\"}"
    });

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
        mockRules={[
          {
            id: 11,
            endpointId: 7,
            ruleName: "Unauthorized",
            priority: 100,
            enabled: true,
            queryConditions: [{ name: "mode", value: "strict" }],
            headerConditions: [{ name: "x-scenario", value: "unauthorized" }],
            statusCode: 401,
            mediaType: "application/json",
            body: "{\"error\":\"token expired\"}"
          }
        ]}
        onSimulateMock={onSimulateMock}
        versions={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("Simulator query samples"), { target: { value: "mode=strict" } });
    fireEvent.change(screen.getByLabelText("Simulator header samples"), { target: { value: "x-scenario=unauthorized" } });
    fireEvent.click(screen.getByRole("button", { name: "Run mock simulation" }));

    await waitFor(() =>
      expect(onSimulateMock).toHaveBeenCalledWith({
        draftRules: [
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
        ],
        draftResponses: [
          {
            dataType: "string",
            description: "User identifier",
            exampleValue: "u_1001",
            httpStatusCode: 200,
            mediaType: "application/json",
            name: "userId",
            required: true
          },
          {
            dataType: "integer",
            description: "Count",
            exampleValue: "",
            httpStatusCode: 200,
            mediaType: "application/json",
            name: "count",
            required: true
          }
        ],
        headerSamples: [{ name: "x-scenario", value: "unauthorized" }],
        querySamples: [{ name: "mode", value: "strict" }]
      })
    );

    expect(await screen.findByText("Unauthorized")).toBeInTheDocument();
    expect(screen.getByText("Matched header x-scenario=unauthorized")).toBeInTheDocument();
    const simulationBody = screen.getByText("Simulation Body").parentElement?.querySelector("pre");
    expect(simulationBody).toHaveTextContent('"error":"token expired"');
  });

  it("shows published runtime status and triggers mock publish", async () => {
    const onPublishMockRelease = vi.fn().mockResolvedValue(undefined);

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
        mockReleases={[
          {
            id: 21,
            endpointId: 7,
            releaseNo: 3,
            responseSnapshotJson: "[]",
            rulesSnapshotJson: "[]",
            createdAt: "2026-04-09T12:20:00Z"
          }
        ]}
        onPublishMockRelease={onPublishMockRelease}
        versions={[]}
      />
    );

    expect(screen.getByText("Published Runtime")).toBeInTheDocument();
    expect(screen.getAllByText("Release #3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/mock/1/users/{id}").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Publish mock" }));

    await waitFor(() => expect(onPublishMockRelease).toHaveBeenCalled());
  });

  it("shows published runtime snapshot summary and draft drift details", () => {
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
            name: "role",
            dataType: "string",
            required: true,
            description: "Role",
            exampleValue: "admin",
            sortOrder: 1
          }
        ]}
        mockRules={[
          {
            id: 11,
            endpointId: 7,
            ruleName: "Unauthorized",
            priority: 100,
            enabled: true,
            queryConditions: [{ name: "mode", value: "strict" }],
            headerConditions: [],
            statusCode: 401,
            mediaType: "application/json",
            body: "{\"error\":\"token expired\"}"
          }
        ]}
        mockReleases={[
          {
            id: 21,
            endpointId: 7,
            releaseNo: 3,
            responseSnapshotJson:
              "[{\"httpStatusCode\":200,\"mediaType\":\"application/json\",\"name\":\"userId\",\"dataType\":\"string\",\"required\":true,\"description\":\"\",\"exampleValue\":\"u_1001\"}]",
            rulesSnapshotJson: "[]",
            createdAt: "2026-04-09T12:20:00Z"
          }
        ]}
        versions={[]}
      />
    );

    expect(screen.getByText("Draft has unpublished mock changes.")).toBeInTheDocument();
    expect(screen.getByText("Published response fields")).toBeInTheDocument();
    expect(screen.getByText("1 field across 1 status group")).toBeInTheDocument();
    expect(screen.getAllByText("Published rules").length).toBeGreaterThan(0);
    expect(screen.getByText("0 enabled of 0 total")).toBeInTheDocument();
    expect(screen.getByText("Draft response fields")).toBeInTheDocument();
    expect(screen.getByText("2 fields across 1 status group")).toBeInTheDocument();
    expect(screen.getByText("Draft rules")).toBeInTheDocument();
    expect(screen.getByText("1 enabled of 1 total")).toBeInTheDocument();
    expect(screen.getByText("Draft response fields changed from 1 to 2.")).toBeInTheDocument();
    expect(screen.getByText("Draft enabled rules changed from 0 to 1.")).toBeInTheDocument();
  });

  it("shows published runtime response groups and rule breakdown", () => {
    render(
      <EndpointEditor
        endpoint={{
          id: 7,
          groupId: 3,
          name: "Get User",
          method: "GET",
          path: "/users/{id}",
          description: "Load",
          mockEnabled: true
        }}
        projectId={1}
        mockReleases={[
          {
            id: 21,
            endpointId: 7,
            releaseNo: 3,
            responseSnapshotJson:
              "[{\"httpStatusCode\":200,\"mediaType\":\"application/json\",\"name\":\"userId\",\"dataType\":\"string\",\"required\":true,\"description\":\"\",\"exampleValue\":\"u_1001\"},{\"httpStatusCode\":200,\"mediaType\":\"application/json\",\"name\":\"role\",\"dataType\":\"string\",\"required\":true,\"description\":\"\",\"exampleValue\":\"admin\"}]",
            rulesSnapshotJson:
              "[{\"ruleName\":\"Unauthorized\",\"priority\":100,\"enabled\":true,\"queryConditions\":[{\"name\":\"mode\",\"value\":\"strict\"}],\"headerConditions\":[{\"name\":\"x-scenario\",\"value\":\"unauthorized\"}],\"statusCode\":401,\"mediaType\":\"application/json\",\"body\":\"{\\\"error\\\":\\\"token expired\\\"}\"}]",
            createdAt: "2026-04-09T12:20:00Z"
          }
        ]}
        versions={[]}
      />
    );

    expect(screen.getByText("Published response groups")).toBeInTheDocument();
    expect(screen.getByText("200 application/json")).toBeInTheDocument();
    expect(screen.getByText("2 fields")).toBeInTheDocument();
    expect(screen.getAllByText("Published rules").length).toBeGreaterThan(0);
    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    expect(screen.getByText("Priority 100")).toBeInTheDocument();
    expect(screen.getByText("query mode=strict")).toBeInTheDocument();
    expect(screen.getByText("header x-scenario=unauthorized")).toBeInTheDocument();
  });

  it("shows unpublished runtime state when no release exists", () => {
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
        versions={[]}
      />
    );

    expect(screen.getByText("No published release yet.")).toBeInTheDocument();
  });

  it("shows mock rule match summary and formatted rule response preview", () => {
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
        mockRules={[
          {
            id: 11,
            endpointId: 7,
            ruleName: "Unauthorized",
            priority: 100,
            enabled: true,
            queryConditions: [{ name: "mode", value: "strict" }],
            headerConditions: [{ name: "x-scenario", value: "unauthorized" }],
            statusCode: 401,
            mediaType: "application/json",
            body: "{\"error\":\"token expired\"}"
          }
        ]}
        versions={[]}
      />
    );

    expect(screen.getByText("Match summary")).toBeInTheDocument();
    expect(screen.getByText("query mode=strict")).toBeInTheDocument();
    expect(screen.getByText("header x-scenario=unauthorized")).toBeInTheDocument();
    expect(screen.getByText("Rule response preview")).toBeInTheDocument();

    const previewBlocks = screen.getAllByText("Rule response preview");
    const previewBody = previewBlocks[0].parentElement?.querySelector("pre");
    expect(previewBody).toHaveTextContent('"error": "token expired"');
  });

});
