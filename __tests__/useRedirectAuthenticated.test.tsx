import { act, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import { useRedirectAuthenticated } from "../hooks/useRedirectAuthenticated";
import { supabase } from "../lib/supabaseClient";
import { getAccessStateForUser } from "../lib/subscription";
import { loadPersistedTaskTimerSession } from "../lib/taskTimerSession";

const mockReplace = jest.fn();
const mockUnsubscribe = jest.fn();
let authStateCallback:
  | ((event: string, session: { user?: { id?: string } } | null) => void)
  | null = null;

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    router: {
      replace: (...args: unknown[]) => mockReplace(...args),
    },
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };
      }),
    },
  },
}));

jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: jest.fn(),
}));

jest.mock("../lib/taskTimerSession", () => ({
  loadPersistedTaskTimerSession: jest.fn(),
}));

jest.mock("../lib/sentry", () => ({
  addSentryBreadcrumb: jest.fn(),
}));

const TestScreen = () => {
  useRedirectAuthenticated();
  return <Text>test</Text>;
};

describe("useRedirectAuthenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (getAccessStateForUser as jest.Mock).mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      resolution: "entitled",
      subscription: { status: "active" },
      accessOverride: null,
    });
    (loadPersistedTaskTimerSession as jest.Mock).mockResolvedValue(null);
  });

  test("redirects an authenticated accessible user to dashboard on focused mount", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    render(<TestScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
  });

  test("prioritizes a persisted task timer over dashboard", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    (loadPersistedTaskTimerSession as jest.Mock).mockResolvedValue({
      version: 1,
      taskId: "task-1",
      title: "Write report",
      yearlyGoalId: "year-1",
      loggedBaseline: 25,
      inputSeconds: 300,
      remainingSeconds: 120,
      expectedEndAt: Date.now() + 120_000,
      completionElapsedSeconds: null,
      status: "running",
      savedAt: Date.now(),
    });

    render(<TestScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/task-timer"));
    expect(mockReplace).not.toHaveBeenCalledWith("/dashboard");
  });

  test("does not redirect on Supabase token refresh events", async () => {
    render(<TestScreen />);

    await waitFor(() => expect(supabase.auth.onAuthStateChange).toHaveBeenCalled());
    await act(async () => {
      authStateCallback?.("TOKEN_REFRESHED", { user: { id: "user-1" } });
      await Promise.resolve();
    });

    expect(getAccessStateForUser).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("redirects on explicit sign-in auth events", async () => {
    render(<TestScreen />);

    await waitFor(() => expect(supabase.auth.onAuthStateChange).toHaveBeenCalled());
    await act(async () => {
      authStateCallback?.("SIGNED_IN", { user: { id: "user-1" } });
      await Promise.resolve();
    });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
  });

  test("redirects authenticated users to dashboard when access is temporarily unknown", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    (getAccessStateForUser as jest.Mock).mockResolvedValueOnce({
      canAccessApp: true,
      accessMode: "paid",
      resolution: "unknown",
      unknownReason: "subscription_fetch_failed",
      subscription: null,
      accessOverride: null,
      source: "last_known_cache",
    });

    render(<TestScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
    expect(mockReplace).not.toHaveBeenCalledWith("/purchases");
  });

  test("unsubscribes auth listener when the focused screen unmounts", async () => {
    const screen = render(<TestScreen />);

    await waitFor(() => expect(supabase.auth.onAuthStateChange).toHaveBeenCalled());
    screen.unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
