import React from "react";
import { Keyboard, KeyboardEventListener, Platform } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import Contact from "../app/contact";
import i18n from "../i18n";

const mockInsert = jest.fn().mockResolvedValue({ error: null });

jest.mock("../components/Footer", () => () => null);
jest.mock("../components/LanguageSheet", () => () => null);
jest.mock("../components/MoreSheet", () => () => null);
jest.mock("@react-navigation/elements", () => ({
  useHeaderHeight: () => 64,
}));
jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
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
  const keyboardListeners: Record<string, KeyboardEventListener | undefined> = {};
  let keyboardDismissMock: jest.SpyInstance;

  beforeEach(() => {
    mockInsert.mockClear();
    Object.keys(keyboardListeners).forEach((key) => {
      delete keyboardListeners[key];
    });
    keyboardDismissMock = jest.spyOn(Keyboard, "dismiss").mockImplementation(jest.fn());
    jest.spyOn(Keyboard, "addListener").mockImplementation((eventName, callback) => {
      keyboardListeners[eventName] = callback;
      return {
        remove: () => {
          delete keyboardListeners[eventName];
        },
      } as never;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  test("uses the same keyboard avoiding container pattern as input modals", () => {
    const { getByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <Contact />
      </I18nextProvider>,
    );

    expect(getByTestId("contact-form-kav")).toBeTruthy();
    expect(getByTestId("contact-form-scroll").props.keyboardShouldPersistTaps).toBe("handled");
  });

  test("shows a fixed keyboard close button only while the keyboard is visible", () => {
    const { queryByTestId, getByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <Contact />
      </I18nextProvider>,
    );
    const showEventName = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEventName = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    expect(queryByTestId("contact-keyboard-dismiss")).toBeNull();

    act(() => {
      keyboardListeners[showEventName]?.({ endCoordinates: { height: 280 } } as never);
    });
    const dismissButton = getByTestId("contact-keyboard-dismiss");
    expect(dismissButton).toBeTruthy();
    expect(dismissButton).toHaveStyle({ bottom: 290 });

    fireEvent.press(dismissButton);
    expect(keyboardDismissMock).toHaveBeenCalled();

    act(() => {
      keyboardListeners[hideEventName]?.({} as never);
    });
    expect(queryByTestId("contact-keyboard-dismiss")).toBeNull();
  });
});
