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
      toggleFunPlan: { title: string; subtitle: string };
      toggleTimerAlarm: {
        title: string;
        subtitle: string;
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
          title: "次回の楽しい予定",
          subtitle: "ダッシュボード表示を切り替えます",
        },
        toggleTimerAlarm: {
          title: "タスクタイマーアラーム",
          subtitle: "完了時に音とバイブを鳴らします",
        },
        payment: {
          title: "料金プラン変更",
          subtitle: "無料枠の確認や課金設定を開きます",
        },
        profile: {
          title: "プロフィール変更/削除",
          subtitle: "プロフィールを更新、削除します",
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
          title: "Next exciting plan",
          subtitle: "Show or hide the dashboard card",
        },
        toggleTimerAlarm: {
          title: "Timer end alarm",
          subtitle: "Make alarm sound and vibration",
        },
        payment: {
          title: "Manage plan",
          subtitle: "Review free limits or open billing settings",
        },
        profile: {
          title: "Edit/delete profile",
          subtitle: "Update or delete your profile",
        },
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
          title: "Plan sympa à venir",
          subtitle: "Afficher ou masquer la carteju",
        },
        toggleTimerAlarm: {
          title: "Alarme de fin du minuteur",
          subtitle: "Lire un son et une vibration",
        },
        payment: {
          title: "Changer de forfait",
          subtitle: "Voir les limites gratuites ou ouvrir la facturation", // マリー再チェック
        },
        profile: {
          title: "Modifier/supprimer le profil",
          subtitle: "Mettre à jour ou supprimer votre profil",
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
