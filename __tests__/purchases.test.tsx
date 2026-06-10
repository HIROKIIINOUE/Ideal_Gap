import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";
import PurchasesScreen from "../app/purchases";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

const mockFetchTestStorePackage = jest.fn();
const mockPurchaseSelectedPackage = jest.fn();
const mockEnsureSignupAwaitSubscription = jest.fn();
const mockGetAccessStateForUser = jest.fn();
const mockWaitForActiveSubscription = jest.fn();

let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Stack: { Screen: () => null },
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => mockParams,
  };
});

jest.mock("../components/LanguageSheet", () => () => null);
jest.mock("../components/Footer", () => () => null);

jest.mock("../lib/revenuecatOfferings", () => ({
  fetchTestStorePackage: (...args: unknown[]) => mockFetchTestStorePackage(...args),
  purchaseSelectedPackage: (...args: unknown[]) => mockPurchaseSelectedPackage(...args),
  hasActiveEntitlement: (customerInfo: any, entitlementId = "premium") =>
    Boolean(customerInfo?.entitlements?.active?.[entitlementId]),
}));

jest.mock("../lib/subscription", () => ({
  ensureSignupAwaitSubscription: (...args: unknown[]) =>
    mockEnsureSignupAwaitSubscription(...args),
  getAccessStateForUser: (...args: unknown[]) => mockGetAccessStateForUser(...args),
  waitForActiveSubscription: (...args: unknown[]) =>
    mockWaitForActiveSubscription(...args),
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

const renderScreen = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <PurchasesScreen />
    </I18nextProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: { user: { id: "user-123" } } },
    error: null,
  });
  (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
  mockFetchTestStorePackage.mockResolvedValue({
    package: {
      identifier: "monthly",
      product: {
        priceString: "$8.50",
        introPrice: {
          price: 0,
          period: "P1M",
          periodUnit: "MONTH",
          periodNumberOfUnits: 1,
        },
      },
    },
    priceString: "$8.50",
    trialLabel: "Free for 1 month",
    hasTrial: true,
  });
  mockEnsureSignupAwaitSubscription.mockResolvedValue({ status: "signupAwait" });
  mockGetAccessStateForUser.mockResolvedValue({
    canAccessApp: false,
    accessMode: "none",
    subscription: { status: "signupAwait" },
    accessOverride: null,
  });
  mockPurchaseSelectedPackage.mockResolvedValue({
    customerInfo: { entitlements: { active: { premium: { identifier: "premium" } } } },
  });
  mockWaitForActiveSubscription.mockResolvedValue({ status: "trial" });
});

describe("Purchases screen", () => {
  test("shows billed price, subscription details, and legal links", async () => {
    const { findByText } = renderScreen();

    expect(await findByText("Standard plan")).toBeTruthy();
    expect(await findByText("Auto-renews every 30 days")).toBeTruthy();
    expect(await findByText("$8.50/month")).toBeTruthy();
    expect(await findByText("Free for 1 month, then renews at $8.50/month.")).toBeTruthy();
    expect(await findByText("Privacy Policy")).toBeTruthy();
    expect(await findByText("Terms of Use")).toBeTruthy();
  });

  test("shows signup success message when opened from email link", async () => {
    mockParams = { signup: "1" };
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    renderScreen();

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    alertSpy.mockRestore();
  });

  test("purchases package and redirects after webhook sync", async () => {
    const { getByText } = renderScreen();

    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    fireEvent.press(getByText("Continue to payment"));

    await waitFor(() => expect(mockPurchaseSelectedPackage).toHaveBeenCalled());
    expect(mockWaitForActiveSubscription).toHaveBeenCalledWith("user-123");
    expect(router.replace).toHaveBeenCalledWith("/dashboard");
  });

  test("does not proceed when premium entitlement is not active", async () => {
    mockPurchaseSelectedPackage.mockResolvedValueOnce({
      customerInfo: { entitlements: { active: {} } },
    });

    const { getByText } = renderScreen();
    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    fireEvent.press(getByText("Continue to payment"));

    await waitFor(() => expect(mockPurchaseSelectedPackage).toHaveBeenCalled());
    expect(mockWaitForActiveSubscription).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalledWith("/dashboard");
  });

  test("shows load error and retries when RevenueCat pricing cannot be loaded", async () => {
    mockFetchTestStorePackage
      .mockRejectedValueOnce(new Error("load failed"))
      .mockResolvedValueOnce({
        package: {
          identifier: "monthly",
          product: {
            priceString: "$8.50",
            introPrice: {
              price: 0,
              period: "P1M",
              periodUnit: "MONTH",
              periodNumberOfUnits: 1,
            },
          },
        },
        priceString: "$8.50",
        trialLabel: "Free for 1 month",
        hasTrial: true,
      });
    const { findByText, getByRole } = renderScreen();

    expect(await findByText("Could not load pricing. Please try again.")).toBeTruthy();
    fireEvent.press(getByRole("button", { name: "Retry pricing" }));

    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalledTimes(2));
  });

  test("returns to home after sign out when return-home button is pressed", async () => {
    const multiRemoveSpy = jest.spyOn(AsyncStorage, "multiRemove").mockResolvedValue();
    const { getByRole } = renderScreen();
    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Return to home" }));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
      expect(multiRemoveSpy).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  test("returns home after clearing persisted auth data when session is already missing", async () => {
    const multiRemoveSpy = jest.spyOn(AsyncStorage, "multiRemove").mockResolvedValue();
    (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
      error: { message: "Auth session missing!" },
    });

    const { getByRole } = renderScreen();
    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Return to home" }));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
      expect(multiRemoveSpy).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  test("redirects friend free users to dashboard without loading pricing", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "friend_free",
      subscription: { status: "signupAwait" },
      accessOverride: { access_type: "friend_free", is_active: true },
    });

    renderScreen();

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });

    expect(mockEnsureSignupAwaitSubscription).not.toHaveBeenCalled();
    expect(mockFetchTestStorePackage).not.toHaveBeenCalled();
  });
});
