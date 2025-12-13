import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import Contact from "../app/contact";
import i18n from "../i18n";

jest.mock("../components/Footer", () => () => null);
jest.mock("../components/LanguageSheet", () => () => null);
jest.mock("../components/MoreSheet", () => () => null);
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signOut: jest.fn(),
    },
  },
}));
jest.mock("../providers/FunPlanProvider", () => ({
  useFunPlan: () => ({ funPlanVisible: true, toggleFunPlan: jest.fn() }),
}));

describe("Contact page", () => {
  test("collects feedback fields and shows demo completion message", async () => {
    const { getByPlaceholderText, getByRole, findByText } = render(
      <I18nextProvider i18n={i18n}>
        <Contact />
      </I18nextProvider>,
    );

    fireEvent.changeText(getByPlaceholderText("Your name"), "Alice");
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "alice@example.com");

    fireEvent.press(getByRole("button", { name: /select a category/i }));
    fireEvent.press(getByRole("button", { name: /bug/i }));

    fireEvent.changeText(
      getByPlaceholderText("Share as much detail as you can"),
      "Found a visual glitch on the home screen.",
    );

    fireEvent.press(getByRole("button", { name: /send message/i }));

    expect(await findByText(/this is a demo submission/i)).toBeTruthy();
  });
});
