import { LanguageKey } from "../types/i18n";

export type FocusMusicTranslations = {
  title: string;
  description: string;
  installedTitle: string;
  installedSubtitle: string;
  installedEmptyTitle: string;
  installedEmptyBody: string;
  installButton: string;
  loadingCatalog: string;
  limitMessage: string;
  installedCount: string;
  selectedLabel: string;
  removeConfirmTitle: string;
  removeConfirmBody: string;
  removeConfirmYes: string;
  removeConfirmNo: string;
  removeFailedTitle: string;
  removeFailedBody: string;
  installLimitTitle: string;
  installLimitBody: string;
  offlineTitle: string;
  offlineBody: string;
  cellularConfirmTitle: string;
  cellularConfirmBody: string;
  cellularConfirmYes: string;
  cellularConfirmNo: string;
  downloadFailedTitle: string;
  downloadFailedBody: string;
  downloadBusyTitle: string;
  downloadBusyBody: string;
  catalogTitle: string;
  catalogSubtitle: string;
  preview: string;
  previewStop: string;
  previewLoading: string;
  previewFailedTitle: string;
  previewFailedBody: string;
  installLabel: string;
  installedLabel: string;
  downloadingLabel: string;
  close: string;
};

export const focusMusicTranslations: Record<LanguageKey, FocusMusicTranslations> = {
  ja: {
    title: "タスク集中音楽",
    description: "集中を途切れさせないための音楽を5曲まで管理できます。",
    installedTitle: "手持ちの集中音楽",
    installedSubtitle: "タイマーで使う曲を選択できます。",
    installedEmptyTitle: "まだ集中音楽がありません。",
    installedEmptyBody: "カタログからお気に入りの音楽を追加しましょう。",
    installButton: "作業用音楽をインストール",
    loadingCatalog: "読み込み中...",
    limitMessage: "インストールは最大5曲までです。",
    installedCount: "{{count}} / {{max}}曲",
    selectedLabel: "選択中",
    removeConfirmTitle: "削除の確認",
    removeConfirmBody: "この曲を手持ちリストから削除しますか？",
    removeConfirmYes: "削除する",
    removeConfirmNo: "キャンセル",
    removeFailedTitle: "削除に失敗しました",
    removeFailedBody: "もう一度お試しください。",
    installLimitTitle: "インストール上限",
    installLimitBody:
      "インストールは最大5曲までです。手持ちの曲リストから手持ち曲を削除した後にインストールが可能です。",
    offlineTitle: "オフラインです",
    offlineBody: "ネットワークに接続してから再度お試しください。",
    cellularConfirmTitle: "モバイル通信でダウンロード",
    cellularConfirmBody:
      "モバイル通信でダウンロードしますか？通信量が発生する可能性があります。",
    cellularConfirmYes: "ダウンロードする",
    cellularConfirmNo: "キャンセル",
    downloadFailedTitle: "ダウンロードに失敗しました",
    downloadFailedBody: "回線状況を確認して、もう一度お試しください。",
    downloadBusyTitle: "ダウンロード中です",
    downloadBusyBody: "他の曲のダウンロードが完了するまでお待ちください。",
    catalogTitle: "作業用音楽カタログ",
    catalogSubtitle: "試聴して追加できます。",
    preview: "試聴",
    previewStop: "停止",
    previewLoading: "読み込み中",
    previewFailedTitle: "試聴に失敗しました",
    previewFailedBody: "時間をおいて再度お試しください。",
    installLabel: "追加",
    installedLabel: "追加済み",
    downloadingLabel: "ダウンロード中",
    close: "閉じる",
  },
  en: {
    title: "Focus music",
    description: "Manage up to five tracks that keep you in flow.",
    installedTitle: "Installed focus music",
    installedSubtitle: "Choose which track to use in the timer.",
    installedEmptyTitle: "No focus music yet.",
    installedEmptyBody: "Add a track from the catalog to get started.",
    installButton: "Install focus music",
    loadingCatalog: "Loading...",
    limitMessage: "Install up to 5 tracks.",
    installedCount: "{{count}} / {{max}} tracks",
    selectedLabel: "Selected",
    removeConfirmTitle: "Remove track?",
    removeConfirmBody: "Remove this track from your list?",
    removeConfirmYes: "Remove",
    removeConfirmNo: "Cancel",
    removeFailedTitle: "Remove failed",
    removeFailedBody: "Please try again.",
    installLimitTitle: "Install limit reached",
    installLimitBody:
      "You can install up to 5 tracks. Remove a track from your list to install another one.",
    offlineTitle: "You're offline",
    offlineBody: "Connect to the internet and try again.",
    cellularConfirmTitle: "Download on cellular?",
    cellularConfirmBody:
      "Do you want to download using cellular data? Data charges may apply.",
    cellularConfirmYes: "Download",
    cellularConfirmNo: "Cancel",
    downloadFailedTitle: "Download failed",
    downloadFailedBody: "Check your connection and try again.",
    downloadBusyTitle: "Download in progress",
    downloadBusyBody: "Please wait until the current download finishes.",
    catalogTitle: "Focus music catalog",
    catalogSubtitle: "Preview and add your favorites.",
    preview: "Preview",
    previewStop: "Stop",
    previewLoading: "Loading",
    previewFailedTitle: "Preview failed",
    previewFailedBody: "Please try again.",
    installLabel: "Install",
    installedLabel: "Installed",
    downloadingLabel: "Downloading",
    close: "Close",
  },
  fr: {
    title: "Musique de focus",
    description: "Gérez jusqu’à cinq morceaux pour rester concentré.",
    installedTitle: "Musiques installées",
    installedSubtitle: "Sélectionnez le morceau utilisé par le minuteur.",
    installedEmptyTitle: "Aucune musique pour le moment.",
    installedEmptyBody: "Ajoutez un morceau depuis le catalogue.",
    installButton: "Installer une musique de travail",
    loadingCatalog: "Chargement...",
    limitMessage: "Vous pouvez installer jusqu’à 5 morceaux.",
    installedCount: "{{count}} / {{max}} morceaux",
    selectedLabel: "Sélectionné",
    removeConfirmTitle: "Supprimer le morceau ?",
    removeConfirmBody: "Retirer ce morceau de votre liste ?",
    removeConfirmYes: "Supprimer",
    removeConfirmNo: "Annuler",
    removeFailedTitle: "Suppression échouée",
    removeFailedBody: "Veuillez réessayer.",
    installLimitTitle: "Limite atteinte",
    installLimitBody:
      "Vous pouvez installer jusqu’à 5 morceaux. Supprimez-en un pour en ajouter un autre.",
    offlineTitle: "Hors ligne",
    offlineBody: "Connectez-vous à internet puis réessayez.",
    cellularConfirmTitle: "Télécharger via mobile ?",
    cellularConfirmBody:
      "Voulez-vous télécharger via les données mobiles ? Des frais peuvent s’appliquer.",
    cellularConfirmYes: "Télécharger",
    cellularConfirmNo: "Annuler",
    downloadFailedTitle: "Échec du téléchargement",
    downloadFailedBody: "Vérifiez la connexion et réessayez.",
    downloadBusyTitle: "Téléchargement en cours",
    downloadBusyBody: "Veuillez attendre la fin du téléchargement en cours.",
    catalogTitle: "Catalogue de musiques",
    catalogSubtitle: "Écoutez un extrait et ajoutez vos favoris.",
    preview: "Écouter",
    previewStop: "Arrêter",
    previewLoading: "Chargement",
    previewFailedTitle: "Échec de l’écoute",
    previewFailedBody: "Veuillez réessayer.",
    installLabel: "Ajouter",
    installedLabel: "Installé",
    downloadingLabel: "Téléchargement",
    close: "Fermer",
  },
};
