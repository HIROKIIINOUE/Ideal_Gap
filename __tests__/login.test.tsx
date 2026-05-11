import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";
import Login from "../app/login";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

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

jest.mock("../components/LanguageSheet", () => () => null);
jest.mock("../components/Footer", () => () => null);

jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: (...args: unknown[]) => mockGetAccessStateForUser(...args),
  ensureSignupAwaitSubscription: (...args: unknown[]) =>
    mockEnsureSignupAwaitSubscription(...args),
  canAccessDashboardWithSubscriptionStatus: (status: string | null | undefined) =>
    status === "active" || status === "trial",
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
  const originalPlatform = Platform.OS;

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
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: false,
      accessMode: "none",
      subscription: { status: "signupAwait" },
      accessOverride: null,
    });
    mockEnsureSignupAwaitSubscription.mockResolvedValue({
      user_id: "user-123",
      status: "signupAwait",
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

  test("renders keyboard avoiding form container on Android", () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });

    const { getByTestId } = renderScreen();

    expect(getByTestId("login-form-kav")).toBeTruthy();
  });

  test("toggles password visibility", () => {
    const { getByPlaceholderText, getByRole } = renderScreen();

    const passwordInput = getByPlaceholderText("Password");
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(getByRole("button", { name: "Show password" }));
    expect(getByPlaceholderText("Password").props.secureTextEntry).toBe(false);

    fireEvent.press(getByRole("button", { name: "Hide password" }));
    expect(getByPlaceholderText("Password").props.secureTextEntry).toBe(true);
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
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: false,
      accessMode: "none",
      subscription: { status: "signupAwait" },
      accessOverride: null,
    });
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
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active" },
      accessOverride: null,
    });
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

  test("redirects authenticated users to dashboard on mount when subscription is active", async () => {
    (supabase.auth.getSession as jest.Mock).mockReset();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active" },
      accessOverride: null,
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

  test("redirects authenticated users to purchases on mount when subscription is canceled", async () => {
    (supabase.auth.getSession as jest.Mock).mockReset();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: false,
      accessMode: "none",
      subscription: { status: "canceled" },
      accessOverride: null,
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
    expect(router.replace).toHaveBeenCalledWith("/purchases");
  });

  test("redirects to dashboard when friend free override is active", async () => {
    mockSignInWithEmailPassword.mockResolvedValue({ ok: true });
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "friend_free",
      subscription: { status: "signupAwait" },
      accessOverride: { access_type: "friend_free", is_active: true },
    });
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
});
