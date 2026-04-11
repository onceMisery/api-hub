import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { WorkbenchNotificationCenter, useWorkbenchNotifications } from "./workbench-notification-center";

describe("WorkbenchNotificationCenter", () => {
  it("renders notifications, supports manual dismiss, and auto-clears expired items", () => {
    vi.useFakeTimers();

    function Harness() {
      const { notifications, notify, dismissNotification } = useWorkbenchNotifications({ durationMs: 1200 });

      return (
        <>
          <button
            onClick={() =>
              notify({
                tone: "success",
                title: "Environment created",
                detail: "Staging is ready."
              })
            }
            type="button"
          >
            Push notification
          </button>
          <WorkbenchNotificationCenter notifications={notifications} onDismiss={dismissNotification} />
        </>
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Push notification" }));
    expect(screen.getByText("Environment created")).toBeInTheDocument();
    expect(screen.getByText("Staging is ready.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification Environment created" }));
    expect(screen.queryByText("Environment created")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Push notification" }));
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.queryByText("Environment created")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
