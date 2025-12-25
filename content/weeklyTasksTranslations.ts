import { LanguageKey } from "../types/i18n";

export type WeeklyTasksTranslations = {
  pageTitle: string;
  header: {
    title: string;
    applyNextMemo: string;
  };
  actions: {
    add: string;
    delete: string;
    deleteExit: string;
  };
  deleteConfirm: {
    title: string;
    body: string;
    yes: string;
    no: string;
  };
  summary: {
    target: string;
    logged: string;
    remaining: string;
  };
  list: {
    title: string;
    emptyTitle: string;
    emptyBody: string;
  };
  task: {
    monthlyLink: string;
    openTimer: string;
    manualLog: string;
    edit: string;
    comingSoon: string;
  };
  modal: {
    addTitle: string;
    editTitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    monthLabel: string;
    monthlyGoalLabel: string;
    noMonthlyGoal: string;
    targetLabel: string;
    targetPlaceholder: string;
    targetHelper: string;
    cancel: string;
    save: string;
    errorRequired: string;
    errorEstimated: string;
  };
  manualModal: {
    title: string;
    description: string;
    taskLabel: string;
    currentLabel: string;
    targetLabel: string;
    hoursLabel: string;
    minutesLabel: string;
    rangeHelper: string;
    unchangedHint: string;
    confirmTitle: string;
    confirmMessage: string;
    confirm: string;
    cancel: string;
    submit: string;
    outOfRange: string;
    successTitle: string;
    successBody: string;
    errorTitle: string;
  };
};

export const weeklyTasksTranslations: Record<
  LanguageKey,
  WeeklyTasksTranslations
