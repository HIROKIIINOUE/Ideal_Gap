import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import MonthlyGoalsScreen from "../components/feature/MonthlyGoalsScreen";
import i18n from "../i18n";

jest.useFakeTimers().setSystemTime(new Date("2025-02-10T00:00:00Z"));

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

jest.mock("react-native-draggable-flatlist", () => {
  const React = require("react");
  const MockFlatList = ({
    data,
    renderItem,
  }: {
    data: unknown[];
    renderItem: (params: { item: unknown; index: number; drag: () => void; isActive: boolean; getIndex: () => number }) => React.ReactNode;
  }) => (
    <>
      {data.map((item, index) =>
        renderItem({
          item,
          index,
          drag: () => {},
          isActive: false,
          getIndex: () => index,
        }),
      )}
    </>
  );
  MockFlatList.displayName = "MockDraggableFlatList";
  return MockFlatList;
});

describe("MonthlyGoalsScreen", () => {
  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <MonthlyGoalsScreen />
      </I18nextProvider>,
    );

  test("shows summary and current month goals with progress totals", async () => {
    const { getByText, getAllByText } = renderScreen();

    expect(getByText("Monthly goals")).toBeTruthy();
    expect(getAllByText("Feb")[0]).toBeTruthy();
    expect(getByText("Sleep 7+ hours consistently")).toBeTruthy();

    // Summary numbers for February seed data: target 50h, logged 25h
    expect(getAllByText("Target")[0]).toBeTruthy();
    expect(getByText("50h")).toBeTruthy();
    expect(getAllByText("Logged")[0]).toBeTruthy();
    expect(getByText("25h")).toBeTruthy();
  });

  test("truncates long yearly goal labels in the selector", async () => {
    const { getByRole, getByText, getAllByText } = renderScreen();

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.press(getByText("Deep health routine with cons..."));

    await waitFor(() => {
      expect(getAllByText("Career leap with shipped proj...")[0]).toBeTruthy();
    });
  });

  test("shows empty state when switching to a month without goals", async () => {
    const { getByText, getByRole } = renderScreen();

    fireEvent.press(getByRole("button", { name: "Mar" }));

    await waitFor(() => {
      expect(getByText("No monthly goals for this month yet.")).toBeTruthy();
    });
  });
});
