//　購入画面やサインアップ画面で見せる「料金表示の文言」を組み立てる
//　プランの仕様変更(金額や期間など)をこのファイルで一元管理
import { TFunction } from "i18next";
import { RevenueCatPlan } from "./revenuecatOfferings";

type TrialUnit = NonNullable<RevenueCatPlan["trialDuration"]>["unit"];

const unitKeyMap: Record<TrialUnit, string> = {
  DAY: "trialLabelDay",
  WEEK: "trialLabelWeek",
  MONTH: "trialLabelMonth",
  YEAR: "trialLabelYear",
};

const formatDecimalPrice = (price: number) => {
  if (Number.isInteger(price)) return String(price);
  return price.toFixed(2);
};

export const formatRevenueCatPrice = (
  plan: Pick<RevenueCatPlan, "price" | "priceString" | "currencyCode"> | null,
) => {
  if (!plan) return null;
  if (typeof plan.price === "number" && plan.currencyCode) {
    return `${formatDecimalPrice(plan.price)} ${plan.currencyCode}`;
  }
  return plan.priceString;
};

export const getTrialLabel = (plan: RevenueCatPlan | null, t: TFunction) => {
  if (!plan) return null;
  if (plan.trialDuration) {
    const key = unitKeyMap[plan.trialDuration.unit];
    if (key) return t(key, { count: plan.trialDuration.value });
  }
  if (plan.trialLabel) return plan.trialLabel;
  return null;
};

export const getPlanBillingCopy = (plan: RevenueCatPlan | null, t: TFunction) => {
  if (!plan) return t("planUnavailable");
  return t("planRenewalPrice", { price: formatRevenueCatPrice(plan) });
};

export const getPlanTrialCopy = (plan: RevenueCatPlan | null, t: TFunction) => {
  if (!plan) return null;
  const trialLabel = getTrialLabel(plan, t);
  if (trialLabel) {
    return t("trialInfo", {
      trial: trialLabel,
      price: formatRevenueCatPrice(plan),
    });
  }
  return null;
};

export const getPlanPriceCopy = (plan: RevenueCatPlan | null, t: TFunction) =>
  getPlanBillingCopy(plan, t);
