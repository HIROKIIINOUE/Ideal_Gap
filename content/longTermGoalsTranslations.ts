// ⭐️ マリーフランス語チェック
import { LanguageKey } from "../types/i18n";

export type LongTermGoalsTranslations = {
  pageTitle: string;
  add: string;
  delete: string;
  deleteExit: string;
  completion: {
    complete: string;
    undo: string;
    badge: string;
  };
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  updatedSuffix: string;
  modal: {
    addTitle: string;
    editTitle: string;
    untilWhenLabel: string;
    untilWhenPlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    cancel: string;
    save: string;
    errorRequired: string;
  };
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  deleteConfirmYes: string;
  deleteConfirmNo: string;
  deleteSuccess: {
    title: string;
    body: string;
  };
  errors: {
    loginMissing: string;
    fetchFailed: string;
    reorderSaveFailed: string;
    saveFailed: string;
    deleteFailed: string;
  };
};

export const longTermGoalsTranslations: Record<
  LanguageKey,
  LongTermGoalsTranslations
> = {
  ja: {
    pageTitle: "長期目標",
    add: "追加",
    delete: "削除",
    deleteExit: "戻る",
    completion: {
      complete: "完了",
      undo: "未完了に戻す",
      badge: "完了済み",
    },
    emptyTitle: "まだ長期目標が登録されていません",
    emptyBody:
      "数年単位で見据える目標を並べて、理想への道標を可視化しましょう。",
    emptyCta: "最初の長期目標を追加",
    updatedSuffix: "更新",
    modal: {
      addTitle: "長期目標を追加",
      editTitle: "編集",
      untilWhenLabel: "いつまでに",
      untilWhenPlaceholder: "例 29歳までに / 2030年までに",
      descriptionLabel: "長期目標",
      descriptionPlaceholder: "例 海外留学に挑戦",
      cancel: "キャンセル",
      save: "保存",
      errorRequired: "必須項目を入力してください",
    },
    deleteConfirmTitle: "削除してもよろしいですか？",
    deleteConfirmBody: "削除すると元に戻せません。",
    deleteConfirmYes: "削除する",
    deleteConfirmNo: "キャンセル",
    deleteSuccess: {
      title: "削除しました",
      body: "削除が完了しました。",
    },
    errors: {
      loginMissing: "ログイン情報が見つかりませんでした",
      fetchFailed: "長期目標の取得に失敗しました",
      reorderSaveFailed: "並び替えの保存に失敗しました",
      saveFailed: "保存に失敗しました",
      deleteFailed: "削除に失敗しました",
    },
  },
  en: {
    pageTitle: "Long-Term Goals",
    add: "Add",
    delete: "Delete",
    deleteExit: "Exit",
    completion: {
      complete: "Done",
      undo: "Mark as active",
      badge: "Done",
    },
    emptyTitle: "No long-term goals yet",
    emptyBody:
      "Set long-term goals for the next few years and visualize your path to your ideal self.",
    emptyCta: "Add your first long-term goal",
    updatedSuffix: "Updated",
    modal: {
      addTitle: "Add long-term goal",
      editTitle: "Edit",
      untilWhenLabel: "By when",
      untilWhenPlaceholder: "e.g. By age 29 / By 2030",
      descriptionLabel: "Long-term goal",
      descriptionPlaceholder: "e.g. Get a master’s degree abroad",
      cancel: "Cancel",
      save: "Save",
      errorRequired: "Please fill the required fields",
    },
    deleteConfirmTitle: "Delete this long-term goal?",
    deleteConfirmBody: "You can’t undo this action after deleting.",
    deleteConfirmYes: "Delete",
    deleteConfirmNo: "Cancel",
    deleteSuccess: {
      title: "Deleted",
      body: "Deletion completed.",
    },
    errors: {
      loginMissing: "Session not found. Please log in again.",
      fetchFailed: "Failed to load long-term goals.",
      reorderSaveFailed: "Failed to save the new order.",
      saveFailed: "Failed to save.",
      deleteFailed: "Failed to delete this long-term goal.",
    },
  },
  fr: {
    pageTitle: "Objectifs long terme",
    add: "Ajouter",
    delete: "Supprimer",
    deleteExit: "Quitter",
    completion: {
      complete: "Terminer",
      undo: "Réactiver",
      badge: "Terminé",
    },
    emptyTitle: "Aucun objectif long terme pour le moment",
    emptyBody:
      "Ajoutez les étqpes qui relient votre moi idéal à vos objectifs annuels.",
    emptyCta: "Ajouter un objectif long terme",
    updatedSuffix: "Mis à jour",
    modal: {
      addTitle: "Ajouter un objectif long terme",
      editTitle: "Modifier",
      untilWhenLabel: "Pour quand",
      untilWhenPlaceholder: "ex. Avant 29 ans / Avant 2030",
      descriptionLabel: "Objectif long terme",
      descriptionPlaceholder: "ex. Obtenir un master à l’étranger",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Veuillez remplir les champs requis",
    },
    deleteConfirmTitle: "Supprimer cet objectif long terme ?",
    deleteConfirmBody: "Cette action est irréversible.",
    deleteConfirmYes: "Supprimer",
    deleteConfirmNo: "Annuler",
    deleteSuccess: {
      title: "Supprimé",
      body: "Suppression terminée.",
    },
    errors: {
      loginMissing: "Session introuvable. Veuillez vous reconnecter.",
      fetchFailed: "Échec du chargement des objectifs long terme.",
      reorderSaveFailed: "Échec de l'enregistrement de l'ordre.",
      saveFailed: "Échec de l'enregistrement.",
      deleteFailed: "Échec de la suppression de cet objectif long terme.",
    },
  },
};
