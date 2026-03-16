import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import * as Notifications from "expo-notifications";
import { AppState, AppStateStatus, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import TaskTimerScreen from "../components/feature/TaskTimerScreen";
import i18n from "../i18n";
import { FocusMusicProvider } from "../providers/FocusMusicProvider";
import * as FocusMusicProviderModule from "../providers/FocusMusicProvider";
import { FOCUS_MUSIC_INSTALLED_KEY } from "../lib/focus-music/constants";
import { FocusMusicTrack, InstalledFocusTrack } from "../types/focus-music";
import { colors } from "../constants/theme";

jest.useFakeTimers();

jest.mock("@expo/vector-icons", () => {
  const MockIcon = () => null;
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

jest.mock("expo-audio", () => ({
  useAudioPlayer: () => ({
    loop: false,
    playing: false,
    paused: false,
    isLoaded: true,
    isBuffering: false,
    currentTime: 0,
    duration: 10,
    volume: 1,
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
  }),
  useAudioPlayerStatus: () => ({
    playing: false,
    currentTime: 0,
    duration: 0,
  }),
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
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
      <FocusMusicProvider>
        <TaskTimerScreen />
      </FocusMusicProvider>
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
const mockNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;
const mockOpenSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);

describe("TaskTimerScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
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
    mockOpenSettings.mockClear();
  });

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

  test("hides start button when timer is running", () => {
    const { getByText, getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    expect(queryByTestId("start-button")).toBeNull();
    expect(getByText("Pause")).toBeTruthy();
  });

  test("keeps full progress after resumed timer completes on app return", () => {
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

      expect(getByText("Review before saving")).toBeTruthy();
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

  test("shows notification prompt when notifications are off", async () => {
    jest.useRealTimers();
    try {
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        expires: "never",
      } as Notifications.NotificationPermissionsStatus);

      const { getByText } = renderScreen();

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockGetPermissionsAsync).toHaveBeenCalled();
      expect(getByText("Allow notifications so we can notify you when the timer ends.")).toBeTruthy();
    } finally {
      jest.useFakeTimers();
    }
  });

  test("hides notification prompt when notifications are granted", async () => {
    jest.useRealTimers();
    try {
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: Notifications.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: "never",
      } as Notifications.NotificationPermissionsStatus);

      const { queryByText } = renderScreen();

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockGetPermissionsAsync).toHaveBeenCalled();
      expect(queryByText("Allow notifications so we can notify you when the timer ends.")).toBeNull();
    } finally {
      jest.useFakeTimers();
    }
  });

  test("opens device settings when tapping notification action", async () => {
    jest.useRealTimers();
    try {
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        expires: "never",
      } as Notifications.NotificationPermissionsStatus);

      const { getByText, queryByText } = renderScreen();

      await act(async () => {
        await Promise.resolve();
      });

      fireEvent.press(getByText("Open settings"));

      await waitFor(() => expect(mockOpenSettings).toHaveBeenCalled());
      expect(queryByText("Allow notifications so we can notify you when the timer ends.")).toBeNull();
    } finally {
      jest.useFakeTimers();
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
        <FocusMusicProvider>
          <TaskTimerScreen />
        </FocusMusicProvider>
      </I18nextProvider>,
    );

    fireEvent.press(getByText("Play music"));
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

    const { getByText, getByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <TaskTimerScreen />
      </I18nextProvider>,
    );

    fireEvent.press(getByText("Play music"));
    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

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
        <TaskTimerScreen />
      </I18nextProvider>,
    );

    fireEvent.press(getByText("Play music"));
    unmount();

    await waitFor(() => expect(stop).toHaveBeenCalled());
    spy.mockRestore();
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
        <FocusMusicProvider>
          <TaskTimerScreen />
        </FocusMusicProvider>
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
