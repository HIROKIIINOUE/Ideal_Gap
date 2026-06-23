import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";
import PurchasesScreen from "../app/purchases";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

const mockFetchRevenueCatPackage = jest.fn();
const mockPurchaseSelectedPackage = jest.fn();
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
  fetchRevenueCatPackage: (...args: unknown[]) => mockFetchRevenueCatPackage(...args),
  purchaseSelectedPackage: (...args: unknown[]) => mockPurchaseSelectedPackage(...args),
  hasActiveEntitlement: (customerInfo: any, entitlementId = "premium") =>
    Boolean(customerInfo?.entitlements?.active?.[entitlementId]),
}));

jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: (...args: unknown[]) => mockGetAccessStateForUser(...args),
  waitForActiveSubscription: (...args: unknown[]) =>
    mockWaitForActiveSubscription(...args),
  PAID_SUBSCRIPTION_STATUSES: ["trial", "active"],
  canAccessDashboardWithSubscriptionStatus: (status: string | null | undefined) =>
    status === "trial" || status === "active",
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
  mockFetchRevenueCatPackage.mockResolvedValue({
      package: {
        identifier: "monthly",
        product: {
          price: 8.5,
          priceString: "$8.50",
          currencyCode: "CAD",
          introPrice: null,
        },
      },
      price: 8.5,
      priceString: "$8.50",
      currencyCode: "CAD",
    });
  mockGetAccessStateForUser.mockResolvedValue({
    canAccessApp: true,
    accessMode: "free",
    subscription: null,
    accessOverride: null,
  });
  mockPurchaseSelectedPackage.mockResolvedValue({
    customerInfo: { entitlements: { active: { premium: { identifier: "premium" } } } },
  });
  mockWaitForActiveSubscription.mockResolvedValue({ status: "active" });
});

describe("Purchases screen", () => {
  test("shows billed price, subscription details, and legal links", async () => {
    const { findByText } = renderScreen();

    expect(await findByText("Pro Plan")).toBeTruthy();
    expect(await findByText("Auto-renews every 30 days")).toBeTruthy();
    expect(await findByText("8.50 CAD / month")).toBeTruthy();
    expect(await findByText("Unlimited Ideal Self cards")).toBeTruthy();
    expect(await findByText("Privacy Policy")).toBeTruthy();
    expect(await findByText("Terms of Use")).toBeTruthy();
  });

  test("shows signup success message when opened from email link", async () => {
    mockParams = { signup: "1" };
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    renderScreen();

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/purchases"));

    alertSpy.mockRestore();
  });

  test("purchases package and redirects after webhook sync", async () => {
    const { getByText } = renderScreen();

    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalled());

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
    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalled());

    fireEvent.press(getByText("Continue to payment"));

    await waitFor(() => expect(mockPurchaseSelectedPackage).toHaveBeenCalled());
    expect(mockWaitForActiveSubscription).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalledWith("/dashboard");
  });

  test("shows load error and retries when RevenueCat pricing cannot be loaded", async () => {
    mockFetchRevenueCatPackage
      .mockRejectedValueOnce(new Error("load failed"))
      .mockResolvedValueOnce({
        package: {
          identifier: "monthly",
          product: {
            price: 8.5,
            priceString: "$8.50",
            currencyCode: "CAD",
            introPrice: null,
          },
        },
        price: 8.5,
        priceString: "$8.50",
        currencyCode: "CAD",
      });
    const { findByText, getByRole } = renderScreen();

    expect(await findByText("Could not load pricing. Please try again.")).toBeTruthy();
    fireEvent.press(getByRole("button", { name: "Retry pricing" }));

    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalledTimes(2));
  });

  test("returns to dashboard when return button is pressed", async () => {
    const { getByRole } = renderScreen();
    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Return to dashboard" }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("redirects friend free users to payment management", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "friend_free",
      subscription: null,
      accessOverride: { access_type: "friend_free", is_active: true },
    });

    renderScreen();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/payment-management");
    });
    expect(mockFetchRevenueCatPackage).not.toHaveBeenCalled();
  });

  test("shows pricing when a free user opens purchases manually", async () => {
    renderScreen();

    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalledWith("/dashboard");
  });

  test("redirects active users to payment management", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active" },
      accessOverride: null,
    });

    renderScreen();

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/payment-management");
    });
    expect(mockFetchRevenueCatPackage).not.toHaveBeenCalled();
  });

  test("keeps free users on purchases even when cached subscription exists", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "free",
      subscription: { status: "active" },
      accessOverride: null,
    });

    renderScreen();
    await waitFor(() => expect(mockFetchRevenueCatPackage).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalledWith("/payment-management");
  });
});
