import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { FocusMusicProvider, useFocusMusic } from "../providers/FocusMusicProvider";
import { FOCUS_MUSIC_INSTALLED_KEY } from "../lib/focus-music/constants";
import { FocusMusicTrack, InstallResult } from "../types/focus-music";
import * as FileSystem from "expo-file-system/legacy";

const mockCatalog: FocusMusicTrack[] = [
  {
    id: "track-1",
    title: "Deep Focus",
    bucket: "focus-music",
    storagePath: "tracks/deep-focus.mp3",
    durationSeconds: 150,
    musicCategories: ["study"],
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
    musicCategories: ["chill"],
  },
  {
    id: "track-4",
    title: "Quiet Orbit",
    bucket: "focus-music",
    storagePath: "tracks/quiet-orbit.mp3",
    durationSeconds: 180,
    musicCategories: ["chill"],
  },
  {
    id: "track-5",
    title: "Soft Horizon",
    bucket: "focus-music",
    storagePath: "tracks/soft-horizon.mp3",
    durationSeconds: 190,
    musicCategories: ["nature"],
  },
];

const mockFetchCatalog = jest.fn(async () => mockCatalog);
const mockSignedUrl = jest.fn(
  async (_trackId: string) => "https://example.com/focus.mp3",
);
const mockLoadFocusMusicDownloadQuota = jest.fn();
const mockConsumeFocusMusicDownloadQuota = jest.fn();
const mockNetInfoFetch = jest.fn();
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

const createMockPlayer = () => ({
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
  setActiveForLockScreen: jest.fn(),
});

const mockPlayer = createMockPlayer();
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);
const mockRequestNotificationPermissions = jest
  .fn()
  .mockResolvedValue({ granted: true, status: "granted" });
let appStateChangeListener: ((nextState: AppStateStatus) => void) | null = null;
const mockAppStateSubscriptionRemove = jest.fn();

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

const mockGetUserId = jest.fn(async () => "user-1");

