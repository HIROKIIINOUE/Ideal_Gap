import { LanguageKey } from "../types/i18n";

export type FunPlanTranslations = {
  pageTitle: string;
  pageSubtitle: string;
  add: string;
  delete: string;
  deleteExit: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  updatedSuffix: string;
  limitHelper: string;
  limitReached: string;
  modal: {
    addTitle: string;
    editTitle: string;
    placeholder: string;
    cancel: string;
    save: string;
    errorRequired: string;
  };
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  deleteConfirmYes: string;
  deleteConfirmNo: string;
  errors: {
    loginMissing: string;
    deleteFailed: string;
    reorderSaveFailed: string;
    saveFailed: string;
  };
};

export const funPlanTranslations: Record<LanguageKey, FunPlanTranslations> = {
  ja: {
    pageTitle: "次回の楽しい予定",
    pageSubtitle: "直近の楽しみを可視化して、毎日のモチベーションを高めましょう。（1番上のリストのみダッシュボードに表示されます）",
    add: "予定を追加",
    delete: "削除",
    deleteExit: "削除モードを終了",
    loading: "読み込み中...",
    emptyTitle: "まだ楽しい予定がありません",
    emptyBody: "",
    emptyCta: "最初の予定を追加",
    updatedSuffix: "更新",
    limitHelper: "追加できるのは最大5件までです",
    limitReached: "上限に達しました。削除してから追加してください。",
    modal: {
      addTitle: "予定を追加",
      editTitle: "予定を編集",
      placeholder: "例）金曜の友人とのディナー",
      cancel: "キャンセル",
      save: "保存",
      errorRequired: "1文字以上入力してください",
    },
    deleteConfirmTitle: "この予定を削除しますか？",
    deleteConfirmBody: "削除すると元に戻せません。",
    deleteConfirmYes: "削除する",
    deleteConfirmNo: "キャンセル",
    errors: {
      loginMissing: "ログイン情報が見つかりませんでした",
      deleteFailed: "削除に失敗しました",
      reorderSaveFailed: "並び替えの保存に失敗しました",
      saveFailed: "保存に失敗しました",
    },
  },
  en: {
    pageTitle: "Next Fun Plans",
    pageSubtitle: "Keep your next bright moments in sight and stay motivated. (Only the top item appears on the dashboard)",
    add: "Add plan",
    delete: "Delete",
    deleteExit: "Exit delete mode",
    loading: "Loading...",
    emptyTitle: "No fun plans yet",
    emptyBody: "",
    emptyCta: "Add your first plan",
    updatedSuffix: "Updated",
    limitHelper: "Up to 5 plans can be added",
    limitReached: "You’ve reached the limit. Remove one to add another.",
    modal: {
      addTitle: "Add plan",
      editTitle: "Edit plan",
      placeholder: "e.g. Dinner with friends on Friday",
      cancel: "Cancel",
      save: "Save",
      errorRequired: "Please enter at least 1 character",
    },
    deleteConfirmTitle: "Delete this plan?",
    deleteConfirmBody: "You can’t undo this action after deleting.",
    deleteConfirmYes: "Delete",
    deleteConfirmNo: "Cancel",
    errors: {
      loginMissing: "Session not found. Please log in again.",
      deleteFailed: "Failed to delete",
      reorderSaveFailed: "Failed to save order",
      saveFailed: "Failed to save",
    },
  },
  fr: {
    pageTitle: "Prochaines envies",
    pageSubtitle: "Gardez vos moments réjouissants en vue pour nourrir la motivation. (Seul le premier élément s’affiche sur le tableau de bord)",
    add: "Ajouter un moment",
    delete: "Supprimer",
    deleteExit: "Quitter le mode suppression",
    loading: "Chargement...",
    emptyTitle: "Aucun moment plaisir pour l’instant",
    emptyBody: "",
    emptyCta: "Ajouter un premier moment",
    updatedSuffix: "Mis à jour",
    limitHelper: "Vous pouvez en ajouter jusqu’à 5",
    limitReached: "Limite atteinte. Supprimez-en un pour en ajouter un autre.",
    modal: {
      addTitle: "Ajouter un moment",
      editTitle: "Modifier le moment",
      placeholder: "ex. Dîner avec des amis vendredi",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Saisissez au moins 1 caractère",
    },
    deleteConfirmTitle: "Supprimer ce moment ?",
    deleteConfirmBody: "Cette action est définitive après suppression.",
    deleteConfirmYes: "Supprimer",
    deleteConfirmNo: "Annuler",
    errors: {
      loginMissing: "Session introuvable. Veuillez vous reconnecter.",
      deleteFailed: "Échec de la suppression",
      reorderSaveFailed: "Échec de l'enregistrement de l'ordre",
      saveFailed: "Échec de l'enregistrement",
    },
  },
};
