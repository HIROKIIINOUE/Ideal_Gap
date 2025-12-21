import { LanguageKey } from "../types/i18n";

export type WeeklyTasksTranslations = {
  pageTitle: string;
  bucket: {
    current: string;
    next: string;
    last: string;
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
};

export const weeklyTasksTranslations: Record<LanguageKey, WeeklyTasksTranslations> = {
  ja: {
    pageTitle: "週間タスク",
    bucket: {
      current: "今週",
      next: "来週メモ",
      last: "先週メモ",
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
  },
  en: {
    pageTitle: "Weekly Tasks",
    bucket: {
      current: "This week",
      next: "Next week memo",
      last: "Last week memo",
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
  },
  fr: {
    pageTitle: "Tâches hebdomadaires",
    bucket: {
      current: "Cette semaine",
      next: "Mémo semaine prochaine",
      last: "Mémo semaine dernière",
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
  },
};
