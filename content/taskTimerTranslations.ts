import { LanguageKey } from "../types/i18n";

export type TaskTimerTranslations = {
  pageTitle: string;
  header: {
    taskLabel: string;
    monthlyLabel: string;
    estimatedLabel: string;
    loggedLabel: string;
    notificationTitle: string;
    notificationAction: string;
    notificationDismiss: string;
  };
  timerCard: {
    title: string;
    helper: string;
    endLabel: string;
    endTimeLabel: string;
    start: string;
    startDisabled: string;
    running: string;
    paused: string;
    finished: string;
    zeroState: string;
  };
  presets: {
    add5: string;
    add10: string;
    add30: string;
    add1h: string;
    add2h: string;
    clear: string;
  };
  controls: {
    title: string;
    pause: string;
    resume: string;
    complete: string;
    completeConfirmTitle: string;
    completeConfirmBody: string;
    confirm: string;
    cancel: string;
    completeToast: string;
    musicPlay: string;
    musicPause: string;
    musicSelect: string;
    musicModalTitle: string;
    musicModalSubtitle: string;
    musicSelected: string;
  };
  feedback: {
    startError: string;
  };
};

export const taskTimerTranslations: Record<LanguageKey, TaskTimerTranslations> = {
  ja: {
    pageTitle: "タスクタイマー",
    header: {
      taskLabel: "対象タスク",
      monthlyLabel: "紐づけた月間目標",
      estimatedLabel: "目標時間",
      loggedLabel: "実績",
      notificationTitle: "タイマー終了を通知するため、通知を許可してください。",
      notificationAction: "あとで設定を開く",
      notificationDismiss: "閉じる",
    },
    timerCard: {
      title: "作業タイマー",
      helper: "集中したい時間をセットして開始します。",
      endLabel: "終了予定 {{time}}",
      endTimeLabel: "終了予定時刻 {{time}}",
      start: "スタート",
      startDisabled: "時間をセットしてください",
      running: "計測中",
      paused: "一時停止中",
      finished: "完了",
      zeroState: "未設定",
    },
    presets: {
      add5: "+5m",
      add10: "+10m",
      add30: "+30m",
      add1h: "+1h",
      add2h: "+2h",
      clear: "クリア",
    },
    controls: {
      title: "操作",
      pause: "一時停止",
      resume: "再開",
      complete: "作業完了",
      completeConfirmTitle: "この作業を終了しますか？",
      completeConfirmBody: "経過時間を記録して週間タスクに戻ります。",
      confirm: "終了する",
      cancel: "戻る",
      completeToast: "経過時間を記録しました",
      musicPlay: "音楽再生",
      musicPause: "音楽停止",
      musicSelect: "音楽を選ぶ",
      musicModalTitle: "集中用の音楽を選択",
      musicModalSubtitle: "ダウンロード済みの曲",
      musicSelected: "{{title}}を選択しました",
    },
    feedback: {
      startError: "時間を設定してから開始してください",
    },
  },
  en: {
    pageTitle: "Task timer",
    header: {
      taskLabel: "Task",
      monthlyLabel: "Monthly goal",
      estimatedLabel: "Planned",
      loggedLabel: "Logged",
      notificationTitle: "Allow notifications so we can alert you when the timer ends.",
      notificationAction: "Open settings later",
      notificationDismiss: "Dismiss",
    },
    timerCard: {
      title: "Focus timer",
      helper: "Set how long you want to focus and start when ready.",
      endLabel: "Ends at {{time}}",
      endTimeLabel: "Ends at {{time}}",
      start: "Start focus",
      startDisabled: "Add time to start",
      running: "Running",
      paused: "Paused",
      finished: "Finished",
      zeroState: "No time set",
    },
    presets: {
      add5: "+5m",
      add10: "+10m",
      add30: "+30m",
      add1h: "+1h",
      add2h: "+2h",
      clear: "Clear",
    },
    controls: {
      title: "Controls",
      pause: "Pause",
      resume: "Resume",
      complete: "Mark done",
      completeConfirmTitle: "Finish this session?",
      completeConfirmBody: "We’ll record the elapsed time and return to weekly tasks.",
      confirm: "Finish",
      cancel: "Cancel",
      completeToast: "Elapsed time recorded",
      musicPlay: "Play music",
      musicPause: "Pause music",
      musicSelect: "Choose track",
      musicModalTitle: "Pick focus music",
      musicModalSubtitle: "Downloaded tracks",
      musicSelected: "{{title}} selected",
    },
    feedback: {
      startError: "Set a duration before starting",
    },
  },
  fr: {
    pageTitle: "Minuteur de tâche",
    header: {
      taskLabel: "Tâche",
      monthlyLabel: "Objectif mensuel",
      estimatedLabel: "Temps prévu",
      loggedLabel: "Enregistré",
      notificationTitle: "Autorisez les notifications pour être prévenu à la fin du minuteur.",
      notificationAction: "Autoriser plus tard",
      notificationDismiss: "Fermer",
    },
    timerCard: {
      title: "Minuteur de focus",
      helper: "Définissez la durée de focus puis lancez le compte à rebours.",
      endLabel: "Fin prévue {{time}}",
      endTimeLabel: "Fin prévue {{time}}",
      start: "Démarrer",
      startDisabled: "Ajoutez un temps avant de démarrer",
      running: "En cours",
      paused: "En pause",
      finished: "Terminé",
      zeroState: "Non défini",
    },
    presets: {
      add5: "+5 min",
      add10: "+10 min",
      add30: "+30 min",
      add1h: "+1 h",
      add2h: "+2 h",
      clear: "Réinitialiser",
    },
    controls: {
      title: "Contrôles",
      pause: "Mettre en pause",
      resume: "Reprendre",
      complete: "Marquer terminé",
      completeConfirmTitle: "Terminer cette session ?",
      completeConfirmBody: "Nous enregistrerons le temps écoulé et reviendrons aux tâches hebdomadaires.",
      confirm: "Terminer",
      cancel: "Annuler",
      completeToast: "Temps écoulé enregistré",
      musicPlay: "Lancer la musique",
      musicPause: "Mettre la musique en pause",
      musicSelect: "Choisir un morceau",
      musicModalTitle: "Choisir la musique de focus",
      musicModalSubtitle: "Morceaux téléchargés",
      musicSelected: "{{title}} sélectionné",
    },
    feedback: {
      startError: "Définissez une durée avant de démarrer",
    },
  },
};
