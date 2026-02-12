import { LanguageKey } from "../types/i18n";

export type ProfileUpdateTranslations = {
  title: string;
  subtitle: string;
  usernameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  usernamePlaceholder: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  save: string;
  saving: string;
  emailPendingTitle: string;
  emailPendingBody: string;
  emailPendingVerificationNotice: string;
  successTitle: string;
  successBody: string;
  errorUnknown: string;
  errorEmailExists: string;
  validation: {
    username: string;
    email: string;
    password: string;
  };
};

export const profileUpdateTranslations: Record<
  LanguageKey,
  ProfileUpdateTranslations
> = {
  ja: {
    title: "プロフィール変更",
    subtitle: "アカウント情報を最新に保ちましょう。",
    usernameLabel: "ユーザ名",
    emailLabel: "メールアドレス",
    passwordLabel: "パスワード",
    usernamePlaceholder: "ユーザ名を入力",
    emailPlaceholder: "メールアドレスを入力",
    passwordPlaceholder: "新しいパスワード（任意）",
    save: "変更を保存",
    saving: "保存中…",
    emailPendingTitle: "確認メールを送信しました",
    emailPendingBody: "メール内のリンクを開いて本人確認を完了してください。",
    emailPendingVerificationNotice:
      "新しいメールアドレスに届いたリンクから本人確認をしてください。本人確認完了までメールアドレスは変更されません。",
    successTitle: "更新しました",
    successBody: "プロフィールが更新されました。",
    errorUnknown:
      "エラーが発生しました。時間をおいて再度お試しください。前回と同じパスワード、既に登録済みのメールアドレスは指定できません。",
    errorEmailExists: "このメールアドレスは既に登録されています。",
    validation: {
      username: "ユーザ名を入力してください",
      email: "メールアドレスの形式が正しくありません",
      password: "パスワードは6文字以上で入力してください",
    },
  },
  en: {
    title: "Profile-update",
    subtitle: "Keep your account details up to date.",
    usernameLabel: "Username",
    emailLabel: "Email",
    passwordLabel: "Password",
    usernamePlaceholder: "Enter your username",
    emailPlaceholder: "Enter your email",
    passwordPlaceholder: "New password (optional)",
    save: "Save changes",
    saving: "Saving…",
    emailPendingTitle: "Verification email sent",
    emailPendingBody: "Open the link in the email to confirm your address.",
    emailPendingVerificationNotice:
      "Please verify your identity from the link sent to your new email address. Your email address will not be changed until verification is complete.",
    successTitle: "Updated",
    successBody: "Your profile has been updated.",
    errorUnknown:
      "Something went wrong. Please try again later. Your new password must be different from previous one",
    errorEmailExists: "This email is already registered.",
    validation: {
      username: "Please enter a username",
      email: "Invalid email format",
      password: "Password must be at least 6 characters",
    },
  },
  fr: {
    title: "Profile-update",
    subtitle: "Gardez vos informations de compte à jour.",
    usernameLabel: "Nom d’utilisateur",
    emailLabel: "E-mail",
    passwordLabel: "Mot de passe",
    usernamePlaceholder: "Saisissez votre nom d’utilisateur",
    emailPlaceholder: "Saisissez votre e-mail",
    passwordPlaceholder: "Nouveau mot de passe (facultatif)",
    save: "Enregistrer les modifications",
    saving: "Enregistrement…",
    emailPendingTitle: "E-mail de vérification envoyé",
    emailPendingBody:
      "Ouvrez le lien dans l’e-mail pour confirmer votre adresse.",
    emailPendingVerificationNotice:
      "Veuillez vérifier votre identité à partir du lien envoyé à votre nouvelle adresse e-mail. Votre adresse e-mail ne sera pas modifiée tant que la vérification n’est pas terminée.",
    successTitle: "Mis à jour",
    successBody: "Votre profil a été mis à jour.",
    errorUnknown:
      "Une erreur est survenue. Réessayez plus tard. Votre nouveau mot de passe doit être différent du précédent.",
    errorEmailExists: "Cet e-mail est déjà enregistré.",
    validation: {
      username: "Veuillez saisir un nom d’utilisateur",
      email: "Format d’e-mail invalide",
      password: "Le mot de passe doit contenir au moins 6 caractères",
    },
  },
};
