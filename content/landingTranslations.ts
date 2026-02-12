// 【フランス語チェック】
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
        "年間目標・月間目標リスト機能",
        "週間タスクリスト機能",
        "タスクタイマー・作業集中音楽機能",
        "休憩通知機能",
        "次回の楽しい予定機能",
      ],
      overviewCardTitle: "アプリの概要",
    },
    membership: {
      label: "Membership",
      title: "定額プラン(現在無料期間あり)",
      price: "490 円",
      period: "/月 (30日ごと)",
      description:
        "40日間無料。無料期間終了日を起点に30日ごとに自動更新。いつでもキャンセル予約が可能。",
      bulletPoints: [
        "40日間無料、無料期間以降490円/月",
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
      title: "Your first step to your ideal self",
      subtitle:
        "Define your ideal self and clarify the right path. Then just focus and move forward.",
      ctaPrimary: "Start free",
      ctaSecondary: "Log in",
      scrollHint: "Scroll",
    },
    overview: {
      label: "What is Ideal Gap",
      title: "6 Pillars Connecting Ideals and Daily Life",
      description:
        "Clarify your ideal self and map your path with yearly and monthly goals. Break them into weekly tasks and take action. Track your effort with a countdown timer, stay focused with task music and break alarm, and enjoy upcoming plans while moving steadily toward your ideal future.",
      highlights: [
        "Ideal Self Listing",
        "Yearly & Monthly Goals",
        "Weekly Task Lists",
        "Task Timer & Focus Music",
        "Break Alarm",
        "Upcoming Fun Plan",
      ],
      overviewCardTitle: "App Overview",
    },
    membership: {
      label: "Membership",
      title: "Subscription Plan(Free Trial Available)",
      price: "490 JPY",
      period: "/mo (every 30 days)",
      description:
        "40 days free trial. Auto-renews every 30 days after the trial end. Cancel anytime.",
      bulletPoints: [
        "40 days free trial, then 490 JPY/month",
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
      title: "Votre premier pas vers l’idéal",
      subtitle:
        "Définissez votre idéal et clarifiez le bon chemin. Il ne reste qu’à maximiser la concentration et avancer.",
      ctaPrimary: "Start free",
      ctaSecondary: "Log in",
      scrollHint: "Faites défiler",
    },
    overview: {
      label: "Qu’est-ce qu’Ideal Gap",
      title: "Six piliers reliant idéal et quotidien",
      description:
        "Mettez votre idéal en mots, dessinez le cap avec des objectifs annuels et mensuels, puis déclinez en tâches hebdomadaires. Un minuteur compte à rebours visualise l’effort. Musique de concentration et rappels de pause soutiennent le focus. Les prochains moments plaisants aident à profiter du présent tout en avançant vers l’avenir idéal.",
      highlights: [
        "Liste de votre idéal",
        "Listes d’objectifs annuels et mensuels",
        "Listes de tâches hebdomadaires",
        "Minuteur de tâche et musique focus",
        "Rappels de pause",
        "Prochain moment plaisant",
      ],
      overviewCardTitle: "Présentation de l’app",
    },
    membership: {
      label: "Abonnement",
      title: "Forfait fixe (essai gratuit)",
      price: "490 JPY",
      period: "/mois (tous les 30 jours)",
      description:
        "Essai gratuit de 40 jours. Renouvellement automatique tous les 30 jours à partir de la fin de l’essai. Annulation possible à tout moment.",
      bulletPoints: [
        "Essai gratuit de 40 jours, puis 490 JPY/mois",
        "Annulation possible à tout moment",
        "Pas d’offre gratuite lors d’une réinscription",
      ],
    },
    getStarted: {
      label: "Commencer",
      title: "Commencez par l’inscription",
      description:
        "Toutes les fonctionnalités sont disponibles pendant l’essai. Annulez pendant l’essai et aucun paiement ne sera facturé.",
      ctaPrimary: "Start free",
      ctaSecondary: "Log in",
    },
  },
};
