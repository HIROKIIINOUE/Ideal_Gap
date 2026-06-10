jest.mock("@sentry/react-native", () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  init: jest.fn(),
  withScope: jest.fn((callback: (scope: any) => void) => {
    const scope = {
      setLevel: jest.fn(),
      setTag: jest.fn(),
      setFingerprint: jest.fn(),
      setContext: jest.fn(),
    };
    callback(scope);
  }),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

import React from "react";
import * as Sentry from "@sentry/react-native";
import {
  addSentryBreadcrumb,
  captureTaskTimerAnomaly,
  stripSensitiveDataFromEvent,
  shouldIgnoreSentryError,
} from "../lib/sentry";

describe("Sentry filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ignores configured minor cancellation errors", () => {
    expect(shouldIgnoreSentryError("AbortError: The operation was aborted")).toBe(true);
    expect(shouldIgnoreSentryError("Purchase was cancelled by user")).toBe(true);
    expect(shouldIgnoreSentryError("ERR_CANCELED")).toBe(true);
  });

  it("does not ignore unknown errors", () => {
    expect(shouldIgnoreSentryError("TypeError: undefined is not an object")).toBe(false);
  });

  it("strips email and auth-like headers from event", () => {
    const sanitized = stripSensitiveDataFromEvent({
      user: {
        id: "user-123",
        email: "user@example.com",
        username: "hiroki",
      },
      request: {
        headers: {
          authorization: "Bearer token",
          cookie: "session=abc",
          "x-api-key": "secret",
        },
      },
    });

    expect(sanitized.user).toEqual({ id: "user-123" });
    expect(sanitized.request?.headers).toEqual({
      authorization: "[Filtered]",
      cookie: "[Filtered]",
      "x-api-key": "[Filtered]",
    });
  });

  it("adds breadcrumbs without capturing events", () => {
    addSentryBreadcrumb("task_timer", "timer_started", {
      taskId: "task-1",
      status: "running",
    });

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: "task_timer",
      data: {
        status: "running",
        taskId: "task-1",
      },
      level: "info",
      message: "timer_started",
    });
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("deduplicates task timer anomaly reports within one app session", () => {
    captureTaskTimerAnomaly("unexpected_active_timer_unmount", {
      taskId: "task-1",
    });
    captureTaskTimerAnomaly("unexpected_active_timer_unmount", {
      taskId: "task-1",
    });

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Task timer anomaly: unexpected_active_timer_unmount",
    );
  });
});
