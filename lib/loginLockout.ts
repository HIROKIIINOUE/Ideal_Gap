//　ログイン時の総当たり攻撃を避けるために10回失敗すると５分間ロックがかかる
// → まだコードの細部の学習はできていない。（優先度低）
// アプリ上での挙動は問題なし。

import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

export const MAX_FAILED_ATTEMPTS = 10;
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
export const RESET_WINDOW_MS = 5 * 60 * 1000;

const LockoutStateSchema = z.object({
  attempts: z.number().int().min(0),
  lockedUntil: z.number().nullable(),
  lastFailedAt: z.number().nullable(),
});

type LockoutState = z.infer<typeof LockoutStateSchema>;

const DEFAULT_STATE: LockoutState = {
  attempts: 0,
  lockedUntil: null,
  lastFailedAt: null,
};

const buildStorageKey = (email: string) => `loginLockout:${email}`;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const readState = async (email: string): Promise<LockoutState> => {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ...DEFAULT_STATE };
  const raw = await AsyncStorage.getItem(buildStorageKey(normalized));
  if (!raw) return { ...DEFAULT_STATE };
  try {
    const parsed = LockoutStateSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(buildStorageKey(normalized));
  return { ...DEFAULT_STATE };
};

const writeState = async (email: string, state: LockoutState) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  await AsyncStorage.setItem(
    buildStorageKey(normalized),
    JSON.stringify(state),
  );
};

const clearState = async (email: string) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  await AsyncStorage.removeItem(buildStorageKey(normalized));
};

export type LockoutStatus = {
  locked: boolean;
  lockedUntil: number | null;
  attempts: number;
};

export type RemainingTimeParts = {
  minutes: number;
  seconds: number;
  totalSeconds: number;
};

export const getRemainingTimeParts = (
  lockedUntil: number | null,
  now: number = Date.now(),
): RemainingTimeParts => {
  if (!lockedUntil) return { minutes: 0, seconds: 0, totalSeconds: 0 };
  const diffMs = Math.max(0, lockedUntil - now);
  const totalSeconds = Math.ceil(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds, totalSeconds };
};

export const getLockoutStatus = async (
  email: string,
  now: number = Date.now(),
): Promise<LockoutStatus> => {
  const state = await readState(email);
  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      locked: true,
      lockedUntil: state.lockedUntil,
      attempts: state.attempts,
    };
  }
  if (state.lockedUntil && state.lockedUntil <= now) {
    await clearState(email);
    return { locked: false, lockedUntil: null, attempts: 0 };
  }
  return { locked: false, lockedUntil: null, attempts: state.attempts };
};

export const registerFailedAttempt = async (
  email: string,
  now: number = Date.now(),
): Promise<LockoutStatus> => {
  const state = await readState(email);

  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      locked: true,
      lockedUntil: state.lockedUntil,
      attempts: state.attempts,
    };
  }

  let attempts = state.attempts;
  if (state.lastFailedAt && now - state.lastFailedAt >= RESET_WINDOW_MS) {
    attempts = 0;
  }

  attempts += 1;
  const lockedUntil =
    attempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_DURATION_MS : null;

  const nextState: LockoutState = {
    attempts,
    lockedUntil,
    lastFailedAt: now,
  };

  await writeState(email, nextState);

  return {
    locked: !!lockedUntil,
    lockedUntil,
    attempts,
  };
};

export const clearLockoutState = async (email: string) => {
  await clearState(email);
};

export const normalizeLockoutEmail = (email: string) => normalizeEmail(email);
