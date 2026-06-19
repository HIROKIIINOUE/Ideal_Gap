import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { router } from "expo-router";
import Purchases from "../app/purchases";
import i18n from "../i18n";
import { colors } from "../constants/theme";
import { LanguageProvider } from "../providers/LanguageProvider";
import {
  fetchRevenueCatPackage,
  purchaseSelectedPackage,
} from "../lib/revenuecatOfferings";
import {
  getAccessStateForUser,
  waitForActiveSubscription,
} from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";

const mockStackScreen = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
  Stack: {
    Screen: (props: unknown) => {
      mockStackScreen(props);
      return null;
    },
  },
  useLocalSearchParams: () => ({}),
}));

jest.mock("../lib/revenuecatOfferings", () => ({
  fetchRevenueCatPackage: jest.fn(),
  purchaseSelectedPackage: jest.fn(),
  hasActiveEntitlement: (customerInfo: any, entitlementId = "premium") =>
    Boolean(customerInfo?.entitlements?.active?.[entitlementId]),
}));
jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: jest.fn(),
  waitForActiveSubscription: jest.fn(),
  canAccessDashboardWithSubscriptionStatus: (status: string | null | undefined) =>
    status === "active" || status === "trial",
}));
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockFetchRevenueCatPackage = fetchRevenueCatPackage as jest.Mock;
const mockPurchaseSelectedPackage = purchaseSelectedPackage as jest.Mock;
const mockGetAccessStateForUser = getAccessStateForUser as jest.Mock;
const mockWaitForActiveSubscription = waitForActiveSubscription as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;

const renderWithProviders = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <Purchases />
      </LanguageProvider>
    </I18nextProvider>,
  );

describe("Purchases screen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("preferred_language", "en");
    await i18n.changeLanguage("en");
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "free",
      subscription: null,
      accessOverride: null,
    });
    mockFetchRevenueCatPackage.mockResolvedValue({
      package: { identifier: "monthly" },
      priceString: "$9.99",
      trialDuration: { unit: "MONTH", value: 1 },
    });
    mockWaitForActiveSubscription.mockResolvedValue({ status: "trial" });
    mockPurchaseSelectedPackage.mockResolvedValue({
      customerInfo: { entitlements: { active: { premium: { identifier: "premium" } } } },
    });
    (router.replace as jest.Mock).mockClear();
  });

  it("shows RevenueCat pricing and completes purchase", async () => {
    const screen = renderWithProviders();

    await waitFor(() =>
      expect(mockFetchRevenueCatPackage).toHaveBeenCalled(),
    );

    await screen.findByText("Standard plan");
    await screen.findByText("Free for 1 month, then renews at $9.99/month.");
    await screen.findByText("If you cancel during the free trial, you will not be charged.");
    await screen.findByText(
      "Payment details are managed securely by App Store. We never store your credit card number in this app."
    );

    const button = await screen.findByRole("button", { name: "Continue to payment" });
    const screenOptions = mockStackScreen.mock.calls[0]?.[0] as {
      options?: { headerLeft?: () => React.ReactElement };
    };
    const headerLeft = screenOptions.options?.headerLeft;
    const headerElement = headerLeft?.() as React.ReactElement<{ children: React.ReactNode }> | undefined;
    const headerContent = headerElement?.props.children as React.ReactElement<{ children: React.ReactNode }>;
    const [, headerLabel] = React.Children.toArray(headerContent.props.children) as Array<
      React.ReactElement<{ style?: object }>
    >;

    expect(button).toHaveStyle({ backgroundColor: colors.accentPrimary });
    expect(headerLeft).toBeDefined();
    expect(headerLabel.props.style).toEqual(
      expect.objectContaining({ color: colors.textPrimary }),
    );
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockPurchaseSelectedPackage).toHaveBeenCalledWith({ identifier: "monthly" });
      expect(mockWaitForActiveSubscription).toHaveBeenCalledWith("user-123");
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("retries loading pricing when retry button is pressed", async () => {
    mockFetchRevenueCatPackage
      .mockRejectedValueOnce(new Error("load failed"))
      .mockResolvedValueOnce({
        package: { identifier: "monthly" },
        priceString: "$9.99",
        trialDuration: { unit: "MONTH", value: 1 },
      });

    const screen = renderWithProviders();

    const retryButton = await screen.findByRole("button", { name: "Retry pricing" });
    await screen.findByText("Could not load pricing. Please try again.");
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockFetchRevenueCatPackage).toHaveBeenCalledTimes(2);
    });
  });

  it("signs out and returns to home when return-home button is pressed", async () => {
    const multiRemoveSpy = jest.spyOn(AsyncStorage, "multiRemove").mockResolvedValue();
    const screen = renderWithProviders();

    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalled());

    const returnButton = await screen.findByRole("button", { name: "Return to home" });
    fireEvent.press(returnButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
      expect(multiRemoveSpy).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("clears persisted auth data and returns home when local session is already missing", async () => {
    const multiRemoveSpy = jest.spyOn(AsyncStorage, "multiRemove").mockResolvedValue();
    mockSignOut.mockResolvedValueOnce({
      error: { message: "Auth session missing!" },
    });

    const screen = renderWithProviders();

    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalled());

    const returnButton = await screen.findByRole("button", { name: "Return to home" });
    fireEvent.press(returnButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
      expect(multiRemoveSpy).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("redirects to dashboard when subscription is already active", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active" },
      accessOverride: null,
    });

    renderWithProviders();

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });

    expect(mockFetchRevenueCatPackage).not.toHaveBeenCalled();
  });

  it("stays on purchases when subscription is canceled", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: false,
      accessMode: "none",
      resolution: "not_entitled",
      subscription: { status: "canceled" },
      accessOverride: null,
    });

    renderWithProviders();

    await waitFor(() => {
        expect(mockFetchRevenueCatPackage).toHaveBeenCalled();
    });

    expect(router.replace).not.toHaveBeenCalledWith("/dashboard");
  });

  it("returns to dashboard when access cannot be verified", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      resolution: "unknown",
      unknownReason: "subscription_fetch_failed",
      subscription: null,
      accessOverride: null,
      source: "last_known_cache",
    });

    renderWithProviders();

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });

    expect(mockFetchRevenueCatPackage).not.toHaveBeenCalled();
  });

  it("redirects to dashboard when friend free override is active", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "friend_free",
      subscription: { status: "signupAwait" },
      accessOverride: { access_type: "friend_free", is_active: true },
    });

    renderWithProviders();

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });

    expect(mockFetchRevenueCatPackage).not.toHaveBeenCalled();
  });

  it("localizes page label and trial notice in Japanese", async () => {
    await AsyncStorage.setItem("preferred_language", "ja");
    await i18n.changeLanguage("ja");
    const screen = renderWithProviders();

    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalled());

    const labels = await screen.findAllByText(/購入|お支払い/);
    expect(labels.length).toBeGreaterThan(0);
    await screen.findByText("無料期間中にキャンセルすれば請求は発生しません。");
  });

  it("localizes purchase copy and trial notice in French", async () => {
    await AsyncStorage.setItem("preferred_language", "fr");
    await i18n.changeLanguage("fr");
    const screen = renderWithProviders();

    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalled());

    await screen.findByText("Ajouter un moyen de paiement");
    await screen.findByText(
      /Si vous annulez pendant l'essai gratuit/i
    );
  });
});
