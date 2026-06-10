// ⭐️ マリーフランス語チェック(月間detail目標の例文のみ)
import { LanguageKey } from "../types/i18n";

export type AnnualGoalsTranslations = {
  pageTitle: string;
  pageSubtitle: string;
  add: string;
  delete: string;
  deleteExit: string;
  reorderHint: string;
  completion: {
    complete: string;
    undo: string;
    badge: string;
  };
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  updatedSuffix: string;
  chart: {
    title: string;
    totalLabel: string;
  };
  detail: {
    open: string;
    title: string;
    label: string;
    placeholder: string;
    save: string;
    cancel: string;
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
    cancel: string;
  };
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
    deleteExit: "戻る",
    reorderHint: "カードを長押し＋ドラッグで順番を変えられます",
    completion: {
      complete: "完了",
      undo: "未完了に戻す",
      badge: "完了済み",
    },
    emptyTitle: "まだ年間目標が登録されていません",
    emptyBody: "年間目標をリストアップし、優先順位をつけましょう。",
    emptyCta: "最初の年間目標を追加",
    updatedSuffix: "更新",
    chart: {
      title: "タスクの内訳",
      totalLabel: "総作業時間",
    },
    detail: {
      open: "詳細メモ",
      title: "詳細メモ",
      label: "詳細メモ(任意)",
      placeholder:
        "例) Ielts8達成の道のり\n \n4月: 参考書終わらせる\n5月: 過去問スタート\n8月: 模擬試験受験\n10月:  1回目の試験\n12月:  未達成なら2回目の試験",
      save: "保存",
      cancel: "キャンセル",
    },
    modal: {
      addTitle: "年間目標を追加",
      editTitle: "編集",
      descriptionLabel: "年間目標",
      colorLabel: "目標カラー",
      placeholder: "例 TOEICで800点を取得",
      cancel: "キャンセル",
      save: "保存",
      errorRequired: "すべての項目を入力してください",
      colorA11y: "色 {{color}} を選択",
    },
    deleteConfirmTitle: "削除してもよろしいですか？",
    deleteConfirmBody:
      "削除すると元に戻せません。\n紐づく週間タスクも削除されます。",
    deleteConfirmYes: "削除する",
    deleteConfirmNo: "キャンセル",
    deleteSuccess: {
      title: "削除しました",
      body: "削除が完了しました。",
    },
    bulkDeleteSuccess: {
      title: "全て削除しました",
      body: "年間目標を全て削除しました。",
    },
    bulkDelete: {
      button: "全削除",
      title: "年間目標を全て削除しますか？",
      message: "この操作は元に戻せません。\n紐づく週間タスクも削除されます。",
      all: "すべて削除",
      cancel: "キャンセル",
    },
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
    deleteExit: "Exit",
    reorderHint: "Long-press and drag cards to reorder.",
    completion: {
      complete: "Done",
      undo: "Mark as active",
      badge: "Done",
    },
    emptyTitle: "No annual goals yet",
    emptyBody: "Visualize your yearly priorities.",
    emptyCta: "Add your first annual goal",
    updatedSuffix: "Updated",
    chart: {
      title: "Task Breakdown",
      totalLabel: "Total Focus Time",
    },
    detail: {
      open: "Detail memo",
      title: "Detail memo",
      label: "Detail memo (optional)",
      placeholder:
        "e.g.) Path to IELTS 8\n \nApr : finish the textbook\nMay : start past exam practice\nAug : take a mock exam\nOct : first official exam\nDec : second exam if needed",
      save: "Save",
      cancel: "Cancel",
    },
    modal: {
      addTitle: "Add annual goal",
      editTitle: "Edit",
      descriptionLabel: "Annual goal",
      colorLabel: "Goal color",
      placeholder: "e.g. Get a overall score 8 in IELTS",
      cancel: "Cancel",
      save: "Save",
      errorRequired: "Please fill all fields",
      colorA11y: "Select color {{color}}",
    },
    deleteConfirmTitle: "Delete this annual goal?",
    deleteConfirmBody:
      "You can’t undo this action after deleting.\nLinked weekly tasks will also be deleted.",
    deleteConfirmYes: "Delete",
    deleteConfirmNo: "Cancel",
    deleteSuccess: {
      title: "Deleted",
      body: "Deletion completed.",
    },
    bulkDeleteSuccess: {
      title: "Deleted all",
      body: "All annual goals were removed.",
    },
    bulkDelete: {
      button: "Delete all",
      title: "Delete all annual goals?",
      message:
        "This cannot be undone.\nLinked weekly tasks will also be deleted.",
      all: "Delete all",
      cancel: "Cancel",
    },
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
    deleteExit: "Quitter",
    reorderHint: "Appui long puis glisser pour réordonner les cartes.",
    completion: {
      complete: "Terminer",
      undo: "Réactiver",
      badge: "Terminé",
    },
    emptyTitle: "Aucun objectif annuel pour le moment",
    emptyBody: "Visualisez vos priorités annuelles.",
    emptyCta: "Ajouter un objectif",
    updatedSuffix: "Mis à jour",
    chart: {
      title: "Répartition des tâches",
      totalLabel: "Temps total",
    },
    detail: {
      open: "Mémo détaillé",
      title: "Mémo détaillé",
      label: "Mémo détaillé (optionnel)",
      placeholder:
        "ex) Parcours vers l'IELTS 8\n \nAvr : terminer le manuel\nMai : commencer les annales\nAoût : passer un examen blanc\nOct : premier examen officiel\nDéc : deuxième examen si nécessaire",
      save: "Enregistrer",
      cancel: "Annuler",
    },
    modal: {
      addTitle: "Ajouter un objectif annuel",
      editTitle: "Modifier",
      descriptionLabel: "Objectif annuel",
      colorLabel: "Couleur de l'objectif",
      placeholder: "ex. Obtenir un score de 8 à l'IELTS.",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Veuillez remplir tous les champs",
      colorA11y: "Sélectionner la couleur {{color}}",
    },
    deleteConfirmTitle: "Supprimer cet objectif annuel ?",
    deleteConfirmBody:
      "Cette action sera définitive après la suppression.\nLes tâches hebdomadaires liées seront également supprimées.",
    deleteConfirmYes: "Supprimer",
    deleteConfirmNo: "Annuler",
    deleteSuccess: {
      title: "Supprimé",
      body: "Suppression terminée.",
    },
    bulkDeleteSuccess: {
      title: "Tout supprimer",
      body: "Tous les objectifs annuels ont été supprimés.",
    },
    bulkDelete: {
      button: "Tout supprimer",
      title: "Voulez-vous supprimer tous les objectifs annuels ?",
      message:
        "Cette action est irréversible.\nLes tâches hebdomadaires liées seront également supprimées.",
      all: "Tout supprimer",
      cancel: "Annuler",
    },
    errors: {
      loginMissing: "Session introuvable. Veuillez vous reconnecter.",
      fetchFailed: "Échec du chargement des objectifs annuels.",
      reorderSaveFailed: "Échec de l'enregistrement de l'ordre.",
      saveFailed: "Échec de l'enregistrement.",
      deleteFailed: "Échec de la suppression de cet objectif annuel.",
    },
  },
};
