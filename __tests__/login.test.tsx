import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";
import Login from "../app/login";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

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

jest.mock("../components/LanguageSheet", () => () => null);
jest.mock("../components/Footer", () => () => null);

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

const mockSignInWithEmailPassword = jest.fn();

jest.mock("../lib/auth", () => ({
  signInWithEmailPassword: (...args: unknown[]) => mockSignInWithEmailPassword(...args),
}));

describe("Login screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock)
      .mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })
      .mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
        error: null,
      });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockGetSubscriptionForUser.mockResolvedValue({ status: "signupAwait" });
    mockEnsureSignupAwaitSubscription.mockResolvedValue({
      user_id: "user-123",
      status: "signupAwait",
    });
  });

  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <Login />
      </I18nextProvider>,
    );

  test("disables login button when email or password is empty", () => {
    const { getByPlaceholderText, getByRole } = renderScreen();

    const getLoginButton = () => getByRole("button", { name: "Log In" });

    expect(getLoginButton().props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "user@example.com");
    expect(getLoginButton().props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    expect(getLoginButton().props.accessibilityState?.disabled).toBe(false);
  });

  test("shows sign up prompt when email does not exist", async () => {
    mockSignInWithEmailPassword.mockResolvedValue({
      ok: false,
      reason: "user_not_found",
      message: "User not found",
    });

    const { getByPlaceholderText, getByRole, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "missing@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.press(getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(mockSignInWithEmailPassword).toHaveBeenCalledTimes(1));

    expect(await findByText("No account found. Please sign up.")).toBeTruthy();
  });

  test("shows wrong password error when credentials are invalid", async () => {
    mockSignInWithEmailPassword.mockResolvedValue({
      ok: false,
      reason: "invalid_password",
      message: "Invalid login credentials",
    });

    const { getByPlaceholderText, getByRole, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "user@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "wrongpass");
    fireEvent.press(getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(mockSignInWithEmailPassword).toHaveBeenCalledTimes(1));

    expect(await findByText("Incorrect password. Please try again.")).toBeTruthy();
  });

  test("redirects to purchases when subscription is pending signup", async () => {
    mockSignInWithEmailPassword.mockResolvedValue({ ok: true });
    mockGetSubscriptionForUser.mockResolvedValue({ status: "signupAwait" });
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByPlaceholderText, getByRole } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "user@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.press(getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(mockSignInWithEmailPassword).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/purchases?from=login"));
    expect(alertSpy).toHaveBeenCalledWith("Logged in successfully");

    alertSpy.mockRestore();
  });

  test("redirects to dashboard when subscription is active", async () => {
    mockSignInWithEmailPassword.mockResolvedValue({ ok: true });
    mockGetSubscriptionForUser.mockResolvedValue({ status: "active" });
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByPlaceholderText, getByRole } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "user@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.press(getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(mockSignInWithEmailPassword).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
    expect(alertSpy).toHaveBeenCalledWith("Logged in successfully");

    alertSpy.mockRestore();
  });

  test("redirects authenticated users to dashboard on mount", async () => {
    (supabase.auth.getSession as jest.Mock).mockReset();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    render(
      <I18nextProvider i18n={i18n}>
        <Login />
      </I18nextProvider>,
    );

    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalled());
    expect(router.replace).toHaveBeenCalledWith("/dashboard");
  });
});
