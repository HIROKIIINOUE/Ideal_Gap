import { restoreSession } from "../lib/authBootstrap";
import { supabase } from "../lib/supabaseClient";

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

describe("restoreSession", () => {
  beforeEach(() => {
    (supabase.auth.getSession as jest.Mock).mockReset();
  });

  it("returns session when available", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    const result = await restoreSession();
    expect(result.session?.user.id).toBe("user-1");
  });

  it("returns null when session is missing", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await restoreSession();
    expect(result.session).toBeNull();
  });
});
