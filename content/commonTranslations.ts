import { LanguageKey } from "../types/i18n";

export type CommonTranslations = {
  footer: {
    language: string;
    dashboard: string;
    more: string;
  };
  languageSheet: {
    title: string;
    close: string;
  };
  languageNames: Record<LanguageKey, string>;
  languageHelpers: Record<LanguageKey, string>;
};

export const commonTranslations: Record<LanguageKey, CommonTranslations> = {
  ja: {
    footer: {
      language: "言語",
      dashboard: "ダッシュボード",
      more: "その他",
    },
    languageSheet: {
      title: "言語を選択",
      close: "閉じる",
    },
    languageNames: {
      ja: "日本語",
      en: "English",
      fr: "Français",
    },
    languageHelpers: {
      ja: "Japanese",
      en: "English",
      fr: "French",
    },
  },
  en: {
    footer: {
      language: "Language",
      dashboard: "Dashboard",
      more: "More",
    },
    languageSheet: {
      title: "Choose a language",
      close: "Close",
    },
    languageNames: {
      ja: "日本語",
      en: "English",
      fr: "Français",
    },
    languageHelpers: {
      ja: "Japanese",
      en: "English",
      fr: "French",
    },
  },
  fr: {
    footer: {
      language: "Langue",
      dashboard: "Tableau de bord",
      more: "Autres",
    },
    languageSheet: {
      title: "Choisir une langue",
      close: "Fermer",
    },
    languageNames: {
      ja: "日本語",
      en: "English",
      fr: "Français",
    },
    languageHelpers: {
      ja: "Japonais",
      en: "Anglais",
      fr: "Français",
    },
  },
};
