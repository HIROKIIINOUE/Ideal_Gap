import { LanguageKey } from "../types/i18n";

export type SignupTranslations = {
  pageLabel: string;
  backToHome: string;
  heroTitle: string;
  heroBody: string;
  planTitle: string;
  planDescription: string;
  planPriceWithTrial: string;
  planPriceNoTrial: string;
  planUnavailable: string;
  trialLabelDay: string;
  trialLabelWeek: string;
  trialLabelMonth: string;
  trialLabelYear: string;
  planLoadError: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  usernameInvalid: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailInvalid: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordInvalid: string;
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
      "プラン: {{planCopy}}。登録日から自動更新。再サインアップ時は無料プランが適用されません。",
    planTitle: "スタンダードプラン",
    planDescription: "アプリストアに登録済みの支払い方法を利用します。",
    planPriceWithTrial: "{{trial}}・その後 {{price}}/30日",
    planPriceNoTrial: "{{price}}/30日",
    planUnavailable: "プラン情報を取得できませんでした",
    trialLabelDay: "{{count}}日間無料",
    trialLabelWeek: "{{count}}週間無料",
    trialLabelMonth: "{{count}}か月無料",
    trialLabelYear: "{{count}}年間無料",
    planLoadError: "価格の取得に失敗しました。少し待ってから再度お試しください。",
    usernameLabel: "ユーザ名",
    usernamePlaceholder: "Your name",
    usernameInvalid: "ユーザ名を入力してください",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    emailInvalid: "メールアドレスの形式が正しくありません",
    passwordLabel: "パスワード",
    passwordPlaceholder: "6文字以上",
    passwordInvalid: "パスワードは6文字以上で入力してください",
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
      "Plan: {{planCopy}}. Auto-renews from your sign-up date. Re-signups start on the paid plan.",
    planTitle: "Standard plan",
    planDescription: "We’ll use your App Store/Google Play billing method.",
    planPriceWithTrial: "{{trial}} • then {{price}}/30 days",
    planPriceNoTrial: "{{price}}/30 days",
    planUnavailable: "Plan info unavailable",
    trialLabelDay: "Free for {{count}} day",
    trialLabelWeek: "Free for {{count}} week",
    trialLabelMonth: "Free for {{count}} month",
    trialLabelYear: "Free for {{count}} year",
    planLoadError: "Could not load pricing. Please try again.",
    usernameLabel: "Username",
    usernamePlaceholder: "Your name",
    usernameInvalid: "Please enter your username",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    emailInvalid: "Invalid email format",
    passwordLabel: "Password",
    passwordPlaceholder: "6+ characters",
    passwordInvalid: "Password must be at least 6 characters",
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
      "Offre : {{planCopy}}. Renouvellement automatique à partir de la date d’inscription. Une réinscription démarre sur l’offre payante.",
    planTitle: "Forfait standard",
    planDescription: "Nous utilisons votre moyen de paiement App Store/Google Play.",
    planPriceWithTrial: "{{trial}} • puis {{price}}/30 jours",
    planPriceNoTrial: "{{price}}/30 jours",
    planUnavailable: "Tarification indisponible",
    trialLabelDay: "{{count}} jour gratuit",
    trialLabelWeek: "{{count}} semaine gratuite",
    trialLabelMonth: "{{count}} mois gratuit",
    trialLabelYear: "{{count}} an gratuit",
    planLoadError: "Impossible de récupérer le tarif. Veuillez réessayer.",
    usernameLabel: "Nom d’utilisateur",
    usernamePlaceholder: "Votre nom",
    usernameInvalid: "Veuillez renseigner votre nom d’utilisateur",
    emailLabel: "E-mail",
    emailPlaceholder: "vous@example.com",
    emailInvalid: "Format d’e-mail invalide",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "6 caractères ou plus",
    passwordInvalid: "Le mot de passe doit comporter au moins 6 caractères",
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
