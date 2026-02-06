import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { FocusMusicProvider, useFocusMusic } from "../providers/FocusMusicProvider";
import {
  FOCUS_MUSIC_DOWNLOAD_QUOTA_KEY_PREFIX,
  FOCUS_MUSIC_INSTALLED_KEY,
} from "../lib/focus-music/constants";
import { FocusMusicTrack, InstallResult } from "../types/focus-music";
import * as FileSystem from "expo-file-system/legacy";

const mockCatalog: FocusMusicTrack[] = [
  {
    id: "track-1",
    title: "Deep Focus",
    bucket: "focus-music",
    storagePath: "tracks/deep-focus.mp3",
    durationSeconds: 150,
  },
  {
    id: "track-2",
    title: "Flow State",
    bucket: "focus-music",
    storagePath: "tracks/flow-state.mp3",
    durationSeconds: 160,
  },
  {
    id: "track-3",
    title: "Night River",
    bucket: "focus-music",
    storagePath: "tracks/night-river.mp3",
    durationSeconds: 170,
  },
  {
    id: "track-4",
    title: "Quiet Orbit",
    bucket: "focus-music",
    storagePath: "tracks/quiet-orbit.mp3",
    durationSeconds: 180,
  },
  {
    id: "track-5",
    title: "Soft Horizon",
    bucket: "focus-music",
    storagePath: "tracks/soft-horizon.mp3",
    durationSeconds: 190,
  },
];

const mockFetchCatalog = jest.fn(async () => mockCatalog);
const mockSignedUrl = jest.fn(
  async (_trackId: string) => "https://example.com/focus.mp3",
);
const mockNetInfoFetch = jest.fn();

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
});

const mockPlayerA = createMockPlayer();
const mockPlayerB = createMockPlayer();
let mockPlayerIndex = 0;

jest.mock("../lib/focus-music/catalog", () => ({
  fetchFocusMusicCatalog: () => mockFetchCatalog(),
}));

jest.mock("../lib/focus-music/signedUrl", () => ({
  createFocusMusicSignedUrl: (trackId: string) => mockSignedUrl(trackId),
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
  downloadAsync: jest.fn().mockResolvedValue({ uri: "file://test/focus-music/track-1.mp3" }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-audio", () => ({
  useAudioPlayer: () => {
    const player = mockPlayerIndex % 2 === 0 ? mockPlayerA : mockPlayerB;
    mockPlayerIndex += 1;
    return player;
  },
  useAudioPlayerStatus: () => ({
    playing: true,
    currentTime: 0,
    duration: 10,
  }),
}));

describe("FocusMusicProvider", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockFetchCatalog.mockClear();
    mockSignedUrl.mockClear();
    mockNetInfoFetch.mockReset();
    mockPlayerIndex = 0;
    mockPlayerA.loop = false;
    mockPlayerA.playing = false;
    mockPlayerA.paused = false;
    mockPlayerA.isLoaded = true;
    mockPlayerA.isBuffering = false;
    mockPlayerA.currentTime = 0;
    mockPlayerA.duration = 10;
    mockPlayerA.volume = 1;
    mockPlayerA.play.mockClear();
    mockPlayerA.pause.mockClear();
    mockPlayerA.replace.mockClear();
    mockPlayerA.seekTo.mockClear();
    mockPlayerB.loop = false;
    mockPlayerB.playing = false;
    mockPlayerB.paused = false;
    mockPlayerB.isLoaded = true;
    mockPlayerB.isBuffering = false;
    mockPlayerB.currentTime = 0;
    mockPlayerB.duration = 10;
    mockPlayerB.volume = 1;
    mockPlayerB.play.mockClear();
    mockPlayerB.pause.mockClear();
    mockPlayerB.replace.mockClear();
    mockPlayerB.seekTo.mockClear();
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

  test("playSelected primes dual players for crossfade looping", async () => {
    const installed = [
      {
        trackId: "track-1",
        localPath: "file://test/focus-music/track-1.mp3",
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

    expect(mockPlayerA.replace).toHaveBeenCalledWith(
      "file://test/focus-music/track-1.mp3",
    );
    expect(mockPlayerA.play).toHaveBeenCalled();
    expect(mockPlayerB.replace).toHaveBeenCalledWith(
      "file://test/focus-music/track-1.mp3",
    );
    expect(mockPlayerA.volume).toBe(1);
    expect(mockPlayerB.volume).toBe(0);

    act(() => {
      result.current.pause();
    });
  });

  test("blocks concurrent downloads", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });

    let resolveDownload: ((value: { uri: string }) => void) | null = null;
    (FileSystem.downloadAsync as jest.Mock).mockImplementation(
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

  test("blocks install when monthly download limit is reached", async () => {
    mockNetInfoFetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    });

    await AsyncStorage.setItem(
      `${FOCUS_MUSIC_DOWNLOAD_QUOTA_KEY_PREFIX}.user-1`,
      JSON.stringify({
        resetAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        count: 10,
      }),
    );

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
});
