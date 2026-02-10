//　ログイン時の総当たり攻撃を避けるために10回失敗すると５分間ロックがかかる仕様のためのカスタムフック
// → まだコードの細部の学習はできていない。（優先度低）
// アプリ上での挙動は問題なし。

import { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearLockoutState,
  getLockoutStatus,
  getRemainingTimeParts,
  registerFailedAttempt,
} from "../lib/loginLockout";

type LockoutState = {
  locked: boolean;
  lockedUntil: number | null;
};

type UseLoginLockoutParams = {
  email: string;
  t: TFunction<"login">;
};

export const useLoginLockout = ({ email, t }: UseLoginLockoutParams) => {
  const [lockoutStatus, setLockoutStatus] = useState<LockoutState | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    if (!email.trim()) {
      setLockoutStatus(null);
      return;
    }
    getLockoutStatus(email).then((status) => {
      if (!active) return;
      setLockoutStatus({
        locked: status.locked,
        lockedUntil: status.lockedUntil,
      });
    });
    return () => {
      active = false;
    };
  }, [email]);

  useEffect(() => {
    if (!lockoutStatus?.lockedUntil || !email.trim()) {
      return undefined;
    }
    const interval = setInterval(() => {
      const remaining = getRemainingTimeParts(
        lockoutStatus.lockedUntil,
        Date.now(),
      );
      if (remaining.totalSeconds <= 0) {
        clearLockoutState(email).catch(() => {});
        setLockoutStatus({ locked: false, lockedUntil: null });
        setNowTick(Date.now());
        clearInterval(interval);
        return;
      }
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [email, lockoutStatus?.lockedUntil]);

  const remainingText = useMemo(() => {
    if (!lockoutStatus?.lockedUntil) return null;
    const remaining = getRemainingTimeParts(lockoutStatus.lockedUntil, nowTick);
    if (remaining.totalSeconds <= 0) return null;
    const secondsLabel = String(remaining.seconds).padStart(2, "0");
    return t("lockoutRemaining", {
      minutes: remaining.minutes,
      seconds: secondsLabel,
    });
  }, [lockoutStatus?.lockedUntil, nowTick, t]);

  const checkLockout = useCallback(async (targetEmail: string) => {
    const status = await getLockoutStatus(targetEmail);
    setLockoutStatus({
      locked: status.locked,
      lockedUntil: status.lockedUntil,
    });
    return status;
  }, []);

  const recordFailure = useCallback(async (targetEmail: string) => {
    const status = await registerFailedAttempt(targetEmail);
    setLockoutStatus({
      locked: status.locked,
      lockedUntil: status.lockedUntil,
    });
    return status;
  }, []);

  const clearLockout = useCallback(async (targetEmail: string) => {
    await clearLockoutState(targetEmail);
    setLockoutStatus({ locked: false, lockedUntil: null });
  }, []);

  return {
    isLocked: !!lockoutStatus?.locked,
    remainingText,
    checkLockout,
    recordFailure,
    clearLockout,
  };
};
