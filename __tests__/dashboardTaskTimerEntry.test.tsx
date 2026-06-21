import { fireEvent, render } from "@testing-library/react-native";
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
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    }));
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

  test("navigates directly to the task timer from dashboard", () => {
    const { getByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <Dashboard />
      </I18nextProvider>,
    );

    fireEvent.press(getByTestId("dashboard-card-taskTimer"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/task-timer",
      params: { source: "dashboard" },
    });
  });
});
