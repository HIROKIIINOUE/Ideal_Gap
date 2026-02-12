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
  errorUserNotFound: string;
  errorWrongPassword: string;
  errorLocked: string;
  lockoutRemaining: string;
  loginSuccess: string;
  loggingIn: string;
};

export const loginTranslations: Record<LanguageKey, LoginTranslations> = {
  ja: {
    pageLabel: "ログイン",
    backToHome: "ホームへ戻る",
    welcomeTitle: "おかえりなさい",
    welcomeBody: "メールアドレスとパスワードでログイン。",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    passwordLabel: "パスワード",
    passwordPlaceholder: "Password",
    loginCta: "ログイン",
    forgotPassword: "パスワードをお忘れの方はこちら",
    firstTimeHeading: "はじめての方はこちら",
    firstTimeBody:
      "40日間の無料体験後は 490円/月 (30日) で自動更新。キャンセルはいつでも可能。",
    signupCta: "無料でサインアップへ",
    errorUserNotFound: "アカウントが見つかりません。サインアップしてください。",
    errorWrongPassword: "パスワードが間違っています。再入力してください。",
    errorLocked: "一定数ログインに失敗したので５分間ログインできません",
    lockoutRemaining: "再試行まであと{{minutes}}分{{seconds}}秒",
    loginSuccess: "ログインに成功しました。",
    loggingIn: "ログイン中…",
  },
  en: {
    pageLabel: "Login",
    backToHome: "Back to Home",
    welcomeTitle: "Welcome back",
    welcomeBody: "Log in with your email and password.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Password",
    loginCta: "Log In",
    forgotPassword: "Forgot password?",
    firstTimeHeading: "New here?",
    firstTimeBody:
      "After your 40 days free trial, it renews at 4.5 CAD every 30 days. You can cancel anytime.",
    signupCta: "Go to Sign Up For Free",
    errorUserNotFound: "No account found. Please sign up.",
    errorWrongPassword: "Incorrect password. Please try again.",
    errorLocked: "Too many failed attempts. Please try again in 5 minutes.",
    lockoutRemaining: "Try again in {{minutes}}m {{seconds}}s.",
    loginSuccess: "Logged in successfully",
    loggingIn: "Logging in…",
  },
  fr: {
    pageLabel: "Connexion",
    backToHome: "Retour à l’accueil",
    welcomeTitle: "Content de vous revoir",
    welcomeBody: "Connectez-vous avec votre e-mail et mot de passe.",
    emailLabel: "E-mail",
    emailPlaceholder: "vous@example.com",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "Mot de passe",
    loginCta: "Log in",
    forgotPassword: "Mot de passe oublié ?",
    firstTimeHeading: "Première visite ?",
    firstTimeBody:
      "Après 40 jours l’essai gratuit, le renouvellement est de 4.5 CAD tous les 30 jours. Vous pouvez annuler à tout moment.",
    signupCta: "Aller à l’inscription gratuit",
    errorUserNotFound: "Aucun compte trouvé. Veuillez vous inscrire.",
    errorWrongPassword: "Mot de passe incorrect. Veuillez réessayer.",
    errorLocked:
      "Trop de tentatives échouées. Veuillez réessayer dans 5 minutes.",
    lockoutRemaining: "Réessayez dans {{minutes}} min {{seconds}} s.",
    loginSuccess: "Connexion réussie",
    loggingIn: "Connexion…",
  },
};
