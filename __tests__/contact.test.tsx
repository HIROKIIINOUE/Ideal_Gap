import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import Contact from "../app/contact";
import i18n from "../i18n";

const mockInsert = jest.fn().mockResolvedValue({ error: null });

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
    from: () => ({
      insert: mockInsert,
    }),
  },
}));
jest.mock("../providers/FunPlanProvider", () => ({
  useFunPlan: () => ({ funPlanVisible: true, toggleFunPlan: jest.fn() }),
}));

describe("Contact page", () => {
  beforeEach(() => {
    mockInsert.mockClear();
  });

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

    expect(await findByText(/we’ll review your submission shortly/i)).toBeTruthy();
  });

  test("blocks submission when the honeypot is filled", async () => {
    const { getByPlaceholderText, getByRole, getByTestId } = render(
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

    fireEvent.changeText(getByTestId("contact-honeypot", { includeHiddenElements: true }), "spam");

    const submitButton = getByRole("button", { name: /send message/i });
    expect(submitButton).toBeDisabled();
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });
});
