import { LanguageKey } from "../types/i18n";

export type MonthlyGoalsTranslations = {
  pageTitle: string;
  add: string;
  delete: string;
  deleteExit: string;
  monthSelector: {
    label: string;
  };
  monthsShort: string[];
  summary: {
    targetLabel: string;
    loggedLabel: string;
    remainingLabel: string;
  };
  empty: {
    title: string;
    body: string;
  };
  modal: {
    addTitle: string;
    editTitle: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    monthLabel: string;
    yearlyGoalLabel: string;
    targetLabel: string;
    targetPlaceholder: string;
    targetHelper: string;
    cancel: string;
    save: string;
    errorRequired: string;
    errorMonthRange: string;
    errorEstimated: string;
  };
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  deleteConfirmYes: string;
  deleteConfirmNo: string;
  deleteSuccess: {
    title: string;
    body: string;
  };
  bulkDeleteSuccess: {
    title: string;
    body: string;
  };
  bulkDelete: {
    button: string;
    title: string;
    message: string;
    all: string;
    current: string;
    cancel: string;
  };
  errors?: {
    loginMissing: string;
    fetchFailed: string;
    saveFailed: string;
    reorderSaveFailed: string;
  };
};

export const monthlyGoalsTranslations: Record<
  LanguageKey,
  MonthlyGoalsTranslations
