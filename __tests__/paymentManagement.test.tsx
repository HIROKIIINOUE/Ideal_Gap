import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import PaymentManagement from "../app/payment-management";
import i18n from "../i18n";

const mockOpenPortal = jest.fn();
const mockGetSubscription = jest.fn();

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

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

jest.mock("../lib/subscriptionManagement", () => ({
  openSubscriptionManagementPortal: () => mockOpenPortal(),
}));

jest.mock("../lib/subscription", () => ({
  getSubscriptionForUser: (...args: unknown[]) => mockGetSubscription(...args),
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
  },
}));

describe("PaymentManagement", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockOpenPortal.mockResolvedValue("customer_center");
    mockGetSubscription.mockResolvedValue({ status: "active" });
    await i18n.changeLanguage("ja");
  });

  it("shows current subscription status", async () => {
    const screen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(mockGetSubscription).toHaveBeenCalledWith("user-123");
    });

    expect(await screen.findByText("現在の契約ステータス")).toBeTruthy();
    expect(await screen.findByText(/有効|サブスクリプション中/)).toBeTruthy();
  });

  it("opens management portal when tapping button", async () => {
    const screen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    fireEvent.press(await screen.findByText("支払い設定を開く"));

    await waitFor(() => {
      expect(mockOpenPortal).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error when opening portal fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockOpenPortal.mockRejectedValueOnce(new Error("open failed"));

    const screen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    fireEvent.press(await screen.findByText("支払い設定を開く"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "支払い設定を開けませんでした。時間をおいて再度お試しください。",
      );
    });

    alertSpy.mockRestore();
  });
});
