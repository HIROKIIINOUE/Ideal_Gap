import { LanguageKey } from "../types/i18n";

export type LoginTranslations = {
  pageLabel: string;
  backToHome: string;
  welcomeTitle: string;
  welcomeBody: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  loginCta: string;
  forgotPassword: string;
  firstTimeHeading: string;
  firstTimeBody: string;
  signupCta: string;
};

export const loginTranslations: Record<LanguageKey, LoginTranslations> = {
  ja: {
    pageLabel: "Log In",
    backToHome: "ホームへ戻る",
    welcomeTitle: "おかえりなさい",
    welcomeBody: "メールアドレスとパスワードでログイン。初月無料の適用は初回サインアップのみです。",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    passwordLabel: "パスワード",
    passwordPlaceholder: "Password",
    loginCta: "ログイン",
    forgotPassword: "パスワードをお忘れの方（後で実装）",
    firstTimeHeading: "はじめての方はこちら",
    firstTimeBody: "無料体験後は 8.5 CAD/月 (30日) で自動更新。キャンセルはいつでも設定可能。",
    signupCta: "サインアップへ",
  },
  en: {
    pageLabel: "Log In",
    backToHome: "Back to Home",
    welcomeTitle: "Welcome back",
    welcomeBody: "Log in with your email and password. The free first month applies only to the first signup.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Password",
    loginCta: "Log In",
    forgotPassword: "Forgot password? (coming soon)",
    firstTimeHeading: "New here?",
    firstTimeBody: "After your free trial, it renews at 8.5 CAD/month every 30 days. You can cancel anytime.",
    signupCta: "Go to Sign Up",
  },
  fr: {
    pageLabel: "Connexion",
    backToHome: "Retour à l’accueil",
    welcomeTitle: "Content de vous revoir",
    welcomeBody:
      "Connectez-vous avec votre e-mail et mot de passe. Le premier mois gratuit s’applique uniquement à la première inscription.",
    emailLabel: "E-mail",
    emailPlaceholder: "vous@example.com",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "Mot de passe",
    loginCta: "Se connecter",
    forgotPassword: "Mot de passe oublié ? (à venir)",
    firstTimeHeading: "Première visite ?",
    firstTimeBody:
      "Après l’essai gratuit, le renouvellement est de 8.5 CAD/mois tous les 30 jours. Vous pouvez annuler à tout moment.",
    signupCta: "Aller à l’inscription",
  },
};
