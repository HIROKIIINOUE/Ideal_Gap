import { LanguageKey } from "../types/i18n";

export type IdealSelfTranslations = {
  pageTitle: string;
  pageSubtitle: string;
  add: string;
  delete: string;
  deleteExit: string;
  listLabel: string;
  reorderHint: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  handleA11y: string;
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
};

export const idealSelfTranslations: Record<LanguageKey, IdealSelfTranslations> = {
  ja: {
    pageTitle: "理想の自分",
    pageSubtitle: "なりたい姿を言語化し、いつでも軸を思い出せるようにまとめましょう。",
    add: "追加",
    delete: "削除",
    deleteExit: "削除モードを終了",
    listLabel: "リスト",
    reorderHint: "カードを長押し＋ドラッグで順番を変えられます",
    emptyTitle: "まだ理想が登録されていません",
    emptyBody: "最初の理想を追加して、軸を固定しましょう。",
    emptyCta: "最初の理想を追加",
    handleA11y: "長押しで並び替え",
    modal: {
      addTitle: "理想を追加",
      editTitle: "理想を編集",
      placeholder: "例）毎朝5時に起きて静かな時間に読書をする",
      cancel: "キャンセル",
      save: "保存",
      errorRequired: "1文字以上入力してください",
    },
    deleteConfirmTitle: "削除してもよろしいですか？",
    deleteConfirmBody: "この理想を削除すると元に戻せません。",
    deleteConfirmYes: "削除する",
    deleteConfirmNo: "キャンセル",
  },
  en: {
    pageTitle: "Ideal Self",
    pageSubtitle: "Write down who you want to become so you can stay aligned every day.",
    add: "Add",
    delete: "Delete",
    deleteExit: "Exit delete mode",
    listLabel: "List",
    reorderHint: "Long-press and drag cards to reorder.",
    emptyTitle: "No ideals yet",
    emptyBody: "Add your first ideal to anchor your direction.",
    emptyCta: "Add your first ideal",
    handleA11y: "Long press to reorder",
    modal: {
      addTitle: "Add ideal",
      editTitle: "Edit ideal",
      placeholder: "e.g. Wake up at 5am and read in quiet time",
      cancel: "Cancel",
      save: "Save",
      errorRequired: "Please enter at least 1 character",
    },
    deleteConfirmTitle: "Delete this ideal?",
    deleteConfirmBody: "You can’t undo this action after deleting.",
    deleteConfirmYes: "Delete",
    deleteConfirmNo: "Cancel",
  },
  fr: {
    pageTitle: "Moi idéal",
    pageSubtitle: "Notez qui vous voulez devenir pour rester aligné chaque jour.",
    add: "Ajouter",
    delete: "Supprimer",
    deleteExit: "Quitter le mode suppression",
    listLabel: "Liste",
    reorderHint: "Appui long puis glisser pour réordonner les cartes.",
    emptyTitle: "Aucun idéal pour le moment",
    emptyBody: "Ajoutez un premier idéal pour fixer votre cap.",
    emptyCta: "Ajouter un premier idéal",
    handleA11y: "Appui long pour réordonner",
    modal: {
      addTitle: "Ajouter un idéal",
      editTitle: "Modifier l’idéal",
      placeholder: "ex. Se lever à 5h et lire dans le calme",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Saisissez au moins 1 caractère",
    },
    deleteConfirmTitle: "Supprimer cet idéal ?",
    deleteConfirmBody: "Cette action est définitive après suppression.",
    deleteConfirmYes: "Supprimer",
    deleteConfirmNo: "Annuler",
  },
};
