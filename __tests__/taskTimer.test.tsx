import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import * as Notifications from "expo-notifications";
import { Linking } from "react-native";
import TaskTimerScreen from "../components/feature/TaskTimerScreen";
import i18n from "../i18n";

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

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

jest.mock("../lib/timeTracking/updateAccumulatedTimes", () => ({
  updateAccumulatedTimes: jest.fn().mockResolvedValue({ delta: 0, newLoggedMinutes: 0 }),
}));

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
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
      <TaskTimerScreen />
    </I18nextProvider>,
  );

const mockGetPermissionsAsync = Notifications.getPermissionsAsync as jest.MockedFunction<
  typeof Notifications.getPermissionsAsync
>;
const mockOpenSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);

describe("TaskTimerScreen", () => {
  beforeEach(() => {
    mockGetPermissionsAsync.mockResolvedValue({
      status: Notifications.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    } as Notifications.NotificationPermissionsStatus);
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

  test("hides start button when timer is running", () => {
    const { getByText, getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByText("+5m"));
    fireEvent.press(getByTestId("start-button"));

    expect(queryByTestId("start-button")).toBeNull();
    expect(getByText("Pause")).toBeTruthy();
  });

  test("opens music modal and selects a track", () => {
    const { getByTestId, getByText } = renderScreen();

    fireEvent.press(getByTestId("music-select-button"));

    expect(getByText("Pick focus music")).toBeTruthy();

    fireEvent.press(getByText("Night Drive"));

    expect(getByText("Night Drive selected")).toBeTruthy();
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
      expect(getByText("Allow notifications so we can alert you when the timer ends.")).toBeTruthy();
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
      expect(queryByText("Allow notifications so we can alert you when the timer ends.")).toBeNull();
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
      expect(queryByText("Allow notifications so we can alert you when the timer ends.")).toBeNull();
    } finally {
      jest.useFakeTimers();
    }
  });
});
