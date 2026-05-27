import { LanguageKey } from "../types/i18n";

type CardKey =
  | "idealSelf"
  | "annualGoals"
  | "weeklyGoals"
  | "taskTimer"
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
  taskTimerModal: {
    title: string;
    description: string;
    taskLabel: string;
    noTaskOption: string;
    noTasksMessage: string;
    loading: string;
    error: string;
    back: string;
    next: string;
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
      taskTimerModal: {
        title: "タスクタイマーを開始",
        description:
          "週間タスクに紐づけると完了時に作業時間が年間目標へ積み上がります。",
        taskLabel: "紐づける週間タスク",
        noTaskOption: "週間タスクを紐付けない",
        noTasksMessage:
          "週間タスクがまだ設定されていません。\nタスクタイマーは使用できますが作業時間は記録されません。",
        loading: "週間タスクを読み込み中...",
        error: "週間タスクの読み込みに失敗しました。",
        back: "戻る",
        next: "次へ",
      },
      cards: {
        idealSelf: {
          title: "理想の自分",
          subtitle:
            "自分の理想の姿を想像し言語化する。自分が夢を叶えた姿であり最終目的地点。",
        },
        annualGoals: {
          title: "年間目標",
          subtitle:
            "理想の自分に近づくために今年1年の目標を設定。目標達成に向けてバランスの良い努力を継続していく。",
        },
        weeklyGoals: {
          title: "週間タスク",
          subtitle:
            "目標を行動まで落とし込む。作業時間を積み上げていくことで努力の軌跡を記録する。",
        },
        taskTimer: {
          title: "タスクタイマー",
          subtitle:
            "計画を立てたら次は行動。タスクタイマーでモチベーションを保ちタスク音楽で集中力を高める。",
        },
        focusMusic: {
          title: "タスク集中音楽",
          subtitle:
            "お気に入りの作業用音楽をダウンロードしタスクタイマー計測中の集中力を最大限する。",
        },
        breakReminders: {
          title: "休憩通知",
          subtitle:
            "継続に大事なのはONとOFFの切り替え。休憩終了時間を設定しメリハリをつける。",
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
      taskTimerModal: {
        title: "Start Task Timer",
        description:
          "Link a weekly task to save this session toward your annual goal.",
        taskLabel: "Weekly task",
        noTaskOption: "No weekly task linked",
        noTasksMessage:
          "No weekly tasks are set yet.\nYou can still use the task timer, but work time will not be recorded.",
        loading: "Loading weekly tasks...",
        error: "Failed to load weekly tasks.",
        back: "Back",
        next: "Next",
      },
      cards: {
        idealSelf: {
          title: "Ideal Self",
          subtitle:
            "Visualize and define your ideal self. It is who you want to be and your final destination.",
        },
        annualGoals: {
          title: "Annual Goals",
          subtitle:
            "List resolutions of this year. Stay focused on them to move closer to your ideal self.",
        },
        weeklyGoals: {
          title: "Weekly Tasks",
          subtitle:
            "Break goals into actions, track time, and build progress toward your annual goals.",
        },
        taskTimer: {
          title: "Task Timer",
          subtitle:
            "Keep motivated with Task Timer and stay focused with Task Music.",
        },
        focusMusic: {
          title: "Focus Music",
          subtitle:
            "Download your favorite Focus Music and maximize your concentration during work sessions.",
        },
        breakReminders: {
          title: "Break Alarm",
          subtitle:
            "Consistency comes from balance. Schedule your break end time and then stay focused.",
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
      taskTimerModal: {
        title: "Lancer le minuteur",
        description:
          "Associez une tâche hebdomadaire pour enregistrer cette session dans votre objectif annuel.",
        taskLabel: "Tâche hebdomadaire",
        noTaskOption: "Aucune tâche hebdomadaire liée",
        noTasksMessage:
          "Aucune tâche hebdomadaire n'est définie.\nLe minuteur reste disponible, mais le temps ne sera pas enregistré.",
        loading: "Chargement des tâches hebdomadaires...",
        error: "Impossible de charger les tâches hebdomadaires.",
        back: "Retour",
        next: "Suivant",
      },
      cards: {
        idealSelf: {
          title: "Mon Moi Idéal",
          subtitle:
            "Visualisez et définissez la personne que vous voulez devenir, ainsi que votre destination finale.",
        },
        annualGoals: {
          title: "Objectif Annuel",
          subtitle:
            "Définissez les objectifs à poursuivre cette année pour vous rapprocher de votre moi idéal.",
        },
        weeklyGoals: {
          title: "Tâche Hebdomadaire",
          subtitle:
            "Suivez votre avancement avec le minuteur et progressez vers vos objectifs annuels.",
        },
        taskTimer: {
          title: "Minuteur De Tâche",
          subtitle:
            "Gardez votre motivation avec le minuteur de tâche et restez concentré avec la musique de travail.",
        },
        focusMusic: {
          title: "Musique De Concentration",
          subtitle:
            "Téléchargez votre musique favorite et optimisez votre concentration durant vos sessions d'études.",
        },
        breakReminders: {
          title: "Rappel De Pause",
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
