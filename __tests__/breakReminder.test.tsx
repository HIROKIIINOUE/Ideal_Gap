import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import React from "react";
import { I18nextProvider } from "react-i18next";
import BreakReminderScreen from "../components/feature/BreakReminderScreen";
import i18n from "../i18n";

jest.useFakeTimers();

jest.mock("../providers/LanguageProvider", () => ({
  useLanguage: () => ({ language: "ja", setLanguage: jest.fn(), ready: true }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-notifications", () => {
  const actual = jest.requireActual("expo-notifications");
  const listenerStore: Array<(notification: Notifications.Notification) => void> = [];
  return {
    ...actual,
    __listeners: listenerStore,
    AndroidImportance: {
      MAX: 5,
    },
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    scheduleNotificationAsync: jest.fn().mockResolvedValue("notif-123"),
    cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
    setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
    getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
    addNotificationReceivedListener: jest.fn((cb) => {
      listenerStore.push(cb);
      return { remove: jest.fn() };
    }),
  };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const MockPicker = ({ onChange, value, style }: { onChange?: (...args: any[]) => void; value: Date; style?: any }) => (
    <Text testID="break-reminder-datetime" onPress={() => onChange?.({ type: "set" }, value)} onChange={onChange} style={style}>
      {value.toISOString()}
    </Text>
  );
  MockPicker.displayName = "MockDateTimePicker";
  return MockPicker;
});

const renderScreen = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <BreakReminderScreen />
    </I18nextProvider>,
  );

describe("BreakReminderScreen", () => {
  beforeEach(async () => {
    const mockModule = jest.requireMock("expo-notifications") as { __listeners: Array<(notification: Notifications.Notification) => void> };
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockModule.__listeners.splice(0, mockModule.__listeners.length);
  });

  test("shows explanation and input when no reminder is set", () => {
    const { getByText, getByTestId } = renderScreen();

    expect(getByText(i18n.t("title", { ns: "breakReminder" }))).toBeTruthy();
    expect(getByText(i18n.t("description", { ns: "breakReminder" }))).toBeTruthy();
    expect(getByTestId("break-reminder-scroll")).toBeTruthy();
    expect(getByTestId("break-reminder-datetime")).toBeTruthy();
    expect(getByText(i18n.t("schedule", { ns: "breakReminder" }))).toBeTruthy();
  });

  test("applies compact styling to the datetime picker", () => {
    const { getByTestId } = renderScreen();

    expect(getByTestId("break-reminder-datetime")).toHaveStyle({
      transform: [{ scaleX: 0.8 }, { scaleY: 0.94 }, { translateX: -39.199999999999996 }],
    });
  });

  test("schedules a reminder and hides the input", async () => {
    const { getByText, getByTestId, queryByTestId } = renderScreen();
    const nextTime = new Date(Date.now() + 5 * 60 * 1000);

    fireEvent(getByTestId("break-reminder-datetime"), "onChange", { type: "set" }, nextTime);
    fireEvent.press(getByText("Schedule reminder"));

    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
    await waitFor(() => expect(queryByTestId("break-reminder-datetime")).toBeNull());
    expect(getByText(/Reminder set for/)).toBeTruthy();
    expect(getByText(/Break reminder active/)).toBeTruthy();
    expect(getByText(/Time remaining/)).toBeTruthy();
  });

  test("schedules a reminder with default sound", async () => {
    const { getByText, getByTestId } = renderScreen();
    const nextTime = new Date(Date.now() + 5 * 60 * 1000);

    fireEvent(getByTestId("break-reminder-datetime"), "onChange", { type: "set" }, nextTime);
    fireEvent.press(getByText("Schedule reminder"));

    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "Break is over",
          body: "Time to start your next task.",
          sound: "default",
        }),
      }),
    );
  });

  test("cancels an existing reminder", async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce("notif-cancel");
    const { getByText, getByTestId } = renderScreen();
    const nextTime = new Date(Date.now() + 10 * 60 * 1000);

    fireEvent(getByTestId("break-reminder-datetime"), "onChange", { type: "set" }, nextTime);
    fireEvent.press(getByText("Schedule reminder"));
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());

    fireEvent.press(getByText("Cancel reminder"));

    await waitFor(() => expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("notif-cancel"));
    expect(getByTestId("break-reminder-datetime")).toBeTruthy();
    expect(() => getByText(/Break reminder active/)).toThrow();
  });

  test("clears stored reminder when notification is received", async () => {
    const { __listeners } = jest.requireMock("expo-notifications") as {
      __listeners: Array<(notification: Notifications.Notification) => void>;
    };
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce("notif-clear");
    const { getByText, getByTestId, queryByText } = renderScreen();
    const nextTime = new Date(Date.now() + 2 * 60 * 1000);

    fireEvent(getByTestId("break-reminder-datetime"), "onChange", { type: "set" }, nextTime);
    fireEvent.press(getByText("Schedule reminder"));
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());

    const listener = __listeners[0];
    listener?.({ request: { identifier: "notif-clear" } } as Notifications.Notification);

    await waitFor(() => expect(queryByText(/Reminder set for/)).toBeNull());
    expect(getByTestId("break-reminder-datetime")).toBeTruthy();
    expect(() => getByText(/Break reminder active/)).toThrow();
  });
});
