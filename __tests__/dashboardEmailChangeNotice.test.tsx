import { render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import Dashboard from "../app/dashboard";
import i18n from "../i18n";

const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
    useLocalSearchParams: () => mockUseLocalSearchParams(),
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
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe("Dashboard email change completion notice", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage("ja");
  });

  test("shows completion popup and removes query when opened with emailUpdated flag", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockUseLocalSearchParams.mockReturnValue({ emailUpdated: "1" });

    render(
      <I18nextProvider i18n={i18n}>
        <Dashboard />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("メールアドレス変更が完了しました");
    });
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });
});
