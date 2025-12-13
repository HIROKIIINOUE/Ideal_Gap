import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import Signup from "../app/signup";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

const mockFetchTestStorePackage = jest.fn();
const mockGetSubscriptionForUser = jest.fn();
const mockEnsureSignupAwaitSubscription = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({}),
  };
});

const mockSignUpWithEmailConfirmation = jest.fn();

jest.mock("../lib/revenuecatOfferings", () => ({
  fetchTestStorePackage: (...args: unknown[]) => mockFetchTestStorePackage(...args),
}));

jest.mock("../lib/subscription", () => ({
  getSubscriptionForUser: (...args: unknown[]) => mockGetSubscriptionForUser(...args),
  ensureSignupAwaitSubscription: (...args: unknown[]) =>
    mockEnsureSignupAwaitSubscription(...args),
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock("../lib/auth", () => ({
  signUpWithEmailConfirmation: (...args: unknown[]) => mockSignUpWithEmailConfirmation(...args),
}));

jest.mock("../components/LanguageSheet", () => () => null);

jest.mock("../providers/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en", setLanguage: jest.fn(), ready: true }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Signup screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockGetSubscriptionForUser.mockResolvedValue(null);
    mockEnsureSignupAwaitSubscription.mockResolvedValue({
      user_id: "user-123",
      status: "signupAwait",
    });
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
  });

  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <Signup />
      </I18nextProvider>,
    );

  test("submits and shows verification prompt on success", async () => {
    mockSignUpWithEmailConfirmation.mockResolvedValue({ ok: true });

    const { getByPlaceholderText, getByText, queryByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("Your name"), "Hiro");
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "hiro@example.com");
    fireEvent.changeText(getByPlaceholderText("6+ characters"), "password123");

    fireEvent.press(getByText("Continue to sign up"));

    await waitFor(() => expect(mockSignUpWithEmailConfirmation).toHaveBeenCalledTimes(1));

    expect(queryByText("An account with this email already exists. Please log in instead.")).toBeNull();
    expect(getByText("Check your inbox")).toBeTruthy();
  });

  test("shows email exists error when Supabase reports duplicate", async () => {
    mockSignUpWithEmailConfirmation.mockResolvedValue({
      ok: false,
      reason: "email_exists",
      message: "User already registered",
    });

    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("Your name"), "Hiro");
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "hiro@example.com");
    fireEvent.changeText(getByPlaceholderText("6+ characters"), "password123");

    fireEvent.press(getByText("Continue to sign up"));

    await waitFor(() => expect(mockSignUpWithEmailConfirmation).toHaveBeenCalledTimes(1));

    expect(getByText("An account with this email already exists. Please log in instead.")).toBeTruthy();
  });

  test("renders plan price and trial copy from RevenueCat offering", async () => {
    const { findByText, findAllByText } = renderScreen();

    expect(await findByText("Free for 1 month")).toBeTruthy();
    const priceTexts = await findAllByText(/then \$8\.50\/30 days/i);
    expect(priceTexts.length).toBeGreaterThan(0);
  });
});
