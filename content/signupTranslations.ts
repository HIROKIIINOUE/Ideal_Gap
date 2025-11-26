import { LanguageKey } from "../types/i18n";

export type SignupTranslations = {
  pageLabel: string;
  backToHome: string;
  heroTitle: string;
  heroBody: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  paymentLabel: string;
  paymentPlaceholder: string;
  primaryCta: string;
  noteText: string;
  planHeading: string;
  planBody: string;
  planCaption: string;
  existingAccountHeading: string;
  goToLogin: string;
};

export const signupTranslations: Record<LanguageKey, SignupTranslations> = {
  ja: {
    pageLabel: "Sign Up",
    backToHome: "ホームへ戻る",
    heroTitle: "無料で始める",
    heroBody: "初月無料・次月以降 8.5 CAD/月 (30日)。登録日から自動更新。再サインアップ時は無料プランが適用されません。",
    usernameLabel: "ユーザ名",
    usernamePlaceholder: "Your name",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    passwordLabel: "パスワード",
    passwordPlaceholder: "8文字以上",
    paymentLabel: "支払い方法",
    paymentPlaceholder: "決済連携は後続ステップで設定",
    primaryCta: "サインアップを続ける",
    noteText: "使用中の言語設定とタイムゾーンをサインアップ完了時に自動検出します（手動変更も対応予定）。",
    planHeading: "プランとステータス",
    planBody:
      "支払いステータスは「有効 / 支払い失敗 / キャンセル予約」で表示。初回無料は一度のみ適用され、解約後の再登録は有料プランから開始します。",
    planCaption: "実際の課金処理とステータス更新は今後の実装で追加予定。",
    existingAccountHeading: "すでにアカウントをお持ちですか？",
    goToLogin: "ログインへ",
  },
  en: {
    pageLabel: "Sign Up",
    backToHome: "Back to Home",
    heroTitle: "Start free",
    heroBody:
      "First month free, then 8.5 CAD/month (every 30 days). Auto-renews from your sign-up date. Re-signups start on the paid plan.",
    usernameLabel: "Username",
    usernamePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "8+ characters",
    paymentLabel: "Payment method",
    paymentPlaceholder: "Set up payment in a later step",
    primaryCta: "Continue to sign up",
    noteText: "We detect your current language and time zone when you finish sign-up (manual edits planned).",
    planHeading: "Plan and status",
    planBody:
      "Billing status shows active / payment failed / cancel scheduled. The free month applies once; reactivation starts on the paid tier.",
    planCaption: "Actual billing and status updates will be added in a later implementation.",
    existingAccountHeading: "Already have an account?",
    goToLogin: "Go to Log In",
  },
  fr: {
    pageLabel: "Inscription",
    backToHome: "Retour à l’accueil",
    heroTitle: "Commencer gratuitement",
    heroBody:
      "Premier mois gratuit, puis 8.5 CAD/mois (tous les 30 jours). Renouvellement automatique à partir de la date d’inscription. Une réinscription démarre sur l’offre payante.",
    usernameLabel: "Nom d’utilisateur",
    usernamePlaceholder: "Votre nom",
    emailLabel: "E-mail",
    emailPlaceholder: "vous@example.com",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "8 caractères ou plus",
    paymentLabel: "Moyen de paiement",
    paymentPlaceholder: "Configurer le paiement dans une étape ultérieure",
    primaryCta: "Continuer l’inscription",
    noteText:
      "Nous détectons la langue et le fuseau horaire utilisés lorsque vous terminez l’inscription (modification manuelle prévue).",
    planHeading: "Forfait et statut",
    planBody:
      "Le statut de facturation affiche actif / paiement échoué / annulation planifiée. Le mois gratuit s’applique une seule fois ; une réactivation démarre sur l’offre payante.",
    planCaption: "La facturation réelle et la mise à jour des statuts seront ajoutées plus tard.",
    existingAccountHeading: "Vous avez déjà un compte ?",
    goToLogin: "Aller à la connexion",
  },
};
