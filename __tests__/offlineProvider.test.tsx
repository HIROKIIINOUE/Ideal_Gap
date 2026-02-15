import { render, screen } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import { OfflineProvider, useOffline } from "../providers/OfflineProvider";

const mockFetch = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: () => mockFetch(),
    addEventListener: (listener: (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) =>
      mockAddEventListener(listener),
  },
}));

function Probe() {
  const { offlineBlocked } = useOffline();
  return <Text>{offlineBlocked ? "offline" : "online"}</Text>;
}

describe("OfflineProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddEventListener.mockReturnValue(jest.fn());
  });

  test("switches to offline when listener reports disconnected", async () => {
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });

    let handler: ((state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) | null = null;
    mockAddEventListener.mockImplementation((listener) => {
      handler = listener as (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void;
      return jest.fn();
    });

    render(
      <OfflineProvider>
        <Probe />
      </OfflineProvider>,
    );

    expect(await screen.findByText("online")).toBeTruthy();

    if (handler) {
      (handler as (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void)({
        isConnected: false,
        isInternetReachable: false,
      });
    }

    expect(await screen.findByText("offline")).toBeTruthy();
  });
});
