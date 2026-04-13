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
  showPassword: string;
  hidePassword: string;
  passwordInvalid: string;
  primaryCta: string;
  primaryCtaLoading: string;
  existingAccountHeading: string;
  goToLogin: string;
  emailExistsError: string;
  unknownError: string;
  verificationTitle: string;
  verificationBody: string;
};

export const signupTranslations: Record<LanguageKey, SignupTranslations> = {
  ja: {
    pageLabel: "サインアップ",
    backToHome: "ホームへ戻る",
    heroTitle: "無料で始める",
    heroBody:
      "支払い情報はApple Store/Google Playを使用するため安全に管理されます。トライアル中にキャンセルすれば一切料金はかかりません。",
    planTitle: "スタンダードプラン",
    planDescription: "お支払いは毎月自動で更新されます。",
    planPriceWithTrial: "14日間無料\nその後 390円/月",
    planPriceNoTrial: "{{price}}/月",
    planUnavailable: "プラン情報を取得できませんでした",
    trialLabelDay: "14日間無料",
    trialLabelWeek: "{{count}}週間無料",
    trialLabelMonth: "{{count}}か月無料",
    trialLabelYear: "{{count}}年間無料",
    planLoadError:
      "価格の取得に失敗しました。少し待ってから再度お試しください。",
    usernameLabel: "ユーザ名",
    usernamePlaceholder: "ユーザ名",
    usernameInvalid: "ユーザ名を入力してください",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    emailInvalid: "メールアドレスの形式が正しくありません",
    passwordLabel: "パスワード",
    passwordPlaceholder: "6文字以上",
    showPassword: "パスワードを表示",
    hidePassword: "パスワードを非表示",
    passwordInvalid: "パスワードは6文字以上で入力してください",
    primaryCta: "サインアップを続ける",
    primaryCtaLoading: "送信中...",
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
    pageLabel: "Signup",
    backToHome: "Back to Home",
    heroTitle: "Start free",
    heroBody:
      "Payments are securely processed through the App Store / Google Play. You can cancel anytime during the free trial and you won’t be charged.",
    planTitle: "Standard plan",
    planDescription: "Payments renew automatically each month.",
    planPriceWithTrial: "Free for 14 days\nthen 3.99CAD/month",
    planPriceNoTrial: "{{price}}/month",
    planUnavailable: "Plan info unavailable",
    trialLabelDay: "Free for 14 days",
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
    showPassword: "Show password",
    hidePassword: "Hide password",
    passwordInvalid: "Password must be at least 6 characters",
    primaryCta: "Continue to sign up",
    primaryCtaLoading: "Sending...",
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
      "Paiements sécurisés via l’App Store / Google Play. Annulez à tout moment pendant l’essai gratuit, sans frais.",
    planTitle: "Forfait standard",
    planDescription: "Renouvellement automatique tous les mois.",
    planPriceWithTrial: "14 jours gratuits\npuis 3.99CAD/mois",
    planPriceNoTrial: "{{price}}/mois",
    planUnavailable: "Tarification indisponible",
    trialLabelDay: "14 jours gratuits",
    trialLabelWeek: "{{count}} semaine gratuite",
    trialLabelMonth: "{{count}} mois gratuit",
    trialLabelYear: "{{count}} an gratuit",
    planLoadError: "Impossible de récupérer le tarif. Veuillez réessayer.",
    usernameLabel: "Nom d’utilisateur",
    usernamePlaceholder: "Votre nom",
    usernameInvalid: "Veuillez renseigner votre nom d’utilisateur",
    emailLabel: "E-mail",
    emailPlaceholder: "vous@exemple.com",
    emailInvalid: "Format d’e-mail invalide",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "6 caractères ou plus",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    passwordInvalid: "Le mot de passe doit comporter au moins 6 caractères",
    primaryCta: "Continuer l’inscription",
    primaryCtaLoading: "Envoi...",
    existingAccountHeading: "Vous avez déjà un compte ?",
    goToLogin: "Se connecter",
    emailExistsError:
      "Un compte associé à cet e-mail existe déjà. Veuillez vous connecter.",
    unknownError: "Échec de l'inscription. Veuillez réessayer.",
    verificationTitle: "Vérifiez votre boîte mail",
    verificationBody:
      "Nous avons envoyé un lien de vérification à {{email}}. Confirmez pour terminer l'inscription.",
  },
};
