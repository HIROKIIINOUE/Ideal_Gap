import { LanguageKey } from "../types/i18n";

export type FunPlanTranslations = {
  pageTitle: string;
  pageSubtitle: string;
  titleCardNote: string;
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
  limitAlert: {
    title: string;
    body: string;
    back: string;
    upgrade: string;
  };
  modal: {
    addTitle: string;
    editTitle: string;
    placeholder: string;
    optionalDateLabel: string;
    optionalDateHelper: string;
    selectedDate: string;
    pickDate: string;
    changeDate: string;
    clearDate: string;
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
    pageSubtitle:
      "直近の楽しみを可視化して、毎日のモチベーションを高めましょう。(1番上のリストのみダッシュボードに表示されます)",
    titleCardNote: "(一番上のリストのみダッシュボードに表示されます)",
    add: "追加",
    delete: "削除",
    deleteExit: "戻る",
    loading: "読み込み中...",
    emptyTitle: "まだ楽しい予定がありません",
    emptyBody:
      "直近の楽しみを可視化して、毎日のモチベーションを高めましょう。(1番上のリストのみダッシュボードに表示されます)",
    emptyCta: "最初の予定を追加",
    updatedSuffix: "更新",
    limitHelper: "無料プランでは最大5件まで追加できます",
    limitReached: "上限に達しました。削除してから追加してください。",
    limitAlert: {
      title: "上限に達しました",
      body: "無料プランは最大5件までです。5件を超える場合はプランをアップグレードしてください。",
      back: "戻る",
      upgrade: "Pro Planへアップグレード",
    },
    modal: {
      addTitle: "追加",
      editTitle: "編集",
      placeholder: "例 金曜日：友人とディナー",
      optionalDateLabel: "イベント日(任意)",
      optionalDateHelper: "日付は任意です",
      selectedDate: "選択中の日付: {{date}}",
      pickDate: "日付を選択",
      changeDate: "日付を変更",
      clearDate: "クリア",
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
    pageTitle: "Next Exciting Plans",
    pageSubtitle:
      "Keep your next exciting events in sight and stay motivated. (Only the top item appears on the dashboard)",
    titleCardNote: "(Only the top item appears on the dashboard)",
    add: "Add",
    delete: "Delete",
    deleteExit: "Exit",
    loading: "Loading...",
    emptyTitle: "No fun plans yet",
    emptyBody:
      "Keep your next exciting events in sight and stay motivated. (Only the top item appears on the dashboard)",
    emptyCta: "Add your first plan",
    updatedSuffix: "Updated",
    limitHelper: "Free users can add up to 5 items",
    limitReached: "You’ve reached the limit. Remove one to add another.",
    limitAlert: {
      title: "Limit reached",
      body: "The free plan allows up to 5 items. Upgrade your plan to go beyond 5.",
      back: "Back",
      upgrade: "Upgrade to Pro Plan",
    },
    modal: {
      addTitle: "Add",
      editTitle: "Edit",
      placeholder: "e.g. Dinner with friends on Friday",
      optionalDateLabel: "Event day(optional)",
      optionalDateHelper: "Date is optional",
      selectedDate: "Selected date: {{date}}",
      pickDate: "Select date",
      changeDate: "Change date",
      clearDate: "Clear",
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
    pageTitle: "Plans sympas à venir",
    pageSubtitle:
      "Gardez vos prochains évènements sympas en vue pour rester motivé-e au quotidien. (Seul le premier élément s’affiche sur le tableau de bord)",
    titleCardNote: "(Seul le premier élément s’affiche sur le tableau de bord)",
    add: "Ajouter",
    delete: "Supprimer",
    deleteExit: "Quitter",
    loading: "Chargement...",
    emptyTitle: "Aucun plan sympa à venir pour l’instant",
    emptyBody:
      "Gardez vos prochains événements sympas en vue pour rester motivé-e au quotidien. (Seul le premier élément s’affiche sur le tableau de bord)",
    emptyCta: "Ajouter un événement",
    updatedSuffix: "Mise à jour",
    limitHelper: "Les utilisateurs gratuits peuvent en ajouter jusqu’à 5",
    limitReached: "Limite atteinte. Supprimez-en un pour en ajouter un autre.",
    limitAlert: {
      title: "Limite atteinte",
      body: "Le forfait gratuit permet jusqu’à 5 éléments. Passez au forfait Pro pour dépasser 5.",
      back: "Retour",
      upgrade: "Passer au forfait Pro",
    },
    modal: {
      addTitle: "Ajouter",
      editTitle: "Modifier",
      placeholder: "ex. Dîner avec mes amis vendredi",
      optionalDateLabel: "Jour de l'événement (optionnel)",
      optionalDateHelper: "La date est facultative",
      selectedDate: "Date sélectionnée : {{date}}",
      pickDate: "Choisir une date",
      changeDate: "Changer la date",
      clearDate: "Clear",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Saisissez au moins 1 caractère",
    },
    deleteConfirmTitle: "Supprimer cet évènement ?",
    deleteConfirmBody: "Cette action sera définitive après la suppression.",
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