jest.mock("../lib/api/supabase/common", () => ({
  getUserId: () => mockGetUserId(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  fetch: () => mockNetInfoFetch(),
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file://test/",
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({
    exists: true,
    isDirectory: false,
    uri: "file://test/focus-music/track-1.mp3",
  }),
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

jest.mock("expo-audio", () => ({
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => ({
    playing: true,
    currentTime: 0,
    duration: 10,
  }),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
}));

jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: (...args: unknown[]) =>
    mockRequestNotificationPermissions(...args),
}));

describe("FocusMusicProvider", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useRealTimers();
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
    mockPlayer.loop = false;
    mockPlayer.playing = false;
    mockPlayer.paused = false;
    mockPlayer.isLoaded = true;
    mockPlayer.isBuffering = false;
    mockPlayer.currentTime = 0;
    mockPlayer.duration = 10;
    mockPlayer.volume = 1;
    mockPlayer.play.mockClear();
    mockPlayer.pause.mockClear();
    mockPlayer.replace.mockClear();
    mockPlayer.seekTo.mockClear();
    mockPlayer.setActiveForLockScreen.mockClear();
    mockSetAudioModeAsync.mockClear();
    mockRequestNotificationPermissions.mockClear();
    (FileSystem.getInfoAsync as jest.Mock).mockReset();
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(
      async (uri: string) => ({
        exists: true,
        isDirectory: false,
        uri,
      }),
    );
    (FileSystem.deleteAsync as jest.Mock).mockReset();
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    appStateChangeListener = null;
    mockAppStateSubscriptionRemove.mockReset();
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((type, listener) => {
        if (type === "change") {
          appStateChangeListener = listener as (nextState: AppStateStatus) => void;
        }
        return {
          remove: mockAppStateSubscriptionRemove,
        };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("installs a track on wifi and persists metadata", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let installResult: InstallResult | undefined;
    await act(async () => {
      installResult = await result.current.installTrack("track-1");
    });

    expect(installResult?.ok).toBe(true);
    expect(result.current.installedTracks).toHaveLength(1);

    const stored = await AsyncStorage.getItem(FOCUS_MUSIC_INSTALLED_KEY);
    expect(stored).toContain("track-1");
  });

  test("blocks install on cellular without permission", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "cellular",
      isConnected: true,
      isInternetReachable: true,
    });

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let firstAttempt: InstallResult | undefined;
    await act(async () => {
      firstAttempt = await result.current.installTrack("track-1");
    });

    expect(firstAttempt?.ok).toBe(false);
    if (firstAttempt && !firstAttempt.ok) {
      expect(firstAttempt.reason).toBe("cellular");
    }

    let secondAttempt: InstallResult | undefined;
    await act(async () => {
      secondAttempt = await result.current.installTrack("track-1", {
        allowCellular: true,
      });
    });

    expect(secondAttempt?.ok).toBe(true);
  });

  test("returns limit error when already at capacity", async () => {
    const installed = Array.from({ length: 5 }, (_, index) => ({
      trackId: `track-${index + 1}`,
      localPath: `file://test/focus-music/${index + 1}.mp3`,
      downloadedAt: new Date().toISOString(),
    }));

    await AsyncStorage.setItem(
      FOCUS_MUSIC_INSTALLED_KEY,
      JSON.stringify(installed)
    );

    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let installResult: InstallResult | undefined;
    await act(async () => {
      installResult = await result.current.installTrack("track-6");
    });

    expect(installResult?.ok).toBe(false);
    if (installResult && !installResult.ok) {
      expect(installResult.reason).toBe("limit");
    }
  });

  test("playSelected uses rebuilt local uri from current document directory", async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });

    const installed = [
      {
        trackId: "track-1",
        localPath:
          "file://old-container/Documents/focus-music/track-1.mp3",
        downloadedAt: new Date().toISOString(),
      },
    ];

    await AsyncStorage.setItem(
      FOCUS_MUSIC_INSTALLED_KEY,
      JSON.stringify(installed),
    );

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    await act(async () => {
      await result.current.playSelected();
    });

    expect(FileSystem.getInfoAsync).toHaveBeenCalledWith(
      "file://test/focus-music/track-1.mp3",
    );
    expect(mockPlayer.replace).toHaveBeenCalledWith(
      "file://test/focus-music/track-1.mp3",
    );
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });
    expect(mockRequestNotificationPermissions).toHaveBeenCalledTimes(1);
    expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(true, {
      title: "Deep Focus",
      artist: "Ideal Gap",
    });
    expect(mockPlayer.play).toHaveBeenCalled();
    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.volume).toBe(1);

    await act(async () => {
      result.current.pause();
    });

    expect(mockSetAudioModeAsync).toHaveBeenLastCalledWith({
      shouldPlayInBackground: false,
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });
    expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(
      false,
      undefined,
    );
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform,
    });
  });

  test("migrates legacy installed entries to current document directory and drops non-local paths", async () => {
    await AsyncStorage.setItem(
      FOCUS_MUSIC_INSTALLED_KEY,
      JSON.stringify([
        {
          trackId: "track-1",
          uri: "https://example.com/expired-signed-url.mp3",
          downloadedAt: new Date().toISOString(),
        },
        {
          trackId: "track-2",
          localPath:
            "file://old-container/Documents/focus-music/track-2.mp3",
          downloadedAt: new Date().toISOString(),
        },
      ]),
    );

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    expect(result.current.installedTracks).toHaveLength(1);
    expect(result.current.installedTracks[0].id).toBe("track-2");
    expect(result.current.installedTracks[0].localPath).toBe(
      "file://test/focus-music/track-2.mp3",
    );

    const stored = await AsyncStorage.getItem(FOCUS_MUSIC_INSTALLED_KEY);
    expect(stored).not.toContain("old-container");
    expect(stored).toContain("track-2.mp3");
  });

  test("drops installed entries when rebuilt local file does not exist", async () => {
    await AsyncStorage.setItem(
      FOCUS_MUSIC_INSTALLED_KEY,
      JSON.stringify([
        {
          trackId: "track-1",
          localPath:
            "file://old-container/Documents/focus-music/track-1.mp3",
          downloadedAt: new Date().toISOString(),
        },
      ]),
    );
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: false,
      isDirectory: false,
      uri: "file://test/focus-music/track-1.mp3",
    });

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    expect(result.current.installedTracks).toHaveLength(0);
    const stored = await AsyncStorage.getItem(FOCUS_MUSIC_INSTALLED_KEY);
    expect(stored).toBe("[]");
  });

  test("removeTrack deletes rebuilt local uri and removes metadata even when file deletion fails", async () => {
    await AsyncStorage.setItem(
      FOCUS_MUSIC_INSTALLED_KEY,
      JSON.stringify([
        {
          trackId: "track-1",
          localPath:
            "file://old-container/Documents/focus-music/track-1.mp3",
          downloadedAt: new Date().toISOString(),
        },
      ]),
    );
    (FileSystem.deleteAsync as jest.Mock).mockRejectedValueOnce(
      new Error("permission denied"),
    );

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));
    expect(result.current.installedTracks).toHaveLength(1);

    let removeResult:
      | { ok: true }
      | { ok: false; reason: "not_installed" | "remove_failed" }
      | undefined;
    await act(async () => {
      removeResult = await result.current.removeTrack("track-1");
    });

    expect(removeResult).toEqual({ ok: true });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file://test/focus-music/track-1.mp3",
      { idempotent: true },
    );
    expect(result.current.installedTracks).toHaveLength(0);
  });

  test("blocks concurrent downloads", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });

    let resolveDownload: ((value: { uri: string }) => void) | null = null;
    mockDownloadResumableDownloadAsync.mockImplementation(
      () =>
        new Promise<{ uri: string }>((resolve) => {
          resolveDownload = resolve;
        }),
    );

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let firstInstall: Promise<InstallResult> | null = null;
    await act(async () => {
      firstInstall = result.current.installTrack("track-1");
    });

    await waitFor(() => expect(result.current.isInstalling("track-1")).toBe(true));

    let secondAttempt: InstallResult | undefined;
    await act(async () => {
      secondAttempt = await result.current.installTrack("track-2");
    });

    expect(secondAttempt?.ok).toBe(false);
    if (secondAttempt && !secondAttempt.ok) {
      expect(secondAttempt.reason).toBe("busy");
    }

    act(() => {
      resolveDownload?.({ uri: "file://test/focus-music/track-1.mp3" });
    });

    if (firstInstall) {
      await act(async () => {
        await firstInstall;
      });
    }
  });

  test("tracks install progress when expected bytes are available", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });

    let resolveDownload: ((value: { uri: string }) => void) | null = null;
    mockDownloadResumableDownloadAsync.mockImplementation(
      () =>
        new Promise<{ uri: string }>((resolve) => {
          resolveDownload = resolve;
        }),
    );

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let installPromise: Promise<InstallResult> | null = null;
    await act(async () => {
      installPromise = result.current.installTrack("track-1");
    });

    await waitFor(() => expect(result.current.isInstalling("track-1")).toBe(true));

    act(() => {
      latestDownloadProgressCallback?.({
        totalBytesWritten: 250,
        totalBytesExpectedToWrite: 1000,
      });
    });

    await waitFor(() => {
      expect(result.current.getInstallProgress("track-1")).toEqual({
        progress: 0.25,
        writtenBytes: 250,
        totalBytes: 1000,
        remainingBytes: 750,
        isIndeterminate: false,
      });
    });

    act(() => {
      resolveDownload?.({ uri: "file://test/focus-music/track-1.mp3" });
    });
    if (installPromise) {
      await act(async () => {
        await installPromise;
      });
    }

    expect(result.current.getInstallProgress("track-1")).toBeNull();
  });

  test("falls back to indeterminate install progress when expected bytes are unavailable", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });

    let resolveDownload: ((value: { uri: string }) => void) | null = null;
    mockDownloadResumableDownloadAsync.mockImplementation(
      () =>
        new Promise<{ uri: string }>((resolve) => {
          resolveDownload = resolve;
        }),
    );

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let installPromise: Promise<InstallResult> | null = null;
    await act(async () => {
      installPromise = result.current.installTrack("track-1");
    });

    await waitFor(() => expect(result.current.isInstalling("track-1")).toBe(true));

    act(() => {
      latestDownloadProgressCallback?.({
        totalBytesWritten: 320,
        totalBytesExpectedToWrite: -1,
      });
    });

    await waitFor(() => {
      expect(result.current.getInstallProgress("track-1")).toEqual({
        progress: null,
        writtenBytes: 320,
        totalBytes: null,
        remainingBytes: null,
        isIndeterminate: true,
      });
    });

    act(() => {
      resolveDownload?.({ uri: "file://test/focus-music/track-1.mp3" });
    });
    if (installPromise) {
      await act(async () => {
        await installPromise;
      });
    }

    expect(result.current.getInstallProgress("track-1")).toBeNull();
  });

  test("blocks install when monthly download limit is reached", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });
    mockLoadFocusMusicDownloadQuota.mockResolvedValue({
      accessMode: "free",
      limit: 5,
      count: 5,
      remaining: 0,
      resetAt: "2026-06-23T00:00:00.000Z",
      windowStartedAt: "2026-05-24T00:00:00.000Z",
    });

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let installResult: InstallResult | undefined;
    await act(async () => {
      installResult = await result.current.installTrack("track-1");
    });

    expect(installResult?.ok).toBe(false);
    if (installResult && !installResult.ok) {
      expect(installResult.reason).toBe("monthly_limit");
    }
  });

  test("reloads monthly download quota when app returns to foreground", async () => {
    mockLoadFocusMusicDownloadQuota
      .mockResolvedValueOnce({
        accessMode: "free",
        limit: 5,
        count: 3,
        remaining: 2,
        resetAt: "2026-06-23T00:00:00.000Z",
        windowStartedAt: "2026-05-24T00:00:00.000Z",
      })
      .mockResolvedValueOnce({
        accessMode: "paid",
        limit: 30,
        count: 4,
        remaining: 26,
        resetAt: "2026-06-21T00:00:00.000Z",
        windowStartedAt: "2026-05-22T00:00:00.000Z",
      });

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.monthlyDownloadRemaining).toBe(2));

    await act(async () => {
      appStateChangeListener?.("background");
      appStateChangeListener?.("active");
    });

    await waitFor(() => expect(result.current.monthlyDownloadRemaining).toBe(26));
    expect(result.current.monthlyDownloadLimit).toBe(30);
  });

  test("automatically resets monthly download quota when resetAt passes", async () => {
    jest.useFakeTimers();
    const initialResetAt = new Date(Date.now() + 1000).toISOString();
    mockLoadFocusMusicDownloadQuota
      .mockResolvedValueOnce({
        accessMode: "free",
        limit: 5,
        count: 5,
        remaining: 0,
        resetAt: initialResetAt,
        windowStartedAt: "2026-05-19T00:00:00.000Z",
      })
      .mockResolvedValueOnce({
        accessMode: "free",
        limit: 5,
        count: 0,
        remaining: 5,
        resetAt: "2026-07-18T00:00:01.000Z",
        windowStartedAt: "2026-06-18T00:00:01.000Z",
      });

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.monthlyDownloadRemaining).toBe(0));

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.monthlyDownloadRemaining).toBe(5));
  });

  test("reverts downloaded file when quota consumption fails after download", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });
    mockConsumeFocusMusicDownloadQuota.mockResolvedValue({
      ok: false,
      reason: "monthly_limit",
    });

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let installResult: InstallResult | undefined;
    await act(async () => {
      installResult = await result.current.installTrack("track-1");
    });

    expect(installResult).toEqual({ ok: false, reason: "monthly_limit" });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file://test/focus-music/track-1.mp3",
      { idempotent: true },
    );
    expect(result.current.installedTracks).toHaveLength(0);
  });

  test("reverts downloaded file when quota consumption throws after download", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });
    mockConsumeFocusMusicDownloadQuota.mockRejectedValue(
      new Error("rpc unavailable"),
    );

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let installResult: InstallResult | undefined;
    await act(async () => {
      installResult = await result.current.installTrack("track-1");
    });

    expect(installResult).toEqual({ ok: false, reason: "download_failed" });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file://test/focus-music/track-1.mp3",
      { idempotent: true },
    );
    expect(result.current.installedTracks).toHaveLength(0);
  });

  test("retries quota consumption after ensuring user profile when first rpc fails", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });
    mockConsumeFocusMusicDownloadQuota
      .mockRejectedValueOnce(
        new Error(
          'insert or update on table "focus_music_download_quotas" violates foreign key constraint',
        ),
      )
      .mockResolvedValueOnce({
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

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    let installResult: InstallResult | undefined;
    await act(async () => {
      installResult = await result.current.installTrack("track-1");
    });

    expect(mockEnsureUserProfileForAuthUser).toHaveBeenCalledTimes(1);
    expect(mockConsumeFocusMusicDownloadQuota).toHaveBeenCalledTimes(2);
    expect(installResult?.ok).toBe(true);
    expect(result.current.installedTracks).toHaveLength(1);
  });

  test("keeps install successful when metadata persistence fails after download", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });

    const { result } = renderHook(() => useFocusMusic(), {
      wrapper: ({ children }) => <FocusMusicProvider>{children}</FocusMusicProvider>,
    });

    await waitFor(() => expect(result.current.catalog.length).toBe(5));

    jest
      .spyOn(AsyncStorage, "setItem")
      .mockRejectedValueOnce(new Error("storage unavailable"));

    let installResult: InstallResult | undefined;
    await act(async () => {
      installResult = await result.current.installTrack("track-1");
    });

    expect(installResult?.ok).toBe(true);
    expect(result.current.installedTracks).toHaveLength(1);
    expect(result.current.installedTracks[0]?.trackId).toBe("track-1");
  });
});
