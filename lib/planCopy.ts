//　購入画面やサインアップ画面で見せる「料金表示の文言」を組み立てる
//　プランの仕様変更(金額や期間など)をこのファイルで一元管理
import { TFunction } from "i18next";
import { TestStorePlan } from "./revenuecatOfferings";

type TrialUnit = NonNullable<TestStorePlan["trialDuration"]>["unit"];

const unitKeyMap: Record<TrialUnit, string> = {
  DAY: "trialLabelDay",
  WEEK: "trialLabelWeek",
  MONTH: "trialLabelMonth",
  YEAR: "trialLabelYear",
};

export const getTrialLabel = (plan: TestStorePlan | null, t: TFunction) => {
  if (!plan) return null;
  if (plan.trialDuration) {
    const key = unitKeyMap[plan.trialDuration.unit];
    if (key) return t(key, { count: plan.trialDuration.value });
  }
  if (plan.trialLabel) return plan.trialLabel;
  return null;
};

export const getPlanBillingCopy = (plan: TestStorePlan | null, t: TFunction) => {
  if (!plan) return t("planUnavailable");
  return t("planRenewalPrice", { price: plan.priceString });
};

export const getPlanTrialCopy = (plan: TestStorePlan | null, t: TFunction) => {
  if (!plan) return null;
  const trialLabel = getTrialLabel(plan, t);
  if (trialLabel) {
    return t("trialInfo", {
      trial: trialLabel,
      price: plan.priceString,
    });
  }
  return null;
};

export const getPlanPriceCopy = (plan: TestStorePlan | null, t: TFunction) =>
  getPlanBillingCopy(plan, t);
