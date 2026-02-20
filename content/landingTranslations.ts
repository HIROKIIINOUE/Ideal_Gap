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
    overviewCardTitle: string;
  };
  membership: {
    label: string;
    title: string;
    price: string;
    period: string;
    trialBadge: string;
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
      title: "理想の自分への第一歩",
      subtitle:
        "理想の自分を定義し、そこに向かう正しい道標を明確にする。あとは集中力を最大化し進んでいくだけ。",
      ctaPrimary: "無料で始める",
      ctaSecondary: "ログイン",
      scrollHint: "スクロール",
    },
    overview: {
      label: "What is Ideal Gap",
      title: "理想と日常を結ぶ、6 つの柱",
      description:
        "理想の自分を言語化し、年間/月間目標で道標を描く。週間タスクまで落とし込んだらあとは行動するだけ。カウントダウンタイマーで自分の努力の軌跡を可視化。タスクへの集中を手助けするタスク集中音楽、休憩通知。直近の楽しみな予定も表示することで「今」を楽しみながらバランスよく理想の「未来」へ進んでいく。",
      highlights: [
        "理想の自分リストアップ機能",
        "年間目標/月間目標リスト・進捗管理機能",
        "週間タスクリスト・進捗管理機能",
        "タスクタイマー・作業集中音楽機能",
        "休憩通知機能",
        "次回の楽しい予定リスト機能",
      ],
      overviewCardTitle: "アプリの概要",
    },
    membership: {
      label: "Membership",
      title: "定額プラン(現在無料期間あり)",
      price: "390 円",
      period: "/月",
      trialBadge: "14日間無料トライアル付き",
      description:
        "14日間無料。無料期間終了日を起点に毎月自動更新。いつでもキャンセル予約が可能。",
      bulletPoints: [
        "14日間無料、無料期間以降390円/月",
        "いつでもキャンセル予約可能",
        "再サインアップ時は無料プラン適用なし",
      ],
    },
    getStarted: {
      label: "Get Started",
      title: "まずはサインアップから",
      description:
        "無料期間中も全ての機能使用可能です。無料期間中にキャンセルすれば支払いは発生しません。",
      ctaPrimary: "無料で始める",
      ctaSecondary: "ログイン",
    },
  },
  en: {
    hero: {
      logo: "Ideal Gap",
      title: "The first step to your ideal self",
      subtitle:
        "Define your ideal self and clarify the right path. Then just focus and move forward.",
      ctaPrimary: "Start free",
      ctaSecondary: "Log in",
      scrollHint: "Scroll",
    },
    overview: {
      label: "What is Ideal Gap",
      title: "Six Pillars to Your Ideal Self",
      description:
        "Clarify your ideal self and map your path with yearly and monthly goals. Break them into weekly tasks and just go forward. Track your effort with a countdown timer, stay focused with task music and break reminders. And also enjoy upcoming plans while moving steadily toward your ideal future.",
      highlights: [
        "Ideal Self Vision Board",
        "Yearly & Monthly Goal Tracking",
        "Weekly Task Planning & Tracking",
        "Task Timer with Focus Music",
        "Smart Break Reminders",
        "Upcoming Exciting Events",
      ],
      overviewCardTitle: "App Overview",
    },
    membership: {
      label: "Membership",
      title: "Subscription(Free Trial Available)",
      price: "3.99 CAD",
      period: "/month",
      trialBadge: "Includes 14-days free trial",
      description:
        "14 days free trial. Auto-renews every month after the trial end. Cancel anytime.",
      bulletPoints: [
        "14 days free trial, then 3.99 CAD/month",
        "Cancel anytime",
        "No free plan when re-signing up",
      ],
    },
    getStarted: {
      label: "Get Started",
      title: "Start with sign up",
      description:
        "All features are available during the trial. Cancel during the trial and you will not be charged.",
      ctaPrimary: "Start free",
      ctaSecondary: "Log in",
    },
  },
  fr: {
    hero: {
      logo: "Ideal Gap",
      title: "Votre premier pas vers votre moi idéal",
      subtitle:
        "Définissez votre idéal et identifiez la bonne voie. Il ne reste plus qu’à se concentrer et avancer.",
      ctaPrimary: "Essai gratuit",
      ctaSecondary: "Connexion",
      scrollHint: "Faites défiler",
    },
    overview: {
      label: "Qu’est-ce l'Ideal Gap",
      title: "Six piliers reliant l'idéal et le quotidien",
      description:
        "Définissez votre idéal et tracez votre voie avec des objectifs annuels et mensuels. Divisez-les en tâches hebdomadaires et passez à l'action. Visualisez votre progression avec un compte à rebours, restez concentrer avec de la musique adaptées à vos envies et des rappels de temps de pause. Motivez-vous avec vos plans sympas à venir tout en avançant petit à petit vers votre avenir idéal.",
      highlights: [
        "Tableau d'inspiration de votre moi idéal",
        "Suivi des objectifs annuels et mensuels",
        "Liste et suivi des tâches hebdomadaires",
        "Minuteur et musique de concentration",
        "Rappels de pause",
        "Vos plans sympas à venir",
      ],
      overviewCardTitle: "Présentation de l’app",
    },
    membership: {
      label: "Abonnement",
      title: "Forfait fixe (essai gratuit disponible)",
      price: "3.99 CAD",
      period: "/mois",
      trialBadge: "Essai gratuit de 14 jours inclus",
      description:
        "Essai gratuit de 14 jours. Renouvellement automatique tous les mois dès la fin de l’essai. Annulation possible à tout moment.",
      bulletPoints: [
        "Essai gratuit de 14 jours, puis 3.99 CAD/mois",
        "Annulation possible à tout moment",
        "Pas d’offre gratuite lors d’une réinscription",
      ],
    },
    getStarted: {
      label: "Commencer",
      title: "Commencez l’inscription",
      description:
        "Toutes les fonctionnalités sont disponibles pendant l’essai. Annulez durant l’essai et aucun paiement ne sera facturé.",
      ctaPrimary: "Essai gratuit",
      ctaSecondary: "Connexion",
    },
  },
};
