// 言語選択表示機能を実現するi18next設定ファイル
import i18n, { Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import { commonTranslations } from "../content/commonTranslations";
import { dashboardTranslations } from "../content/dashboardTranslations";
import { idealSelfTranslations } from "../content/idealSelfTranslations";
import { annualGoalsTranslations } from "../content/annualGoalsTranslations";
import { monthlyGoalsTranslations } from "../content/monthlyGoalsTranslations";
import { landingTranslations } from "../content/landingTranslations";
import { loginTranslations } from "../content/loginTranslations";
import { purchasesTranslations } from "../content/purchasesTranslations";
import { funPlanTranslations } from "../content/funPlanTranslations";
import { profileUpdateTranslations } from "../content/profileUpdateTranslations";
import { resetPasswordTranslations } from "../content/resetPasswordTranslations";
import { signupTranslations } from "../content/signupTranslations";
import { contactTranslations } from "../content/contactTranslations";
import { weeklyTasksTranslations } from "../content/weeklyTasksTranslations";
import { taskTimerTranslations } from "../content/taskTimerTranslations";
import { LanguageKey, SUPPORTED_LANGUAGES } from "../types/i18n";
import { breakReminderTranslations } from "../content/breakReminderTranslations";
import { focusMusicTranslations } from "../content/focusMusicTranslations";

const resources = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
  // useTranslationの参照先をコントロール
  acc[lang] = {
    common: commonTranslations[lang],
    dashboard: dashboardTranslations[lang],
    idealSelf: idealSelfTranslations[lang],
    annualGoals: annualGoalsTranslations[lang],
    monthlyGoals: monthlyGoalsTranslations[lang],
    landing: landingTranslations[lang],
    login: loginTranslations[lang],
    profileUpdate: profileUpdateTranslations[lang],
    purchases: purchasesTranslations[lang],
    resetPassword: resetPasswordTranslations[lang],
    signup: signupTranslations[lang],
    contact: contactTranslations[lang],
    weeklyTasks: weeklyTasksTranslations[lang],
    taskTimer: taskTimerTranslations[lang],
    funPlan: funPlanTranslations[lang],
    breakReminder: breakReminderTranslations[lang],
    focusMusic: focusMusicTranslations[lang],
  };
  return acc;
}, {} as Resource);

// 初期値が日本語英語フランス語以外の場合は英語にフォールバック
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    lng: "en",
    defaultNS: "common",
    ns: [
      "common",
      "dashboard",
      "idealSelf",
      "annualGoals",
      "monthlyGoals",
      "landing",
      "login",
      "resetPassword",
      "signup",
      "purchases",
      "profileUpdate",
      "contact",
      "weeklyTasks",
      "taskTimer",
      "funPlan",
      "breakReminder",
      "focusMusic",
    ],
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: "v4",
    returnNull: false,
  });
}

export type AppResource = typeof resources;

// サポート言語(今回は日本語英語フランス語)を指定
export const isSupportedLanguage = (
  lang?: string | null
): lang is LanguageKey =>
  !!lang && SUPPORTED_LANGUAGES.includes(lang as LanguageKey);

export default i18n;
