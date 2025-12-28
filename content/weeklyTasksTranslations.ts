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
    currentLabel: string;
    addedLabel: string;
    finalLabel: string;
    hoursLabel: string;
    minutesLabel: string;
    rangeHelper: string;
    finalPreview: string;
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
      currentLabel: "現在の実績",
      addedLabel: "追加する時間",
      finalLabel: "追加後の合計",
      hoursLabel: "時間",
      minutesLabel: "分",
      rangeHelper:
        "入力した時間を現在の実績に積み上げます。関連する月間目標、年間目標にも反映されます。",
      finalPreview: "追加後の累計: {{total}}（目標 {{target}}）",
      confirmTitle: "この実績で更新しますか？",
      confirmMessage: "{{added}} を加算して合計を {{total}} に更新します。",
      confirm: "加算する",
      cancel: "戻る",
      submit: "加算する",
      outOfRange: "1分以上の時間を入力してください",
      successTitle: "更新しました",
      successBody: "追加分を保存しました。",
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
      currentLabel: "Current log",
      addedLabel: "Add",
      finalLabel: "New total",
      hoursLabel: "Hours",
      minutesLabel: "Minutes",
      rangeHelper:
        "The time you enter will be added to the current total. It will be also applied on relating monthly and yearly goals",
      finalPreview: "New total: {{total}} (target {{target}})",
      confirmTitle: "Update this log?",
      confirmMessage: "Add {{added}} and update the total to {{total}}.",
      confirm: "Add time",
      cancel: "Back",
      submit: "Add time",
      outOfRange: "Enter more than 0 minutes.",
      successTitle: "Added",
      successBody: "The additional time has been saved.",
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
      currentLabel: "Enregistré",
      addedLabel: "Ajout",
      finalLabel: "Total après ajout",
      hoursLabel: "Heures",
      minutesLabel: "Minutes",
      rangeHelper:
        "Le temps que vous saisissez sera ajouté au total actuel. Il sera également appliqué aux objectifs mensuels et annuels correspondants.",
      finalPreview: "Nouveau total : {{total}} (objectif {{target}})",
      confirmTitle: "Mettre à jour ce suivi ?",
      confirmMessage: "Ajouter {{added}} au suivi et passer à {{total}}.",
      confirm: "Ajouter",
      cancel: "Retour",
      submit: "Ajouter",
      outOfRange: "Entrez une durée supérieure à 0 minute.",
      successTitle: "Ajout enregistré",
      successBody: "Le temps ajouté a été enregistré.",
      errorTitle: "Échec de la mise à jour",
    },
  },
};
