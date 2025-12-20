import { LanguageKey } from "../types/i18n";

export type AnnualGoalsTranslations = {
  pageTitle: string;
  pageSubtitle: string;
  add: string;
  delete: string;
  deleteExit: string;
  reorderHint: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  updatedSuffix: string;
  chart: {
    title: string;
    totalLabel: string;
    avgPerDayLabel: string;
  };
  modal: {
    addTitle: string;
    editTitle: string;
    descriptionLabel: string;
    colorLabel: string;
    placeholder: string;
    cancel: string;
    save: string;
    errorRequired: string;
    colorA11y: string;
  };
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  deleteConfirmYes: string;
  deleteConfirmNo: string;
  errors: {
    loginMissing: string;
    fetchFailed: string;
    reorderSaveFailed: string;
    saveFailed: string;
    deleteFailed: string;
  };
};

export const annualGoalsTranslations: Record<
  LanguageKey,
  AnnualGoalsTranslations
> = {
  ja: {
    pageTitle: "年間目標",
    pageSubtitle: "理想の自分をもとに、色で年間の軸を整理しましょう。",
    add: "追加",
    delete: "削除",
    deleteExit: "削除モードを終了",
    reorderHint: "カードを長押し＋ドラッグで順番を変えられます",
    emptyTitle: "まだ年間目標が登録されていません",
    emptyBody: "色を決めて、年間の優先順位を可視化しましょう。",
    emptyCta: "最初の年間目標を追加",
    updatedSuffix: "更新",
    chart: {
      title: "タスクの内訳",
      totalLabel: "総作業時間",
      avgPerDayLabel: "1日の平均 {{value}}",
    },
    modal: {
      addTitle: "年間目標を追加",
      editTitle: "編集",
      descriptionLabel: "年間目標",
      colorLabel: "目標カラー",
      placeholder: "例）健康的な生活リズムを確立して睡眠を最優先にする",
      cancel: "キャンセル",
      save: "保存",
      errorRequired: "すべての項目を入力してください",
      colorA11y: "色 {{color}} を選択",
    },
    deleteConfirmTitle: "削除してもよろしいですか？",
    deleteConfirmBody: "この年間目標を削除すると元に戻せません。",
    deleteConfirmYes: "削除する",
    deleteConfirmNo: "キャンセル",
    errors: {
      loginMissing: "ログイン情報が見つかりませんでした",
      fetchFailed: "年間目標の取得に失敗しました",
      reorderSaveFailed: "並び替えの保存に失敗しました",
      saveFailed: "保存に失敗しました",
      deleteFailed: "削除に失敗しました",
    },
  },
  en: {
    pageTitle: "Annual Goals",
    pageSubtitle: "Map your year from your ideal self with clear color coding.",
    add: "Add",
    delete: "Delete",
    deleteExit: "Exit delete mode",
    reorderHint: "Long-press and drag cards to reorder.",
    emptyTitle: "No annual goals yet",
    emptyBody: "Pick colors to visualize your yearly priorities.",
    emptyCta: "Add your first annual goal",
    updatedSuffix: "Updated",
    chart: {
      title: "Task breakdown",
      totalLabel: "Total focus time",
      avgPerDayLabel: "Avg per day {{value}}",
    },
    modal: {
      addTitle: "Add annual goal",
      editTitle: "Edit",
      descriptionLabel: "Annual goal",
      colorLabel: "Goal color",
      placeholder: "e.g. Build a stable sleep routine and prioritize recovery",
      cancel: "Cancel",
      save: "Save",
      errorRequired: "Please fill all fields",
      colorA11y: "Select color {{color}}",
    },
    deleteConfirmTitle: "Delete this annual goal?",
    deleteConfirmBody: "You can’t undo this action after deleting.",
    deleteConfirmYes: "Delete",
    deleteConfirmNo: "Cancel",
    errors: {
      loginMissing: "Session not found. Please log in again.",
      fetchFailed: "Failed to load annual goals.",
      reorderSaveFailed: "Failed to save the new order.",
      saveFailed: "Failed to save.",
      deleteFailed: "Failed to delete this annual goal.",
    },
  },
  fr: {
    pageTitle: "Objectifs annuels",
    pageSubtitle:
      "Définissez votre année depuis votre moi idéal avec un code couleur clair.",
    add: "Ajouter",
    delete: "Supprimer",
    deleteExit: "Quitter le mode suppression",
    reorderHint: "Appui long puis glisser pour réordonner les cartes.",
    emptyTitle: "Aucun objectif annuel pour le moment",
    emptyBody:
      "Choisissez des couleurs pour visualiser vos priorités annuelles.",
    emptyCta: "Ajouter un premier objectif annuel",
    updatedSuffix: "Mis à jour",
    chart: {
      title: "Répartition des tâches",
      totalLabel: "Temps total de focus",
      avgPerDayLabel: "Moyenne par jour {{value}}",
    },
    modal: {
      addTitle: "Ajouter un objectif annuel",
      editTitle: "Modifier",
      descriptionLabel: "Objectif annuel",
      colorLabel: "Couleur de l'objectif",
      placeholder:
        "ex. Construire une routine de sommeil stable et prioriser la récupération",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Veuillez remplir tous les champs",
      colorA11y: "Sélectionner la couleur {{color}}",
    },
    deleteConfirmTitle: "Supprimer cet objectif annuel ?",
    deleteConfirmBody: "Cette action est définitive après suppression.",
    deleteConfirmYes: "Supprimer",
    deleteConfirmNo: "Annuler",
    errors: {
      loginMissing: "Session introuvable. Veuillez vous reconnecter.",
      fetchFailed: "Échec du chargement des objectifs annuels.",
      reorderSaveFailed: "Échec de l'enregistrement de l'ordre.",
      saveFailed: "Échec de l'enregistrement.",
      deleteFailed: "Échec de la suppression de cet objectif annuel.",
    },
  },
};
