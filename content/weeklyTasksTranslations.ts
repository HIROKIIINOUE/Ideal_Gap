import { LanguageKey } from "../types/i18n";

export type WeeklyTasksTranslations = {
  pageTitle: string;
  header: {
    applyNextMemo: string;
  };
  actions: {
    add: string;
    delete: string;
    deleteExit: string;
  };
  limitHelper: string;
  limitReached: string;
  limitAlert: {
    title: string;
    body: string;
    back: string;
    upgrade: string;
  };
  completion: {
    complete: string;
    undo: string;
    badge: string;
  };
  deleteConfirm: {
    title: string;
    body: string;
    yes: string;
    no: string;
  };
  deleteSuccess: {
    title: string;
    body: string;
  };
  bulkDeleteSuccess: {
    title: string;
    body: string;
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
    emptyCta: string;
    loadError: string;
  };
  task: {
    yearlyLink: string;
    openTimer: string;
    manualLog: string;
    edit: string;
    comingSoon: string;
  };
  bulkDelete: {
    button: string;
    title: string;
    message: string;
    all: string;
    cancel: string;
  };
  modal: {
    addTitle: string;
    editTitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    yearlyGoalLabel: string;
    noYearlyGoal: string;
    unlinkedYearlyGoal: string;
    cancel: string;
    save: string;
    errorRequired: string;
  };
  manualModal: {
    title: string;
    currentLabel: string;
    addedLabel: string;
    finalLabel: string;
    hoursLabel: string;
    minutesLabel: string;
    rangeHelper: string;
    confirmTitle: string;
    confirmMessage: string;
    confirm: string;
    cancel: string;
    submit: string;
    outOfRange: string;
    successTitle: string;
    successBody: string;
    errorTitle: string;
  };
};

export const weeklyTasksTranslations: Record<
  LanguageKey,
  WeeklyTasksTranslations
