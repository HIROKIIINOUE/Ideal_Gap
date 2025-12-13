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
    feature: string;
    feedback: string;
    other: string;
  };
  submit: {
    label: string;
    submitting: string;
    successTitle: string;
    successBody: string;
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
      feature: "機能要望",
      feedback: "フィードバック",
      other: "その他",
    },
    submit: {
      label: "送信する",
      submitting: "送信中...",
      successTitle: "送信を受け付けました",
      successBody: "デモ送信のため実際には記録されませんが、いただいた内容を確認します。",
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
      feature: "Feature request",
      feedback: "Feedback",
      other: "Other",
    },
    submit: {
      label: "Send message",
      submitting: "Sending...",
      successTitle: "Thanks for your message",
      successBody: "This is a demo submission. We’ll review your feedback shortly.",
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
      feature: "Demande de fonctionnalité",
      feedback: "Retour général",
      other: "Autre",
    },
    submit: {
      label: "Envoyer",
      submitting: "Envoi...",
      successTitle: "Merci pour votre message",
      successBody: "Ceci est un envoi de démonstration. Nous examinerons votre retour prochainement.",
    },
  },
};
