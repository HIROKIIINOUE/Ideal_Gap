import { LanguageKey } from "../types/i18n";

export type LandingSections = {
  hero: {
    logo: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    scrollHint: string;
  };
  overview: {
    label: string;
    title: string;
    highlights: string[];
    description: string;
  };
  membership: {
    label: string;
    title: string;
    price: string;
    period: string;
    description: string;
    bulletPoints: string[];
  };
  getStarted: {
    label: string;
    title: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
};

export type LandingTranslations = Record<LanguageKey, LandingSections>;

export const landingTranslations: LandingTranslations = {
  ja: {
    hero: {
      logo: "Ideal Gap",
      title: "理想に向けた最初の一歩を。",
      subtitle: "Apple HIG に沿ったシンプルで高級感のある体験で、続けやすさをデザイン。",
      ctaPrimary: "無料で始める",
      ctaSecondary: "サインイン",
      scrollHint: "スクロール",
    },
    overview: {
      label: "Why Ideal Gap",
      title: "理想と日常を結ぶ、6 つの柱",
      description:
        "理想の自分を定義し、年間・月間・週間の目標、集中できるタスクタイマー、タスク集中音楽、休憩通知で習慣化を支える。すべてのデータはシンプルな UI に整理され、毎日の進捗が明確に見える。",
      highlights: [
        "理想の自分を可視化し、年間・月間・週間の目標を一本の線でつなぐ",
        "タスク集中音楽と休憩通知で、集中と回復のリズムを整える",
        "マルチデバイス・マルチ言語対応（日本語/英語/フランス語）",
      ],
    },
    membership: {
      label: "Membership",
      title: "シンプルな定額プラン",
      price: "8.5 CAD",
      period: "/月 (30日ごと)",
      description: "初月無料。登録日を起点に 30 日ごとに自動更新。いつでもキャンセル予約が可能。",
      bulletPoints: [
        "初月無料・次月以降 8.5 CAD/月 (30日ごと課金)",
        "支払いステータス: 有効 / 支払い失敗 / キャンセル予約",
        "再サインアップ時は無料プラン適用なし",
      ],
    },
    getStarted: {
      label: "Get Started",
      title: "まずはサインアップから",
      description: "目標設定・タスク集中音楽・休憩通知をまとめて体験。無料期間終了後も 8.5 CAD/月で継続できます。",
      ctaPrimary: "無料で始める",
      ctaSecondary: "サインイン",
    },
  },
  en: {
    hero: {
      logo: "Ideal Gap",
      title: "Take your first step toward the ideal you.",
      subtitle: "Elegant, Apple HIG-inspired experience that keeps you engaged.",
      ctaPrimary: "Start free",
      ctaSecondary: "Sign in",
      scrollHint: "Scroll",
    },
    overview: {
      label: "Why Ideal Gap",
      title: "Six pillars that connect your ideals and daily life",
      description:
        "Define your ideal self and link yearly, monthly, and weekly goals with focus timer, focus music, and break reminders. A clear UI keeps every bit of progress visible.",
      highlights: [
        "Visualize your ideal self and align yearly / monthly / weekly goals",
        "Focus music and break reminders keep your rhythm balanced",
        "Multi-device, multilingual support (Japanese / English / French)",
      ],
    },
    membership: {
      label: "Membership",
      title: "Simple flat plan",
      price: "8.5 CAD",
      period: "/mo (every 30 days)",
      description: "First month free, then auto-renews every 30 days. Cancel anytime.",
      bulletPoints: [
        "First month free, then 8.5 CAD every 30 days",
        "Billing status: active / payment failed / cancel scheduled",
        "No free tier when re-signing up after cancel",
      ],
    },
    getStarted: {
      label: "Get Started",
      title: "Create your account",
      description: "Try goals, focus music, and break reminders together. Continue for 8.5 CAD/month after trial.",
      ctaPrimary: "Start free",
      ctaSecondary: "Sign in",
    },
  },
  fr: {
    hero: {
      logo: "Ideal Gap",
      title: "Faites le premier pas vers votre idéal.",
      subtitle: "Une expérience élégante inspirée des HIG d’Apple pour rester motivé.",
      ctaPrimary: "Commencer gratuitement",
      ctaSecondary: "Se connecter",
      scrollHint: "Faites défiler",
    },
    overview: {
      label: "Pourquoi Ideal Gap",
      title: "Six piliers pour relier idéal et quotidien",
      description:
        "Définissez votre idéal et reliez vos objectifs annuels, mensuels et hebdomadaires avec minuteur, musique de concentration et rappels de pause. Une interface claire pour voir vos progrès.",
      highlights: [
        "Visualisez votre idéal et alignez objectifs annuels / mensuels / hebdomadaires",
        "Musique de concentration et rappels de pause pour garder le rythme",
        "Compatibilité multi-appareils et multilingue (japonais / anglais / français)",
      ],
    },
    membership: {
      label: "Abonnement",
      title: "Forfait simple",
      price: "8.5 CAD",
      period: "/mois (tous les 30 jours)",
      description: "Premier mois gratuit, puis renouvellement automatique tous les 30 jours. Annulable à tout moment.",
      bulletPoints: [
        "Premier mois gratuit, puis 8.5 CAD tous les 30 jours",
        "Statut de facturation : actif / paiement échoué / annulation planifiée",
        "Pas de mois gratuit lors d’une réinscription après annulation",
      ],
    },
    getStarted: {
      label: "Commencer",
      title: "Créez votre compte",
      description:
        "Essayez les objectifs, la musique de concentration et les rappels de pause. Poursuivez pour 8.5 CAD/mois après l’essai.",
      ctaPrimary: "Commencer gratuitement",
      ctaSecondary: "Se connecter",
    },
  },
};
