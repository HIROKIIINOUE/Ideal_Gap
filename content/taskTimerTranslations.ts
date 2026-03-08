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
  timerNotification: {
    title: string;
    body: string;
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
    add10s: string; // これはテスト用
    add1m: string; // これはテスト用
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
    musicUnavailable: string;
    musicSelect: string;
    musicModalTitle: string;
    musicModalSubtitle: string;
    musicSelected: string;
    musicNone: string;
    musicEmptyTitle: string;
    musicEmptyBody: string;
    musicEmptyCta: string;
  };
  completionModal: {
    title: string;
    description: string;
    actualTimeLabel: string;
    minutesLabel: string;
    nextStartLabel: string;
    currentStartLabel: string;
    nextStartPlaceholder: string;
    nextStartHelper: string;
    confirm: string;
  };
  feedback: {
    startError: string;
    offlineSaveBlocked: string;
    offlineSaveBlockedAction: string;
  };
};

export const taskTimerTranslations: Record<LanguageKey, TaskTimerTranslations> =
  {
    ja: {
      pageTitle: "タスクタイマー",
      header: {
        taskLabel: "対象タスク",
        monthlyLabel: "紐づけた月間目標",
        estimatedLabel: "目標時間",
        loggedLabel: "実績",
        notificationTitle:
          "タイマー終了を通知するため、通知を許可してください。",
        notificationAction: "設定を開く",
        notificationDismiss: "閉じる",
      },
      timerNotification: {
        title: "タイマーが終了しました",
        body: "作業セッションが完了しました。",
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
        add10s: "10秒", // これはテスト用
        add1m: "1分", // これはテスト用
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
        musicUnavailable: "音楽未設定",
        musicSelect: "音楽を選ぶ",
        musicModalTitle: "集中用の音楽を選択",
        musicModalSubtitle: "ダウンロード済みの曲",
        musicSelected: "{{title}}を選択しました",
        musicNone: "音楽が選択されていません",
        musicEmptyTitle: "集中音楽がありません",
        musicEmptyBody: "タスク集中音楽ページからインストールしてください。",
        musicEmptyCta: "タスク集中音楽へ",
      },
      completionModal: {
        title: "実績を保存",
        description:
          "週間タスクに戻る前に実績時間を確認し、次回のスタート地点をメモできます。",
        actualTimeLabel: "今回の実績時間",
        minutesLabel: "{{minutes}}分として記録されます",
        nextStartLabel: "次回のスタート地点（任意）",
        currentStartLabel: "今回のスタート地点",
        nextStartPlaceholder: "例: 第2章から / 単語帳セクション3から",
        nextStartHelper: "メモを残すと次のセッション開始時に表示されます",
        confirm: "完了して記録",
      },
      feedback: {
        startError: "時間を設定してから開始してください",
        offlineSaveBlocked:
          "オフラインです。通信を再接続するか、手動記録ボタンから手動で時間を記録してください。",
        offlineSaveBlockedAction: "戻る",
      },
    },
    en: {
      pageTitle: "Task timer",
      header: {
        taskLabel: "Task",
        monthlyLabel: "Monthly goal",
        estimatedLabel: "Planned",
        loggedLabel: "Logged",
        notificationTitle:
          "Allow notifications so we can notify you when the timer ends.",
        notificationAction: "Open settings",
        notificationDismiss: "Dismiss",
      },
      timerNotification: {
        title: "Timer finished",
        body: "Your session is complete.",
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
        add10s: "10s", // これはテスト用
        add1m: "1m", // これはテスト用
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
        completeConfirmBody:
          "We’ll record the elapsed time and return to weekly tasks.",
        confirm: "Finish",
        cancel: "Cancel",
        completeToast: "Elapsed time recorded",
        musicPlay: "Play music",
        musicPause: "Pause music",
        musicUnavailable: "No music",
        musicSelect: "Choose track",
        musicModalTitle: "Pick focus music",
        musicModalSubtitle: "Downloaded tracks",
        musicSelected: "{{title}} selected",
        musicNone: "No track selected",
        musicEmptyTitle: "No focus music installed",
        musicEmptyBody: "Install a track from the focus music page.",
        musicEmptyCta: "Go to focus music",
      },
      completionModal: {
        title: "Review before saving",
        description:
          "Check the logged time and note your next starting point before returning to weekly tasks.",
        actualTimeLabel: "Elapsed this session",
        minutesLabel: "Saved as {{minutes}} min",
        nextStartLabel: "Next starting point (optional)",
        currentStartLabel: "Starting point this session",
        nextStartPlaceholder: "e.g. Resume from section 2",
        nextStartHelper:
          "Leave a short note so you can resume from the proper point in next time.",
        confirm: "Save",
      },
      feedback: {
        startError: "Set a duration before starting",
        offlineSaveBlocked:
          "You are offline. Reconnect to the internet, or record your time manually from the manual log button.",
        offlineSaveBlockedAction: "Back",
      },
    },
    fr: {
      pageTitle: "Minuteur de tâche",
      header: {
        taskLabel: "Tâche",
        monthlyLabel: "Objectif mensuel",
        estimatedLabel: "Temps prévu",
        loggedLabel: "Enregistré",
        notificationTitle:
          "Autorisez les notifications pour être prévenu à la fin du minuteur.",
        notificationAction: "Ouvrir les réglages",
        notificationDismiss: "Fermer",
      },
      timerNotification: {
        title: "Minuteur terminé",
        body: "Votre session est terminée.",
      },
      timerCard: {
        title: "Minuteur de concentration",
        helper:
          "Définissez la durée de concentration et lancez le compte à rebours.",
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
        add10s: "10 s", // これはテスト用
        add1m: "1m", // これはテスト用
        add5: "+5m",
        add10: "+10m",
        add30: "+30m",
        add1h: "+1h",
        add2h: "+2h",
        clear: "clear",
      },
      controls: {
        title: "Contrôles",
        pause: "Mettre en pause",
        resume: "Reprendre",
        complete: "Marquer terminé",
        completeConfirmTitle: "Terminer cette session ?",
        completeConfirmBody:
          "Nous enregistrerons le temps écoulé et reviendrons aux tâches hebdomadaires.",
        confirm: "Terminer",
        cancel: "Annuler",
        completeToast: "Temps écoulé enregistré",
        musicPlay: "Lancer la musique",
        musicPause: "Mettre la musique en pause",
        musicUnavailable: "Aucune musique",
        musicSelect: "Choisir un morceau",
        musicModalTitle: "Choisir la musique de concentration",
        musicModalSubtitle: "Morceaux téléchargés",
        musicSelected: "{{title}} sélectionné",
        musicNone: "Aucun morceau sélectionné",
        musicEmptyTitle: "Aucune musique installée",
        musicEmptyBody:
          "Installez un morceau depuis la page musique de concentration.",
        musicEmptyCta: "Aller à la musique",
      },
      completionModal: {
        title: "Revoir avant d'enregistrer",
        description:
          "Vérifiez le temps enregistré et notez le prochain point de reprise avant de revenir aux tâches hebdomadaires.",
        actualTimeLabel: "Temps passé sur cette session",
        minutesLabel: "Enregistré en {{minutes}}m",
        nextStartLabel: "Point de reprise (optionnel)",
        currentStartLabel: "Point de départ de cette session",
        nextStartPlaceholder:
          "ex. Reprendre à la section 2 ou à la sous-tâche 3",
        nextStartHelper:
          "Ajoutez une note pour reprendre plus vite la prochaine fois.",
        confirm: "Enregistrer et terminer",
      },
      feedback: {
        startError: "Définissez une durée avant de démarrer",
        offlineSaveBlocked:
          "Vous êtes hors ligne. Reconnectez-vous à Internet, ou enregistrez le temps manuellement avec le bouton de saisie manuelle.",
        offlineSaveBlockedAction: "Retour",
      },
    },
  };
