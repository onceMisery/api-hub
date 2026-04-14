import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { EndpointVersionPanel } from "./endpoint-version-panel";

describe("EndpointVersionPanel", () => {
  it("renders structured version diff summary cards and snapshot overview", () => {
    render(
      <EndpointVersionPanel
        compareVersion={{
          id: 1,
          endpointId: 7,
          version: "v1",
          changeSummary: "Legacy",
          snapshotJson: "{}"
        }}
        compareVersionId="1"
        diffResult={{
          summary: {
            totalChanges: 5,
            endpointChanges: 2,
            parameterChanges: 1,
            responseChanges: 2,
            addedChanges: 1,
            removedChanges: 1,
            changedChanges: 3
          },
          sections: [
            {
              id: "endpoint",
              label: "Endpoint basics",
              totalChanges: 2,
              addedChanges: 0,
              removedChanges: 0,
              changedChanges: 2,
              items: [
                {
                  id: "endpoint.name",
                  sectionId: "endpoint",
                  kind: "changed",
                  title: "Changed endpoint name",
                  detail: "Get User -> Get User Detail"
                }
              ]
            }
          ],
          snapshotOverview: [
            { label: "Method", previousValue: "GET", currentValue: "POST" },
            { label: "Request params", previousValue: "1 field", currentValue: "3 fields" }
          ]
        }}
        isRestoring={false}
        latestSnapshot="{}"
        onCompareVersionChange={vi.fn()}
        onVersionFieldChange={vi.fn()}
        restoreError={null}
        restoreMessage={null}
        versionForm={{ version: "", changeSummary: "" }}
        versionMessage={null}
        versions={[]}
      />
    );

    expect(screen.getAllByText("5 total changes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Endpoint basics").length).toBeGreaterThan(0);
    expect(screen.getByText("Selected snapshot vs current draft")).toBeInTheDocument();
    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("POST")).toBeInTheDocument();
  });

  it("filters diff sections by selected contract area", () => {
    render(
      <EndpointVersionPanel
        compareVersion={{
          id: 1,
          endpointId: 7,
          version: "v1",
          changeSummary: "Legacy",
          snapshotJson: "{}"
        }}
        compareVersionId="1"
        diffResult={{
          summary: {
            totalChanges: 4,
            endpointChanges: 1,
            parameterChanges: 1,
            responseChanges: 2,
            addedChanges: 1,
            removedChanges: 1,
            changedChanges: 2
          },
          sections: [
            {
              id: "endpoint",
              label: "Endpoint basics",
              totalChanges: 1,
              addedChanges: 0,
              removedChanges: 0,
              changedChanges: 1,
              items: [
                {
                  id: "endpoint.name",
                  sectionId: "endpoint",
                  kind: "changed",
                  title: "Changed endpoint name",
                  detail: "Get User -> Get User Detail"
                }
              ]
            },
            {
              id: "parameters",
              label: "Request parameters",
              totalChanges: 1,
              addedChanges: 1,
              removedChanges: 0,
              changedChanges: 0,
              items: [
                {
                  id: "parameter.query.expand",
                  sectionId: "parameters",
                  kind: "added",
                  title: "Added request parameter",
                  detail: "query.expand"
                }
              ]
            },
            {
              id: "responses",
              label: "Responses",
              totalChanges: 2,
              addedChanges: 0,
              removedChanges: 0,
              changedChanges: 2,
              items: [
                {
                  id: "response.200.userId.type",
                  sectionId: "responses",
                  kind: "changed",
                  title: "Changed response field type",
                  detail: "200 application/json userId: string -> uuid"
                }
              ]
            }
          ],
          snapshotOverview: [
            { label: "Method", previousValue: "GET", currentValue: "POST" }
          ]
        }}
        isRestoring={false}
        latestSnapshot="{}"
        onCompareVersionChange={vi.fn()}
        onVersionFieldChange={vi.fn()}
        restoreError={null}
        restoreMessage={null}
        versionForm={{ version: "", changeSummary: "" }}
        versionMessage={null}
        versions={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Responses/ }));

    expect(screen.queryByText("Changed endpoint name")).not.toBeInTheDocument();
    expect(screen.queryByText("Added request parameter")).not.toBeInTheDocument();
    expect(screen.getByText("Changed response field type")).toBeInTheDocument();
  });
});
