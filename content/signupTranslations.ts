import { LanguageKey } from "../types/i18n";

export type SignupTranslations = {
  pageLabel: string;
  backToHome: string;
  heroTitle: string;
  heroBody: string;
  planTitle: string;
  planDuration: string;
  planDescription: string;
  planRenewalPrice: string;
  trialInfo: string;
  planUnavailable: string;
  trialLabelDay: string;
  trialLabelWeek: string;
  trialLabelMonth: string;
  trialLabelYear: string;
  planLoadError: string;
  privacyPolicyLabel: string;
  termsOfUseLabel: string;
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
  continueWithGoogle: string;
  continueWithApple: string;
  oauthLoading: string;
  oauthError: string;
  primaryCta: string;
  primaryCtaLoading: string;
  existingAccountHeading: string;
  goToLogin: string;
  emailExistsError: string;
  unknownError: string;
  verificationTitle: string;
  verificationBody: string;
  unconfirmedVerificationBody: string;
};

export const signupTranslations: Record<LanguageKey, SignupTranslations> = {
  ja: {
    pageLabel: "サインアップ",
    backToHome: "ホームへ戻る",
    heroTitle: "無料で始める",
    heroBody:
      "支払い情報は{{storeName}}で安全に管理されます。無料期間中にキャンセルすれば請求は一切発生しません。",
    planTitle: "スタンダードプラン",
    planDuration: "30日ごとの自動更新",
    planDescription: "すべての機能をすぐに利用できます。",
    planRenewalPrice: "{{price}}/月",
    trialInfo: "{{trial}}トライアルあり。",
    planUnavailable: "プラン情報を取得できませんでした",
    trialLabelDay: "14日間無料",
    trialLabelWeek: "{{count}}週間無料",
    trialLabelMonth: "{{count}}か月無料",
    trialLabelYear: "{{count}}年間無料",
    planLoadError:
      "価格の取得に失敗しました。少し待ってから再度お試しください。",
    privacyPolicyLabel: "プライバシーポリシー",
    termsOfUseLabel: "利用規約",
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
    continueWithGoogle: "Googleで続ける",
    continueWithApple: "Appleで続ける",
    oauthLoading: "認証中...",
    oauthError:
      "Apple/Google認証に失敗しました。時間をおいて再度お試しください。",
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
    unconfirmedVerificationBody:
      "本人確認がまだ完了しておりません。メールを再送しましたので、メール内リンクから本人確認を完了してください。",
  },
  en: {
    pageLabel: "Signup",
    backToHome: "Back to Home",
    heroTitle: "Start free",
    heroBody:
      "Payments are securely processed through {{storeName}}. Cancel during the free trial and you won’t be charged.",
    planTitle: "Standard plan",
    planDuration: "Auto-renews every 30 days",
    planDescription: "All features are available right away.",
    planRenewalPrice: "{{price}}/month",
    trialInfo: "{{trial}}",
    planUnavailable: "Plan info unavailable",
    trialLabelDay: "Free for 14 days",
    trialLabelWeek: "Free for {{count}} week",
    trialLabelMonth: "Free for {{count}} month",
    trialLabelYear: "Free for {{count}} year",
    planLoadError: "Could not load pricing. Please try again.",
    privacyPolicyLabel: "Privacy Policy",
    termsOfUseLabel: "Terms of Use",
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
    continueWithGoogle: "Continue with Google",
    continueWithApple: "Continue with Apple",
    oauthLoading: "Signing in...",
    oauthError: "Apple/Google sign-in failed. Please try again.",
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
    unconfirmedVerificationBody:
      "Your email is not verified yet. We resent the verification email. Please complete verification from the link in your inbox.",
  },
  fr: {
    pageLabel: "Inscription",
    backToHome: "Retour à l’accueil",
    heroTitle: "Commencer gratuitement",
    heroBody:
      "Les paiements sont traités en sécurité via {{storeName}}. Annulez pendant l’essai gratuit et vous ne serez pas facturé.",
    planTitle: "Forfait standard",
    planDuration: "Renouvellement automatique tous les 30 jours",
    planDescription:
      "Toutes les fonctionnalités sont disponibles immédiatement.",
    planRenewalPrice: "{{price}}/mois",
    trialInfo: "{{trial}}",
    planUnavailable: "Tarification indisponible",
    trialLabelDay: "14 jours gratuits",
    trialLabelWeek: "{{count}} semaine gratuite",
    trialLabelMonth: "{{count}} mois gratuit",
    trialLabelYear: "{{count}} an gratuit",
    planLoadError: "Impossible de récupérer le tarif. Veuillez réessayer.",
    privacyPolicyLabel: "Politique de confidentialité",
    termsOfUseLabel: "Conditions d’utilisation",
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
    continueWithGoogle: "Continuer avec Google",
    continueWithApple: "Continuer avec Apple",
    oauthLoading: "Connexion...",
    oauthError: "La connexion avec Apple/Google a échoué. Veuillez réessayer.",
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
    unconfirmedVerificationBody:
      "Votre adresse e-mail n’est pas encore vérifiée. Nous avons renvoyé l’e-mail de vérification. Veuillez terminer la vérification depuis le lien reçu.",
  },
};
