jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { getActiveAccessOverrideForUser } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";

type AccessOverrideRow = {
  access_type: string;
  created_at: string | null;
  ends_at: string | null;
  id: string;
  is_active: boolean;
  note: string | null;
  starts_at: string;
  updated_at: string | null;
  user_id: string;
};

const mockFrom = supabase.from as jest.Mock;

const buildAccessOverride = (
  overrides: Partial<AccessOverrideRow> = {},
): AccessOverrideRow => ({
  access_type: "friend_free",
  created_at: "2026-04-25T00:00:00.000Z",
  ends_at: null,
  id: "override-1",
  is_active: true,
  note: null,
  starts_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-25T00:00:00.000Z",
  user_id: "user-123",
  ...overrides,
});

describe("subscription helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the access override when the single row is active", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: buildAccessOverride(),
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    mockFrom.mockReturnValue({ select });

    const result = await getActiveAccessOverrideForUser("user-123");

    expect(mockFrom).toHaveBeenCalledWith("access_overrides");
    expect(select).toHaveBeenCalledWith("*");
    expect(eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(maybeSingle).toHaveBeenCalled();
    expect(result).toEqual(buildAccessOverride());
  });

  it("returns null when the single row is not currently active", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: buildAccessOverride({ is_active: false }),
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    mockFrom.mockReturnValue({ select });

    const result = await getActiveAccessOverrideForUser("user-123");

    expect(result).toBeNull();
  });

  it("returns null when the query fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    mockFrom.mockReturnValue({ select });

    const result = await getActiveAccessOverrideForUser("user-123");

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to fetch access override",
      "boom",
    );

    warnSpy.mockRestore();
  });
});
