import { render } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Platform } from "react-native";
import Dashboard from "../app/dashboard";
import i18n from "../i18n";

const mockGetAccessStateForUser = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
    useLocalSearchParams: () => ({}),
    Stack: { Screen: () => null },
    router: {
      push: jest.fn(),
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

describe("Dashboard sentry test button", () => {
  const originalAppEnv = process.env.APP_ENV;
  const originalPlatform = Platform.OS;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active" },
      accessOverride: null,
    });
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    process.env.APP_ENV = originalAppEnv;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform,
    });
  });

  test("does not render the sentry test button when APP_ENV is not prod", () => {
    process.env.APP_ENV = "dev";

    const { queryByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <Dashboard />
      </I18nextProvider>,
    );

    expect(queryByTestId("sentry-test-button")).toBeNull();
  });

  test("does not render the sentry test button in production", () => {
    process.env.APP_ENV = "prod";

    const { queryByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <Dashboard />
      </I18nextProvider>,
    );
    expect(queryByTestId("sentry-test-button")).toBeNull();
  });

  test("uses smaller Android Japanese typography for dashboard tiles", async () => {
    process.env.APP_ENV = "dev";
    await i18n.changeLanguage("ja");
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });

    const { findByText } = render(
      <I18nextProvider i18n={i18n}>
        <Dashboard />
      </I18nextProvider>,
    );

    const tileTitle = await findByText("理想の自分");
    expect(tileTitle).toHaveStyle({ fontSize: 18 });
  });
});
