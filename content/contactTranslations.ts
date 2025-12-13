import { LanguageKey } from "../types/i18n";

export type ContactTranslations = {
  pageTitle: string;
  intro: string;
  demoNotice: string;
  fields: {
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    helper: string;
  };
  categories: {
    bug: string;
    request: string;
    feedback: string;
    other: string;
  };
  submit: {
    label: string;
    sending: string;
    successTitle: string;
    successBody: string;
    error: string;
  };
  validation: {
    name: string;
    email: string;
    category: string;
    message: string;
  };
};

export const contactTranslations: Record<LanguageKey, ContactTranslations> = {
  ja: {
    pageTitle: "お問い合わせ",
    intro: "不具合の報告や改善のリクエストをお送りください。ログイン前でもご利用いただけます。",
    demoNotice: "現在はデモ送信です。内容は記録されませんが、いただいた声を確認し製品改善に活かします。",
    fields: {
      nameLabel: "お名前",
      namePlaceholder: "お名前",
      emailLabel: "メールアドレス",
      emailPlaceholder: "you@example.com",
      categoryLabel: "カテゴリー",
      categoryPlaceholder: "カテゴリーを選択",
      messageLabel: "本文",
      messagePlaceholder: "できるだけ詳しくご記入ください",
      helper: "返信が必要な場合は正しいメールアドレスをご記入ください。",
    },
    categories: {
      bug: "バグ報告",
      request: "機能要望",
      feedback: "フィードバック",
      other: "その他",
    },
    submit: {
      label: "送信する",
      sending: "送信中...",
      successTitle: "送信が完了しました",
      successBody: "いただいた内容は順次確認させていただきます。",
      error: "送信に失敗しました。ネットワーク環境を確認して、もう一度お試しください。",
    },
    validation: {
      name: "お名前を入力してください",
      email: "有効なメールアドレスを入力してください",
      category: "カテゴリーを選択してください",
      message: "本文は6文字以上で入力してください",
    },
  },
  en: {
    pageTitle: "Contact us",
    intro: "Tell us about bugs, feature ideas, or general feedback. You can reach out even before signing in.",
    demoNotice: "Demo submission only for now. Messages are not stored, but we’ll review your notes for improvements.",
    fields: {
      nameLabel: "Name",
      namePlaceholder: "Your name",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      categoryLabel: "Category",
      categoryPlaceholder: "Select a category",
      messageLabel: "Message",
      messagePlaceholder: "Share as much detail as you can",
      helper: "Use an email we can reply to if you’d like a response.",
    },
    categories: {
      bug: "Bug",
      request: "Feature request",
      feedback: "Feedback",
      other: "Other",
    },
    submit: {
      label: "Send message",
      sending: "Sending...",
      successTitle: "Message sent",
      successBody: "We’ll review your submission shortly.",
      error: "Could not send your message. Please check your connection and try again.",
    },
    validation: {
      name: "Please enter your name",
      email: "Enter a valid email address",
      category: "Choose a category",
      message: "Message must be at least 6 characters",
    },
  },
  fr: {
    pageTitle: "Contact",
    intro: "Signalez un bug, demandez une fonctionnalité ou partagez votre avis. Accessible même sans connexion.",
    demoNotice: "Formulaire de démonstration pour le moment. Les messages ne sont pas enregistrés, mais nous les examinons.",
    fields: {
      nameLabel: "Nom",
      namePlaceholder: "Votre nom",
      emailLabel: "E-mail",
      emailPlaceholder: "vous@example.com",
      categoryLabel: "Catégorie",
      categoryPlaceholder: "Choisir une catégorie",
      messageLabel: "Message",
      messagePlaceholder: "Donnez le plus de détails possible",
      helper: "Indiquez un e-mail valide si vous souhaitez une réponse.",
    },
    categories: {
      bug: "Bug",
      request: "Demande de fonctionnalité",
      feedback: "Retour général",
      other: "Autre",
    },
    submit: {
      label: "Envoyer",
      sending: "Envoi...",
      successTitle: "Message envoyé",
      successBody: "Nous examinerons votre demande prochainement.",
      error: "Impossible d’envoyer votre message. Vérifiez votre connexion et réessayez.",
    },
    validation: {
      name: "Veuillez saisir votre nom",
      email: "Entrez une adresse e-mail valide",
      category: "Choisissez une catégorie",
      message: "Le message doit contenir au moins 6 caractères",
    },
  },
};
