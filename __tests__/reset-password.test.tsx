import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Linking from "expo-linking";
import React from "react";
import { I18nextProvider } from "react-i18next";
import ResetPassword from "../app/reset-password";
import i18n from "../i18n";

const mockRequestPasswordResetEmail = jest.fn();
const mockCompletePasswordReset = jest.fn();
const mockSetSessionFromRecoveryLink = jest.fn();
const mockReplace = jest.fn();

jest.mock("../components/LanguageSheet", () => () => null);
jest.mock("../components/Footer", () => () => null);
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    router: { push: jest.fn(), replace: mockReplace, back: jest.fn() },
    useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
    useLocalSearchParams: () => ({}),
  };
});

jest.mock("expo-linking", () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock("../lib/auth", () => ({
  requestPasswordResetEmail: (...args: unknown[]) => mockRequestPasswordResetEmail(...args),
  completePasswordReset: (...args: unknown[]) => mockCompletePasswordReset(...args),
  setSessionFromRecoveryLink: (...args: unknown[]) => mockSetSessionFromRecoveryLink(...args),
}));

describe("ResetPassword screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
    (Linking.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
  });

  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <ResetPassword />
      </I18nextProvider>,
    );

  test("requests a reset email when user submits their address", async () => {
    mockRequestPasswordResetEmail.mockResolvedValue({ ok: true });
    mockSetSessionFromRecoveryLink.mockResolvedValue(false);
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
    const { getByPlaceholderText, getByRole } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "user@example.com");
    fireEvent.press(getByRole("button", { name: "Send reset email" }));

    await waitFor(() => expect(mockRequestPasswordResetEmail).toHaveBeenCalledWith("user@example.com"));
  });

  test("shows error message when email is not found", async () => {
    mockRequestPasswordResetEmail.mockResolvedValue({ ok: false, reason: "user_not_found" });
    mockSetSessionFromRecoveryLink.mockResolvedValue(false);
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
    const { getByPlaceholderText, getByRole, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "missing@example.com");
    fireEvent.press(getByRole("button", { name: "Send reset email" }));

    expect(await findByText("No account found for that email.")).toBeOnTheScreen();
  });

  test("updates password after recovery session is ready", async () => {
    mockSetSessionFromRecoveryLink.mockResolvedValue(true);
    mockCompletePasswordReset.mockResolvedValue({ ok: true });
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(
      "idealgap://reset-password#access_token=access&refresh_token=refresh&type=recovery",
    );
    const { findAllByText, getByPlaceholderText, getByRole } = renderScreen();

    const readinessTexts = await findAllByText("Recovery link confirmed. You can set a new password now.");
    expect(readinessTexts.length).toBeGreaterThan(0);

    fireEvent.changeText(getByPlaceholderText("New password"), "new-password");
    fireEvent.press(getByRole("button", { name: "Update password and log in" }));

    await waitFor(() => expect(mockCompletePasswordReset).toHaveBeenCalledWith("new-password"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
  });
});
