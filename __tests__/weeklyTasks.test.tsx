import { render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import WeeklyTasksScreen from "../components/feature/WeeklyTasksScreen";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

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

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => { });

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
    });

    mockSelectWeekly.mockReturnValue({ eq: mockEqWeekly });
    mockEqWeekly.mockReturnValue({ order: mockOrderWeekly });

    mockSelectMonthly.mockReturnValue({ eq: mockEqMonthly });
    mockEqMonthly.mockReturnValue({ order: mockOrderMonthly });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "weekly_tasks") {
        return { select: mockSelectWeekly, insert: jest.fn(), update: jest.fn(), delete: jest.fn() };
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

  test("renders weekly tasks and summary totals", async () => {
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

    const { findByText, getAllByText } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    expect(await findByText("Ship UX fixes")).toBeTruthy();
    expect(await findByText("Write docs")).toBeTruthy();

    // Summary totals: target 900m = 15h, logged 240m = 4h
    expect((await getAllByText("Target"))[0]).toBeTruthy();
    expect(await findByText("15h")).toBeTruthy();
    expect((await getAllByText("4h")).length).toBeGreaterThan(0);
    expect(await findByText("10h")).toBeTruthy();
    expect(await findByText("3h")).toBeTruthy();
  });
});
