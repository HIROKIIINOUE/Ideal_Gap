import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";
import PaymentManagement from "../app/payment-management";
import i18n from "../i18n";

const mockOpenPortal = jest.fn();
const mockGetAccessState = jest.fn();

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
  getAccessStateForUser: (...args: unknown[]) => mockGetAccessState(...args),
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
    mockGetAccessState.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active" },
      accessOverride: null,
    });
    await i18n.changeLanguage("ja");
  });

  it("shows current subscription status", async () => {
    const screen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(mockGetAccessState).toHaveBeenCalledWith("user-123");
    });

    expect(await screen.findByText("現在の契約ステータス")).toBeTruthy();
    expect(await screen.findByText(/有効|サブスクリプション中/)).toBeTruthy();
  });

  it("redirects free users to purchases", async () => {
    mockGetAccessState.mockResolvedValue({
      canAccessApp: true,
      accessMode: "free",
      subscription: null,
      accessOverride: null,
    });

    const screen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/purchases");
    });
  });

  it("redirects expired free users to purchases", async () => {
    mockGetAccessState.mockResolvedValue({
      canAccessApp: true,
      accessMode: "free",
      subscription: { status: "expired" },
      accessOverride: null,
    });

    const screen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/purchases");
    });
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

  it("allows friend free users to stay on payment management", async () => {
    mockGetAccessState.mockResolvedValue({
      canAccessApp: true,
      accessMode: "friend_free",
      subscription: null,
      accessOverride: { access_type: "friend_free", is_active: true },
    });

    const screen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    expect(await screen.findByText("友人向け無料アクセス")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalledWith("/purchases");
  });

  it("shows a cancellation notice when an active subscription is set to cancel at period end", async () => {
    mockGetAccessState.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active", cancel_at_period_end: true },
      accessOverride: null,
    });

    const screen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    expect(
      await screen.findByText(
        "キャンセル済みです。次回のお支払いは発生しません。前回支払い分の期間中は引き続き有料プランで使用できます。再開する場合は以下のボタンから支払い設定を開いてください。",
      ),
    ).toBeTruthy();
  });

  it("shows a cancellation notice when a trial subscription is set to cancel at period end", async () => {
    mockGetAccessState.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "trial", cancel_at_period_end: true },
      accessOverride: null,
    });

    const screen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    expect(
      await screen.findByText(
        "キャンセル済みです。次回のお支払いは発生しません。無料トライアル期間中は引き続き有料プランで使用できます。再開する場合は以下のボタンから支払い設定を開いてください。",
      ),
    ).toBeTruthy();
  });

  it("renders the cancellation notice in English and French", async () => {
    mockGetAccessState.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active", cancel_at_period_end: true },
      accessOverride: null,
    });

    await i18n.changeLanguage("en");
    const englishScreen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    expect(
      await englishScreen.findByText(
        "Your subscription has been canceled. No further payments will be charged. You can continue using the paid plan during the period covered by your last payment. To resume your subscription, open your billing settings with the button below.",
      ),
    ).toBeTruthy();

    englishScreen.unmount();

    await i18n.changeLanguage("fr");
    const frenchScreen = render(
      <I18nextProvider i18n={i18n}>
        <PaymentManagement />
      </I18nextProvider>,
    );

    expect(
      await frenchScreen.findByText(
        "Votre abonnement a été annulé. Aucun autre paiement ne sera facturé. Vous pouvez continuer à utiliser le forfait payant pendant la période couverte par votre dernier paiement. Pour reprendre votre abonnement, ouvrez les paramètres de paiement avec le bouton ci-dessous.",
      ),
    ).toBeTruthy();
  });
});
