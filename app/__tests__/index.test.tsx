import { render, screen } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import i18n from "../../i18n";
import { LanguageProvider } from "../../providers/LanguageProvider";
import Index from "../index";
import { supabase } from "../../lib/supabaseClient";

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

describe("Index screen", () => {
  beforeEach(() => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it("shows pricing and CTA buttons", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <Index />
        </LanguageProvider>
      </I18nextProvider>,
    );

    expect(await screen.findByText(/40日間無料、無料期間以降490円\/月/)).toBeOnTheScreen();
    const startButtons = await screen.findAllByRole("button", { name: "無料で始める" });
    const signInButtons = await screen.findAllByRole("button", { name: "ログイン" });
    expect(startButtons[0]).toBeOnTheScreen();
    expect(signInButtons[0]).toBeOnTheScreen();
  });
});
