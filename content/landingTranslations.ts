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
    fallbackPrice: string;
    freeTitle: string;
    freeDescription: string;
    freePoints: string[];
    paidTitle: string;
    paidDescription: string;
    paidPoints: string[];
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
        "理想の自分を定義し、そこに向かうための道標を明確にする。あとは集中力を最大化し進んでいくだけ。",
      ctaPrimary: "無料で始める",
      ctaSecondary: "ログイン",
      scrollHint: "スクロール",
    },
    overview: {
      label: "What is Ideal Gap",
      title: "理想と日常を結ぶ、6 つの柱",
      description:
        "理想の自分を言語化し、年間目標で道標を描く。週間タスクまで落とし込んだらあとは行動するのみ。カウントダウンタイマーで自分の努力の軌跡を可視化し、タスク集中音楽と休憩通知で集中力を最大化。直近の楽しみな予定も表示することで「今」を楽しみながらバランスよく理想の「未来」へ進んでいく。",
      highlights: [
        "理想の自分リストアップ機能",
        "年間目標リスト・進捗管理機能",
        "週間タスクリスト・進捗管理機能",
        "タスクタイマー・作業集中音楽機能",
        "休憩終了通知機能",
        "次回の楽しい予定リスト機能",
      ],
      overviewCardTitle: "アプリの概要",
    },
    membership: {
      label: "Membership",
      title: "料金体系(無料プランあり)",
      fallbackPrice: "390円",
      freeTitle: "無料プラン",
      freeDescription: "基本的な機能は使用可能です。",
      freePoints: [
        "一部データ保存数に制限あり",
        "音楽ダウンロードは月5曲まで",
        "サインアップ後にプラン変更可能",
      ],
      paidTitle: "有料プラン",
      paidDescription: "Pro Planは月額{{price}}です。",
      paidPoints: [
        "全機能を無制限で利用可能",
        "音楽ダウンロードは月30曲まで",
        "ダッシュボードから簡単にキャンセル可能",
      ],
    },
    getStarted: {
      label: "Get Started",
      title: "まずはサインアップから",
      description:
        "まずは無料プランからお試しください。以下からユーザ登録、ログインが可能です。",
      ctaPrimary: "無料で始める",
      ctaSecondary: "ログイン",
    },
  },
  en: {
    hero: {
      logo: "Ideal Gap",
      title: "First step to your ideal self",
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
        "Define your ideal self and map your path with annual goals. Break them into weekly tasks and just go forward. Track your effort with a countdown timer, stay focused with task music and break reminders. And also enjoy upcoming plans while moving steadily toward your ideal future.",
      highlights: [
        "Ideal Self Vision Board",
        "Annual Goal Planning & Tracking",
        "Weekly Task Planning & Tracking",
        "Task Timer with Focus Music",
        "Smart Break Reminders",
        "Upcoming Exciting Events",
      ],
      overviewCardTitle: "App Overview",
    },
    membership: {
      label: "Membership",
      title: "Pricing (Free Plan Available)",
      fallbackPrice: "3.99 CAD",
      freeTitle: "Free Plan",
      freeDescription: "Basic features are available.",
      freePoints: [
        "Some data limits apply",
        "Music downloads up to 5 per month",
        "Plan changes available after sign-up",
      ],
      paidTitle: "Paid Plan",
      paidDescription: "Pro Plan is {{price}} per month.",
      paidPoints: [
        "Unlimited access to all features",
        "Music downloads up to 30 per month",
        "Easy cancellation from the dashboard",
      ],
    },
    getStarted: {
      label: "Get Started",
      title: "Start with sign up",
      description: "Start with the free plan. You can sign up or log in below.",
      ctaPrimary: "Start free",
      ctaSecondary: "Log in",
    },
  },
  fr: {
    hero: {
      logo: "Ideal Gap",
      title: "Premier pas vers votre idéal",
      subtitle:
        "Définissez votre idéal et identifiez la bonne méthode. Il ne reste plus qu’à se concentrer et avancer.",
      ctaPrimary: "Essai gratuit",
      ctaSecondary: "Connexion",
      scrollHint: "Faites défiler",
    },
    overview: {
      label: "Qu’est-ce l'Ideal Gap",
      title: "Six piliers reliant l'idéal et le quotidien",
      description:
        "Définissez votre idéal et tracez votre voie avec des objectifs annuels. Divisez-les en tâches hebdomadaires et passez à l'action. Visualisez votre progression avec un compte à rebours, restez concentré avec de la musique adaptée à vos envies et des rappels de temps de pause. Motivez-vous avec vos plans sympas à venir tout en avançant petit à petit vers votre avenir idéal.",
      highlights: [
        "Tableau d'inspiration de votre moi idéal",
        "Liste et suivi des objectifs annuels",
        "Liste et suivi des tâches hebdomadaires",
        "Minuteur et musique de concentration",
        "Rappels de pause",
        "Vos plans sympas à venir",
      ],
      overviewCardTitle: "Présentation de l’app",
    },
    membership: {
      label: "Abonnement",
      title: "Tarification (forfait gratuit disponible)",
      fallbackPrice: "3.99 CAD",
      freeTitle: "Forfait gratuit",
      freeDescription: "Les fonctions de base sont disponibles.",
      freePoints: [
        "Certaines limites de données s'appliquent",
        "Musique : jusqu’à 5 téléchargements par mois",
        "Changement de formule après inscription",
      ],
      paidTitle: "Forfait payant",
      paidDescription: "Le Pro Plan coûte {{price}} par mois.",
      paidPoints: [
        "Toutes les fonctions sans limite",
        "Musique : jusqu’à 30 téléchargements par mois",
        "Annulation facile depuis le tableau de bord",
      ],
    },
    getStarted: {
      label: "Commencer",
      title: "Commencez l’inscription",
      description:
        "Commencez avec le forfait gratuit. Vous pouvez vous inscrire ou vous connecter ci-dessous.",
      ctaPrimary: "Essai gratuit",
      ctaSecondary: "Connexion",
    },
  },
};
