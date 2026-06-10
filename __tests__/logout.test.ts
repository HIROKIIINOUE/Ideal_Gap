import { signOutCurrentSession } from "../lib/logout";
import { supabase } from "../lib/supabaseClient";
import { clearPersistedAuthSession } from "../lib/authStorage";

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
    },
  },
}));

jest.mock("../lib/authStorage", () => ({
  clearPersistedAuthSession: jest.fn(),
}));

describe("signOutCurrentSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    (clearPersistedAuthSession as jest.Mock).mockResolvedValue(undefined);
  });

  test("signs out the current session and clears persisted auth storage", async () => {
    await signOutCurrentSession();

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(clearPersistedAuthSession).toHaveBeenCalledTimes(1);
  });

  test("allows logout to complete when the local auth session is already missing", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: { message: "Auth session missing!" },
    });

    await expect(signOutCurrentSession()).resolves.toBeUndefined();
    expect(clearPersistedAuthSession).toHaveBeenCalledTimes(1);
  });

  test("throws when sign out fails for another reason", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: { message: "network failed" },
    });

    await expect(signOutCurrentSession()).rejects.toThrow("network failed");
    expect(clearPersistedAuthSession).toHaveBeenCalledTimes(1);
  });
});
