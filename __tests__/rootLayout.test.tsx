import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, waitFor } from "@testing-library/react-native";
import React from "react";
import RootLayout, {
  resetRootLayoutInitialNavigationStateForTests,
} from "../app/_layout";
import { TASK_TIMER_SESSION_STORAGE_KEY } from "../lib/taskTimerSession";
import { supabase } from "../lib/supabaseClient";
import { getAccessStateForUser } from "../lib/subscription";
import { restoreSession } from "../lib/authBootstrap";

jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    Stack: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-linking", () => ({
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  parse: jest.fn(() => ({ queryParams: {} })),
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../components/OfflineBanner", () => () => null);
jest.mock("../components/SplashOverlay", () => () => null);

jest.mock("../providers/FocusMusicProvider", () => ({
  FocusMusicProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../providers/FunPlanProvider", () => ({
  FunPlanProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../providers/LanguageProvider", () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../providers/OfflineProvider", () => ({
  OfflineProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../providers/RevenueCatProvider", () => ({
  RevenueCatProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../providers/TimerAlarmPreferenceProvider", () => ({
  TimerAlarmPreferenceProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../lib/authBootstrap", () => ({
  restoreSession: jest.fn().mockResolvedValue({ session: { user: { id: "user-1" } } }),
}));

jest.mock("../lib/subscription", () => ({
  ensureSignupAwaitSubscription: jest.fn(),
  getAccessStateForUser: jest.fn().mockResolvedValue({ canAccessApp: true }),
}));

jest.mock("../lib/sentry", () => ({
  addSentryBreadcrumb: jest.fn(),
  captureExpoAudioError: jest.fn(),
  captureTaskTimerAnomaly: jest.fn(),
  initSentry: jest.fn(),
  SentryErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

describe("RootLayout", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    resetRootLayoutInitialNavigationStateForTests();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    (getAccessStateForUser as jest.Mock).mockResolvedValue({
      canAccessApp: true,
    });
    (restoreSession as jest.Mock).mockResolvedValue({
      session: { user: { id: "user-1" } },
    });
  });

  test("restores task timer route before dashboard when a persisted timer exists", async () => {
    const router = require("expo-router").router;

    await AsyncStorage.setItem(
      TASK_TIMER_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        taskId: "task-1",
        title: "Write report",
        yearlyGoalId: "year-1",
        loggedBaseline: 25,
        inputSeconds: 300,
        remainingSeconds: 300,
        expectedEndAt: Date.now() + 300_000,
        completionElapsedSeconds: null,
        status: "running",
        savedAt: Date.now(),
      }),
    );

    render(<RootLayout />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/task-timer"));
  });

  test("does not replace the initial route again after root layout remounts in the same session", async () => {
    const router = require("expo-router").router;

    const firstRender = render(<RootLayout />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
    expect(router.replace).toHaveBeenCalledTimes(1);

    firstRender.unmount();
    render(<RootLayout />);

    await waitFor(() => expect(restoreSession).toHaveBeenCalledTimes(2));
    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});
