import { LanguageKey } from "../types/i18n";

export type WeeklyTasksTranslations = {
  pageTitle: string;
  bucket: {
    current: string;
    next?: string;
    last?: string;
  };
  header: {
    title: string;
    description: string;
    applyNextMemo: string;
  };
  actions: {
    add: string;
    delete: string;
    deleteExit: string;
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
    bucketLabel: string;
    monthlyGoalLabel: string;
    targetLabel: string;
    targetPlaceholder: string;
    targetHelper: string;
    cancel: string;
    save: string;
    errorRequired: string;
    errorEstimated: string;
  };
};

export const weeklyTasksTranslations: Record<LanguageKey, WeeklyTasksTranslations> = {
  ja: {
    pageTitle: "週間タスク",
    bucket: {
      current: "今週",
    },
    header: {
      title: "週の進捗",
      description: "月間目標に紐づくタスクを週単位で整え、来週・先週メモも並べて管理できます。",
      applyNextMemo: "来週メモを今週へ適用",
    },
    actions: {
      add: "追加",
      delete: "削除",
      deleteExit: "削除モードを終了",
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
      bucketLabel: "表示する週",
      monthlyGoalLabel: "紐づける月間目標",
      targetLabel: "目標時間（時間）",
      targetPlaceholder: "例）10",
      targetHelper: "時間単位で入力すると計算しやすいです",
      cancel: "キャンセル",
      save: "保存",
      errorRequired: "すべての項目を入力してください",
      errorEstimated: "目標時間は0より大きい数値で入力してください",
    },
  },
  en: {
    pageTitle: "Weekly Tasks",
    bucket: {
      current: "This week",
    },
    header: {
      title: "Weekly progress",
      description: "Organize tasks by week, linked to monthly goals, with next/last week memos side by side.",
      applyNextMemo: "Apply next memo to this week",
    },
    actions: {
      add: "Add",
      delete: "Delete",
      deleteExit: "Exit delete mode",
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
      bucketLabel: "Bucket",
      monthlyGoalLabel: "Link monthly goal",
      targetLabel: "Target time (hours)",
      targetPlaceholder: "e.g. 10",
      targetHelper: "Enter hours to keep calculations simple.",
      cancel: "Cancel",
      save: "Save",
      errorRequired: "Please fill all fields",
      errorEstimated: "Target time must be greater than 0.",
    },
  },
  fr: {
    pageTitle: "Tâches hebdomadaires",
    bucket: {
      current: "Cette semaine",
    },
    header: {
      title: "Progression de la semaine",
      description:
        "Organisez vos tâches par semaine, reliées aux objectifs mensuels, avec les mémos de la semaine prochaine et précédente.",
      applyNextMemo: "Appliquer le mémo à cette semaine",
    },
    actions: {
      add: "Ajouter",
      delete: "Supprimer",
      deleteExit: "Quitter le mode suppression",
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
      bucketLabel: "Semaine",
      monthlyGoalLabel: "Associer un objectif mensuel",
      targetLabel: "Temps cible (heures)",
      targetPlaceholder: "ex. 10",
      targetHelper: "Saisir en heures pour simplifier les calculs.",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Veuillez remplir tous les champs",
      errorEstimated: "Le temps cible doit être supérieur à 0.",
    },
  },
};
