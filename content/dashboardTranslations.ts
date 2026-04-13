import { LanguageKey } from "../types/i18n";

type CardKey =
  | "idealSelf"
  | "longTermGoals"
  | "annualGoals"
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
  notifications: {
    emailUpdated: string;
  };
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
      notifications: {
        emailUpdated: "メールアドレス変更が完了しました",
      },
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
            "自分の理想の姿を想像し、言語化する。自分が夢を叶えた姿であり、最終目的地点。",
        },
        longTermGoals: {
          title: "長期目標",
          subtitle:
            "理想の自分への道標を設定する。理想の自分へ正しく近づくための長期目標。",
        },
        annualGoals: {
          title: "年間目標",
          subtitle:
            "長期目標達成に向けて今年1年の目標をリストアップする。自分の理想に向けての中期目標。",
        },
        weeklyGoals: {
          title: "週間タスク",
          subtitle:
            "目標を行動まで落とし込み、作業タイマーで作業時間を計測。紐づく年間目標へ積み上げる。",
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
      notifications: {
        emailUpdated: "Your email address has been updated.",
      },
      nextFunPlan: {
        title: "Next Exciting Plans",
        subtitle: "",
        cta: "Add a plan",
        emptyLabel: "No plan is set yet.",
      },
      cards: {
        idealSelf: {
          title: "Ideal Self",
          subtitle:
            "Visualize and define your ideal self. Your final destination.",
        },
        longTermGoals: {
          title: "Life Goals",
          subtitle:
            "Set long-term goals as milestones between your ideal self and your annual goals.",
        },
        annualGoals: {
          title: "Annual Goals",
          subtitle:
            "List this year's goals based on your long-term goals. Your mid-term goal toward the ideal.",
        },
        weeklyGoals: {
          title: "Weekly Tasks",
          subtitle:
            "Break goals into actions, track time, and build progress toward your annual goals.",
        },
        focusMusic: {
          title: "Focus Music",
          subtitle:
            "Download your favorite Focus Music and maximize your concentration during work sessions.",
        },
        breakReminders: {
          title: "Break Alarm",
          subtitle: "Growth requires a good balance. Schedule breaks and reset",
        },
        nextFunPlan: {
          title: "Next Exciting Plans",
          subtitle:
            "Make the next exciting plans visible and use it as fuel to keep going.",
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
      notifications: {
        emailUpdated: "Votre adresse e-mail a bien été modifiée.",
      },
      nextFunPlan: {
        title: "Prochain plan sympa",
        subtitle: "",
        cta: "Ajouter un évènement",
        emptyLabel: "Aucun évènement prévu pour l’instant.",
      },
      cards: {
        idealSelf: {
          title: "Mon moi idéal",
          subtitle:
            "Visualisez et définissez la personne que vous voulez devenir, ainsi que vos objectifs à long terme et votre but final.",
        },
        longTermGoals: {
          title: "Objectifs de vie",
          subtitle:
            "Fixer des objectifs à long terme comme étapes clés entre votre moi idéal et vos objectifs annuels.",
        },
        annualGoals: {
          title: "Objectif annuel",
          subtitle:
            "Fixez vos objectifs annuels sur base des objectifs à long terme, et ceux-ci vers cet idéal.",
        },
        weeklyGoals: {
          title: "Tâche hebdomadaire",
          subtitle:
            "Suivez votre avancement avec le minuteur et progressez vers vos objectifs annuels.",
        },
        focusMusic: {
          title: "Musique de concentration",
          subtitle:
            "Téléchargez votre musique favorite et optimisez votre concentration durant vos sessions d'études.",
        },
        breakReminders: {
          title: "Rappel de pause",
          subtitle:
            "La croissance exige de l'équilibre : planifiez des pauses et prenez le temps de vous reconnecter.",
        },
        nextFunPlan: {
          title: "Prochain plan sympa",
          subtitle:
            "Rendez le prochain évènement visible et utilisez-le comme carburant.",
        },
      },
      details: {
        heading: "{{title}}",
        body: "Cette page sera ajoutée bientôt. Pour l’instant, consultez l’aperçu du tableau de bord.",
        back: "Retour au tableau de bord",
      },
    },
  };
