import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import Login from "../app/login";
import i18n from "../i18n";

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

const mockSignInWithEmailPassword = jest.fn();

jest.mock("../lib/auth", () => ({
  signInWithEmailPassword: (...args: unknown[]) => mockSignInWithEmailPassword(...args),
}));

describe("Login screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test("shows success toast when login succeeds", async () => {
    mockSignInWithEmailPassword.mockResolvedValue({ ok: true });
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByPlaceholderText, getByRole } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "user@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.press(getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(mockSignInWithEmailPassword).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Logged in successfully"));

    alertSpy.mockRestore();
  });
});
