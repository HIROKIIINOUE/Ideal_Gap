import {
  getLimitedAccessMode,
  getUsageLimit,
  hasReachedUsageLimit,
} from "../lib/usageLimits";

describe("usageLimits", () => {
  it("returns free limits for free users", () => {
    expect(getUsageLimit("idealSelf", "free")).toBe(10);
    expect(getUsageLimit("funPlans", "free")).toBe(5);
    expect(getUsageLimit("focusMusicDownloads", "free")).toBe(5);
  });

  it("returns paid-tier limits for paid and friend free users", () => {
    expect(getUsageLimit("idealSelf", "paid")).toBeNull();
    expect(getUsageLimit("annualGoals", "friend_free")).toBeNull();
    expect(getUsageLimit("focusMusicDownloads", "paid")).toBe(30);
    expect(getUsageLimit("focusMusicDownloads", "friend_free")).toBe(30);
  });

  it("normalizes unknown modes to free", () => {
    expect(getLimitedAccessMode("none")).toBe("free");
    expect(getLimitedAccessMode(null)).toBe("free");
    expect(getLimitedAccessMode(undefined)).toBe("free");
  });

  it("detects when a count reaches the configured limit", () => {
    expect(
      hasReachedUsageLimit({
        feature: "weeklyTasks",
        accessMode: "free",
        currentCount: 10,
      }),
    ).toBe(true);
    expect(
      hasReachedUsageLimit({
        feature: "weeklyTasks",
        accessMode: "free",
        currentCount: 9,
      }),
    ).toBe(false);
    expect(
      hasReachedUsageLimit({
        feature: "weeklyTasks",
        accessMode: "paid",
        currentCount: 999,
      }),
    ).toBe(false);
  });
});
