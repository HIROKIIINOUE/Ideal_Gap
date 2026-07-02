import { LanguageKey } from "../types/i18n";

export type IdealSelfTranslations = {
  pageTitle: string;
  pageSubtitle: string;
  add: string;
  delete: string;
  deleteExit: string;
  limitHelper: string;
  limitReached: string;
  limitAlert: {
    title: string;
    body: string;
    back: string;
    upgrade: string;
  };
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
      limitHelper: "無料プランでは最大10件まで追加できます",
      limitReached: "上限に達しました。削除してから追加してください。",
      limitAlert: {
        title: "上限に達しました",
        body: "無料プランは最大10件までです。10件を超える場合はプランをアップグレードしてください。",
        back: "戻る",
        upgrade: "Pro Planへアップグレード",
      },
      loading: "読み込み中...",
      emptyTitle: "まだ理想が登録されていません",
      emptyBody: "最初の理想を追加して、軸を固定しましょう。",
      emptyCta: "最初の理想を追加",
      handleA11y: "長押しで並び替え",
      updatedSuffix: "更新",
      modal: {
        addTitle: "追加",
        editTitle: "編集",
        placeholder: "例 世界中を旅しながら仕事をする",
        cancel: "キャンセル",
        save: "保存",
        errorRequired: "1文字以上入力してください",
      },
      deleteConfirmTitle: "削除してもよろしいですか？",
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
      pageTitle: "Ideal Self",
      pageSubtitle:
        "Write down who you want to become so you can stay aligned every day.",
      add: "Add",
      delete: "Delete",
      deleteExit: "Exit",
      limitHelper: "Free users can add up to 10 items",
      limitReached: "You’ve reached the limit. Remove one to add another.",
      limitAlert: {
        title: "Limit reached",
        body: "The free plan allows up to 10 items. Upgrade your plan to go beyond 10.",
        back: "Back",
        upgrade: "Upgrade to Pro Plan",
      },
      loading: "Loading...",
      emptyTitle: "No ideals yet",
      emptyBody: "Add your first ideal to anchor your direction.",
      emptyCta: "Add your first ideal",
      handleA11y: "Long press to reorder",
      updatedSuffix: "Updated",
      modal: {
        addTitle: "Add",
        editTitle: "Edit",
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
      pageTitle: "Mon moi idéal",
      pageSubtitle:
        "Indiquez la personne que vous désirez devenir afin de rester aligné chaque jour.",
      add: "Ajouter",
      delete: "Supprimer",
      deleteExit: "Quitter",
      limitHelper: "Les utilisateurs gratuits peuvent en ajouter jusqu’à 10",
      limitReached: "Limite atteinte. Supprimez-en un pour en ajouter un autre.",
      limitAlert: {
        title: "Limite atteinte",
        body: "Le forfait gratuit permet jusqu’à 10 éléments. Passez au forfait Pro pour dépasser 10.",
        back: "Retour",
        upgrade: "Passer au forfait Pro",
      },
      loading: "Chargement...",
      emptyTitle: "Aucun objectif d'idéal pour le moment",
      emptyBody:
        "Ajoutez votre premier objectif d'idéal pour vous donner une direction.",
      emptyCta: "Ajouter un idéal",
      handleA11y: "Maintenir le bouton pour réordonner",
      updatedSuffix: "Mise à jour",
      modal: {
        addTitle: "Ajouter",
        editTitle: "Modifier",
        placeholder: "ex. Voyager à travers le monde tout en travaillant",
        cancel: "Annuler",
        save: "Enregistrer",
        errorRequired: "Saisissez au moins 1 caractère",
      },
      deleteConfirmTitle: "Supprimer cet idéal ?",
      deleteConfirmBody: "Cette action sera définitive après sa suppression.",
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
