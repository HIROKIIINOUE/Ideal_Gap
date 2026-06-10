jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("react-native-purchases", () => ({
  getCustomerInfo: jest.fn(),
  getOfferings: jest.fn(),
  isConfigured: jest.fn(),
  purchasePackage: jest.fn(),
}));

import Purchases from "react-native-purchases";
import { writeLastKnownAccessState } from "../lib/accessStateCache";
import { getAccessStateForUser, getActiveAccessOverrideForUser } from "../lib/subscription";
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
const mockGetCustomerInfo = Purchases.getCustomerInfo as jest.Mock;
const mockIsConfigured = Purchases.isConfigured as jest.Mock;

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
    mockIsConfigured.mockResolvedValue(true);
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: {} },
    });
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

  it("returns unknown access when the subscription query fails and RevenueCat has no active cache", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "network down" },
    });
    const limit = jest.fn(() => ({ maybeSingle }));
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));

    mockFrom.mockReturnValue({ select });

    const result = await getAccessStateForUser("user-123");

    expect(result).toEqual(
      expect.objectContaining({
        canAccessApp: false,
        accessMode: "none",
        resolution: "unknown",
        unknownReason: "subscription_fetch_failed",
      }),
    );
    expect(mockGetCustomerInfo).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("allows access from last known entitled state when the subscription query fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "network down" },
    });
    const limit = jest.fn(() => ({ maybeSingle }));
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));

    mockFrom.mockReturnValue({ select });
    await writeLastKnownAccessState("user-123", "paid");

    const result = await getAccessStateForUser("user-123");

    expect(result).toEqual(
      expect.objectContaining({
        canAccessApp: true,
        accessMode: "paid",
        resolution: "unknown",
        source: "last_known_cache",
      }),
    );

    warnSpy.mockRestore();
  });

  it("grants paid access from RevenueCat customer info when Supabase access cannot be read", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "network down" },
    });
    const limit = jest.fn(() => ({ maybeSingle }));
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));

    mockFrom.mockReturnValue({ select });
    mockGetCustomerInfo.mockResolvedValueOnce({
      entitlements: {
        active: {
          premium: { identifier: "premium" },
        },
      },
    });

    const result = await getAccessStateForUser("user-123");

    expect(result).toEqual(
      expect.objectContaining({
        canAccessApp: true,
        accessMode: "paid",
        resolution: "entitled",
        source: "revenuecat",
      }),
    );

    warnSpy.mockRestore();
  });
});
