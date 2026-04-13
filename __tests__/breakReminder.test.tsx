import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { AppState, type AppStateStatus } from "react-native";
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
    setNotificationHandler: jest.fn(),
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
  const MockPicker = jest.fn(
    ({ onChange, value, style }: { onChange?: (...args: any[]) => void; value: Date; style?: any }) => (
      <Text testID="break-reminder-datetime" onPress={() => onChange?.({ type: "set" }, value)} onChange={onChange} style={style}>
        {value.toISOString()}
      </Text>
    ),
  ) as jest.Mock & {
    DateTimePickerAndroid?: {
      open: jest.Mock;
      dismiss: jest.Mock;
    };
  };
  MockPicker.DateTimePickerAndroid = {
    open: jest.fn(),
    dismiss: jest.fn(),
  };
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

  test("uses Android imperative time picker instead of rendering the iOS picker inline", () => {
    const ReactNative = require("react-native");
    const dateTimePickerModule = jest.requireMock("@react-native-community/datetimepicker") as jest.Mock & {
      DateTimePickerAndroid: { open: jest.Mock };
    };
    const originalOs = ReactNative.Platform.OS;
    Object.defineProperty(ReactNative.Platform, "OS", {
      configurable: true,
      value: "android",
    });

    try {
      const { getByTestId, queryByTestId } = renderScreen();

      expect(queryByTestId("break-reminder-datetime")).toBeNull();

      fireEvent.press(getByTestId("break-reminder-android-date-button"));

      expect(dateTimePickerModule.DateTimePickerAndroid.open).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "date",
          display: "calendar",
        }),
      );

      fireEvent.press(getByTestId("break-reminder-android-time-button"));

      expect(dateTimePickerModule).not.toHaveBeenCalled();
      expect(dateTimePickerModule.DateTimePickerAndroid.open).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "time",
          display: "clock",
          is24Hour: false,
        }),
      );
      const latestParams = dateTimePickerModule.DateTimePickerAndroid.open.mock.calls.at(-1)?.[0];
      expect(latestParams.locale).toBeUndefined();
      expect(latestParams.textColor).toBeUndefined();
    } finally {
      Object.defineProperty(ReactNative.Platform, "OS", {
        configurable: true,
        value: originalOs,
      });
    }
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

  test("uses the exact iOS datetime picker value when scheduling", async () => {
    const { getByText, getByTestId } = renderScreen();
    const exactTime = new Date("2026-04-18T17:29:00.000Z");

    fireEvent(getByTestId("break-reminder-datetime"), "onChange", { type: "set" }, exactTime);
    fireEvent.press(getByText("Schedule reminder"));

    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          date: expect.any(Date),
        }),
      }),
    );
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.at(-1)?.[0];
    expect(call.trigger.date.getTime()).toBe(exactTime.getTime());
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
    expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        handleNotification: expect.any(Function),
      }),
    );
  });

  test("does not clear the schedule only because the target time has passed", async () => {
    const { getByText, getByTestId } = renderScreen();
    const nextTime = new Date(Date.now() + 60 * 1000);

    fireEvent(getByTestId("break-reminder-datetime"), "onChange", { type: "set" }, nextTime);
    fireEvent.press(getByText("Schedule reminder"));

    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());

    jest.advanceTimersByTime(2 * 60 * 1000);

    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(getByText(/Break reminder active/)).toBeTruthy();
    expect(getByText(/Time remaining/)).toBeTruthy();
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

  test("on Android, returning to the app clears an already-fired reminder", async () => {
    const ReactNative = require("react-native");
    const originalOs = ReactNative.Platform.OS;
    const baseTime = new Date("2026-04-18T17:00:00.000Z");
    let appStateListener: ((state: AppStateStatus) => void) | null | undefined | any;
    const appStateSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() } as any;
      });
    Object.defineProperty(ReactNative.Platform, "OS", {
      configurable: true,
      value: "android",
    });

    jest.setSystemTime(baseTime);
    await AsyncStorage.setItem(
      "break_reminder_schedule",
      JSON.stringify({
        fireDate: baseTime.getTime() + 60 * 1000,
        notificationId: "notif-active",
      }),
    );
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock)
      .mockResolvedValueOnce([{ identifier: "notif-active" }])
      .mockResolvedValueOnce([]);

    try {
      const { getByText, getByTestId, queryByText } = renderScreen();

      await waitFor(() => expect(getByText(/Break reminder active/)).toBeTruthy());

      jest.setSystemTime(new Date(baseTime.getTime() + 2 * 60 * 1000));
      if (appStateListener) {
        appStateListener("active");
      }

      await waitFor(() =>
        expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2),
      );
      await waitFor(() => expect(getByTestId("break-reminder-android-date-button")).toBeTruthy());
      expect(queryByText(/Break reminder active/)).toBeNull();
    } finally {
      appStateSpy.mockRestore();
      Object.defineProperty(ReactNative.Platform, "OS", {
        configurable: true,
        value: originalOs,
      });
    }
  });
});
