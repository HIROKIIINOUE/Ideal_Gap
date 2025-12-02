import { AuthError } from "@supabase/supabase-js";
import { signUpWithEmailConfirmation } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
  },
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "idealgap://auth-callback"),
}));

jest.mock("expo-localization", () => ({
  timeZone: "Asia/Tokyo",
  getCalendars: () => [{ timeZone: "Asia/Tokyo" }],
}));

describe("signUpWithEmailConfirmation", () => {
  const baseParams = {
    email: "new-user@example.com",
    password: "password123",
    username: "New User",
    language: "en" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls Supabase signUp with metadata and redirect, returns success", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-id" }, session: null },
      error: null,
    });

    const result = await signUpWithEmailConfirmation(baseParams);

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "new-user@example.com",
      password: "password123",
      options: {
        data: { name: "New User", language: "en", time_zone: "Asia/Tokyo" },
        emailRedirectTo: "idealgap://auth-callback",
      },
    });
    expect(result).toEqual({ ok: true });
  });

  test("returns email_exists reason when Supabase reports the email is already registered", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered", status: 400 } as AuthError,
    });

    const result = await signUpWithEmailConfirmation(baseParams);

    expect(result).toEqual({
      ok: false,
      reason: "email_exists",
      message: "User already registered",
    });
  });

  test("returns unknown reason for other errors", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Connection failed", status: 500 } as AuthError,
    });

    const result = await signUpWithEmailConfirmation(baseParams);

    expect(result).toEqual({
      ok: false,
      reason: "unknown",
      message: "Connection failed",
    });
  });
});
