import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import * as Notifications from "expo-notifications";
import { Alert, AppState, AppStateStatus, Linking, Vibration } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import TaskTimerScreen from "../components/feature/TaskTimerScreen";
import i18n from "../i18n";
import { FocusMusicProvider } from "../providers/FocusMusicProvider";
import * as FocusMusicProviderModule from "../providers/FocusMusicProvider";
import { TimerAlarmPreferenceProvider } from "../providers/TimerAlarmPreferenceProvider";
import { FOCUS_MUSIC_INSTALLED_KEY } from "../lib/focus-music/constants";
import { FocusMusicTrack, InstalledFocusTrack } from "../types/focus-music";
import { colors } from "../constants/theme";
import { TIMER_ALARM_ENABLED_STORAGE_KEY } from "../providers/TimerAlarmPreferenceProvider";
import { supabase } from "../lib/supabaseClient";
import {
  TASK_TIMER_SESSION_STORAGE_KEY,
} from "../lib/taskTimerSession";

jest.useFakeTimers();

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const MockIcon = ({ name, testID }: { name?: string; testID?: string }) => (
    <Text testID={testID}>{name}</Text>
  );
  MockIcon.displayName = "MockMaterialCommunityIcons";
  return { MaterialCommunityIcons: MockIcon };
});

jest.mock("expo-linear-gradient", () => {
  const MockLinearGradient = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockLinearGradient.displayName = "MockLinearGradient";
  return { LinearGradient: MockLinearGradient };
});

const mockCatalog: FocusMusicTrack[] = [
  {
    id: "track-1",
    title: "Deep Focus",
    bucket: "focus-music",
    storagePath: "tracks/deep-focus.mp3",
    durationSeconds: 150,
    musicCategories: ["study"],
  },
];

const mockFetchCatalog = jest.fn(async () => mockCatalog);
const mockSignedUrl = jest.fn(
  async (_trackId: string) => "https://example.com/focus.mp3",
);

jest.mock("../lib/focus-music/catalog", () => ({
  fetchFocusMusicCatalog: () => mockFetchCatalog(),
}));

jest.mock("../lib/focus-music/signedUrl", () => ({
  createFocusMusicSignedUrl: (trackId: string) => mockSignedUrl(trackId),
}));

jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn().mockResolvedValue({
    type: "wifi",
    isConnected: true,
    isInternetReachable: true,
  }),
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file://test/",
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  createDownloadResumable: jest.fn().mockReturnValue({
    downloadAsync: jest
      .fn()
      .mockResolvedValue({ uri: "file://test/focus-music/track-1.mp3" }),
  }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockAudioPlayers: Array<{
  play: jest.Mock;
  pause: jest.Mock;
  replace: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
}> = [];
const mockAnyAudioPlay = jest.fn();
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-audio", () => ({
  useAudioPlayer: () => {
    const React = require("react");
    const ref = React.useRef(null as any);
    if (!ref.current) {
      ref.current = {
        loop: false,
        playing: false,
        paused: false,
        isLoaded: true,
        isBuffering: false,
        currentTime: 0,
        duration: 10,
        volume: 1,
        play: jest.fn(() => mockAnyAudioPlay()),
        pause: jest.fn(),
        replace: jest.fn(),
        seekTo: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn(),
      };
      mockAudioPlayers.push(ref.current);
    }
    return ref.current;
  },
  useAudioPlayerStatus: () => ({
    playing: false,
    currentTime: 0,
    duration: 0,
  }),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
}));

jest.mock("../lib/sentry", () => ({
  addSentryBreadcrumb: jest.fn(),
  captureTaskTimerAnomaly: jest.fn(),
  captureExpoAudioError: jest.fn(),
  captureMusicDownloadError: jest.fn(),
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    from: jest.fn(),
  },
}));

