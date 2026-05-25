import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import Dashboard from "../app/dashboard";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

const mockPush = jest.fn();
const mockGetAccessStateForUser = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
    useLocalSearchParams: () => ({}),
    Stack: { Screen: () => null },
    router: {
      push: (...args: unknown[]) => mockPush(...args),
      replace: jest.fn(),
    },
  };
});

jest.mock("expo-linear-gradient", () => {
  const MockLinearGradient = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockLinearGradient.displayName = "MockLinearGradient";
  return { LinearGradient: MockLinearGradient };
});

jest.mock("../components/Footer", () => () => null);
jest.mock("../components/LanguageSheet", () => () => null);
jest.mock("../components/MoreSheet", () => () => null);
jest.mock("../providers/FunPlanProvider", () => ({
  useFunPlan: () => ({ funPlanVisible: false, toggleFunPlan: jest.fn() }),
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
        error: null,
      }),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: (...args: unknown[]) => mockGetAccessStateForUser(...args),
}));

describe("Dashboard task timer entry", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage("en");
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active" },
      accessOverride: null,
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "yearly_goals") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [{ id: "year-1", year_goal_color: "#5f9cff" }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "weekly_tasks") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: "task-1",
                    description: "Write report",
                    yearly_goal_id: "year-1",
                    accumulated_time_week: 25,
                    order: 0,
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
    });
  });

  test("replaces the long-term goal card with a task timer card", () => {
    const { getByText, queryByText } = render(
      <I18nextProvider i18n={i18n}>
        <Dashboard />
      </I18nextProvider>,
    );

    expect(getByText("Task Timer")).toBeTruthy();
    expect(queryByText("Life Goals")).toBeNull();
  });

  test("opens the task timer selector and can continue without linking a weekly task", async () => {
    const { findByTestId, findByText, getByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <Dashboard />
      </I18nextProvider>,
    );

    fireEvent.press(getByTestId("dashboard-card-taskTimer"));

    expect(await findByText("Start Task Timer")).toBeTruthy();
    expect(await findByText("Do not link a weekly task")).toBeTruthy();
    fireEvent.press(getByTestId("dashboard-task-timer-task-select"));
    expect(await findByText("Write report")).toBeTruthy();

    fireEvent.press(await findByTestId("dashboard-task-timer-next"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/task-timer",
      params: { source: "dashboard" },
    });
  });

  test("shows weekly task loading inside the opened dropdown only", async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "yearly_goals") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [{ id: "year-1", year_goal_color: "#5f9cff" }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "weekly_tasks") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn(() => new Promise(() => undefined)),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
    });

    const { findByText, getAllByText, getByTestId, getByText, queryByText } = render(
      <I18nextProvider i18n={i18n}>
        <Dashboard />
      </I18nextProvider>,
    );

    fireEvent.press(getByTestId("dashboard-card-taskTimer"));

    expect(await findByText("Start Task Timer")).toBeTruthy();
    expect(queryByText("Loading weekly tasks...")).toBeNull();

    fireEvent.press(getByTestId("dashboard-task-timer-task-select"));

    expect(getAllByText("Do not link a weekly task")).toHaveLength(2);
    await waitFor(() => expect(getByText("Loading weekly tasks...")).toBeTruthy());
  });
});
