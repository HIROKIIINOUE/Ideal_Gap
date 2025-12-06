import { AuthError } from "@supabase/supabase-js";
import {
  completePasswordReset,
  requestPasswordResetEmail,
  setSessionFromRecoveryLink,
  signInWithEmailPassword,
  signUpWithEmailConfirmation,
} from "../lib/auth";
import { supabase } from "../lib/supabaseClient";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      scheme: "idealgap",
    },
  },
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getSession: jest.fn(),
      setSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn((path?: string) => `idealgap://${(path ?? "").replace(/^\//, "")}`),
}));

jest.mock("expo-localization", () => ({
  timeZone: "Asia/Tokyo",
  getCalendars: () => [{ timeZone: "Asia/Tokyo" }],
}));

const selectMock = jest.fn();
const eqMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });
  selectMock.mockReturnValue({ eq: eqMock });
});

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
        emailRedirectTo: "idealgap://dashboard",
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
  beforeEach(() => {
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

describe("requestPasswordResetEmail", () => {
  beforeEach(() => {
    eqMock.mockResolvedValue({ count: 1, error: null });
  });

  test("returns user_not_found when email is missing", async () => {
    eqMock.mockResolvedValue({ count: 0, error: null });

    const result = await requestPasswordResetEmail("missing@example.com");

    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      reason: "user_not_found",
      message: "User not found",
    });
  });

  test("sends reset email when user exists", async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await requestPasswordResetEmail("user@example.com");

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "idealgap://reset-password",
    });
    expect(result).toEqual({ ok: true });
  });

  test("returns unknown when Supabase returns an error", async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: "Rate limited", status: 429 } as AuthError,
    });

    const result = await requestPasswordResetEmail("user@example.com");

    expect(result).toEqual({
      ok: false,
      reason: "unknown",
      message: "Rate limited",
    });
  });
});

describe("setSessionFromRecoveryLink", () => {
  test("returns false when tokens are missing", async () => {
    const result = await setSessionFromRecoveryLink("idealgap://reset-password");
    expect(result).toBe(false);
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  test("sets session when tokens are present", async () => {
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({ data: {}, error: null });

    const url =
      "idealgap://reset-password#access_token=access123&refresh_token=refresh456&type=recovery";
    const result = await setSessionFromRecoveryLink(url);

    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "access123",
      refresh_token: "refresh456",
    });
    expect(result).toBe(true);
  });
});

describe("completePasswordReset", () => {
  beforeEach(() => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });
  });

  test("returns missing_session when no active session exists", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await completePasswordReset("new-password");

    expect(result).toEqual({
      ok: false,
      reason: "missing_session",
      message: "Session not ready",
    });
  });

  test("updates password when session exists", async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ data: {}, error: null });

    const result = await completePasswordReset("new-password");

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(result).toEqual({ ok: true });
  });

  test("returns unknown when Supabase returns an error", async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: "Password too weak", status: 400 } as AuthError,
    });

    const result = await completePasswordReset("short");

    expect(result).toEqual({
      ok: false,
      reason: "unknown",
      message: "Password too weak",
    });
  });
});
