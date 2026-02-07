import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import MonthlyGoalsScreen from "../components/feature/MonthlyGoalsScreen";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";
import { deleteMonthlyGoalWithWeeklyTasks } from "../lib/api/supabase/goals/cascadeDelete";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("../lib/api/supabase/goals/cascadeDelete", () => ({
  deleteMonthlyGoalWithWeeklyTasks: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => {
  return {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  };
});

describe("MonthlyGoalsScreen", () => {
  const mockSelectMonthly = jest.fn();
  const mockEqMonthly = jest.fn();
  const mockOrderMonthlyFirst = jest.fn();
  const mockOrderMonthlySecond = jest.fn();
  const mockSelectYearly = jest.fn();
  const mockEqYearly = jest.fn();
  const mockOrderYearly = jest.fn();

  const monthlyRows = [
    {
      id: "mg-feb-1",
      description: "Sleep 7+ hours consistently",
      month: 2,
      estimated_time_month: 1800,
      accumulated_time_month: 900,
      yearly_goal_id: "yg-health",
      order: 0,
      updated_at: "2025-02-01T09:00:00Z",
    },
    {
      id: "mg-feb-2",
      description: "Ship portfolio case studies update",
      month: 2,
      estimated_time_month: 1200,
      accumulated_time_month: 600,
      yearly_goal_id: "yg-career",
      order: 1,
      updated_at: "2025-02-03T09:00:00Z",
    },
  ];

  const yearlyRows = [
    {
      id: "yg-health",
      description: "Deep health routine with consistent sleep and workouts",
      year_goal_color: "#1E5EFF",
      order: 0,
    },
    {
      id: "yg-career",
      description: "Career leap with shipped projects and portfolio refresh",
      year_goal_color: "#6EA8FF",
      order: 1,
    },
  ];

  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <MonthlyGoalsScreen />
      </I18nextProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation((_, __, buttons) => {
      const destructive = buttons?.find((button) => button.style === "destructive");
      destructive?.onPress?.();
    });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("2");

    mockSelectMonthly.mockReturnValue({
      eq: mockEqMonthly,
    });
    mockEqMonthly.mockReturnValue({
      order: mockOrderMonthlyFirst,
    });
    mockOrderMonthlyFirst.mockReturnValue({
      order: mockOrderMonthlySecond,
    });
    mockOrderMonthlySecond.mockResolvedValue({
      data: monthlyRows,
      error: null,
    });

    mockSelectYearly.mockReturnValue({
      eq: mockEqYearly,
    });
    mockEqYearly.mockReturnValue({
      order: mockOrderYearly,
    });
    mockOrderYearly.mockResolvedValue({
      data: yearlyRows,
      error: null,
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "monthly_goals") {
        return {
          select: mockSelectMonthly,
          insert: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          upsert: jest.fn(),
        };
      }
      if (table === "yearly_goals") {
        return {
          select: mockSelectYearly,
          order: mockOrderYearly,
          eq: mockEqYearly,
        };
      }
      return {};
    });

    (deleteMonthlyGoalWithWeeklyTasks as jest.Mock).mockResolvedValue({ deletedCount: 0 });
  });

  test("shows summary and current month goals with progress totals", async () => {
    const { findByText, findAllByText } = renderScreen();

    expect(await findByText("Monthly goals")).toBeTruthy();
    expect(await findByText("Sleep 7+ hours consistently")).toBeTruthy();

    // Summary numbers for February seed data: target 50h, logged 25h
    expect((await findAllByText("Target"))[0]).toBeTruthy();
    expect(await findByText("50h")).toBeTruthy();
    expect((await findAllByText("Logged"))[0]).toBeTruthy();
    expect(await findByText("25h")).toBeTruthy();
  });

  test("truncates long yearly goal labels in the selector", async () => {
    const { getAllByRole, getByText, findAllByText } = renderScreen();

    await waitFor(() => expect(mockOrderMonthlySecond).toHaveBeenCalled());

    fireEvent.press(getAllByRole("button", { name: "Add" })[0]);
    fireEvent.press(getByText("Deep health routine with cons..."));

    const texts = await findAllByText("Career leap with shipped proj...");
    expect(texts[0]).toBeTruthy();
  });

  test("shows empty state when switching to a month without goals", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("3");
    const { findByText } = renderScreen();

    await waitFor(() => expect(mockOrderMonthlySecond).toHaveBeenCalled());

    expect(await findByText("No monthly goals for this month yet.")).toBeTruthy();
  });

  test("deletes weekly tasks when deleting a monthly goal", async () => {
    const mockDeleteMonthly = jest.fn().mockResolvedValue({ error: null });
    const mockUpsertMonthly = jest.fn().mockResolvedValue({ error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "monthly_goals") {
        return {
          select: mockSelectMonthly,
          insert: jest.fn(),
          update: jest.fn(),
          delete: mockDeleteMonthly,
          upsert: mockUpsertMonthly,
        };
      }
      if (table === "yearly_goals") {
        return {
          select: mockSelectYearly,
          order: mockOrderYearly,
          eq: mockEqYearly,
        };
      }
      return {};
    });

    const { getAllByRole } = renderScreen();

    await waitFor(() => expect(mockOrderMonthlySecond).toHaveBeenCalled());

    fireEvent.press(getAllByRole("button", { name: "Delete" })[0]);
    fireEvent.press(getAllByRole("button", { name: "Delete" })[0]);

    await waitFor(() => expect(deleteMonthlyGoalWithWeeklyTasks).toHaveBeenCalledWith("mg-feb-1"));
  });
});
