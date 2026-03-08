import { LanguageKey } from "../types/i18n";

export type CommonTranslations = {
  loading: string;
  offline: {
    banner: string;
    blockedTitle: string;
    blockedBody: string;
    noConnectionTitle: string;
    noConnectionBody: string;
    retry: string;
  };
  footer: {
    language: string;
    dashboard: string;
    more: string;
    contact: string;
    home: string;
  };
  languageSheet: {
    title: string;
    close: string;
  };
  moreSheet: {
    title: string;
    close: string;
    confirmTitle: string;
    confirmBody: string;
    confirmYes: string;
    confirmNo: string;
    logoutSuccess: string;
    items: {
      logout: { title: string; subtitle: string };
      toggleFunPlan: {
        show: { title: string; subtitle: string };
        hide: { title: string; subtitle: string };
      };
      payment: { title: string; subtitle: string };
      profile: { title: string; subtitle: string };
      contact: { title: string; subtitle: string };
    };
  };
  navigation: {
    back: string;
  };
  languageNames: Record<LanguageKey, string>;
  languageHelpers: Record<LanguageKey, string>;
};

export const commonTranslations: Record<LanguageKey, CommonTranslations> = {
  ja: {
    loading: "ローディング中...",
    offline: {
      banner: "You're offline",
      blockedTitle: "オフラインのため操作できません",
      blockedBody: "インターネットに接続してからもう一度お試しください。",
      noConnectionTitle: "インターネットに接続してください",
      noConnectionBody:
        "このページは接続が必要です。接続後に再度アクセスしてください。",
      retry: "再試行",
    },
    footer: {
      language: "言語",
      dashboard: "ホーム",
      more: "その他",
      contact: "お問い合わせ",
      home: "ホームへ戻る",
    },
    languageSheet: {
      title: "言語を選択",
      close: "閉じる",
    },
    moreSheet: {
      title: "その他のメニュー",
      close: "閉じる",
      confirmTitle: "ログアウトしますか？",
      confirmBody: "セッションが終了します。続行しますか？",
      confirmYes: "ログアウト",
      confirmNo: "キャンセル",
      logoutSuccess: "ログアウトが完了しました",
      items: {
        logout: { title: "ログアウト", subtitle: "セッションを終了します" },
        toggleFunPlan: {
          show: {
            title: "次回の楽しい予定を表示",
            subtitle: "カードをダッシュボードに戻します",
          },
          hide: {
            title: "次回の楽しい予定を非表示",
            subtitle: "カードを一時的に隠します",
          },
        },
        payment: {
          title: "支払い方法の変更・退会",
          subtitle: "支払い方法を更新します",
        },
        profile: {
          title: "プロフィール変更",
          subtitle: "名前やメールを更新します",
        },
        contact: {
          title: "お問い合わせ",
          subtitle: "不具合や要望を送信します",
        },
      },
    },
    navigation: {
      back: "戻る",
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
    loading: "Loading...",
    offline: {
      banner: "You're offline",
      blockedTitle: "This action is unavailable offline",
      blockedBody: "Reconnect to the internet and try again.",
      noConnectionTitle: "Connect to the internet",
      noConnectionBody:
        "This page requires a network connection. Please reconnect and try again.",
      retry: "Retry",
    },
    footer: {
      language: "Language",
      dashboard: "Home",
      more: "More",
      contact: "Contact",
      home: "Home",
    },
    languageSheet: {
      title: "Choose a language",
      close: "Close",
    },
    moreSheet: {
      title: "More",
      close: "Close",
      confirmTitle: "Log out?",
      confirmBody: "Your session will end. Do you want to continue?",
      confirmYes: "Log out",
      confirmNo: "Cancel",
      logoutSuccess: "Logged out successfully",
      items: {
        logout: { title: "Log out", subtitle: "End your current session" },
        toggleFunPlan: {
          show: {
            title: "Show Next Exciting Plans",
            subtitle: "Bring the card back to dashboard",
          },
          hide: {
            title: "Hide Exciting Plan",
            subtitle: "Temporarily hide the card",
          },
        },
        payment: {
          title: "Manage payment",
          subtitle: "update or cancel subscription",
        },
        profile: { title: "Edit profile", subtitle: "Update name or email" },
        contact: { title: "Contact us", subtitle: "Send feedback or issues" },
      },
    },
    navigation: {
      back: "Back",
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
    loading: "Chargement...",
    offline: {
      banner: "La connection Internet est interrompue",
      blockedTitle: "Action indisponible hors ligne",
      blockedBody: "Reconnectez-vous à Internet puis réessayez.",
      noConnectionTitle: "Connectez-vous à Internet",
      noConnectionBody:
        "Cette page nécessite une connexion Internet. Reconnectez-vous pour réessayer.",
      retry: "Réessayer",
    },
    footer: {
      language: "Langue",
      dashboard: "Accueil",
      more: "Autres",
      contact: "Contact",
      home: "Accueil",
    },
    languageSheet: {
      title: "Choisir une langue",
      close: "Fermer",
    },
    moreSheet: {
      title: "Plus",
      close: "Fermer",
      confirmTitle: "Se déconnecter ?",
      confirmBody: "Votre session va se terminer. Voulez-vous continuer ?",
      confirmYes: "Déconnexion",
      confirmNo: "Annuler",
      logoutSuccess: "Déconnexion réussie",
      items: {
        logout: {
          title: "Déconnexion",
          subtitle: "Terminer la session en cours",
        },
        toggleFunPlan: {
          show: {
            title: "Afficher le plan sympa à venir",
            subtitle: "Ramener la carte sur le tableau de bord",
          },
          hide: {
            title: "Masquer le plan sympa à venir ",
            subtitle: "Masquer la carte temporairement",
          },
        },
        payment: {
          title: "Gérer le paiement",
          subtitle: "Ouvrir les réglages de la boutique", // マリー再チェック
        },
        profile: {
          title: "Modifier le profil",
          subtitle: "Mettre à jour mon nom ou mon e-mail",
        },
        contact: {
          title: "Contactez-nous",
          subtitle: "Envoyer votre retour ou votre problème",
        },
      },
    },
    navigation: {
      back: "retour",
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
