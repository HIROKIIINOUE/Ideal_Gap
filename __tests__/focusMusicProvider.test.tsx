import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { FocusMusicProvider, useFocusMusic } from "../providers/FocusMusicProvider";
import { FOCUS_MUSIC_INSTALLED_KEY } from "../lib/focus-music/constants";
import { FocusMusicTrack } from "../types/focus-music";

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
const mockSignedUrl = jest.fn(async () => "https://example.com/focus.mp3");
const mockNetInfoFetch = jest.fn();

jest.mock("../lib/focus-music/catalog", () => ({
  fetchFocusMusicCatalog: () => mockFetchCatalog(),
}));

jest.mock("../lib/focus-music/signedUrl", () => ({
  createFocusMusicSignedUrl: (trackId: string) => mockSignedUrl(trackId),
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
  useAudioPlayer: () => ({
    loop: false,
    playing: false,
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
  }),
}));

describe("FocusMusicProvider", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockFetchCatalog.mockClear();
    mockSignedUrl.mockClear();
    mockNetInfoFetch.mockReset();
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

    let installResult;
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

    let firstAttempt;
    await act(async () => {
      firstAttempt = await result.current.installTrack("track-1");
    });

    expect(firstAttempt?.ok).toBe(false);
    if (firstAttempt && !firstAttempt.ok) {
      expect(firstAttempt.reason).toBe("cellular");
    }

    let secondAttempt;
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

    let installResult;
    await act(async () => {
      installResult = await result.current.installTrack("track-2");
    });

    expect(installResult?.ok).toBe(false);
    if (installResult && !installResult.ok) {
      expect(installResult.reason).toBe("limit");
    }
  });
});
