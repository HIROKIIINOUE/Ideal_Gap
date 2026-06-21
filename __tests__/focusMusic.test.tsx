import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";
import FocusMusicScreen from "../components/feature/FocusMusicScreen";
import i18n from "../i18n";
import { FocusMusicProvider } from "../providers/FocusMusicProvider";
import { FocusMusicTrack } from "../types/focus-music";

const mockCatalog: FocusMusicTrack[] = [
  {
    id: "track-1",
    title: "Deep Focus",
    bucket: "focus-music",
    storagePath: "tracks/deep-focus.mp3",
    durationSeconds: 150,
    musicCategories: ["study", "music"],
  },
  {
    id: "track-2",
    title: "Flow State",
    bucket: "focus-music",
    storagePath: "tracks/flow-state.mp3",
    durationSeconds: 160,
    musicCategories: ["study"],
  },
  {
    id: "track-3",
    title: "Night River",
    bucket: "focus-music",
    storagePath: "tracks/night-river.mp3",
    durationSeconds: 170,
    musicCategories: ["chill", "nature"],
  },
  {
    id: "track-4",
    title: "Quiet Orbit",
    bucket: "focus-music",
    storagePath: "tracks/quiet-orbit.mp3",
    durationSeconds: 180,
    musicCategories: ["study", "chill"],
  },
  {
    id: "track-5",
    title: "Soft Horizon",
    bucket: "focus-music",
    storagePath: "tracks/soft-horizon.mp3",
    durationSeconds: 190,
    musicCategories: ["nature"],
  },
  {
    id: "track-6",
    title: "Morning Grain",
    bucket: "focus-music",
    storagePath: "tracks/morning-grain.mp3",
    durationSeconds: 200,
    musicCategories: ["workout"],
  },
];

const mockFetchCatalog = jest.fn(async () => mockCatalog);
const mockSignedUrl = jest.fn(
  async (_trackId: string) => "https://example.com/focus.mp3",
);
const mockLoadFocusMusicDownloadQuota = jest.fn();
const mockConsumeFocusMusicDownloadQuota = jest.fn();
const mockNetInfoFetch = jest.fn();
const mockGetUserId = jest.fn(async () => "user-1");
const mockEnsureUserProfileForAuthUser = jest.fn();
const mockSupabaseAuthGetUser = jest.fn(async () => ({
  data: { user: { id: "user-1", email: "user@example.com" } },
  error: null,
}));
const mockDownloadResumableDownloadAsync = jest.fn().mockResolvedValue({
  uri: "file://test/focus-music/track-1.mp3",
});
let latestDownloadProgressCallback:
  | ((data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void)
  | null = null;

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

jest.mock("../lib/focus-music/catalog", () => ({
  fetchFocusMusicCatalog: () => mockFetchCatalog(),
}));

jest.mock("../lib/focus-music/signedUrl", () => ({
  createFocusMusicSignedUrl: (trackId: string) => mockSignedUrl(trackId),
}));

jest.mock("../lib/focus-music/quota", () => ({
  loadFocusMusicDownloadQuota: (...args: unknown[]) =>
    mockLoadFocusMusicDownloadQuota(...args),
  consumeFocusMusicDownloadQuota: (...args: unknown[]) =>
    mockConsumeFocusMusicDownloadQuota(...args),
}));

jest.mock("../lib/subscription", () => ({
  ensureUserProfileForAuthUser: (...args: unknown[]) =>
    mockEnsureUserProfileForAuthUser(...args),
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: () => mockSupabaseAuthGetUser(),
    },
  },
}));

