import { AuthError } from "@supabase/supabase-js";
import {
  completePasswordReset,
  continueWithOAuthProvider,
  requestPasswordResetEmail,
  setSessionFromRecoveryLink,
  signInWithEmailPassword,
  signUpWithEmailConfirmation,
} from "../lib/auth";
import { supabase, supabaseRecovery } from "../lib/supabaseClient";

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
      resend: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
  supabaseRecovery: {
    auth: {
      updateUser: jest.fn(),
      getSession: jest.fn(),
      setSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn((path?: string) => `idealgap://${(path ?? "").replace(/^\//, "")}`),
}));

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

const mockWebBrowser = jest.requireMock("expo-web-browser");

beforeEach(() => {
  jest.clearAllMocks();
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
        data: { name: "New User", language: "en" },
        emailRedirectTo: "idealgap://purchases?signup=1",
      },
    });
    expect(result).toEqual({ ok: true });
  });

  test("returns email_exists reason when Supabase reports the email is already registered", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered", status: 400 } as AuthError,
    });
    (supabaseRecovery.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: "Invalid login credentials", status: 400 } as AuthError,
    });

    const result = await signUpWithEmailConfirmation(baseParams);

    expect(result).toEqual({
      ok: false,
      reason: "email_exists",
      message: "User already registered",
    });
  });

  test("resends verification mail when an existing account is still unconfirmed", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered", status: 400 } as AuthError,
    });
    (supabaseRecovery.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: "Email not confirmed", status: 400 } as AuthError,
    });
    (supabase.auth.resend as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await signUpWithEmailConfirmation(baseParams);

    expect(supabaseRecovery.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "new-user@example.com",
      password: "password123",
    });
    expect(supabase.auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "new-user@example.com",
      options: {
        emailRedirectTo: "idealgap://purchases?signup=1",
      },
    });
    expect(result).toEqual({
      ok: false,
      reason: "email_unconfirmed",
      message: "Email verification resent",
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
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: false, error: null });

    const result = await signInWithEmailPassword({
      email: "missing@example.com",
      password: "password123",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("check_user_exists", {
      p_email: "missing@example.com",
    });
    expect(result).toEqual({
      ok: false,
      reason: "user_not_found",
      message: "User not found",
    });
  });

  test("returns invalid_password when user exists but password is wrong", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
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

  test("resends verification mail when login is blocked because email is unconfirmed", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { status: 400, message: "Email not confirmed" } as AuthError,
    });
    (supabase.auth.resend as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await signInWithEmailPassword({
      email: "user@example.com",
      password: "password123",
    });

    expect(supabase.auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "user@example.com",
      options: {
        emailRedirectTo: "idealgap://purchases?signup=1",
      },
    });
    expect(result).toEqual({
      ok: false,
      reason: "email_unconfirmed",
      message: "Email verification resent",
    });
  });

  test("returns ok true on successful sign in", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

    const result = await signInWithEmailPassword({
      email: "user@example.com",
      password: "password123",
    });

    expect(result).toEqual({ ok: true });
  });
});

describe("continueWithOAuthProvider", () => {
  test("opens provider auth URL and stores returned session", async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize" },
      error: null,
    });
    mockWebBrowser.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "idealgap://auth/callback#access_token=access123&refresh_token=refresh456",
    });
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });

    const result = await continueWithOAuthProvider("google");

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "idealgap://auth/callback",
        skipBrowserRedirect: true,
      },
    });
    expect(mockWebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/authorize",
      "idealgap://auth/callback",
      { preferEphemeralSession: true },
    );
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "access123",
      refresh_token: "refresh456",
    });
    expect(result).toEqual({ ok: true, user: { id: "user-123" } });
  });

  test("does not show a hard error when the user cancels OAuth", async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize" },
      error: null,
    });
    mockWebBrowser.openAuthSessionAsync.mockResolvedValue({ type: "cancel" });

    const result = await continueWithOAuthProvider("apple");

    expect(result).toEqual({
      ok: false,
      reason: "cancelled",
      message: "OAuth sign-in was cancelled",
    });
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });
});

describe("requestPasswordResetEmail", () => {
  beforeEach(() => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
  });

  test("returns user_not_found when email is missing", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: false, error: null });

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
      reason: "rate_limited",
      message: "Rate limited",
    });
  });
});

describe("setSessionFromRecoveryLink", () => {
  test("returns false when tokens are missing", async () => {
    const result = await setSessionFromRecoveryLink("idealgap://reset-password");
    expect(result).toBe(false);
    expect(supabaseRecovery.auth.setSession).not.toHaveBeenCalled();
  });

  test("sets session when tokens are present", async () => {
    (supabaseRecovery.auth.setSession as jest.Mock).mockResolvedValue({ data: {}, error: null });

    const url =
      "idealgap://reset-password#access_token=access123&refresh_token=refresh456&type=recovery";
    const result = await setSessionFromRecoveryLink(url);

    expect(supabaseRecovery.auth.setSession).toHaveBeenCalledWith({
      access_token: "access123",
      refresh_token: "refresh456",
    });
    expect(result).toBe(true);
  });
});

describe("completePasswordReset", () => {
  beforeEach(() => {
    (supabaseRecovery.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });
  });

  test("returns missing_session when no active session exists", async () => {
    (supabaseRecovery.auth.getSession as jest.Mock).mockResolvedValue({
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
    (supabaseRecovery.auth.updateUser as jest.Mock).mockResolvedValue({ data: {}, error: null });

    const result = await completePasswordReset("new-password");

    expect(supabaseRecovery.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(supabaseRecovery.auth.signOut).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  test("returns unknown when Supabase returns an error", async () => {
    (supabaseRecovery.auth.updateUser as jest.Mock).mockResolvedValue({
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
