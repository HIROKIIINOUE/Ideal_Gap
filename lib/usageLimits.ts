import type { AccessMode } from "./subscription";

export type LimitedFeature =
  | "idealSelf"
  | "annualGoals"
  | "weeklyTasks"
  | "funPlans"
  | "focusMusicDownloads";

type UsageLimitValue = number | null;
type LimitedAccessMode = Extract<AccessMode, "free" | "paid" | "friend_free">;

type FeatureUsageLimits = Record<LimitedAccessMode, UsageLimitValue>;

export const USAGE_LIMITS: Record<LimitedFeature, FeatureUsageLimits> = {
  idealSelf: {
    free: 10,
    paid: null,
    friend_free: null,
  },
  annualGoals: {
    free: 10,
    paid: null,
    friend_free: null,
  },
  weeklyTasks: {
    free: 10,
    paid: null,
    friend_free: null,
  },
  funPlans: {
    free: 5,
    paid: null,
    friend_free: null,
  },
  focusMusicDownloads: {
    free: 5,
    paid: 30,
    friend_free: 30,
  },
};

// ユーザの課金状況に応じてキーを返す。paid,friend_free以外はfreeに流される
export const getLimitedAccessMode = (
  accessMode: AccessMode | null | undefined,
): LimitedAccessMode => {
  if (accessMode === "paid" || accessMode === "friend_free") {
    return accessMode;
  }
  return "free";
};

// 上限数を取得
export const getUsageLimit = (
  feature: LimitedFeature,
  accessMode: AccessMode | null | undefined,
): UsageLimitValue => {
  return USAGE_LIMITS[feature][getLimitedAccessMode(accessMode)];
};

// ユーザが非課金でかつデータの上限を超えている場合、trueを返す。
export const hasReachedUsageLimit = ({
  feature,
  accessMode,
  currentCount,
}: {
  feature: LimitedFeature;
  accessMode: AccessMode | null | undefined;
  currentCount: number;
}): boolean => {
  const limit = getUsageLimit(feature, accessMode);
  return limit !== null && currentCount >= limit;
};
