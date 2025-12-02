import { LanguageKey } from "../types/i18n";

export type SignupTranslations = {
  pageLabel: string;
  backToHome: string;
  heroTitle: string;
  heroBody: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  usernameInvalid: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailInvalid: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordInvalid: string;
  paymentLabel: string;
  paymentPlaceholder: string;
  paymentStatusUnset: string;
  paymentStatusSet: string;
  paymentToggleSet: string;
  paymentToggleUnset: string;
  paymentHelper: string;
  primaryCta: string;
  primaryCtaLoading: string;
  noteText: string;
  existingAccountHeading: string;
  goToLogin: string;
  emailExistsError: string;
  unknownError: string;
  verificationTitle: string;
  verificationBody: string;
};

export const signupTranslations: Record<LanguageKey, SignupTranslations> = {
  ja: {
    pageLabel: "Sign Up",
    backToHome: "ホームへ戻る",
    heroTitle: "無料で始める",
    heroBody:
      "初月無料・次月以降 8.5 CAD/月 (30日)。登録日から自動更新。再サインアップ時は無料プランが適用されません。",
    usernameLabel: "ユーザ名",
    usernamePlaceholder: "Your name",
    usernameInvalid: "ユーザ名を入力してください",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    emailInvalid: "メールアドレスの形式が正しくありません",
    passwordLabel: "パスワード",
    passwordPlaceholder: "6文字以上",
    passwordInvalid: "パスワードは6文字以上で入力してください",
    paymentLabel: "支払い方法",
    paymentPlaceholder: "決済連携は後続ステップで設定",
    paymentStatusUnset: "未設定",
    paymentStatusSet: "設定済み",
    paymentToggleSet: "支払い方法を設定済みにする",
    paymentToggleUnset: "未設定に戻す",
    paymentHelper:
      "今は簡易的にトグルで設定状態を切り替えています（本実装時に決済連携を追加）。",
    primaryCta: "サインアップを続ける",
    primaryCtaLoading: "送信中...",
    noteText:
      "使用中の言語設定とタイムゾーンをサインアップ完了時に自動検出します（手動変更も対応予定）。",
    existingAccountHeading: "すでにアカウントをお持ちですか？",
    goToLogin: "ログインへ",
    emailExistsError:
      "このメールアドレスは既に登録されています。ログインしてください。",
    unknownError:
      "サインアップに失敗しました。時間をおいて再度お試しください。",
    verificationTitle: "メールを確認してください",
    verificationBody:
      "確認メールを{{email}}に送信しました。リンクを開いてサインアップを完了してください。",
  },
  en: {
    pageLabel: "Sign Up",
    backToHome: "Back to Home",
    heroTitle: "Start free",
    heroBody:
      "First month free, then 8.5 CAD/month (every 30 days). Auto-renews from your sign-up date. Re-signups start on the paid plan.",
    usernameLabel: "Username",
    usernamePlaceholder: "Your name",
    usernameInvalid: "Please enter your username",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    emailInvalid: "Invalid email format",
    passwordLabel: "Password",
    passwordPlaceholder: "6+ characters",
    passwordInvalid: "Password must be at least 6 characters",
    paymentLabel: "Payment method",
    paymentPlaceholder: "Set up payment in a later step",
    paymentStatusUnset: "Not set",
    paymentStatusSet: "Set",
    paymentToggleSet: "Mark payment method as set",
    paymentToggleUnset: "Mark as not set",
    paymentHelper:
      "For now, toggle the state here; real payment linking will be added later.",
    primaryCta: "Continue to sign up",
    primaryCtaLoading: "Sending...",
    noteText:
      "We detect your current language and time zone when you finish sign-up (manual edits planned).",
    existingAccountHeading: "Already have an account?",
    goToLogin: "Go to Log In",
    emailExistsError:
      "An account with this email already exists. Please log in instead.",
    unknownError: "Sign up failed. Please try again.",
    verificationTitle: "Check your inbox",
    verificationBody:
      "We sent a verification link to {{email}}. Confirm to finish sign-up.",
  },
  fr: {
    pageLabel: "Inscription",
    backToHome: "Retour à l’accueil",
    heroTitle: "Commencer gratuitement",
    heroBody:
      "Premier mois gratuit, puis 8.5 CAD/mois (tous les 30 jours). Renouvellement automatique à partir de la date d’inscription. Une réinscription démarre sur l’offre payante.",
    usernameLabel: "Nom d’utilisateur",
    usernamePlaceholder: "Votre nom",
    usernameInvalid: "Veuillez renseigner votre nom d’utilisateur",
    emailLabel: "E-mail",
    emailPlaceholder: "vous@example.com",
    emailInvalid: "Format d’e-mail invalide",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "6 caractères ou plus",
    passwordInvalid: "Le mot de passe doit comporter au moins 6 caractères",
    paymentLabel: "Moyen de paiement",
    paymentPlaceholder: "Configurer le paiement dans une étape ultérieure",
    paymentStatusUnset: "Non défini",
    paymentStatusSet: "Défini",
    paymentToggleSet: "Marquer le moyen de paiement comme défini",
    paymentToggleUnset: "Marquer comme non défini",
    paymentHelper:
      "Pour l’instant, basculez l’état ici ; le lien de paiement réel sera ajouté plus tard.",
    primaryCta: "Continuer l’inscription",
    primaryCtaLoading: "Envoi...",
    noteText:
      "Nous détectons la langue et le fuseau horaire utilisés lorsque vous terminez l’inscription (modification manuelle prévue).",
    existingAccountHeading: "Vous avez déjà un compte ?",
    goToLogin: "Aller à la connexion",
    emailExistsError:
      "Un compte avec cet e-mail existe déjà. Veuillez vous connecter.",
    unknownError: "Échec de l'inscription. Veuillez réessayer.",
    verificationTitle: "Vérifiez votre boîte mail",
    verificationBody:
      "Nous avons envoyé un lien de vérification à {{email}}. Confirmez pour terminer l'inscription.",
  },
};
