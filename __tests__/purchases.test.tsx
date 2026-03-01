import React from "react";
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
const mockGetUserProfile = jest.fn();
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
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
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
  mockGetUserProfile.mockResolvedValue({ id: "user-123", had_account_before: false });
  mockPurchaseSelectedPackage.mockResolvedValue({
    customerInfo: { entitlements: { active: { premium: { identifier: "premium" } } } },
  });
  mockWaitForActiveSubscription.mockResolvedValue({ status: "trial" });
});

describe("Purchases screen", () => {
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

    fireEvent.press(getByText("Complete sign-up"));

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

    fireEvent.press(getByText("Complete sign-up"));

    await waitFor(() => expect(mockPurchaseSelectedPackage).toHaveBeenCalled());
    expect(mockWaitForActiveSubscription).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalledWith("/dashboard");
  });

  test("keeps load error message wrapped inside the plan card", async () => {
    mockFetchTestStorePackage.mockRejectedValueOnce(new Error("load failed"));
    const { findByText, getByRole } = renderScreen();

    const errorText = await findByText("Could not load pricing. Please try again.");
    expect(errorText).toHaveStyle({ flexShrink: 1 });

    fireEvent.press(getByRole("button", { name: "Retry pricing" }));
    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalledTimes(2));
  });

  test("returns to home after sign out when return-home button is pressed", async () => {
    const { getByRole } = renderScreen();
    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Return to home" }));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });
});
