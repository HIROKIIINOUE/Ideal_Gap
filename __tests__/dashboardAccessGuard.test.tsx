import { render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import Dashboard from "../app/dashboard";
import i18n from "../i18n";

const mockReplace = jest.fn();
const mockGetSubscriptionForUser = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
    useLocalSearchParams: () => ({}),
    Stack: { Screen: () => null },
    router: {
      push: jest.fn(),
      replace: (...args: unknown[]) => mockReplace(...args),
      back: jest.fn(),
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
  getSubscriptionForUser: (...args: unknown[]) => mockGetSubscriptionForUser(...args),
  canAccessDashboardWithSubscriptionStatus: (status: string | null | undefined) =>
    status === "active" || status === "trial",
}));

describe("Dashboard access guard", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage("ja");
  });

  test("redirects to purchases when subscription status is canceled", async () => {
    mockGetSubscriptionForUser.mockResolvedValue({ status: "canceled" });

    render(
      <I18nextProvider i18n={i18n}>
        <Dashboard />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/purchases");
    });
  });
});
