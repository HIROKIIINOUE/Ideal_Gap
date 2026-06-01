import { LanguageKey } from "../types/i18n";

export type TaskTimerTranslations = {
  pageTitle: string;
  header: {
    taskLabel: string;
    yearlyLabel: string;
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
  exitActions: {
    title: string;
    description: string;
    weeklyTasks: string;
    dashboard: string;
    confirmTitle: string;
    confirmBody: string;
  };
  manualEntryCard: {
    title: string;
    description: string;
    button: string;
  };
  completionModal: {
    title: string;
    unlinkedTitle: string;
    description: string;
    unlinkedDescription: string;
    actualTimeLabel: string;
    minutesLabel: string;
    nextStartLabel: string;
    currentStartLabel: string;
    nextStartPlaceholder: string;
    nextStartHelper: string;
    confirm: string;
    done: string;
    saving: string;
    unlinkedNotice: string;
    missingTaskNotice: string;
  };
  manualModal: {
    title: string;
    currentLabel: string;
    addedLabel: string;
    finalLabel: string;
    hoursLabel: string;
    minutesLabel: string;
    rangeHelper: string;
    confirmTitle: string;
    confirmMessage: string;
    confirm: string;
    cancel: string;
    submit: string;
    saving: string;
    successTitle: string;
    successBody: string;
    errorTitle: string;
  };
  feedback: {
    startError: string;
    permissionDenied: string;
    permissionContinue: string;
    permissionAction: string;
    permissionHide: string;
    offlineSaveBlocked: string;
    offlineManualBlocked: string;
    missingTaskOnSave: string;
    offlineSaveBlockedAction: string;
    saveTimeout: string;
  };
};

export const taskTimerTranslations: Record<LanguageKey, TaskTimerTranslations> =
  {
    ja: {
      pageTitle: "タスクタイマー",
      header: {
        taskLabel: "対象タスク",
        yearlyLabel: "紐づけた年間目標",
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
      exitActions: {
        title: "ページ移動",
        description:
          "移動すると現在のタイマーは強制終了され、タイマーデータはリセットされます。",
        weeklyTasks: "週間タスク",
        dashboard: "ダッシュボード",
        confirmTitle: "タイマーを強制終了しますか？",
        confirmBody: "現在のタイマーデータはリセットされます。",
      },
      manualEntryCard: {
        title: "手動記録",
        description:
          "タイマーを使わなかった作業時間を、選択中の週間タスクへ直接加算できます。",
        button: "手動で作業時間を追加",
      },
      completionModal: {
        title: "実績を保存",
        unlinkedTitle: "作業を完了",
        description:
          "週間タスクに戻る前に実績時間を確認し、次回のスタート地点をメモできます。",
        unlinkedDescription: "今回の作業時間を確認してタイマーを完了します。",
        actualTimeLabel: "今回の実績時間",
        minutesLabel: "{{minutes}}分として記録されます",
        nextStartLabel: "次回のスタート地点（任意）",
        currentStartLabel: "今回のスタート地点",
        nextStartPlaceholder: "例: 第2章から / 単語帳セクション3から",
        nextStartHelper: "メモを残すと次のセッション開始時に表示されます",
        confirm: "完了",
        done: "完了",
        saving: "保存中...",
        unlinkedNotice:
          "タイマーが週間タスクに紐づいていないため作業時間は蓄積されません。",
        missingTaskNotice:
          "紐づけた週間タスクが削除されたため作業時間は保存されません。",
      },
      manualModal: {
        title: "手動で記録",
        currentLabel: "現在の実績",
        addedLabel: "追加する時間",
        finalLabel: "追加後の合計",
        hoursLabel: "時間",
        minutesLabel: "分",
        rangeHelper:
          "入力した時間を現在の実績に積み上げます。関連する年間目標にも反映されます。",
        confirmTitle: "この実績で更新しますか？",
        confirmMessage: "{{added}} を加算して合計を {{total}} に更新します。",
        confirm: "加算する",
        cancel: "戻る",
        submit: "加算する",
        saving: "保存中...",
        successTitle: "更新しました",
        successBody: "追加分を保存しました。",
        errorTitle: "更新に失敗しました",
      },
      feedback: {
        startError: "時間を設定してから開始してください",
        permissionDenied:
          "通知がオフになっています。設定から許可してください。",
        permissionContinue: "通知オフで続ける",
        permissionAction: "設定を開く",
        permissionHide: "今後表示しない",
        offlineSaveBlocked:
          "オフラインです。通信を再接続するか、手動記録カードから手動で時間を記録してください。",
        offlineManualBlocked:
          "オフラインです。通信を再接続してから手動で時間を追加してください。",
        missingTaskOnSave:
          "この週間タスクは削除されたため、今回の作業時間は保存されませんでした。週間タスクページに戻ります。",
        offlineSaveBlockedAction: "戻る",
        saveTimeout:
          "保存に時間がかかりすぎました。通信状況を確認して、もう一度お試しください。",
      },
    },
    en: {
      pageTitle: "Task timer",
      header: {
        taskLabel: "Task",
        yearlyLabel: "Annual goal",
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
        musicPlay: "Play",
        musicPause: "Pause",
        musicUnavailable: "No music",
        musicSelect: "Select",
        musicModalTitle: "Pick focus music",
        musicModalSubtitle: "Downloaded tracks",
        musicSelected: "{{title}} selected",
        musicNone: "No track selected",
        musicEmptyTitle: "No focus music installed",
        musicEmptyBody: "Install a track from the focus music page.",
        musicEmptyCta: "Go to focus music",
      },
      exitActions: {
        title: "Leave timer",
        description:
          "Leaving will force stop the current timer and reset the timer data.",
        weeklyTasks: "Weekly tasks",
        dashboard: "Dashboard",
        confirmTitle: "Force stop the timer?",
        confirmBody: "The current timer data will be reset.",
      },
      manualEntryCard: {
        title: "Manual entry",
        description:
          "Add work time directly to the selected weekly task when you did not use the timer.",
        button: "Add work time manually",
      },
      completionModal: {
        title: "Review before saving",
        unlinkedTitle: "Review before finishing",
        description:
          "Check the logged time and note your next starting point before returning to weekly tasks.",
        unlinkedDescription:
          "Check the elapsed time and finish this timer session.",
        actualTimeLabel: "Elapsed this session",
        minutesLabel: "Saved as {{minutes}} min",
        nextStartLabel: "Next starting point (optional)",
        currentStartLabel: "Starting point this session",
        nextStartPlaceholder: "e.g. Resume from section 2",
        nextStartHelper:
          "Leave a short note so you can resume from the proper point in next time.",
        confirm: "Save",
        done: "Done",
        saving: "Saving...",
        unlinkedNotice:
          "This timer is not linked to a weekly task, so work time will not be saved.",
        missingTaskNotice:
          "The linked weekly task was deleted, so work time will not be saved.",
      },
      manualModal: {
        title: "Manual record",
        currentLabel: "Current log",
        addedLabel: "Add",
        finalLabel: "New total",
        hoursLabel: "Hours",
        minutesLabel: "Minutes",
        rangeHelper:
          "The time you enter will be added to the current total. It will also be applied to the related annual goal.",
        confirmTitle: "Update this log?",
        confirmMessage: "Add {{added}} and update the total to {{total}}.",
        confirm: "Add time",
        cancel: "Back",
        submit: "Add time",
        saving: "Saving...",
        successTitle: "Added",
        successBody: "The additional time has been saved.",
        errorTitle: "Update failed",
      },
      feedback: {
        startError: "Set a duration before starting",
        permissionDenied:
          "Notification is disabled. Enable it to receive the notification when the timer is done.",
        permissionContinue: "Continue without notification",
        permissionAction: "Open settings",
        permissionHide: "Don't show again",
        offlineSaveBlocked:
          "You are offline. Reconnect to the internet, or record your time manually from the manual entry card.",
        offlineManualBlocked:
          "You are offline. Reconnect to the internet before adding work time manually.",
        missingTaskOnSave:
          "This weekly task no longer exists, so this session was not saved. You will be returned to weekly tasks.",
        offlineSaveBlockedAction: "Back",
        saveTimeout:
          "Saving took too long. Check your connection and try again.",
      },
    },
    fr: {
      pageTitle: "Minuteur de tâche",
      header: {
        taskLabel: "Tâche",
        yearlyLabel: "Objectif annuel",
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
        pause: "Pause",
        resume: "Reprendre",
        complete: "Terminer",
        completeConfirmTitle: "Terminer cette session ?",
        completeConfirmBody:
          "Nous enregistrerons le temps écoulé et reviendrons aux tâches hebdomadaires.",
        confirm: "Terminer",
        cancel: "Annuler",
        completeToast: "Temps écoulé enregistré",
        musicPlay: "Lancer",
        musicPause: "Pause",
        musicUnavailable: "Aucune musique",
        musicSelect: "Choisir",
        musicModalTitle: "Choisir la musique de concentration",
        musicModalSubtitle: "Morceaux téléchargés",
        musicSelected: "{{title}} sélectionné",
        musicNone: "Aucun morceau sélectionné",
        musicEmptyTitle: "Aucune musique installée",
        musicEmptyBody:
          "Installez un morceau depuis la page musique de concentration.",
        musicEmptyCta: "Aller à la musique",
      },
      exitActions: {
        title: "Quitter le minuteur",
        description:
          "Quitter arrêtera le minuteur en cours et réinitialisera ses données.",
        weeklyTasks: "Tâches hebdo",
        dashboard: "Tableau de bord",
        confirmTitle: "Arrêter le minuteur de force ?",
        confirmBody: "Les données du minuteur en cours seront réinitialisées.",
      },
      manualEntryCard: {
        title: "Saisie manuelle",
        description:
          "Ajoutez directement du temps de travail à la tâche hebdomadaire sélectionnée si vous n'avez pas utilisé le minuteur.",
        button: "Ajouter du temps manuellement",
      },
      completionModal: {
        title: "Revoir avant d'enregistrer",
        unlinkedTitle: "Revoir avant de terminer",
        description:
          "Vérifiez le temps enregistré et notez le prochain point de reprise avant de revenir aux tâches hebdomadaires.",
        unlinkedDescription:
          "Vérifiez le temps écoulé puis terminez cette session.",
        actualTimeLabel: "Temps passé sur cette session",
        minutesLabel: "Enregistré en {{minutes}}m",
        nextStartLabel: "Point de reprise (optionnel)",
        currentStartLabel: "Point de départ de cette session",
        nextStartPlaceholder:
          "ex. Reprendre à la section 2 ou à la sous-tâche 3",
        nextStartHelper:
          "Ajoutez une note pour reprendre plus vite la prochaine fois.",
        confirm: "Enregistrer",
        done: "Terminer",
        saving: "Enregistrer",
        unlinkedNotice:
          "Ce minuteur n'est associé à aucune tâche hebdomadaire, donc le temps de travail ne sera pas enregistré.",
        missingTaskNotice:
          "La tâche hebdomadaire associée a été supprimée, donc le temps de travail ne sera pas enregistré.",
      },
      manualModal: {
        title: "Saisie manuelle",
        currentLabel: "Enregistré",
        addedLabel: "Ajout",
        finalLabel: "Progression totale",
        hoursLabel: "Heures",
        minutesLabel: "Minutes",
        rangeHelper:
          "Le temps que vous saisissez sera additionné au total actuel. Il sera également appliqué à l'objectif annuel associé.",
        confirmTitle: "Voulez-vous mettre à jour la progression ?",
        confirmMessage:
          "Ajouter {{added}} à votre progression et passer à {{total}}.",
        confirm: "Ajouter",
        cancel: "Retour",
        submit: "Ajouter",
        saving: "Enregistrer",
        successTitle: "Ajout enregistré",
        successBody: "Le temps ajouté a été enregistré.",
        errorTitle: "Échec de la mise à jour",
      },
      feedback: {
        startError: "Définissez une durée avant de démarrer",
        permissionDenied:
          "Les notifications sont désactivées. Autorisez-les dans les réglages.",
        permissionContinue: "Continuer sans notifications",
        permissionAction: "Ouvrir les réglages",
        permissionHide: "Ne plus afficher",
        offlineSaveBlocked:
          "Vous êtes hors ligne. Reconnectez-vous à Internet, ou enregistrez le temps manuellement depuis la carte de saisie manuelle.",
        offlineManualBlocked:
          "Vous êtes hors ligne. Reconnectez-vous à Internet avant d'ajouter du temps manuellement.",
        missingTaskOnSave:
          "Cette tâche hebdomadaire n'existe plus, donc cette session n'a pas été enregistrée. Vous allez revenir aux tâches hebdomadaires.",
        offlineSaveBlockedAction: "Retour",
        saveTimeout:
          "L'enregistrement a pris trop de temps. Vérifiez la connexion puis réessayez.",
      },
    },
  };
