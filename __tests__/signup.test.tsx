import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Platform } from "react-native";
import Signup from "../app/signup";
import { typography } from "../constants/theme";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

let mockLanguage: "ja" | "en" | "fr" = "en";

const mockFetchTestStorePackage = jest.fn();
const mockGetAccessStateForUser = jest.fn();
const mockEnsureSignupAwaitSubscription = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Stack: { Screen: () => null },
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(() => callback(), [callback]),
    useLocalSearchParams: () => ({}),
  };
});

const mockSignUpWithEmailConfirmation = jest.fn();

jest.mock("../lib/revenuecatOfferings", () => ({
  fetchTestStorePackage: (...args: unknown[]) => mockFetchTestStorePackage(...args),
}));

jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: (...args: unknown[]) => mockGetAccessStateForUser(...args),
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
  useLanguage: () => ({ language: mockLanguage, setLanguage: jest.fn(), ready: true }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Signup screen", () => {
  const originalPlatform = Platform.OS;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLanguage = "en";
    await i18n.changeLanguage("en");
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: false,
      accessMode: "none",
      subscription: null,
      accessOverride: null,
    });
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

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform,
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

  test("renders keyboard avoiding form container on Android", () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });

    const { getByTestId } = renderScreen();
    expect(getByTestId("signup-form-kav")).toBeTruthy();
  });

  test("toggles password visibility", () => {
    const { getByPlaceholderText, getByRole } = renderScreen();

    const passwordInput = getByPlaceholderText("6+ characters");
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(getByRole("button", { name: "Show password" }));
    expect(getByPlaceholderText("6+ characters").props.secureTextEntry).toBe(false);

    fireEvent.press(getByRole("button", { name: "Hide password" }));
    expect(getByPlaceholderText("6+ characters").props.secureTextEntry).toBe(true);
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
    const { findAllByText } = renderScreen();

    const trialTexts = await findAllByText(/Free for 14 day/i);
    expect(trialTexts.length).toBeGreaterThan(0);
    const priceTexts = await findAllByText(/then 3\.99CAD\/month/i);
    expect(priceTexts.length).toBeGreaterThan(0);
    expect(priceTexts[0]).toHaveStyle({ fontSize: typography.md });
  });

  test("shows fixed Japanese subscription copy", async () => {
    mockLanguage = "ja";
    await i18n.changeLanguage("ja");
    const { findAllByText } = renderScreen();

    const trialTexts = await findAllByText(/14日間無料/);
    expect(trialTexts.length).toBeGreaterThan(0);
    const priceTexts = await findAllByText(/その後 390円\/月/);
    expect(priceTexts.length).toBeGreaterThan(0);
  });

  test("shows fixed French subscription copy", async () => {
    mockLanguage = "fr";
    await i18n.changeLanguage("fr");
    const { findAllByText } = renderScreen();

    const trialTexts = await findAllByText(/14 jours? gratuit/i);
    expect(trialTexts.length).toBeGreaterThan(0);
    const priceTexts = await findAllByText(/puis 3\.99CAD\/mois/i);
    expect(priceTexts.length).toBeGreaterThan(0);
  });
});
