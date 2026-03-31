import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import MoreSheet from "../components/MoreSheet";
import i18n from "../i18n";
import {
  TIMER_ALARM_ENABLED_STORAGE_KEY,
  TimerAlarmPreferenceProvider,
} from "../providers/TimerAlarmPreferenceProvider";

describe("MoreSheet", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("shows fun plan and timer alarm as matching toggles and persists timer alarm value", async () => {
    const onToggleFunPlan = jest.fn();
    const { getByText, getByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <TimerAlarmPreferenceProvider>
          <MoreSheet visible onClose={jest.fn()} onToggleFunPlan={onToggleFunPlan} />
        </TimerAlarmPreferenceProvider>
      </I18nextProvider>,
    );

    expect(getByText("Next exciting plan")).toBeTruthy();
    expect(getByText("Timer end alarm")).toBeTruthy();
    expect(getByTestId("fun-plan-visibility-switch")).toBeTruthy();

    fireEvent(getByTestId("fun-plan-visibility-switch"), "valueChange", false);
    fireEvent(getByTestId("timer-alarm-switch"), "valueChange", false);

    expect(onToggleFunPlan).toHaveBeenCalledTimes(1);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(TIMER_ALARM_ENABLED_STORAGE_KEY)).toBe("false");
    });
  });
});
