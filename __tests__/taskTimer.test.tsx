import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
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

describe("TaskTimerScreen", () => {
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
});