> = {
  ja: {
    pageTitle: "週間タスク",
    header: {
      title: "週の進捗",
      applyNextMemo: "来週メモを今週へ適用",
    },
    actions: {
      add: "追加",
      delete: "削除",
      deleteExit: "削除モードを終了",
    },
    deleteConfirm: {
      title: "削除してもよろしいですか？",
      body: "この週間タスクを削除すると元に戻せません。",
      yes: "削除する",
      no: "キャンセル",
    },
    summary: {
      target: "目標",
      logged: "実績",
      remaining: "残り",
    },
    list: {
      title: "タスクリスト",
      emptyTitle: "まだタスクがありません",
      emptyBody: "追加ボタンからタスクを作成し、月間目標と紐づけてください。",
    },
    task: {
      monthlyLink: "月間目標",
      openTimer: "作業タイマー",
      manualLog: "手動で記録",
      edit: "編集",
      comingSoon: "機能は後で実装予定",
    },
    modal: {
      addTitle: "週間タスクを追加",
      editTitle: "編集",
      titleLabel: "週間タスク",
      titlePlaceholder: "例）朝の30分でUX改善タスクを3本進める",
      monthLabel: "月間目標リストを表示する月",
      monthlyGoalLabel: "紐づける月間目標",
      noMonthlyGoal: "{{month}}月にまだ月間目標がありません",
      targetLabel: "目標時間（時間）",
      targetPlaceholder: "例）10",
      targetHelper: "時間単位で入力すると計算しやすいです",
      cancel: "キャンセル",
      save: "保存",
      errorRequired: "すべての項目を入力してください",
      errorEstimated: "目標時間は0より大きい数値で入力してください",
    },
    manualModal: {
      title: "手動で記録",
      description: "アプリ外で進めた作業時間を手入力で反映できます。",
      taskLabel: "対象タスク",
      currentLabel: "現在の実績",
      targetLabel: "目標時間",
      hoursLabel: "時間",
      minutesLabel: "分",
      rangeHelper: "0〜{{maxHours}}時間{{maxMinutes}}分の範囲で入力してください",
      unchangedHint: "数値を変更すると更新ボタンが有効になります",
      confirmTitle: "この実績で更新しますか？",
      confirmMessage: "累計時間を{{value}}に置き換えます。",
      confirm: "更新する",
      cancel: "戻る",
      submit: "更新する",
      outOfRange: "目標時間を超えない値を入力してください",
      successTitle: "更新しました",
      successBody: "実績時間を保存しました。",
      errorTitle: "更新に失敗しました",
    },
  },
  en: {
    pageTitle: "Weekly Tasks",
    header: {
      title: "Weekly progress",
      applyNextMemo: "Apply next memo to this week",
    },
    actions: {
      add: "Add",
      delete: "Delete",
      deleteExit: "Exit delete mode",
    },
    deleteConfirm: {
      title: "Delete this weekly task?",
      body: "You can’t undo this action after deleting.",
      yes: "Delete",
      no: "Cancel",
    },
    summary: {
      target: "Target",
      logged: "Logged",
      remaining: "Remaining",
    },
    list: {
      title: "Task list",
      emptyTitle: "No tasks yet",
      emptyBody: "Add a task and link it to a monthly goal.",
    },
    task: {
      monthlyLink: "Monthly goal",
      openTimer: "Work timer",
      manualLog: "Manual log",
      edit: "Edit",
      comingSoon: "Feature coming later",
    },
    modal: {
      addTitle: "Add weekly task",
      editTitle: "Edit",
      titleLabel: "Weekly task",
      titlePlaceholder: "e.g. Ship 3 UX fixes in 30m every morning",
      monthLabel: "Month to show monthly goals",
      monthlyGoalLabel: "Link monthly goal",
      noMonthlyGoal: "No monthly goals for month {{month}} yet",
      targetLabel: "Target time (hours)",
      targetPlaceholder: "e.g. 10",
      targetHelper: "Enter hours to keep calculations simple.",
      cancel: "Cancel",
      save: "Save",
      errorRequired: "Please fill all fields",
      errorEstimated: "Target time must be greater than 0.",
    },
    manualModal: {
      title: "Manual record",
      description: "Log time you worked outside the app.",
      taskLabel: "Task",
      currentLabel: "Current log",
      targetLabel: "Weekly target",
      hoursLabel: "Hours",
      minutesLabel: "Minutes",
      rangeHelper: "Enter between 0 and {{maxHours}}h {{maxMinutes}}m.",
      unchangedHint: "Change the value to enable update.",
      confirmTitle: "Update this log?",
      confirmMessage: "Replace the total with {{value}}.",
      confirm: "Update",
      cancel: "Back",
      submit: "Update",
      outOfRange: "Stay within the target time.",
      successTitle: "Update saved",
      successBody: "Time has been updated.",
      errorTitle: "Update failed",
    },
  },
  fr: {
    pageTitle: "Tâches hebdomadaires",
    header: {
      title: "Progression de la semaine",
      applyNextMemo: "Appliquer le mémo à cette semaine",
    },
    actions: {
      add: "Ajouter",
      delete: "Supprimer",
      deleteExit: "Quitter le mode suppression",
    },
    deleteConfirm: {
      title: "Supprimer cette tâche hebdomadaire ?",
      body: "Cette action est définitive après suppression.",
      yes: "Supprimer",
      no: "Annuler",
    },
    summary: {
      target: "Objectif",
      logged: "Enregistré",
      remaining: "Restant",
    },
    list: {
      title: "Liste des tâches",
      emptyTitle: "Aucune tâche pour le moment",
      emptyBody: "Ajoutez une tâche et associez-la à un objectif mensuel.",
    },
    task: {
      monthlyLink: "Objectif mensuel",
      openTimer: "Minuteur de travail",
      manualLog: "Saisie manuelle",
      edit: "Modifier",
      comingSoon: "Fonctionnalité à venir",
    },
    modal: {
      addTitle: "Ajouter une tâche hebdomadaire",
      editTitle: "Modifier",
      titleLabel: "Tâche hebdomadaire",
      titlePlaceholder: "ex. Avancer 3 tâches UX en 30 min chaque matin",
      monthLabel: "Mois pour afficher les objectifs mensuels",
      monthlyGoalLabel: "Associer un objectif mensuel",
      noMonthlyGoal: "Pas d'objectif mensuel pour le mois {{month}}",
      targetLabel: "Temps cible (heures)",
      targetPlaceholder: "ex. 10",
      targetHelper: "Saisir en heures pour simplifier les calculs.",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Veuillez remplir tous les champs",
      errorEstimated: "Le temps cible doit être supérieur à 0.",
    },
    manualModal: {
      title: "Saisie manuelle",
      description: "Enregistrez le temps travaillé hors de l’app.",
      taskLabel: "Tâche",
      currentLabel: "Enregistré",
      targetLabel: "Objectif hebdo",
      hoursLabel: "Heures",
      minutesLabel: "Minutes",
      rangeHelper: "Saisissez entre 0 et {{maxHours}}h {{maxMinutes}}m.",
      unchangedHint: "Modifiez la valeur pour activer la mise à jour.",
      confirmTitle: "Mettre à jour ce suivi ?",
      confirmMessage: "Remplacer le total par {{value}}.",
      confirm: "Mettre à jour",
      cancel: "Retour",
      submit: "Mettre à jour",
      outOfRange: "Restez sous l’objectif.",
      successTitle: "Mise à jour enregistrée",
      successBody: "Le temps a été mis à jour.",
      errorTitle: "Échec de la mise à jour",
    },
  },
};