> = {
  ja: {
    pageTitle: "週間タスク",
    header: {
      applyNextMemo: "来週メモを今週へ適用",
    },
    actions: {
      add: "追加",
      delete: "削除",
      deleteExit: "戻る",
    },
    limitHelper: "無料プランでは最大10件まで追加できます",
    limitReached: "上限に達しました。削除してから追加してください。",
    limitAlert: {
      title: "上限に達しました",
      body: "無料プランは最大10件までです。10件を超える場合はプランをアップグレードしてください。",
      back: "戻る",
      upgrade: "Pro Planへアップグレード",
    },
    completion: {
      complete: "完了",
      undo: "未完了に戻す",
      badge: "完了済み",
    },
    deleteConfirm: {
      title: "削除してもよろしいですか？",
      body: "削除すると元に戻せません。",
      yes: "削除する",
      no: "キャンセル",
    },
    deleteSuccess: {
      title: "削除しました",
      body: "削除が完了しました。",
    },
    bulkDeleteSuccess: {
      title: "全て削除しました",
      body: "週間タスクを全て削除しました。",
    },
    summary: {
      target: "目標",
      logged: "実績",
      remaining: "目標まで",
    },
    list: {
      title: "タスクリスト",
      emptyTitle: "まだタスクがありません",
      emptyBody: "追加ボタンからタスクを作成し、年間目標と紐づけてください。",
      emptyCta: "最初のタスクを追加",
      loadError: "週間タスクを読み込めませんでした",
    },
    task: {
      yearlyLink: "年間目標",
      openTimer: "タイマー",
      manualLog: "手動記録",
      edit: "編集",
      comingSoon: "機能は後で実装予定",
    },
    bulkDelete: {
      button: "全削除",
      title: "週間タスクを全て削除しますか？",
      message: "この操作は元に戻せません。",
      all: "すべて削除",
      cancel: "キャンセル",
    },
    modal: {
      addTitle: "週間タスクを追加",
      editTitle: "編集",
      titleLabel: "週間タスク",
      titlePlaceholder: "例 英単語600語 2周",
      yearlyGoalLabel: "紐づける年間目標",
      noYearlyGoal: "まだ年間目標がありません",
      unlinkedYearlyGoal: "年間目標に紐づけない",
      cancel: "キャンセル",
      save: "保存",
      errorRequired: "すべての項目を入力してください",
    },
    manualModal: {
      title: "手動で記録",
      currentLabel: "現在の実績",
      addedLabel: "追加する時間",
      finalLabel: "追加後の合計",
      hoursLabel: "時間",
      minutesLabel: "分",
      rangeHelper:
        "入力した時間を現在の実績に積み上げます。関連する年間目標にも反映されます。",
      confirmTitle: "この実績で更新しますか？",
      confirmMessage: "{{added}} を加算して合計を {{total}} に更新します。",
      confirm: "加算する",
      cancel: "戻る",
      submit: "加算する",
      outOfRange: "1分以上の時間を入力してください",
      successTitle: "更新しました",
      successBody: "追加分を保存しました。",
      errorTitle: "更新に失敗しました",
    },
  },
  en: {
    pageTitle: "Weekly Tasks",
    header: {
      applyNextMemo: "Apply next memo to this week",
    },
    actions: {
      add: "Add",
      delete: "Delete",
      deleteExit: "Exit",
    },
    limitHelper: "Free users can add up to 10 items",
    limitReached: "You’ve reached the limit. Remove one to add another.",
    limitAlert: {
      title: "Limit reached",
      body: "The free plan allows up to 10 items. Upgrade your plan to go beyond 10.",
      back: "Back",
      upgrade: "Upgrade to Pro Plan",
    },
    completion: {
      complete: "Done",
      undo: "Mark as active",
      badge: "Done",
    },
    deleteConfirm: {
      title: "Delete this weekly task?",
      body: "You can’t undo this action after deleting.",
      yes: "Delete",
      no: "Cancel",
    },
    deleteSuccess: {
      title: "Deleted",
      body: "Deleted successfully.",
    },
    bulkDeleteSuccess: {
      title: "Deleted all",
      body: "All weekly tasks were deleted.",
    },
    summary: {
      target: "Target",
      logged: "Logged",
      remaining: "Remaining",
    },
    list: {
      title: "Task list",
      emptyTitle: "No tasks yet",
      emptyBody: "Add a task and link it to an annual goal.",
      emptyCta: "Add your first task",
      loadError: "Unable to load weekly tasks.",
    },
    task: {
      yearlyLink: "Annual goal",
      openTimer: "Timer",
      manualLog: "Manual",
      edit: "Edit",
      comingSoon: "Feature coming later",
    },
    bulkDelete: {
      button: "Delete all",
      title: "Delete all weekly tasks?",
      message: "This cannot be undone.",
      all: "Delete all",
      cancel: "Cancel",
    },
    modal: {
      addTitle: "Add weekly task",
      editTitle: "Edit",
      titleLabel: "Weekly task",
      titlePlaceholder: "e.g. Finish 7 pages in section4 on the textbook",
      yearlyGoalLabel: "Link annual goal",
      noYearlyGoal: "No annual goals yet",
      unlinkedYearlyGoal: "Don't link an annual goal",
      cancel: "Cancel",
      save: "Save",
      errorRequired: "Please fill all fields",
    },
    manualModal: {
      title: "Manual record",
      currentLabel: "Current log",
      addedLabel: "Add",
      finalLabel: "New total",
      hoursLabel: "Hours",
      minutesLabel: "Minutes",
      rangeHelper:
        "The time you enter will be added to the current total. It will also be applied to the related annual goal.",
      confirmTitle: "Update this log?",
      confirmMessage: "Add {{added}} and update the total to {{total}}.",
      confirm: "Add time",
      cancel: "Back",
      submit: "Add time",
      outOfRange: "Enter more than 0 minutes.",
      successTitle: "Added",
      successBody: "The additional time has been saved.",
      errorTitle: "Update failed",
    },
  },
  fr: {
    pageTitle: "Tâches hebdomadaires",
    header: {
      applyNextMemo: "Appliquer le mémo à cette semaine",
    },
    actions: {
      add: "Ajouter",
      delete: "Supprimer",
      deleteExit: "Quitter",
    },
    limitHelper: "Les utilisateurs gratuits peuvent en ajouter jusqu’à 10",
    limitReached: "Limite atteinte. Supprimez-en un pour en ajouter un autre.",
    limitAlert: {
      title: "Limite atteinte",
      body: "Le forfait gratuit permet jusqu’à 10 éléments. Passez au forfait Pro pour dépasser 10.",
      back: "Retour",
      upgrade: "Passer au forfait Pro",
    },
    completion: {
      complete: "Terminer",
      undo: "Rendre active",
      badge: "Terminée",
    },
    deleteConfirm: {
      title: "Supprimer cette tâche hebdomadaire ?",
      body: "Cette action sera définitive après la suppression.",
      yes: "Supprimer",
      no: "Annuler",
    },
    deleteSuccess: {
      title: "Supprimé",
      body: "Suppression terminée.",
    },
    bulkDeleteSuccess: {
      title: "Tout supprimer",
      body: "Toutes les tâches hebdomadaires ont été supprimées.",
    },
    summary: {
      target: "Objectif",
      logged: "Réalisé",
      remaining: "Restant",
    },
    list: {
      title: "Liste des tâches",
      emptyTitle: "Aucune tâche pour le moment",
      emptyBody: "Ajoutez une tâche et associez-la à un objectif annuel.",
      emptyCta: "Ajouter une tâche",
      loadError: "Impossible de charger les tâches hebdomadaires.",
    },
    task: {
      yearlyLink: "Objectif annuel",
      openTimer: "Minuteur",
      manualLog: "Manuel",
      edit: "Modifier",
      comingSoon: "Fonctionnalité à venir",
    },
    bulkDelete: {
      button: "Tout supprimer",
      title: "Voulez-vous supprimer toutes les tâches hebdomadaires ?",
      message: "Cette action est irréversible.",
      all: "Tout supprimer",
      cancel: "Annuler",
    },
    modal: {
      addTitle: "Ajouter une tâche hebdomadaire",
      editTitle: "Modifier",
      titleLabel: "Tâche hebdomadaire",
      titlePlaceholder: "ex. Réviser 600 mots de vocabulaire d'anglais",
      yearlyGoalLabel: "Associer un objectif annuel",
      noYearlyGoal: "Aucun objectif annuel pour le moment",
      unlinkedYearlyGoal: "Ne pas associer d'objectif annuel",
      cancel: "Annuler",
      save: "Enregistrer",
      errorRequired: "Veuillez remplir tous les champs",
    },
    manualModal: {
      title: "Saisie manuelle",
      currentLabel: "Enregistré",
      addedLabel: "Ajout",
      finalLabel: "Progression totale",
      hoursLabel: "Heures",
      minutesLabel: "Minutes",
      rangeHelper:
        "Le temps que vous saisissez sera additionné au total actuel. Il sera également appliqué à l'objectif annuel associé.",
      confirmTitle: "Voulez-vous mettre à jour la progression ?",
      confirmMessage:
        "Ajouter {{added}} à votre progression et passer à {{total}}.",
      confirm: "Ajouter",
      cancel: "Retour",
      submit: "Ajouter",
      outOfRange: "Entrez une durée supérieure à 0 minute.",
      successTitle: "Ajout enregistré",
      successBody: "Le temps ajouté a été enregistré.",
      errorTitle: "Échec de la mise à jour",
    },
  },
};