> = {
  ja: {
    pageTitle: "月間目標",
    add: "追加",
    delete: "削除",
    deleteExit: "戻る",
    monthSelector: {
      label: "表示する月",
    },
    monthsShort: [
      "1月",
      "2月",
      "3月",
      "4月",
      "5月",
      "6月",
      "7月",
      "8月",
      "9月",
      "10月",
      "11月",
      "12月",
    ],
    summary: {
      targetLabel: "目標",
      loggedLabel: "実績",
      remainingLabel: "残り",
    },
    empty: {
      title: "この月の月間目標はまだありません。",
      body: "追加ボタンから月間目標を作成し、年間目標と紐づけてください。",
    },
    modal: {
      addTitle: "月間目標を追加",
      editTitle: "編集",
      descriptionLabel: "月間目標",
      descriptionPlaceholder: "例 TOEIC 参考書Section4まで終わらせる",
      monthLabel: "月を選択",
      yearlyGoalLabel: "紐づける年間目標",
      targetLabel: "目標時間（時間）",
      targetPlaceholder: "例 40",
      targetHelper: "時間単位で入力してください",
      cancel: "キャンセル",
      save: "保存",
      errorRequired: "全ての項目を入力してください",
      errorMonthRange: "月は1〜12の範囲で選択してください",
      errorEstimated: "目標時間は0より大きい数値で入力してください",
    },
    deleteConfirmTitle: "削除してもよろしいですか？",
    deleteConfirmBody:
      "削除すると元に戻せません。\n紐づく週間タスクも全て削除されます。",
    deleteConfirmYes: "削除する",
    deleteConfirmNo: "キャンセル",
    deleteSuccess: {
      title: "削除しました",
      body: "削除が完了しました。",
    },
    bulkDeleteSuccess: {
      title: "全て削除しました",
      body: "月間目標を全て削除しました。",
    },
    bulkDelete: {
      button: "全削除",
      title: "どの目標を削除しますか？",
      message:
        "この操作は元に戻せません。\n紐づく週間タスクも全て削除されます。",
      all: "全ての月を削除",
      current: "{{month}}を削除",
      cancel: "キャンセル",
    },
    errors: {
      loginMissing: "ログイン情報が見つかりませんでした",
      fetchFailed: "月間目標の取得に失敗しました",
      saveFailed: "保存に失敗しました",
      reorderSaveFailed: "並び替えの保存に失敗しました",
    },
  },
  en: {
    pageTitle: "Monthly goals",
    add: "Add",
    delete: "Delete",
    deleteExit: "Exit",
    monthSelector: {
      label: "Month to display",
    },
    monthsShort: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    summary: {
      targetLabel: "Target",
      loggedLabel: "Logged",
      remainingLabel: "Remaining",
    },
    empty: {
      title: "No monthly goals for this month yet.",
      body: "Add a monthly goal and link it to a yearly goal to track progress.",
    },
    modal: {
      addTitle: "Add monthly goal",
      editTitle: "Edit",
      descriptionLabel: "Monthly goal",
      descriptionPlaceholder: "e.g. Complete section4 in the textbook",
      monthLabel: "Select month",
      yearlyGoalLabel: "Link annual goal",
      targetLabel: "Target time (hours)",
      targetPlaceholder: "e.g. 40",
      targetHelper: "Enter hours",
      cancel: "Cancel",
      save: "Save",
      errorRequired: "Please fill all fields",
      errorMonthRange: "Month must be between 1 and 12.",
      errorEstimated: "Target time must be greater than 0.",
    },
    deleteConfirmTitle: "Delete this monthly goal?",
    deleteConfirmBody:
      "You can’t undo this action after deleting.\nAll linked weekly tasks will also be deleted.",
    deleteConfirmYes: "Delete",
    deleteConfirmNo: "Cancel",
    deleteSuccess: {
      title: "Deleted",
      body: "Deleted successfully.",
    },
    bulkDeleteSuccess: {
      title: "Deleted all",
      body: "All monthly goals were deleted.",
    },
    bulkDelete: {
      button: "Delete all",
      title: "What would you like to delete?",
      message:
        "This cannot be undone.\nAll linked weekly tasks will also be deleted.",
      all: "Delete all months",
      current: "Delete {{month}}",
      cancel: "Cancel",
    },
    errors: {
      loginMissing: "Session not found. Please log in again.",
      fetchFailed: "Failed to load monthly goals.",
      saveFailed: "Failed to save.",
      reorderSaveFailed: "Failed to save the new order.",
    },
  },
  fr: {
    pageTitle: "Objectifs mensuels",
    add: "Ajouter",
    delete: "Supprimer",
    deleteExit: "Quitter",
    monthSelector: {
      label: "Mois à afficher",
    },
    monthsShort: [
      "Janv",
      "Févr",
      "Mars",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sept",
      "Oct",
      "Nov",
      "Déc",
    ],
    summary: {
      targetLabel: "Objectif",
      loggedLabel: "Réalisé",
      remainingLabel: "Restant",
    },
    empty: {
      title: "Aucun objectif mensuel pour ce mois-ci.",
      body: "Ajoutez un objectif mensuel et associez-le à un objectif annuel pour suivre vos progrès.",
    },
    modal: {
      addTitle: "Ajouter un objectif mensuel",
      editTitle: "Modifier",
      descriptionLabel: "Objectif mensuel",
      descriptionPlaceholder:
        "ex. Terminer jusqu'à la section 4 du livre IELTS",
      monthLabel: "Sélectionner le mois",
      yearlyGoalLabel: "Associer un objectif annuel",
      targetLabel: "Temps cible (heures)",
      targetPlaceholder: "ex. 40",
      targetHelper: "Saisir en heures pour simplifier les calculs.",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Veuillez remplir tous les champs",
      errorMonthRange: "Le mois doit être entre 1 et 12.",
      errorEstimated: "Le temps cible doit être supérieur à 0.",
    },
    deleteConfirmTitle: "Supprimer cet objectif mensuel ?",
    deleteConfirmBody:
      "Cette action sera définitive après la suppression.\nToutes les tâches hebdomadaires liées aux tâches mensuelles supprimées seront également supprimées.",
    deleteConfirmYes: "Supprimer",
    deleteConfirmNo: "Annuler",
    deleteSuccess: {
      title: "Supprimé",
      body: "Suppression terminée.",
    },
    bulkDeleteSuccess: {
      title: "Tout supprimer",
      body: "Tous les objectifs mensuels ont été supprimés.",
    },
    bulkDelete: {
      button: "Tout supprimer",
      title: "Que souhaitez-vous supprimer ?",
      message:
        "Cette action est irréversible.\nToutes les tâches hebdomadaires liées seront également supprimées.",
      all: "Supprimer tous les mois",
      current: "Supprimer {{month}}",
      cancel: "Annuler",
    },
    errors: {
      loginMissing: "Session introuvable. Veuillez vous reconnecter.",
      fetchFailed: "Échec du chargement des objectifs mensuels.",
      saveFailed: "Échec de l'enregistrement.",
      reorderSaveFailed: "Échec de l'enregistrement de l'ordre.",
    },
  },
};
