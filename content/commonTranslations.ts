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
  moreSheet: {
    title: string;
    close: string;
    items: {
      logout: { title: string; subtitle: string };
      toggleFunPlan: { title: string; subtitle: string };
      payment: { title: string; subtitle: string };
      timezone: { title: string; subtitle: string };
      profile: { title: string; subtitle: string };
      contact: { title: string; subtitle: string };
    };
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
    moreSheet: {
      title: "その他のメニュー",
      close: "閉じる",
      items: {
        logout: { title: "ログアウト", subtitle: "セッションを終了します" },
        toggleFunPlan: { title: "次回の楽しい予定の表示", subtitle: "カードの表示を切り替えます（後で設定）" },
        payment: { title: "支払い方法の確認・変更", subtitle: "ストアの設定画面を開きます" },
        timezone: { title: "タイムゾーンの変更", subtitle: "時刻の表示を合わせます" },
        profile: { title: "プロフィール変更", subtitle: "名前やメールを更新します" },
        contact: { title: "お問い合わせ", subtitle: "不具合や要望を送信します" },
      },
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
    moreSheet: {
      title: "More",
      close: "Close",
      items: {
        logout: { title: "Log out", subtitle: "End your current session" },
        toggleFunPlan: { title: "Toggle Next Fun Plan", subtitle: "Show or hide the card (coming soon)" },
        payment: { title: "Manage payment", subtitle: "Open the store settings" },
        timezone: { title: "Change time zone", subtitle: "Align time displays" },
        profile: { title: "Edit profile", subtitle: "Update name or email" },
        contact: { title: "Contact us", subtitle: "Send feedback or issues" },
      },
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
    moreSheet: {
      title: "Plus",
      close: "Fermer",
      items: {
        logout: { title: "Déconnexion", subtitle: "Terminer la session en cours" },
        toggleFunPlan: {
          title: "Afficher le prochain moment plaisir",
          subtitle: "Afficher ou masquer la carte (bientôt)",
        },
        payment: { title: "Gérer le paiement", subtitle: "Ouvrir les réglages de la boutique" },
        timezone: { title: "Changer le fuseau horaire", subtitle: "Aligner l’affichage de l’heure" },
        profile: { title: "Modifier le profil", subtitle: "Mettre à jour nom ou e-mail" },
        contact: { title: "Contactez-nous", subtitle: "Envoyer vos retours ou problèmes" },
      },
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
