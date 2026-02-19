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
}));
jest.mock("../lib/subscription");
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const mockFetchTestStorePackage = fetchTestStorePackage as jest.Mock;
const mockPurchaseSelectedPackage = purchaseSelectedPackage as jest.Mock;
const mockEnsureSignupAwaitSubscription = ensureSignupAwaitSubscription as jest.Mock;
const mockWaitForActiveSubscription = waitForActiveSubscription as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;

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
    mockPurchaseSelectedPackage.mockResolvedValue({});
    (router.replace as jest.Mock).mockClear();
  });

  it("shows Test Store pricing and completes purchase", async () => {
    const screen = renderWithProviders();

    await waitFor(() =>
      expect(mockFetchTestStorePackage).toHaveBeenCalled(),
    );

    await screen.findByText(/then/i);
    await screen.findByText("If you cancel during the free trial, you will not be charged at all.");

    const button = await screen.findByRole("button", { name: "Complete sign-up" });
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockPurchaseSelectedPackage).toHaveBeenCalledWith({ identifier: "monthly" });
      expect(mockWaitForActiveSubscription).toHaveBeenCalledWith("user-123");
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
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

  it("localizes page label and trial notice in Japanese", async () => {
    await AsyncStorage.setItem("preferred_language", "ja");
    await i18n.changeLanguage("ja");
    const screen = renderWithProviders();

    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    const labels = await screen.findAllByText(/購入|お支払い/);
    expect(labels.length).toBeGreaterThan(0);
    await screen.findByText("無料期間中にキャンセルすれば支払いは一切発生しません");
  });

  it("localizes page label and trial notice in French", async () => {
    await AsyncStorage.setItem("preferred_language", "fr");
    await i18n.changeLanguage("fr");
    const screen = renderWithProviders();

    await waitFor(() => expect(mockFetchTestStorePackage).toHaveBeenCalled());

    await screen.findByText("Achat");
    await screen.findByText(
      /Si vous annulez pendant l'essai gratuit/i
    );
  });
});
