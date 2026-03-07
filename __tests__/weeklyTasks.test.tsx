import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import WeeklyTasksScreen from "../components/feature/WeeklyTasksScreen";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";
import { deleteWeeklyTasks } from "../lib/api/supabase/goals/allItemDelete";

jest.useFakeTimers().setSystemTime(new Date("2025-02-10T00:00:00Z"));

jest.mock("@expo/vector-icons", () => {
  const MockIcon = () => null;
  MockIcon.displayName = "MockMaterialCommunityIcons";
  return { MaterialCommunityIcons: MockIcon };
});

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: () => {},
}));

jest.mock("expo-linear-gradient", () => {
  const MockLinearGradient = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockLinearGradient.displayName = "MockLinearGradient";
  return { LinearGradient: MockLinearGradient };
});


jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("../lib/api/supabase/goals/allItemDelete", () => ({
  deleteWeeklyTasks: jest.fn(),
}));

const renderScreen = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <WeeklyTasksScreen />
    </I18nextProvider>,
  );

describe("WeeklyTasksScreen", () => {
  const mockSelectWeekly = jest.fn();
  const mockEqWeekly = jest.fn();
  const mockOrderWeekly = jest.fn();
  const mockSelectMonthly = jest.fn();
  const mockEqMonthly = jest.fn();
  const mockOrderMonthly = jest.fn();
  const mockDeleteWeekly = jest.fn();
  const mockEqDeleteWeekly = jest.fn();
  const mockUpsertWeekly = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation((_, __, buttons) => {
      const destructive = buttons?.find((button) => button.style === "destructive");
      destructive?.onPress?.();
    });

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
    });

    mockSelectWeekly.mockReturnValue({ eq: mockEqWeekly });
    mockEqWeekly.mockReturnValue({ order: mockOrderWeekly });
    mockDeleteWeekly.mockReturnValue({ eq: mockEqDeleteWeekly });
    mockEqDeleteWeekly.mockResolvedValue({ error: null });
    mockUpsertWeekly.mockResolvedValue({ error: null });

    mockSelectMonthly.mockReturnValue({ eq: mockEqMonthly });
    mockEqMonthly.mockReturnValue({ order: mockOrderMonthly });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "weekly_tasks") {
        return {
          select: mockSelectWeekly,
          insert: jest.fn(),
          update: jest.fn(),
          delete: mockDeleteWeekly,
          upsert: mockUpsertWeekly,
        };
      }
      if (table === "monthly_goals") {
        return { select: mockSelectMonthly };
      }
      return {};
    });
  });

  test("shows empty state when no weekly tasks", async () => {
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });
    mockOrderMonthly.mockResolvedValue({
      data: [
        { id: "m1", description: "April UX", month: 4, yearly_goal_id: "y1", yearly_goals: { year_goal_color: "#1E5EFF" } },
      ],
      error: null,
    });

    const { findByText } = renderScreen();

    expect(await findByText("Weekly Tasks")).toBeTruthy();
    expect(await findByText("No tasks yet")).toBeTruthy();
  });

  test("renders weekly tasks without header summary UI", async () => {
    mockOrderMonthly.mockResolvedValue({
      data: [
        { id: "m1", description: "April UX", month: 4, yearly_goal_id: "y1", yearly_goals: { year_goal_color: "#1E5EFF" } },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          monthly_goal_id: "m1",
          estimated_time_week: 600,
          accumulated_time_week: 180,
          order: 0,
        },
        {
          id: "w2",
          description: "Write docs",
          monthly_goal_id: "m1",
          estimated_time_week: 300,
          accumulated_time_week: 60,
          order: 1,
        },
      ],
      error: null,
    });

    const { findByText, queryByText } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    expect(await findByText("Ship UX fixes")).toBeTruthy();
    expect(await findByText("Write docs")).toBeTruthy();

    expect(queryByText("Weekly progress")).toBeFalsy();
    expect(await findByText("3h")).toBeTruthy();
  });

  test("hides edit action in list mode and keeps timer with reorder", async () => {
    mockOrderMonthly.mockResolvedValue({
      data: [
        { id: "m1", description: "April UX", month: 4, yearly_goal_id: "y1", yearly_goals: { year_goal_color: "#1E5EFF" } },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          monthly_goal_id: "m1",
          estimated_time_week: 600,
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { findByRole, getByRole, getByTestId, queryByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "List view" }));

    expect(await findByRole("button", { name: "Drag to reorder" })).toBeTruthy();
    expect(getByTestId("weekly-task-list-timer-w1")).toBeTruthy();
    expect(queryByTestId("weekly-task-list-edit-w1")).toBeFalsy();
  });

  test("localizes month labels in the add modal", async () => {
    const currentMonth = new Date().getMonth() + 1;
    const monthNames = i18n.t("monthsShort", { ns: "monthlyGoals", returnObjects: true }) as string[];
    const monthLabel = monthNames[currentMonth - 1];
    mockOrderMonthly.mockResolvedValue({
      data: [
        {
          id: "m1",
          description: "Focus this month",
          month: currentMonth,
          yearly_goal_id: "y1",
          yearly_goals: { year_goal_color: "#1E5EFF" },
        },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });

    const { findByText, getByText, getByPlaceholderText, queryByText } = renderScreen();

    await waitFor(() => expect(mockOrderMonthly).toHaveBeenCalled());

    fireEvent.press(await findByText("Add"));

    const titlePlaceholder = i18n.t("modal.titlePlaceholder", { ns: "weeklyTasks" }) as string;

    await waitFor(() => expect(getByText("Month to show monthly goals")).toBeTruthy());
    expect(getByPlaceholderText(titlePlaceholder)).toBeTruthy();

    expect(getByText(monthLabel)).toBeTruthy();
    expect(getByText(`${monthLabel}: Focus this month`)).toBeTruthy();
    expect(queryByText(`${currentMonth}月`)).toBeFalsy();
  });

  test("does not show a success alert after deleting a weekly task", async () => {
    mockOrderMonthly.mockResolvedValue({
      data: [
        {
          id: "m1",
          description: "April UX",
          month: 4,
          yearly_goal_id: "y1",
          yearly_goals: { year_goal_color: "#1E5EFF" },
        },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          monthly_goal_id: "m1",
          estimated_time_week: 600,
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { getAllByRole, getByRole } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());
    (Alert.alert as jest.Mock).mockClear();

    fireEvent.press(getByRole("button", { name: "Delete" }));
    fireEvent.press(getAllByRole("button", { name: "Delete" })[0]);

    await waitFor(() => {
      expect(mockEqDeleteWeekly).toHaveBeenCalledWith("id", "w1");
      expect(Alert.alert).toHaveBeenCalledTimes(1);
    });
  });

  test("shows a bulk delete success alert when deleting all weekly tasks", async () => {
    (deleteWeeklyTasks as jest.Mock).mockResolvedValue(undefined);
    mockOrderMonthly.mockResolvedValue({
      data: [
        {
          id: "m1",
          description: "April UX",
          month: 4,
          yearly_goal_id: "y1",
          yearly_goals: { year_goal_color: "#1E5EFF" },
        },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          monthly_goal_id: "m1",
          estimated_time_week: 600,
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { getByRole, getAllByRole } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Delete" }));
    fireEvent.press(getAllByRole("button", { name: "Delete all" })[0]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenLastCalledWith("Deleted all", "All weekly tasks were deleted.");
    });
  });

});
