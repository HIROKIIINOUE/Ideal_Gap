import { LanguageKey } from "../types/i18n";

export type IdealSelfTranslations = {
  pageTitle: string;
  pageSubtitle: string;
  add: string;
  delete: string;
  deleteExit: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  handleA11y: string;
  updatedSuffix: string;
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

export const idealSelfTranslations: Record<LanguageKey, IdealSelfTranslations> =
  {
    ja: {
      pageTitle: "理想の自分",
      pageSubtitle:
        "なりたい姿を言語化し、いつでも軸を思い出せるようにまとめましょう。",
      add: "追加",
      delete: "削除",
      deleteExit: "戻る",
      loading: "読み込み中...",
      emptyTitle: "まだ理想が登録されていません",
      emptyBody: "最初の理想を追加して、軸を固定しましょう。",
      emptyCta: "最初の理想を追加",
      handleA11y: "長押しで並び替え",
      updatedSuffix: "更新",
      modal: {
        addTitle: "理想を追加",
        editTitle: "理想を編集",
        placeholder: "例）世界中を旅しながら仕事をする",
        cancel: "キャンセル",
        save: "保存",
        errorRequired: "1文字以上入力してください",
      },
      deleteConfirmTitle: "削除してもよろしいですか？",
      deleteConfirmBody: "この理想を削除すると元に戻せません。",
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
      pageTitle: "Ideal Self",
      pageSubtitle:
        "Write down who you want to become so you can stay aligned every day.",
      add: "Add",
      delete: "Delete",
      deleteExit: "Exit",
      loading: "Loading...",
      emptyTitle: "No ideals yet",
      emptyBody: "Add your first ideal to anchor your direction.",
      emptyCta: "Add your first ideal",
      handleA11y: "Long press to reorder",
      updatedSuffix: "Updated",
      modal: {
        addTitle: "Add ideal",
        editTitle: "Edit ideal",
        placeholder: "e.g. Travel around the world as nomad worker",
        cancel: "Cancel",
        save: "Save",
        errorRequired: "Please enter at least 1 character",
      },
      deleteConfirmTitle: "Delete this ideal?",
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
      pageTitle: "Moi idéal",
      pageSubtitle:
        "Notez qui vous voulez devenir pour rester aligné chaque jour.",
      add: "Ajouter",
      delete: "Supprimer",
      deleteExit: "Quitter",
      loading: "Chargement...",
      emptyTitle: "Aucun idéal pour le moment",
      emptyBody: "Ajoutez un premier idéal pour fixer votre cap.",
      emptyCta: "Ajouter un premier idéal",
      handleA11y: "Appui long pour réordonner",
      updatedSuffix: "Mis à jour",
      modal: {
        addTitle: "Ajouter un idéal",
        editTitle: "Modifier",
        placeholder: "ex. Voyager à travers le monde en travaillant",
        cancel: "Annuler",
        save: "Enregistrer",
        errorRequired: "Saisissez au moins 1 caractère",
      },
      deleteConfirmTitle: "Supprimer cet idéal ?",
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
