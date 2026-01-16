import { LanguageKey } from "../types/i18n";

export type BreakReminderTranslations = {
  title: string;
  description: string;
  inputLabel: string;
  schedule: string;
  cancel: string;
  scheduledLabel: string;
  activeTitle: string;
  timeRemaining: string;
  errorPast: string;
  permissionDenied: string;
  notificationTitle: string;
  notificationBody: string;
};

export const breakReminderTranslations: Record<LanguageKey, BreakReminderTranslations> = {
  ja: {
    title: "休憩終了通知",
    description: "休憩終了の時刻を決めて通知を受け取ります。1件だけ設定できます。",
    inputLabel: "終了予定時刻",
    schedule: "通知を予約",
    cancel: "通知をキャンセル",
    scheduledLabel: "{{time}}に通知を送ります",
    activeTitle: "休憩終了設定中",
    timeRemaining: "休憩終了まで残り{{minutes}}分",
    errorPast: "未来の時刻を選択してください。",
    permissionDenied: "通知がオフになっています。設定から許可してください。",
    notificationTitle: "休憩を終えましょう",
    notificationBody: "次のタスクを始める時間です。",
  },
  en: {
    title: "Break reminder",
    description: "Set when to end your break and we’ll notify you. Only one reminder can be active.",
    inputLabel: "Break end time",
    schedule: "Schedule reminder",
    cancel: "Cancel reminder",
    scheduledLabel: "Reminder set for {{time}}",
    activeTitle: "Break reminder active",
    timeRemaining: "Time remaining: {{minutes}} min",
    errorPast: "Please choose a future time.",
    permissionDenied: "Notifications are disabled. Enable them to receive reminders.",
    notificationTitle: "Break is over",
    notificationBody: "Time to start your next task.",
  },
  fr: {
    title: "Rappel de fin de pause",
    description: "Choisissez l’heure de reprise et nous vous alerterons. Un seul rappel peut être actif.",
    inputLabel: "Heure de reprise",
    schedule: "Programmer le rappel",
    cancel: "Annuler le rappel",
    scheduledLabel: "Rappel prévu à {{time}}",
    activeTitle: "Rappel de fin de pause actif",
    timeRemaining: "Temps restant : {{minutes}} min",
    errorPast: "Choisissez une heure future.",
    permissionDenied: "Les notifications sont désactivées. Autorisez-les pour recevoir les rappels.",
    notificationTitle: "Fin de pause",
    notificationBody: "Il est temps de reprendre votre prochaine tâche.",
  },
};
