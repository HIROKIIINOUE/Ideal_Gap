import { AuthError } from "@supabase/supabase-js";
import { signInWithEmailPassword, signUpWithEmailConfirmation } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(),
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
      data: { user: { id: "user-id", identities: [{ identity_id: "identity" }] }, session: null },
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

describe("signInWithEmailPassword", () => {
  const selectMock = jest.fn();
  const eqMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
  });

  test("returns user_not_found when email does not exist", async () => {
    eqMock.mockResolvedValue({ count: 0, error: null });

    const result = await signInWithEmailPassword({
      email: "missing@example.com",
      password: "password123",
    });

    expect(eqMock).toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      reason: "user_not_found",
      message: "User not found",
    });
  });

  test("returns invalid_password when user exists but password is wrong", async () => {
    eqMock.mockResolvedValue({ count: 1, error: null });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { status: 400, message: "Invalid login credentials" } as AuthError,
    });

    const result = await signInWithEmailPassword({
      email: "user@example.com",
      password: "wrong",
    });

    expect(result).toEqual({
      ok: false,
      reason: "invalid_password",
      message: "Invalid login credentials",
    });
  });

  test("returns ok true on successful sign in", async () => {
    eqMock.mockResolvedValue({ count: 1, error: null });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

    const result = await signInWithEmailPassword({
      email: "user@example.com",
      password: "password123",
    });

    expect(result).toEqual({ ok: true });
  });
});
