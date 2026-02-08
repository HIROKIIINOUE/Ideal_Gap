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

export const dashboardTranslations: Record<LanguageKey, DashboardTranslations> =
  {
    ja: {
      pageTitle: "ダッシュボード",
      pageSubtitle:
        "理想への進捗をひと目で確認し、今日のフォーカスを決めましょう。",
      nextFunPlan: {
        title: "次回の楽しい予定",
        subtitle: "",
        cta: "予定を追加",
        emptyLabel: "まだ予定がありません。",
      },
      cards: {
        idealSelf: {
          title: "理想の自分",
          subtitle:
            "自分の理想の姿を想像し、言語化する。自分の長期目標にして最終目的地点。",
        },
        annualGoals: {
          title: "年間目標",
          subtitle:
            "理想の自分を軸に今年1年の目標をリストアップする。自分の理想に向けての中期目標。",
        },
        monthlyGoals: {
          title: "月間目標",
          subtitle:
            "年間目標へ向かう道標を明確にする。年間目標達成に向けての短期目標。",
        },
        weeklyGoals: {
          title: "週間タスク",
          subtitle:
            "目標を行動まで落とし込み、作業タイマーで作業時間を計測、紐づく月間目標/年間目標へ積上げる。",
        },
        focusMusic: {
          title: "タスク集中音楽",
          subtitle:
            "お気に入りの作業用音楽をダウンロードし、作業タイマー計測中の集中力を最大限へ。",
        },
        breakReminders: {
          title: "休憩通知",
          subtitle:
            "継続に大事なのはONとOFFの切り替え。休憩時間を設定しメリハリをつける。",
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
      pageSubtitle:
        "See your progress toward the ideal at a glance and choose today's focus.",
      nextFunPlan: {
        title: "Next Fun Plan",
        subtitle: "",
        cta: "Add a plan",
        emptyLabel: "No plan is set yet.",
      },
      cards: {
        idealSelf: {
          title: "Ideal Self",
          subtitle:
            "Imagine your ideal self and put it into words. Your long-term goal and final destination.",
        },
        annualGoals: {
          title: "Annual Goals",
          subtitle:
            "List this year's goals based on your ideal self. The mid-term goals toward that ideal.",
        },
        monthlyGoals: {
          title: "Monthly Goals",
          subtitle:
            "Clarify the signposts toward annual goals. Short-term goals to achieve the year.",
        },
        weeklyGoals: {
          title: "Weekly Tasks",
          subtitle:
            "Break goals into actions, track time with the task timer, and stack progress toward monthly and annual goals.",
        },
        focusMusic: {
          title: "Focus Music",
          subtitle:
            "Download your favorite work music and maximize focus while the task timer runs.",
        },
        breakReminders: {
          title: "Break Alarm",
          subtitle:
            "What sustains you is switching ON and OFF. Set break time and keep balance.",
        },
        nextFunPlan: {
          title: "Next Fun Plan",
          subtitle:
            "Make the next fun visible and use it as fuel to keep going.",
        },
      },
      details: {
        heading: "{{title}}",
        body: "This screen will be added soon. For now, check the dashboard overview.",
        back: "Back to dashboard",
      },
    },
    fr: {
      pageTitle: "Tableau de bord",
      pageSubtitle:
        "Voyez d’un coup d’œil vos progrès vers l’idéal et choisissez le focus du jour.",
      nextFunPlan: {
        title: "Prochain moment plaisir",
        subtitle: "",
        cta: "Ajouter un moment",
        emptyLabel: "Aucun moment prévu pour l’instant.",
      },
      cards: {
        idealSelf: {
          title: "Moi idéal",
          subtitle:
            "Imaginez votre moi idéal et mettez-le en mots. Votre objectif long terme et destination finale.",
        },
        annualGoals: {
          title: "Objectifs annuels",
          subtitle:
            "Listez les objectifs de l’année à partir du moi idéal. Des objectifs à moyen terme vers cet idéal.",
        },
        monthlyGoals: {
          title: "Objectifs mensuels",
          subtitle:
            "Clarifiez les repères vers les objectifs annuels. Des objectifs à court terme pour réussir l’année.",
        },
        weeklyGoals: {
          title: "Tâche hebdomadaire",
          subtitle:
            "Mesurez le temps avec le minuteur, et cumulez vers le mensuel/annuel.",
        },
        focusMusic: {
          title: "Musique de focus",
          subtitle:
            "Téléchargez votre musique de travail favorite et maximisez la concentration pendant le minuteur.",
        },
        breakReminders: {
          title: "Rappels de pause",
          subtitle:
            "Pour durer, alternez ON et OFF. Définissez des pauses et gardez le rythme.",
        },
        nextFunPlan: {
          title: "Prochain moment plaisir",
          subtitle:
            "Rendez le prochain plaisir visible et utilisez-le comme carburant.",
        },
      },
      details: {
        heading: "{{title}}",
        body: "Cette page sera ajoutée bientôt. Pour l’instant, consultez l’aperçu du tableau de bord.",
        back: "Retour au tableau de bord",
      },
    },
  };