jest.mock("../lib/api/supabase/common", () => ({
  getUserId: () => mockGetUserId(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  fetch: () => mockNetInfoFetch(),
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file://test/",
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockImplementation(async (uri: string) => ({
    exists: true,
    isDirectory: false,
    uri,
  })),
  createDownloadResumable: jest.fn(
    (
      _url: string,
      _filePath: string,
      _options: Record<string, unknown>,
      callback?: (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
    ) => {
      latestDownloadProgressCallback = callback ?? null;
      return {
        downloadAsync: mockDownloadResumableDownloadAsync,
      };
    },
  ),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-native-circular-progress", () => {
  const React = require("react");
  const { View } = require("react-native");
  const AnimatedCircularProgress = ({ testID }: { testID?: string }) => (
    <View testID={testID ?? "mock-install-progress"} />
  );
  return { AnimatedCircularProgress };
});

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

const renderScreen = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <FocusMusicProvider>
        <FocusMusicScreen />
      </FocusMusicProvider>
    </I18nextProvider>,
  );

describe("FocusMusicScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockFetchCatalog.mockClear();
    mockSignedUrl.mockClear();
    mockLoadFocusMusicDownloadQuota.mockReset();
    mockLoadFocusMusicDownloadQuota.mockResolvedValue({
      accessMode: "free",
      limit: 5,
      count: 0,
      remaining: 5,
      resetAt: null,
      windowStartedAt: null,
    });
    mockConsumeFocusMusicDownloadQuota.mockReset();
    mockConsumeFocusMusicDownloadQuota.mockResolvedValue({
      ok: true,
      quota: {
        accessMode: "free",
        limit: 5,
        count: 1,
        remaining: 4,
        resetAt: "2026-07-18T00:00:00.000Z",
        windowStartedAt: "2026-06-18T00:00:00.000Z",
      },
    });
    mockEnsureUserProfileForAuthUser.mockReset();
    mockEnsureUserProfileForAuthUser.mockResolvedValue(undefined);
    mockSupabaseAuthGetUser.mockReset();
    mockSupabaseAuthGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      error: null,
    });
    mockNetInfoFetch.mockReset();
    mockDownloadResumableDownloadAsync.mockReset();
    mockDownloadResumableDownloadAsync.mockResolvedValue({
      uri: "file://test/focus-music/track-1.mp3",
    });
    latestDownloadProgressCallback = null;
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
  });

  test("opens catalog and installs a track", async () => {
    const { getByTestId, queryByTestId, getByText } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    expect(getByTestId("focus-music-catalog-modal")).toBeTruthy();
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    expect(queryByTestId("focus-music-installed-track-1")).toBeNull();
    await act(async () => {
      fireEvent.press(getByTestId("focus-music-install-track-1"));
    });
    await waitFor(() => expect(getByTestId("focus-music-installed-track-1")).toBeTruthy());
  });

  test("disables install buttons immediately after tapping download", async () => {
    let resolveDownload: ((value: { uri: string }) => void) | null = null;
    mockDownloadResumableDownloadAsync.mockImplementationOnce(
      () =>
        new Promise<{ uri: string }>((resolve) => {
          resolveDownload = resolve;
        }),
    );

    const { getByTestId, getByText } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    fireEvent.press(getByTestId("focus-music-install-track-1"));

    await waitFor(() =>
      expect(getByTestId("focus-music-install-track-1")).toBeDisabled(),
    );
    expect(getByTestId("focus-music-install-track-2")).toBeDisabled();

    await act(async () => {
      resolveDownload?.({ uri: "file://test/focus-music/track-1.mp3" });
    });
  });

  test("asks for confirmation before removing a track", async () => {
    const { getByTestId, getByText } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("focus-music-install-track-1"));
    });

    await waitFor(() => expect(getByTestId("focus-music-installed-track-1")).toBeTruthy());

    fireEvent.press(getByTestId("focus-music-remove-track-1"));

    expect(Alert.alert).toHaveBeenCalled();
  });

  test("shows selected icon instead of selected text for the active track", async () => {
    const { getByTestId, getByText, queryByText } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("focus-music-install-track-1"));
    });

    await waitFor(() => expect(getByTestId("focus-music-installed-track-1")).toBeTruthy());

    expect(getByTestId("focus-music-selected-icon-track-1")).toBeTruthy();
    expect(queryByText("Selected")).toBeNull();
  });

  test("shows install limit alert when trying to add a 6th track", async () => {
    const { getByTestId, getByText } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    for (let i = 0; i < 5; i += 1) {
      const trackId = mockCatalog[i].id;
      await act(async () => {
        fireEvent.press(getByTestId(`focus-music-install-${trackId}`));
      });
    }

    await act(async () => {
      fireEvent.press(getByTestId("focus-music-install-track-6"));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "download limit reached",
      "You can download up to 5 tracks. Remove a track from your list to download another one.",
    );
  });

  test("shows upgrade modal for free users when monthly download limit is reached", async () => {
    mockLoadFocusMusicDownloadQuota.mockResolvedValue({
      accessMode: "free",
      limit: 5,
      count: 5,
      remaining: 0,
      resetAt: "2026-07-18T00:00:00.000Z",
      windowStartedAt: "2026-06-18T00:00:00.000Z",
    });

    const { getByTestId, getByText, findByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("focus-music-install-track-1"));
    });

    expect(await findByTestId("usage-limit-upgrade-modal")).toBeTruthy();
    await waitFor(() =>
      expect(queryByTestId("focus-music-catalog-modal")).toBeNull(),
    );
    expect(getByText("Monthly download limit reached")).toBeTruthy();
    fireEvent.press(getByTestId("usage-limit-upgrade-modal-upgrade"));
    expect(router.push).toHaveBeenCalledWith("/purchases");
  });

  test("keeps monthly limit as alert for paid users", async () => {
    mockLoadFocusMusicDownloadQuota.mockResolvedValue({
      accessMode: "paid",
      limit: 30,
      count: 30,
      remaining: 0,
      resetAt: "2026-07-18T00:00:00.000Z",
      windowStartedAt: "2026-06-18T00:00:00.000Z",
    });

    const { getByTestId, getByText, queryByTestId } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("focus-music-install-track-1"));
    });

    expect(queryByTestId("usage-limit-upgrade-modal")).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Monthly download limit",
      "You've reached this month's download limit. Please try again next month.",
    );
  });

  test("filters catalog by selected categories", async () => {
    const { getByTestId, getByText, queryByText } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    fireEvent.press(getByTestId("focus-music-category-filter-study"));
    expect(getByText("Deep Focus")).toBeTruthy();
    expect(getByText("Flow State")).toBeTruthy();
    expect(getByText("Quiet Orbit")).toBeTruthy();
    expect(queryByText("Night River")).toBeNull();

    fireEvent.press(getByTestId("focus-music-category-filter-music"));
    expect(getByText("Deep Focus")).toBeTruthy();
    expect(queryByText("Flow State")).toBeNull();
    expect(queryByText("Quiet Orbit")).toBeNull();
  });

  test("refreshes catalog when screen gets focus", async () => {
    renderScreen();

    await waitFor(() => {
      expect(mockFetchCatalog).toHaveBeenCalledTimes(2);
    });
  });

  test("shows determinate donut progress while downloading when expected size is known", async () => {
    let resolveDownload: ((value: { uri: string }) => void) | null = null;
    mockDownloadResumableDownloadAsync.mockImplementation(
      () =>
        new Promise<{ uri: string }>((resolve) => {
          resolveDownload = resolve;
        }),
    );
    const { getByTestId, getByText } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    fireEvent.press(getByTestId("focus-music-install-track-1"));

    await waitFor(() => {
      expect(latestDownloadProgressCallback).not.toBeNull();
    });

    act(() => {
      latestDownloadProgressCallback?.({
        totalBytesWritten: 400,
        totalBytesExpectedToWrite: 1000,
      });
    });

    await waitFor(() => {
      expect(
        getByTestId("focus-music-install-progress-track-1"),
      ).toBeTruthy();
    });

    act(() => {
      resolveDownload?.({ uri: "file://test/focus-music/track-1.mp3" });
    });
  });

  test("shows indeterminate spinner while downloading when expected size is unknown", async () => {
    let resolveDownload: ((value: { uri: string }) => void) | null = null;
    mockDownloadResumableDownloadAsync.mockImplementation(
      () =>
        new Promise<{ uri: string }>((resolve) => {
          resolveDownload = resolve;
        }),
    );
    const { getByTestId, getByText } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    await waitFor(() => expect(getByText("Deep Focus")).toBeTruthy());

    fireEvent.press(getByTestId("focus-music-install-track-1"));

    await waitFor(() => {
      expect(latestDownloadProgressCallback).not.toBeNull();
    });

    act(() => {
      latestDownloadProgressCallback?.({
        totalBytesWritten: 220,
        totalBytesExpectedToWrite: -1,
      });
    });

    await waitFor(() => {
      expect(
        getByTestId("focus-music-install-progress-indeterminate-track-1"),
      ).toBeTruthy();
    });

    act(() => {
      resolveDownload?.({ uri: "file://test/focus-music/track-1.mp3" });
    });
  });
});
