import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { router } from "expo-router";
import Purchases from "../app/purchases";
import i18n from "../i18n";
import { LanguageProvider } from "../providers/LanguageProvider";
import {
  fetchTestStorePackage,
  purchaseSelectedPackage,
} from "../lib/revenuecatOfferings";
import {
  ensureSignupAwaitSubscription,
  waitForActiveSubscription,
} from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";

jest.mock("../lib/revenuecatOfferings", () => ({
  fetchTestStorePackage: jest.fn(),
  purchaseSelectedPackage: jest.fn(),
  hasActiveEntitlement: (customerInfo: any, entitlementId = "premium") =>
    Boolean(customerInfo?.entitlements?.active?.[entitlementId]),
}));
jest.mock("../lib/subscription", () => ({
  ensureSignupAwaitSubscription: jest.fn(),
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

const mockFetchTestStorePackage = fetchTestStorePackage as jest.Mock;
const mockPurchaseSelectedPackage = purchaseSelectedPackage as jest.Mock;
const mockEnsureSignupAwaitSubscription = ensureSignupAwaitSubscription as jest.Mock;
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
    mockEnsureSignupAwaitSubscription.mockResolvedValue({
      user_id: "user-123",
      status: "signupAwait",
    });
    mockFetchTestStorePackage.mockResolvedValue({
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

  it("shows Test Store pricing and completes purchase", async () => {
    const screen = renderWithProviders();

    await waitFor(() =>
      expect(mockFetchTestStorePackage).toHaveBeenCalled(),
    );

    await screen.findByText(/then/i);
    await screen.findByText("If you cancel during the free trial, you will not be charged at all.");
    await screen.findByText(
      "Payment details are managed securely by App Store or Google Play. We never store your credit card number in this app."
    );

    const button = await screen.findByRole("button", { name: "Complete sign-up" });
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockPurchaseSelectedPackage).toHaveBeenCalledWith({ identifier: "monthly" });
      expect(mockWaitForActiveSubscription).toHaveBeenCalledWith("user-123");
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("retries loading pricing when retry button is pressed", async () => {
    mockFetchTestStorePackage
      .mockRejectedValueOnce(new Error("load failed"))
      .mockResolvedValueOnce({
        package: { identifier: "monthly" },
        priceString: "$9.99",
        trialDuration: { unit: "MONTH", value: 1 },
      });

    const screen = renderWithProviders();

    const retryButton = await screen.findByRole("button", { name: "Retry pricing" });
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockFetchTestStorePackage).toHaveBeenCalledTimes(2);
    });
  });

  it("signs out and returns to home when return-home button is pressed", async () => {
    const screen = renderWithProviders();

    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    const returnButton = await screen.findByRole("button", { name: "Return to home" });
    fireEvent.press(returnButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("redirects to dashboard when subscription is already active", async () => {
    mockEnsureSignupAwaitSubscription.mockResolvedValue({
      user_id: "user-123",
      status: "active",
    });

    renderWithProviders();

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });

    expect(mockFetchTestStorePackage).not.toHaveBeenCalled();
  });

  it("stays on purchases when subscription is canceled", async () => {
    mockEnsureSignupAwaitSubscription.mockResolvedValue({
      user_id: "user-123",
      status: "canceled",
    });

    renderWithProviders();

    await waitFor(() => {
      expect(mockFetchTestStorePackage).toHaveBeenCalled();
    });

    expect(router.replace).not.toHaveBeenCalledWith("/dashboard");
  });

  it("localizes page label and trial notice in Japanese", async () => {
    await AsyncStorage.setItem("preferred_language", "ja");
    await i18n.changeLanguage("ja");
    const screen = renderWithProviders();

    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    const labels = await screen.findAllByText(/購入|お支払い/);
    expect(labels.length).toBeGreaterThan(0);
    await screen.findByText("無料期間中にキャンセルすれば支払いは一切発生しません");
  });

  it("localizes purchase copy and trial notice in French", async () => {
    await AsyncStorage.setItem("preferred_language", "fr");
    await i18n.changeLanguage("fr");
    const screen = renderWithProviders();

    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    await screen.findByText("Ajouter un moyen de paiement");
    await screen.findByText(
      /Si vous annulez pendant l'essai gratuit/i
    );
  });
});