jest.mock("../lib/api/supabase/timeTracking/updateAccumulatedTimes", () => ({
  updateAccumulatedTimes: jest.fn().mockResolvedValue({ delta: 0, newLoggedMinutes: 0 }),
}));

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: "timeInterval",
    DATE: "date",
  },
  IosAuthorizationStatus: {
    PROVISIONAL: 2,
  },
  AndroidImportance: {
    MAX: 5,
  },
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
}));

jest.mock("react-native-circular-progress", () => {
  const React = require("react");
  const { View } = require("react-native");
  const AnimatedCircularProgress = ({ children }: any) => (
    <View testID="mock-circular-progress">{typeof children === "function" ? children(0) : children}</View>
  );
  return { AnimatedCircularProgress };
});

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Mock = (props: any) => <View {...props} />;
  return { __esModule: true, default: Mock, Svg: Mock, Circle: Mock };
});

const renderScreen = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <TimerAlarmPreferenceProvider>
        <FocusMusicProvider>
          <TaskTimerScreen />
        </FocusMusicProvider>
      </TimerAlarmPreferenceProvider>
    </I18nextProvider>,
  );

const buildFocusMusicStub = (
  overrides: Partial<ReturnType<typeof FocusMusicProviderModule.useFocusMusic>> = {},
) => ({
  catalog: [],
  installedTracks: [],
  installedIds: [],
  selectedTrackId: null,
  selectedTrack: null,
  maxInstalled: 0,
  monthlyDownloadLimit: 0,
  monthlyDownloadRemaining: null,
  downloadResetAt: null,
  canInstall: false,
  isInstalling: jest.fn(() => false),
  isDownloadInProgress: false,
  isLoadingCatalog: false,
  getInstallProgress: jest.fn(() => null),
  installTrack: jest.fn(),
  removeTrack: jest.fn(),
  selectTrack: jest.fn(),
  isInstalled: jest.fn(() => false),
  playSelected: jest.fn().mockResolvedValue(false),
  pause: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  refreshCatalog: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockGetPermissionsAsync = Notifications.getPermissionsAsync as jest.MockedFunction<
  typeof Notifications.getPermissionsAsync
>;
const mockRequestPermissionsAsync = Notifications.requestPermissionsAsync as jest.MockedFunction<
  typeof Notifications.requestPermissionsAsync
>;
const mockScheduleNotificationAsync =
  Notifications.scheduleNotificationAsync as jest.MockedFunction<
    typeof Notifications.scheduleNotificationAsync
  >;
const mockCancelScheduledNotificationAsync =
  Notifications.cancelScheduledNotificationAsync as jest.MockedFunction<
    typeof Notifications.cancelScheduledNotificationAsync
  >;
const mockNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;
const mockSupabaseFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
const mockGetSession = supabase.auth.getSession as jest.MockedFunction<
  typeof supabase.auth.getSession
>;
const mockOpenSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
const mockVibrationVibrate = jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
const mockVibrationCancel = jest.spyOn(Vibration, "cancel").mockImplementation(() => {});

describe("TaskTimerScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockAudioPlayers.length = 0;
    mockAnyAudioPlay.mockClear();
    mockSetAudioModeAsync.mockClear();
    mockGetSession.mockResolvedValue({ data: { session: null } } as any);
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
      details: null,
    } as any);
    mockGetPermissionsAsync.mockResolvedValue({
      status: Notifications.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);
    mockRequestPermissionsAsync.mockResolvedValue({
      status: Notifications.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);
    mockScheduleNotificationAsync.mockResolvedValue("timer-notification-id");
    mockCancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockSupabaseFrom.mockReset();
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "weekly_tasks") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    accumulated_time_week: 25,
                    yearly_goal_id: "year-1",
                    next_start_point: "Resume here",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  const getAlarmPlayer = () => mockAudioPlayers[mockAudioPlayers.length - 1];

  test("shows default layout with zero duration", () => {
    const { getAllByText, getByText, getByTestId } = renderScreen();

    expect(getAllByText("Task timer")[0]).toBeTruthy();
    expect(getByText("Start focus")).toBeTruthy();
    expect(getByTestId("timer-duration")).toHaveTextContent("0:00 / 0:00");
  });

  test("updates duration when preset buttons are pressed", () => {
    const { getByText, getByTestId } = renderScreen();

    fireEvent.press(getByText("+10m"));

    expect(getByTestId("timer-duration")).toHaveTextContent("10:00 / 10:00");
  });

  test("keeps preset buttons as a 3-column grid", () => {
    const { getByTestId } = renderScreen();

    expect(getByTestId("timer-preset-add5")).toHaveStyle({ flexBasis: "31%" });
    expect(getByTestId("timer-preset-add10")).toHaveStyle({ flexBasis: "31%" });
    expect(getByTestId("timer-preset-clear")).toHaveStyle({ flexBasis: "31%" });
  });

  test("hides start button when timer is running", async () => {
    const { getByText, getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    await waitFor(() => expect(queryByTestId("start-button")).toBeNull());
    expect(getByText("Pause")).toBeTruthy();
  });

  test("uses timer icons for pause and resume", async () => {
    const { getByText, getByTestId } = renderScreen();

    expect(getByTestId("pause-resume-icon")).toHaveTextContent("timer-outline");

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    await waitFor(() =>
      expect(getByTestId("pause-resume-icon")).toHaveTextContent("timer-off-outline"),
    );
  });

  test("keeps full progress after resumed timer completes on app return", async () => {
    let now = 0;
    let appStateListener: ((state: AppStateStatus) => void) | null = null;
    let cleanup = () => { };
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
    const appStateSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() } as any;
      });

    try {
      const { getByText, getByTestId, queryByTestId, unmount } = renderScreen();
      cleanup = unmount;

      fireEvent.press(getByText("+5m"));
      fireEvent.press(getByTestId("start-button"));

      await waitFor(() =>
        expect(queryByTestId("start-button")).toBeNull(),
      );

      now = 2 * 60 * 1000;
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 1000);
      });

      expect(getByTestId("timer-duration")).toHaveTextContent("3:00 / 5:00");

      fireEvent.press(getByText("Pause"));

      now = 2 * 60 * 1000;
      fireEvent.press(getByText("Resume"));

      now = 5 * 60 * 1000;
      act(() => {
        appStateListener?.("active");
      });

      await waitFor(() => expect(getByText("Review before saving")).toBeTruthy());
      expect(getByText("5:00")).toBeTruthy();

      fireEvent.press(getByText("Cancel"));

      expect(queryByTestId("completion-modal")).toBeNull();
      expect(getByTestId("timer-duration")).toHaveTextContent("0:00 / 5:00");
    } finally {
      cleanup();
      dateNowSpy.mockRestore();
      appStateSpy.mockRestore();
    }
  });

  test("adds preset time after countdown completion without resetting finished progress", async () => {
    const { getByText, getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    await waitFor(() => expect(queryByTestId("start-button")).toBeNull());

    act(() => {
      jest.advanceTimersByTime(300_000);
    });

    await waitFor(() => expect(getByText("Review before saving")).toBeTruthy());
    fireEvent.press(getByText("Cancel"));

    expect(getByTestId("timer-duration")).toHaveTextContent("0:00 / 5:00");

    fireEvent.press(getByText("+5m"));

    expect(getByTestId("timer-duration")).toHaveTextContent("5:00 / 10:00");

    fireEvent.press(getByTestId("start-button"));

    await waitFor(() => expect(queryByTestId("start-button")).toBeNull());

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    await waitFor(() =>
      expect(getByTestId("timer-duration")).toHaveTextContent("4:00 / 10:00"),
    );
  });

  test("keeps countdown display aligned with endAt even when JS timer ticks lag behind wall clock", async () => {
    let now = 0;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);

    try {
      const { getByText, getByTestId, queryByTestId } = renderScreen();

      fireEvent.press(getByText("+5m"));
      fireEvent.press(getByTestId("start-button"));

      await waitFor(() => expect(queryByTestId("start-button")).toBeNull());

      now = 11_000;
      act(() => {
        jest.advanceTimersByTime(1_000);
      });

      await waitFor(() =>
        expect(getByTestId("timer-duration")).toHaveTextContent("4:49 / 5:00"),
      );
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  test("schedules timer notification with default sound", async () => {
    const { getByText, getByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    await waitFor(() => expect(mockScheduleNotificationAsync).toHaveBeenCalled());
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "Timer finished",
          body: "Your session is complete.",
          sound: "default",
        }),
      }),
    );
  });

  test("opens music modal and selects a track", async () => {
    await AsyncStorage.setItem(
      FOCUS_MUSIC_INSTALLED_KEY,
      JSON.stringify([
        {
          trackId: "track-1",
          localPath: "file://test/focus-music/track-1.mp3",
          downloadedAt: new Date().toISOString(),
        },
      ]),
    );

    const { getByTestId, getByText } = renderScreen();

    await waitFor(() => expect(getByText("Deep Focus selected")).toBeTruthy());

    fireEvent.press(getByTestId("music-select-button"));

    expect(getByText("Pick focus music")).toBeTruthy();

    fireEvent.press(getByText("Deep Focus"));

    expect(getByText("Deep Focus selected")).toBeTruthy();
  });

  test("shows notification popup when notifications stay denied", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockGetPermissionsAsync.mockResolvedValueOnce({
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);
    mockRequestPermissionsAsync.mockResolvedValueOnce({
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);

    const { getByText, getByTestId, queryByText } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Notification is disabled. Enable it to receive the notification when the timer is done.",
        undefined,
        [
          { text: "Continue without notification", onPress: expect.any(Function) },
          { text: "Open settings", onPress: expect.any(Function) },
          { text: "Don't show again", onPress: expect.any(Function) },
        ],
      ),
    );
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(getByTestId("start-button")).toBeTruthy();
    expect(queryByText("Pause")).toBeNull();
    alertSpy.mockRestore();
  });

  test("opens device settings from notification popup when start is pressed", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockGetPermissionsAsync.mockResolvedValueOnce({
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);
    mockRequestPermissionsAsync.mockResolvedValueOnce({
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);

    const { getByText, getByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const buttons = alertSpy.mock.calls[0]?.[2] as Array<{ onPress?: () => void }>;
    await act(async () => {
      buttons[1]?.onPress?.();
    });

    await waitFor(() => expect(mockOpenSettings).toHaveBeenCalled());
    alertSpy.mockRestore();
  });

  test("starts timer when continuing without notifications", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockGetPermissionsAsync.mockResolvedValue({
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);
    mockRequestPermissionsAsync.mockResolvedValue({
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);

    const { getByText, getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const buttons = alertSpy.mock.calls[0]?.[2] as Array<{ onPress?: () => void }>;
    await act(async () => {
      buttons[0]?.onPress?.();
    });

    await waitFor(() => expect(queryByTestId("start-button")).toBeNull());
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test("starts timer and suppresses future notification popup after opting out", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockGetPermissionsAsync.mockResolvedValue({
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);
    mockRequestPermissionsAsync.mockResolvedValue({
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);

    const firstRender = renderScreen();

    fireEvent.press(firstRender.getByText("+5m"));
    fireEvent.press(firstRender.getByTestId("start-button"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const buttons = alertSpy.mock.calls[0]?.[2] as Array<{ onPress?: () => void }>;
    await act(async () => {
      buttons[2]?.onPress?.();
    });

    await waitFor(() => expect(firstRender.queryByTestId("start-button")).toBeNull());
    expect(await AsyncStorage.getItem("task_timer_notification_prompt_hidden")).toBe("1");

    firstRender.unmount();

    const secondRender = renderScreen();
    fireEvent.press(secondRender.getByText("+5m"));
    fireEvent.press(secondRender.getByTestId("start-button"));

    await waitFor(() => expect(secondRender.queryByTestId("start-button")).toBeNull());
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test("plays foreground alarm sound and vibration when timer finishes and alarm is enabled", async () => {
    await AsyncStorage.setItem(TIMER_ALARM_ENABLED_STORAGE_KEY, "true");
    const { getByText, getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));
    await waitFor(() => expect(queryByTestId("start-button")).toBeNull());

    await waitFor(() => expect(getAlarmPlayer()).toBeTruthy());

    act(() => {
      jest.advanceTimersByTime(300_000);
    });

    await waitFor(() => expect(mockAnyAudioPlay).toHaveBeenCalled());
    expect(mockVibrationVibrate).toHaveBeenCalled();
  });

  test("does not play foreground alarm when alarm preference is disabled", async () => {
    await AsyncStorage.setItem(TIMER_ALARM_ENABLED_STORAGE_KEY, "false");
    const { getByText, getByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    act(() => {
      jest.advanceTimersByTime(300_000);
    });

    expect(mockAnyAudioPlay).not.toHaveBeenCalled();
    expect(mockVibrationVibrate).not.toHaveBeenCalled();
  });

  test("cancels foreground alarm when timer is paused", async () => {
    await AsyncStorage.setItem(TIMER_ALARM_ENABLED_STORAGE_KEY, "true");
    const { getByText, getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));
    await waitFor(() => expect(queryByTestId("start-button")).toBeNull());

    fireEvent.press(getByText("Pause"));

    act(() => {
      jest.advanceTimersByTime(300_000);
    });

    expect(mockAnyAudioPlay).not.toHaveBeenCalled();
    expect(mockVibrationCancel).toHaveBeenCalled();
  });

  test("keeps working when alarm seek reset rejects during pause cleanup", async () => {
    await AsyncStorage.setItem(TIMER_ALARM_ENABLED_STORAGE_KEY, "true");
    const { getByText, getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));
    await waitFor(() => expect(queryByTestId("start-button")).toBeNull());

    const alarmPlayer = getAlarmPlayer();
    alarmPlayer.seekTo.mockRejectedValueOnce(new Error("released shared object"));

    fireEvent.press(getByText("Pause"));

    await waitFor(() => expect(getByText("Resume")).toBeTruthy());
    expect(mockVibrationCancel).toHaveBeenCalled();
  });

  test("re-schedules foreground alarm after returning from background while timer is still running", async () => {
    await AsyncStorage.setItem(TIMER_ALARM_ENABLED_STORAGE_KEY, "true");
    let now = 0;
    let appStateListener: ((state: AppStateStatus) => void) | null = null;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
    const appStateSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() } as any;
      });

    try {
      const { getByText, getByTestId, queryByTestId } = renderScreen();
      fireEvent.press(getByText("+5m"));
      fireEvent.press(getByTestId("start-button"));
      await waitFor(() => expect(queryByTestId("start-button")).toBeNull());

      now = 60_000;
      act(() => {
        appStateListener?.("background");
      });

      expect(mockAnyAudioPlay).not.toHaveBeenCalled();

      now = 120_000;
      act(() => {
        appStateListener?.("active");
      });
      await waitFor(() =>
        expect(getByTestId("timer-duration")).toHaveTextContent("3:00 / 5:00"),
      );

      act(() => {
        jest.advanceTimersByTime(180_000);
      });

      await waitFor(() => expect(mockAnyAudioPlay).toHaveBeenCalled());
      expect(mockVibrationVibrate).toHaveBeenCalled();
    } finally {
      dateNowSpy.mockRestore();
      appStateSpy.mockRestore();
    }
  });

  test("stops per-second countdown updates while app is in background and catches up on return", async () => {
    let now = 0;
    let appStateListener: ((state: AppStateStatus) => void) | null = null;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
    const appStateSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() } as any;
      });

    try {
      const { getByText, getByTestId, queryByTestId } = renderScreen();

      fireEvent.press(getByText("+5m"));
      fireEvent.press(getByTestId("start-button"));
      await waitFor(() => expect(queryByTestId("start-button")).toBeNull());

      now = 60_000;
      act(() => {
        appStateListener?.("background");
      });

      act(() => {
        jest.advanceTimersByTime(120_000);
      });

      expect(getByTestId("timer-duration")).toHaveTextContent("5:00 / 5:00");

      now = 180_000;
      act(() => {
        appStateListener?.("active");
      });

      await waitFor(() =>
        expect(getByTestId("timer-duration")).toHaveTextContent("2:00 / 5:00"),
      );
    } finally {
      dateNowSpy.mockRestore();
      appStateSpy.mockRestore();
    }
  });

  test("restores a persisted running timer session after remount", async () => {
    let now = 120_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
    const paramsSpy = jest
      .spyOn(require("expo-router"), "useLocalSearchParams")
      .mockReturnValue({});

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
        expectedEndAt: 300_000,
        completionElapsedSeconds: null,
        status: "running",
        savedAt: 0,
      }),
    );

    try {
      const { getByText, getByTestId, queryByTestId } = renderScreen();

      await waitFor(() => expect(queryByTestId("start-button")).toBeNull());
      expect(getByText("Write report")).toBeTruthy();
      expect(getByTestId("timer-duration")).toHaveTextContent("3:00 / 5:00");
      expect(getByText("Pause")).toBeTruthy();
    } finally {
      paramsSpy.mockRestore();
      dateNowSpy.mockRestore();
    }
  });

  test("keeps the persisted timer session when the screen unmounts during a running countdown", async () => {
    const paramsSpy = jest
      .spyOn(require("expo-router"), "useLocalSearchParams")
      .mockReturnValue({
        title: "Write report",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        logged: "25",
      });

    try {
      const { getByText, getByTestId, unmount } = renderScreen();

      fireEvent.press(getByText("+5m"));
      fireEvent.press(getByTestId("start-button"));

      await waitFor(() => expect(mockScheduleNotificationAsync).toHaveBeenCalled());

      unmount();

      await waitFor(async () => {
        const rawSession = await AsyncStorage.getItem(
          TASK_TIMER_SESSION_STORAGE_KEY,
        );
        expect(rawSession).toBeTruthy();
        expect(JSON.parse(rawSession ?? "{}")).toMatchObject({
          taskId: "task-1",
          title: "Write report",
          status: "running",
        });
      });
    } finally {
      paramsSpy.mockRestore();
    }
  });

  test("reports an anomaly when the screen unmounts while a timer is still running in foreground", async () => {
    const { captureTaskTimerAnomaly } = require("../lib/sentry") as {
      captureTaskTimerAnomaly: jest.Mock;
    };
    const paramsSpy = jest
      .spyOn(require("expo-router"), "useLocalSearchParams")
      .mockReturnValue({
        title: "Write report",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        logged: "25",
      });

    try {
      const { getByText, getByTestId, unmount } = renderScreen();

      fireEvent.press(getByText("+5m"));
      fireEvent.press(getByTestId("start-button"));

      await waitFor(() => expect(mockScheduleNotificationAsync).toHaveBeenCalled());

      unmount();

      await waitFor(() =>
        expect(captureTaskTimerAnomaly).toHaveBeenCalledWith(
          "unexpected_active_timer_unmount",
          expect.objectContaining({
            appState: expect.anything(),
            status: "running",
            taskId: "task-1",
          }),
        ),
      );
    } finally {
      paramsSpy.mockRestore();
    }
  });

  test("clears persisted timer session after successful completion save", async () => {
    const updateAccumulatedTimes = require("../lib/api/supabase/timeTracking/updateAccumulatedTimes")
      .updateAccumulatedTimes as jest.Mock;
    const paramsSpy = jest
      .spyOn(require("expo-router"), "useLocalSearchParams")
      .mockReturnValue({
        title: "Write report",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        logged: "25",
      });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
          },
        },
      },
    } as any);

    try {
      const { getByText, getByTestId } = renderScreen();

      fireEvent.press(getByText("+5m"));
      fireEvent.press(getByTestId("start-button"));

      await waitFor(() => expect(mockScheduleNotificationAsync).toHaveBeenCalled());
      expect(await AsyncStorage.getItem(TASK_TIMER_SESSION_STORAGE_KEY)).toBeTruthy();

      fireEvent.press(getByText("Mark done"));
      await waitFor(() => expect(getByText("Review before saving")).toBeTruthy());
      fireEvent.press(getByText("Save"));

      await waitFor(() => expect(updateAccumulatedTimes).toHaveBeenCalled());
      await waitFor(async () =>
        expect(await AsyncStorage.getItem(TASK_TIMER_SESSION_STORAGE_KEY)).toBeNull(),
      );
    } finally {
      paramsSpy.mockRestore();
    }
  });

  test("stops focus music when manually completing the timer", async () => {
    const stop = jest.fn().mockResolvedValue(undefined);
    const playSelected = jest.fn().mockResolvedValue(true);
    const installedTrack: InstalledFocusTrack = {
      id: "track-1",
      trackId: "track-1",
      title: "Deep Focus",
      bucket: "focus-music",
      storagePath: "tracks/deep-focus.mp3",
      durationSeconds: 150,
      musicCategories: ["study"],
      localPath: "file://test/focus-music/track-1.mp3",
      downloadedAt: new Date().toISOString(),
    };

    const spy = jest
      .spyOn(FocusMusicProviderModule, "useFocusMusic")
      .mockReturnValue(
        buildFocusMusicStub({
          installedTracks: [installedTrack],
          selectedTrackId: installedTrack.id,
          selectedTrack: installedTrack,
          playSelected,
          stop,
        }),
      );

    const { getByText } = render(
      <I18nextProvider i18n={i18n}>
        <TimerAlarmPreferenceProvider>
          <FocusMusicProvider>
            <TaskTimerScreen />
          </FocusMusicProvider>
        </TimerAlarmPreferenceProvider>
      </I18nextProvider>,
    );

    fireEvent.press(getByText("Play"));
    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByText("Mark done"));

    await waitFor(() => expect(stop).toHaveBeenCalled());
    spy.mockRestore();
  });

  test("stops focus music when countdown finishes", async () => {
    const stop = jest.fn().mockResolvedValue(undefined);
    const playSelected = jest.fn().mockResolvedValue(true);
    const installedTrack: InstalledFocusTrack = {
      id: "track-1",
      trackId: "track-1",
      title: "Deep Focus",
      bucket: "focus-music",
      storagePath: "tracks/deep-focus.mp3",
      durationSeconds: 150,
      musicCategories: ["study"],
      localPath: "file://test/focus-music/track-1.mp3",
      downloadedAt: new Date().toISOString(),
    };

    const spy = jest
      .spyOn(FocusMusicProviderModule, "useFocusMusic")
      .mockReturnValue(
        buildFocusMusicStub({
          installedTracks: [installedTrack],
          selectedTrackId: installedTrack.id,
          selectedTrack: installedTrack,
          playSelected,
          stop,
        }),
      );

    const { getByText, getByTestId, queryByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <TimerAlarmPreferenceProvider>
          <TaskTimerScreen />
        </TimerAlarmPreferenceProvider>
      </I18nextProvider>,
    );

    fireEvent.press(getByText("Play"));
    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    await waitFor(() => expect(queryByTestId("start-button")).toBeNull());

    act(() => {
      jest.advanceTimersByTime(300_000);
    });

    await waitFor(() => expect(stop).toHaveBeenCalled());
    spy.mockRestore();
  });

  test("stops focus music when leaving the task timer screen", async () => {
    const stop = jest.fn().mockResolvedValue(undefined);
    const playSelected = jest.fn().mockResolvedValue(true);
    const installedTrack: InstalledFocusTrack = {
      id: "track-1",
      trackId: "track-1",
      title: "Deep Focus",
      bucket: "focus-music",
      storagePath: "tracks/deep-focus.mp3",
      durationSeconds: 150,
      musicCategories: ["study"],
      localPath: "file://test/focus-music/track-1.mp3",
      downloadedAt: new Date().toISOString(),
    };

    const spy = jest
      .spyOn(FocusMusicProviderModule, "useFocusMusic")
      .mockReturnValue(
        buildFocusMusicStub({
          installedTracks: [installedTrack],
          selectedTrackId: installedTrack.id,
          selectedTrack: installedTrack,
          playSelected,
          stop,
        }),
      );

    const { getByText, unmount } = render(
      <I18nextProvider i18n={i18n}>
        <TimerAlarmPreferenceProvider>
          <TaskTimerScreen />
        </TimerAlarmPreferenceProvider>
      </I18nextProvider>,
    );

    fireEvent.press(getByText("Play"));
    unmount();

    await waitFor(() => expect(stop).toHaveBeenCalled());
    spy.mockRestore();
  });

  test("cancels scheduled notification when leaving the task timer screen during countdown", async () => {
    const { getByText, getByTestId, unmount } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    await waitFor(() => expect(mockScheduleNotificationAsync).toHaveBeenCalled());

    unmount();

    await waitFor(() =>
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(
        "timer-notification-id",
      ),
    );
  });

  test("shows offline alert and goes back when saving completion while offline", async () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    const router = require("expo-router").router;
    const backSpy = jest.spyOn(router, "back");
    mockNetInfoFetch.mockResolvedValueOnce({
      type: "none",
      isConnected: false,
      isInternetReachable: false,
      details: null,
    } as any);

    const { getByText } = render(
      <I18nextProvider i18n={i18n}>
        <TimerAlarmPreferenceProvider>
          <FocusMusicProvider>
            <TaskTimerScreen />
          </FocusMusicProvider>
        </TimerAlarmPreferenceProvider>
      </I18nextProvider>,
    );

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByText("Mark done"));
    fireEvent.press(getByText("Save"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Finish this session?",
        "You are offline. Reconnect to the internet, or record your time manually from the manual log button.",
        [{ text: "Back", onPress: expect.any(Function) }],
      ),
    );

    const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    buttons[0]?.onPress?.();
    expect(backSpy).toHaveBeenCalled();
  });

  test("shows a task-missing alert and goes back without saving when the weekly task no longer exists", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const router = require("expo-router").router;
    const backSpy = jest.spyOn(router, "back");
    const updateAccumulatedTimes = require("../lib/api/supabase/timeTracking/updateAccumulatedTimes")
      .updateAccumulatedTimes as jest.Mock;
    const paramsSpy = jest
      .spyOn(require("expo-router"), "useLocalSearchParams")
      .mockReturnValue({
        title: "Write report",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        logged: "25",
      });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "weekly_tasks") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
          },
        },
      },
    } as any);

    try {
      const { getByText } = renderScreen();

      fireEvent.press(getByText("+5m"));
      fireEvent.press(getByText("Mark done"));
      await waitFor(() => expect(getByText("Review before saving")).toBeTruthy());
      fireEvent.press(getByText("Save"));

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          "Finish this session?",
          "This weekly task no longer exists, so this session was not saved. You will be returned to weekly tasks.",
          [{ text: "Back", onPress: expect.any(Function) }],
        ),
      );

      expect(updateAccumulatedTimes).not.toHaveBeenCalled();
      const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as Array<{
        text: string;
        onPress?: () => void;
      }>;
      buttons[0]?.onPress?.();
      expect(backSpy).toHaveBeenCalled();
    } finally {
      paramsSpy.mockRestore();
    }
  });

  test("renders keyboard avoiding wrapper in completion modal", () => {
    const { getByText, getByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByText("Mark done"));

    expect(getByTestId("completion-modal-keyboard-avoiding")).toBeTruthy();
  });

  test("uses surface color for task timer background", () => {
    const { getByTestId } = renderScreen();

    expect(getByTestId("task-timer-screen")).toHaveStyle({ backgroundColor: colors.surface });
  });

  test("renders scroll container in completion modal", () => {
    const { getByText, getByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByText("Mark done"));

    expect(getByTestId("completion-modal-scroll")).toBeTruthy();
  });
});
