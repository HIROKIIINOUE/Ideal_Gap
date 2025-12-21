import { LanguageKey } from "../types/i18n";

type CardKey =
  | "idealSelf"
  | "annualGoals"
  | "monthlyGoals"
  | "weeklyGoals"
  | "focusMusic"
  | "breakReminders"
  | "nextFunPlan";

type CardCopy = {
  title: string;
  subtitle: string;
};

export type DashboardTranslations = {
  pageTitle: string;
  pageSubtitle: string;
  nextFunPlan: {
    title: string;
    subtitle: string;
    cta: string;
    emptyLabel: string;
  };
  cards: Record<CardKey, CardCopy>;
  details: {
    heading: string;
    body: string;
    back: string;
  };
};

export const dashboardTranslations: Record<LanguageKey, DashboardTranslations> = {
  ja: {
    pageTitle: "ダッシュボード",
    pageSubtitle: "理想への進捗をひと目で確認し、今日のフォーカスを決めましょう。",
    nextFunPlan: {
      title: "次回の楽しい予定",
      subtitle: "モチベーションの源を手帳より先にここで思い出せるように。",
      cta: "予定を追加",
      emptyLabel: "まだ予定がありません。",
    },
    cards: {
      idealSelf: {
        title: "理想の自分",
        subtitle: "なりたい姿を言語化し、軸をぶらさない。",
      },
      annualGoals: {
        title: "年間目標",
        subtitle: "一年の大枠を定め、優先順位を整理する。",
      },
      monthlyGoals: {
        title: "月間目標",
        subtitle: "今月の到達点を決め、負荷を最適化。",
      },
      weeklyGoals: {
        title: "週間タスク",
        subtitle: "週単位のタスクで、目標を行動まで落とし込む。",
      },
      focusMusic: {
        title: "タスク集中音楽",
        subtitle: "集中を途切れさせないための音を選ぶ。",
      },
      breakReminders: {
        title: "休憩通知",
        subtitle: "リズムを崩さず回復するためのリマインダー。",
      },
      nextFunPlan: {
        title: "次回の楽しい予定",
        subtitle: "次の楽しみを可視化して、継続の燃料に。",
      },
    },
    details: {
      heading: "{{title}}",
      body: "この画面は近日追加予定です。今はダッシュボードから概要をご確認ください。",
      back: "ダッシュボードへ戻る",
    },
  },
  en: {
    pageTitle: "Dashboard",
    pageSubtitle: "See your path at a glance and decide what to focus on today.",
    nextFunPlan: {
      title: "Next Fun Plan",
      subtitle: "Keep your motivation visible before you open your calendar.",
      cta: "Add a plan",
      emptyLabel: "No plan is set yet.",
    },
    cards: {
      idealSelf: {
        title: "Ideal Self",
        subtitle: "Name who you want to be and stay aligned.",
      },
      annualGoals: {
        title: "Annual Goals",
        subtitle: "Set the yearly frame and priorities.",
      },
      monthlyGoals: {
        title: "Monthly Goals",
        subtitle: "Define this month’s targets and load.",
      },
      weeklyGoals: {
        title: "Weekly Tasks",
        subtitle: "Turn goals into focused weekly tasks.",
      },
      focusMusic: {
        title: "Focus Music",
        subtitle: "Pick sounds that keep you in flow.",
      },
      breakReminders: {
        title: "Break Reminders",
        subtitle: "Recover on rhythm with gentle nudges.",
      },
      nextFunPlan: {
        title: "Next Fun Plan",
        subtitle: "Make the next enjoyment visible as fuel.",
      },
    },
    details: {
      heading: "{{title}}",
      body: "This screen is coming soon. For now, use the dashboard overview.",
      back: "Back to dashboard",
    },
  },
  fr: {
    pageTitle: "Tableau de bord",
    pageSubtitle: "Visualisez votre trajectoire et choisissez votre focus du jour.",
    nextFunPlan: {
      title: "Prochain moment plaisir",
      subtitle: "Gardez la motivation en vue avant d’ouvrir votre agenda.",
      cta: "Ajouter un moment",
      emptyLabel: "Aucun moment prévu pour l’instant.",
    },
    cards: {
      idealSelf: {
        title: "Moi idéal",
        subtitle: "Définir qui vous voulez devenir et rester aligné.",
      },
      annualGoals: {
        title: "Objectifs annuels",
        subtitle: "Poser le cadre de l’année et les priorités.",
      },
      monthlyGoals: {
        title: "Objectifs mensuels",
        subtitle: "Fixer les cibles du mois et la charge.",
      },
      weeklyGoals: {
        title: "Tâches hebdomadaires",
        subtitle: "Transformer les objectifs en tâches de la semaine.",
      },
      focusMusic: {
        title: "Musique de focus",
        subtitle: "Choisir des sons pour rester dans le flux.",
      },
      breakReminders: {
        title: "Rappels de pause",
        subtitle: "Préserver le rythme avec des rappels doux.",
      },
      nextFunPlan: {
        title: "Prochain moment plaisir",
        subtitle: "Rendre visible le prochain plaisir comme carburant.",
      },
    },
    details: {
      heading: "{{title}}",
      body: "Cette page arrive bientôt. Utilisez pour l’instant la vue du tableau de bord.",
      back: "Retour au tableau de bord",
    },
  },
};
