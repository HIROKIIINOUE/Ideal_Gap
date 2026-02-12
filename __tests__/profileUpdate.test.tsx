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
});
