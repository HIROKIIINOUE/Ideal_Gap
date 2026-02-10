import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearLockoutState,
  getLockoutStatus,
  getRemainingTimeParts,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  registerFailedAttempt,
  RESET_WINDOW_MS,
} from "../lib/loginLockout";

const email = "test@example.com";

describe("loginLockout", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("locks after max failed attempts", async () => {
    const now = 1_700_000_000_000;
    let status = await getLockoutStatus(email, now);
    expect(status.locked).toBe(false);

    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      status = await registerFailedAttempt(email, now + i * 1000);
    }

    expect(status.locked).toBe(true);
    expect(status.lockedUntil).toBe(now + (MAX_FAILED_ATTEMPTS - 1) * 1000 + LOCKOUT_DURATION_MS);
  });

  it("clears lockout after duration", async () => {
    const now = 1_700_000_000_000;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      await registerFailedAttempt(email, now + i * 1000);
    }

    const locked = await getLockoutStatus(email, now + LOCKOUT_DURATION_MS - 1);
    expect(locked.locked).toBe(true);

    const after = await getLockoutStatus(email, now + LOCKOUT_DURATION_MS + 1);
    expect(after.locked).toBe(false);
    expect(after.attempts).toBe(0);
  });

  it("resets attempts when the window passes", async () => {
    const now = 1_700_000_000_000;
    await registerFailedAttempt(email, now);
    await registerFailedAttempt(email, now + 1000);

    const later = await registerFailedAttempt(email, now + RESET_WINDOW_MS + 1000);
    expect(later.attempts).toBe(1);
    expect(later.locked).toBe(false);
  });

  it("clearLockoutState removes stored data", async () => {
    const now = 1_700_000_000_000;
    await registerFailedAttempt(email, now);
    await clearLockoutState(email);
    const status = await getLockoutStatus(email, now);
    expect(status.attempts).toBe(0);
    expect(status.locked).toBe(false);
  });

  it("getRemainingTimeParts returns minutes/seconds", () => {
    const now = 1_700_000_000_000;
    const lockedUntil = now + 62_000;
    const remaining = getRemainingTimeParts(lockedUntil, now);
    expect(remaining).toEqual({ minutes: 1, seconds: 2, totalSeconds: 62 });
  });

  it("getRemainingTimeParts clamps to zero for expired locks", () => {
    const now = 1_700_000_000_000;
    const remaining = getRemainingTimeParts(now - 1, now);
    expect(remaining).toEqual({ minutes: 0, seconds: 0, totalSeconds: 0 });
  });
});
