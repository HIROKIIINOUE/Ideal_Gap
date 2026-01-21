import { LanguageKey } from "../types/i18n";

export type FocusMusicTranslations = {
  title: string;
  description: string;
  installedTitle: string;
  installedSubtitle: string;
  installedEmptyTitle: string;
  installedEmptyBody: string;
  installButton: string;
  limitMessage: string;
  installedCount: string;
  selectedLabel: string;
  removeConfirmTitle: string;
  removeConfirmBody: string;
  removeConfirmYes: string;
  removeConfirmNo: string;
  installLimitTitle: string;
  installLimitBody: string;
  catalogTitle: string;
  catalogSubtitle: string;
  preview: string;
  previewStop: string;
  installLabel: string;
  installedLabel: string;
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
    limitMessage: "インストールは最大5曲までです。",
    installedCount: "{{count}} / {{max}}曲",
    selectedLabel: "選択中",
    removeConfirmTitle: "削除の確認",
    removeConfirmBody: "この曲を手持ちリストから削除しますか？",
    removeConfirmYes: "削除する",
    removeConfirmNo: "キャンセル",
    installLimitTitle: "インストール上限",
    installLimitBody:
      "インストールは最大5曲までです。手持ちの曲リストから手持ち曲を削除した後にインストールが可能です。",
    catalogTitle: "作業用音楽カタログ",
    catalogSubtitle: "試聴して追加できます。",
    preview: "試聴",
    previewStop: "停止",
    installLabel: "追加",
    installedLabel: "追加済み",
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
    limitMessage: "Install up to 5 tracks.",
    installedCount: "{{count}} / {{max}} tracks",
    selectedLabel: "Selected",
    removeConfirmTitle: "Remove track?",
    removeConfirmBody: "Remove this track from your list?",
    removeConfirmYes: "Remove",
    removeConfirmNo: "Cancel",
    installLimitTitle: "Install limit reached",
    installLimitBody:
      "You can install up to 5 tracks. Remove a track from your list to install another one.",
    catalogTitle: "Focus music catalog",
    catalogSubtitle: "Preview and add your favorites.",
    preview: "Preview",
    previewStop: "Stop",
    installLabel: "Install",
    installedLabel: "Installed",
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
    limitMessage: "Vous pouvez installer jusqu’à 5 morceaux.",
    installedCount: "{{count}} / {{max}} morceaux",
    selectedLabel: "Sélectionné",
    removeConfirmTitle: "Supprimer le morceau ?",
    removeConfirmBody: "Retirer ce morceau de votre liste ?",
    removeConfirmYes: "Supprimer",
    removeConfirmNo: "Annuler",
    installLimitTitle: "Limite atteinte",
    installLimitBody:
      "Vous pouvez installer jusqu’à 5 morceaux. Supprimez-en un pour en ajouter un autre.",
    catalogTitle: "Catalogue de musiques",
    catalogSubtitle: "Écoutez un extrait et ajoutez vos favoris.",
    preview: "Écouter",
    previewStop: "Arrêter",
    installLabel: "Ajouter",
    installedLabel: "Installé",
    close: "Fermer",
  },
};
