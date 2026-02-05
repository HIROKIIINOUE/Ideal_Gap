import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
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
  {
    id: "track-6",
    title: "Morning Grain",
    bucket: "focus-music",
    storagePath: "tracks/morning-grain.mp3",
    durationSeconds: 200,
  },
];

const mockFetchCatalog = jest.fn(async () => mockCatalog);
const mockSignedUrl = jest.fn(
  async (_trackId: string) => "https://example.com/focus.mp3",
);
const mockNetInfoFetch = jest.fn();

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
    mockNetInfoFetch.mockReset();
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
      "Install limit reached",
      "You can install up to 5 tracks. Remove a track from your list to install another one.",
    );
  });
});
