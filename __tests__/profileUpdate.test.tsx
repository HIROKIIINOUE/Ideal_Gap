import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import ProfileUpdate from "../app/profile-update";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

jest.mock("../lib/auth", () => ({
  buildRedirectUrl: () => "idealgap://profile-update?email=1",
}));

jest.mock("../components/Footer", () => () => null);
jest.mock("../components/LanguageSheet", () => () => null);
jest.mock("../components/MoreSheet", () => () => null);
jest.mock("../providers/FunPlanProvider", () => ({
  useFunPlan: () => ({ funPlanVisible: false, toggleFunPlan: jest.fn() }),
}));

const mockProfileMaybeSingle = jest.fn();
const mockEmailExistsNeq = jest.fn();
const mockUpdateEq = jest.fn();

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn((table: string) => {
      if (table !== "users") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: (columns: string, options?: { count?: "exact"; head?: boolean }) => {
          if (columns === "name,email") {
            return {
              eq: () => ({ maybeSingle: mockProfileMaybeSingle }),
            };
          }

          if (columns === "id" && options?.count === "exact" && options?.head === true) {
            return {
              eq: () => ({ neq: mockEmailExistsNeq }),
            };
          }

          throw new Error(`Unexpected select: ${columns}`);
        },
        update: () => ({ eq: mockUpdateEq }),
      };
    }),
  },
}));

describe("ProfileUpdate", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage("en");

    (supabase.auth.getUser as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "user-1",
            email: "current@example.com",
            user_metadata: { name: "Current Name" },
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "user-1",
            email: "current@example.com",
            user_metadata: { name: "Current Name" },
          },
        },
        error: null,
      });

    mockProfileMaybeSingle.mockResolvedValue({
      data: { name: "Current Name", email: "current@example.com" },
      error: null,
    });
    mockEmailExistsNeq.mockResolvedValue({ count: 0, error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: null });
  });

  test("disables save button after email change request is sent", async () => {
    const screen = render(
      <I18nextProvider i18n={i18n}>
        <ProfileUpdate />
      </I18nextProvider>,
    );

    const emailInput = await screen.findByDisplayValue("current@example.com");
    fireEvent.changeText(emailInput, "new@example.com");

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByText(
        /Please verify your identity from the link sent to your new email address/,
      ),
    ).toBeTruthy();

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  test("toggles password visibility", async () => {
    const screen = render(
      <I18nextProvider i18n={i18n}>
        <ProfileUpdate />
      </I18nextProvider>,
    );

    const passwordInput = await screen.findByPlaceholderText("New password (optional)");
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByRole("button", { name: "Show password" }));
    expect((await screen.findByPlaceholderText("New password (optional)")).props.secureTextEntry).toBe(false);

    fireEvent.press(screen.getByRole("button", { name: "Hide password" }));
    expect((await screen.findByPlaceholderText("New password (optional)")).props.secureTextEntry).toBe(true);
  });

  test("renders Google users with only the username as read-only", async () => {
    (supabase.auth.getUser as jest.Mock).mockReset();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "google@example.com",
          app_metadata: { providers: ["google"], provider: "google" },
          identities: [{ provider: "google" }],
          user_metadata: { name: "Google Name" },
        },
      },
      error: null,
    });
    mockProfileMaybeSingle.mockResolvedValue({
      data: { name: "Google Name", email: "google@example.com" },
      error: null,
    });

    const screen = render(
      <I18nextProvider i18n={i18n}>
        <ProfileUpdate />
      </I18nextProvider>,
    );

    expect(await screen.findByDisplayValue("Google Name")).toHaveProp(
      "editable",
      false,
    );
    expect(
      await screen.findByText(
        "You are logged in with Google, so this app cannot change your profile.",
      ),
    ).toBeTruthy();
    expect(screen.queryByDisplayValue("google@example.com")).toBeNull();
    expect(screen.queryByText("Email")).toBeNull();
    expect(screen.queryByText("Password")).toBeNull();
    expect(screen.queryByPlaceholderText("New password (optional)")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  test("prefers Apple when both Apple and Google providers are present", async () => {
    (supabase.auth.getUser as jest.Mock).mockReset();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "apple@example.com",
          app_metadata: { providers: ["google", "apple"], provider: "google" },
          identities: [{ provider: "google" }, { provider: "apple" }],
          user_metadata: { name: "Apple Name" },
        },
      },
      error: null,
    });
    mockProfileMaybeSingle.mockResolvedValue({
      data: { name: "Apple Name", email: "apple@example.com" },
      error: null,
    });

    const screen = render(
      <I18nextProvider i18n={i18n}>
        <ProfileUpdate />
      </I18nextProvider>,
    );

    expect(
      await screen.findByText(
        "You are logged in with Apple, so this app cannot change your profile.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });
});
