jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: jest.fn(),
}));

import {
  consumeFocusMusicDownloadQuota,
  loadFocusMusicDownloadQuota,
} from "../lib/focus-music/quota";
import { getAccessStateForUser } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;
const mockGetAccessStateForUser = getAccessStateForUser as jest.Mock;

describe("focus music quota helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessStateForUser.mockResolvedValue({
      accessMode: "free",
      canAccessApp: true,
    });
  });

  test("loads default free quota when no quota row exists", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const quota = await loadFocusMusicDownloadQuota("user-1");

    expect(quota).toEqual({
      accessMode: "free",
      limit: 5,
      count: 0,
      remaining: 5,
      resetAt: null,
      windowStartedAt: null,
    });
  });

  test("loads paid quota from Supabase row", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      accessMode: "paid",
      canAccessApp: true,
    });

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        download_count: 7,
        reset_at: "2026-07-10T00:00:00.000Z",
        window_started_at: "2026-06-10T00:00:00.000Z",
        plan_snapshot: "paid",
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const quota = await loadFocusMusicDownloadQuota("user-1");

    expect(quota).toEqual({
      accessMode: "paid",
      limit: 30,
      count: 7,
      remaining: 23,
      resetAt: "2026-07-10T00:00:00.000Z",
      windowStartedAt: "2026-06-10T00:00:00.000Z",
    });
  });

  test("resets quota window when a free user upgrades to paid", async () => {
    const now = new Date("2026-06-18T12:00:00.000Z");
    mockGetAccessStateForUser.mockResolvedValue({
      accessMode: "paid",
      canAccessApp: true,
    });

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        download_count: 4,
        reset_at: "2026-07-01T00:00:00.000Z",
        window_started_at: "2026-06-01T00:00:00.000Z",
        plan_snapshot: "free",
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });
    mockRpc.mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          download_count: 0,
          plan_snapshot: "paid",
          window_started_at: "2026-06-18T12:00:00.000Z",
          reset_at: "2026-07-18T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const quota = await loadFocusMusicDownloadQuota("user-1", now);

    expect(mockRpc).toHaveBeenCalledWith("sync_focus_music_download_quota_access", {
      p_user_id: "user-1",
      p_plan_snapshot: "paid",
      p_reset_interval_days: 30,
    });
    expect(quota).toEqual({
      accessMode: "paid",
      limit: 30,
      count: 0,
      remaining: 30,
      resetAt: "2026-07-18T12:00:00.000Z",
      windowStartedAt: "2026-06-18T12:00:00.000Z",
    });
  });

  test("preserves quota count when a paid user downgrades to free", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      accessMode: "free",
      canAccessApp: true,
    });

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        download_count: 8,
        reset_at: "2026-07-10T00:00:00.000Z",
        window_started_at: "2026-06-10T00:00:00.000Z",
        plan_snapshot: "paid",
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });
    mockRpc.mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          download_count: 8,
          plan_snapshot: "free",
          window_started_at: "2026-06-10T00:00:00.000Z",
          reset_at: "2026-07-10T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const quota = await loadFocusMusicDownloadQuota("user-1");

    expect(mockRpc).toHaveBeenCalledWith("sync_focus_music_download_quota_access", {
      p_user_id: "user-1",
      p_plan_snapshot: "free",
      p_reset_interval_days: 30,
    });
    expect(quota).toEqual({
      accessMode: "free",
      limit: 5,
      count: 8,
      remaining: 0,
      resetAt: "2026-07-10T00:00:00.000Z",
      windowStartedAt: "2026-06-10T00:00:00.000Z",
    });
  });

  test("treats expired quota window as a fresh window on read", async () => {
    const now = new Date("2026-06-18T12:00:00.000Z");
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        download_count: 5,
        reset_at: "2026-06-10T00:00:00.000Z",
        window_started_at: "2026-05-11T00:00:00.000Z",
        plan_snapshot: "free",
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const quota = await loadFocusMusicDownloadQuota("user-1", now);

    expect(quota).toEqual({
      accessMode: "free",
      limit: 5,
      count: 0,
      remaining: 5,
      resetAt: "2026-07-18T12:00:00.000Z",
      windowStartedAt: "2026-06-18T12:00:00.000Z",
    });
  });

  test("consumes quota through rpc and returns updated remaining count", async () => {
    mockGetAccessStateForUser.mockResolvedValue({
      accessMode: "friend_free",
      canAccessApp: true,
    });
    mockRpc.mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          download_count: 3,
          plan_snapshot: "friend_free",
          window_started_at: "2026-06-18T00:00:00.000Z",
          reset_at: "2026-07-18T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const result = await consumeFocusMusicDownloadQuota("user-1");

    expect(mockRpc).toHaveBeenCalledWith(
      "increment_focus_music_download_quota",
      {
        p_user_id: "user-1",
        p_plan_snapshot: "friend_free",
        p_increment: 1,
        p_max_downloads: 30,
        p_reset_interval_days: 30,
      },
    );
    expect(result).toEqual({
      ok: true,
      quota: {
        accessMode: "friend_free",
        limit: 30,
        count: 3,
        remaining: 27,
        resetAt: "2026-07-18T00:00:00.000Z",
        windowStartedAt: "2026-06-18T00:00:00.000Z",
      },
    });
  });

  test("returns monthly_limit when rpc rejects due to quota ceiling", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "monthly download limit reached" },
    });

    const result = await consumeFocusMusicDownloadQuota("user-1");

    expect(result).toEqual({
      ok: false,
      reason: "monthly_limit",
    });
  });
});
