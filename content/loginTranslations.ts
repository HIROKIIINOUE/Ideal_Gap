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
  showPassword: string;
  hidePassword: string;
  continueWithGoogle: string;
  continueWithApple: string;
  oauthLoading: string;
  oauthError: string;
  loginCta: string;
  forgotPassword: string;
  firstTimeHeading: string;
  firstTimeBody: string;
  signupCta: string;
  errorUserNotFound: string;
  errorWrongPassword: string;
  errorEmailUnconfirmed: string;
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
    showPassword: "パスワードを表示",
    hidePassword: "パスワードを非表示",
    continueWithGoogle: "Googleで続ける",
    continueWithApple: "Appleで続ける",
    oauthLoading: "認証中...",
    oauthError:
      "Apple/Google認証に失敗しました。時間をおいて再度お試しください。",
    loginCta: "ログイン",
    forgotPassword: "パスワードをお忘れの方はこちら",
    firstTimeHeading: "はじめての方はこちら",
    firstTimeBody:
      "14日間の無料体験後は 390円/月で自動更新。キャンセルはいつでも可能。",
    signupCta: "無料でサインアップへ",
    errorUserNotFound: "アカウントが見つかりません。サインアップしてください。",
    errorWrongPassword: "パスワードが間違っています。再入力してください。",
    errorEmailUnconfirmed:
      "本人確認がまだ完了しておりません。メールを再送しましたので、メール内リンクから本人確認を完了してください。",
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
    showPassword: "Show password",
    hidePassword: "Hide password",
    continueWithGoogle: "Continue with Google",
    continueWithApple: "Continue with Apple",
    oauthLoading: "Signing in...",
    oauthError: "Apple/Google sign-in failed. Please try again.",
    loginCta: "Log In",
    forgotPassword: "Forgot password?",
    firstTimeHeading: "New here?",
    firstTimeBody:
      "After your 14 days free trial, it renews at 3.99 CAD every month. You can cancel anytime.",
    signupCta: "Go to Sign Up For Free",
    errorUserNotFound: "No account found. Please sign up.",
    errorWrongPassword: "Incorrect password. Please try again.",
    errorEmailUnconfirmed:
      "Your email is not verified yet. We resent the verification email. Please complete verification from the link in your inbox.",
    errorLocked: "Too many failed attempts. Please try again in 5 minutes.",
    lockoutRemaining: "Try again in {{minutes}}m {{seconds}}s.",
    loginSuccess: "Logged in successfully",
    loggingIn: "Logging in…",
  },
  fr: {
    pageLabel: "Connexion",
    backToHome: "Retour à l’accueil",
    welcomeTitle: "Content de vous revoir",
    welcomeBody:
      "Connectez-vous avec votre adresse e-mail et votre mot de passe.",
    emailLabel: "E-mail",
    emailPlaceholder: "vous@exemple.com",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "Mot de passe",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    continueWithGoogle: "Continuer avec Google",
    continueWithApple: "Continuer avec Apple",
    oauthLoading: "Connexion...",
    oauthError:
      "La connexion avec Apple/Google a échoué. Veuillez réessayer.",
    loginCta: "Se connecter",
    forgotPassword: "Mot de passe oublié ?",
    firstTimeHeading: "Première visite ?",
    firstTimeBody:
      "Après vos 14 jours d’essai gratuit, le facturation de 3.99 CAD s'effectuera tous les mois. Vous pouvez annuler à tout moment.",
    signupCta: "Aller à l’inscription gratuite",
    errorUserNotFound: "Aucun compte trouvé. Veuillez vous inscrire.",
    errorWrongPassword: "Mot de passe incorrect. Veuillez réessayer.",
    errorEmailUnconfirmed:
      "Votre adresse e-mail n’est pas encore vérifiée. Nous avons renvoyé l’e-mail de vérification. Veuillez terminer la vérification depuis le lien reçu.",
    errorLocked:
      "Trop de tentatives échouées. Veuillez réessayer dans 5 minutes.",
    lockoutRemaining: "Réessayez dans {{minutes}} min {{seconds}} s.",
    loginSuccess: "Connexion réussie",
    loggingIn: "Connexion…",
  },
};
