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
  externalProviderPasswordPlaceholder: string;
  externalProviderNotice: string;
  externalProviderNoticeApple: string;
  externalProviderNoticeGoogle: string;
  showPassword: string;
  hidePassword: string;
  save: string;
  saving: string;
  emailPendingTitle: string;
  emailPendingBody: string;
  emailPendingVerificationNotice: string;
  successTitle: string;
  successBody: string;
  errorUnknown: string;
  errorEmailExists: string;
  deleteSectionTitle: string;
  deleteSectionBody: string;
  deleteButton: string;
  deleting: string;
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  deleteConfirmFinalTitle: string;
  deleteConfirmFinalBody: string;
  deleteConfirmYes: string;
  deleteConfirmNo: string;
  deleteSuccessTitle: string;
  deleteSuccessBody: string;
  deleteError: string;
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
    externalProviderPasswordPlaceholder:
      "Apple/Googleアカウントで管理されています",
    externalProviderNotice:
      "外部プロバイダでログインしているため本アプリではプロフィールを変更できません。",
    externalProviderNoticeApple:
      "Appleでログインしているため本アプリではプロフィールを変更できません。",
    externalProviderNoticeGoogle:
      "Googleでログインしているため本アプリではプロフィールを変更できません。",
    showPassword: "パスワードを表示",
    hidePassword: "パスワードを非表示",
    save: "変更を保存",
    saving: "保存中…",
    emailPendingTitle: "新しいアドレスに確認メールを送信しました",
    emailPendingBody: "メール内のリンクを開いて本人確認を完了してください。",
    emailPendingVerificationNotice:
      "新しいメールアドレスに届いたリンクから本人確認をしてください。本人確認完了までメールアドレスは変更されません。",
    successTitle: "更新しました",
    successBody: "プロフィールが更新されました。",
    errorUnknown:
      "エラーが発生しました。時間をおいて再度お試しください。前回と同じパスワード、既に登録済みのメールアドレスは指定できません。",
    errorEmailExists: "このメールアドレスは既に登録されています。",
    deleteSectionTitle: "アカウント削除",
    deleteSectionBody:
      "アカウントを削除すると、プロフィール・目標・タスク・お問い合わせ履歴など、このアプリ内データは削除されます。この操作は元に戻せません。",
    deleteButton: "アカウントを削除",
    deleting: "削除中…",
    deleteConfirmTitle: "アカウントを削除しますか？",
    deleteConfirmBody:
      "アカウントを削除してもサブスクリプションは自動解約されません。先に支払い管理画面から解約処理をしてください。",
    deleteConfirmFinalTitle: "最終確認",
    deleteConfirmFinalBody:
      "アカウント削除を確定します。プロフィール・目標・タスク・お問い合わせ履歴など、このアプリ内データは全て削除されます。この操作は元に戻せません。",
    deleteConfirmYes: "削除する",
    deleteConfirmNo: "キャンセル",
    deleteSuccessTitle: "アカウントを削除しました",
    deleteSuccessBody: "ご利用ありがとうございました。",
    deleteError:
      "アカウント削除に失敗しました。通信状況を確認して再度お試しください。",
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
    externalProviderPasswordPlaceholder: "Managed by your Apple/Google account",
    externalProviderNotice:
      "You are logged in with an external provider, so this app cannot change your profile.",
    externalProviderNoticeApple:
      "You are logged in with Apple, so this app cannot change your profile.",
    externalProviderNoticeGoogle:
      "You are logged in with Google, so this app cannot change your profile.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    save: "Save changes",
    saving: "Saving…",
    emailPendingTitle: "Verification email sent to new address",
    emailPendingBody: "Open the link in the email to confirm your address.",
    emailPendingVerificationNotice:
      "Please verify your identity from the link sent to your new email address. Your email address will not be changed until verification is complete.",
    successTitle: "Updated",
    successBody: "Your profile has been updated.",
    errorUnknown:
      "Something went wrong. Please try again later. Your new password must be different from previous one",
    errorEmailExists: "This email is already registered.",
    deleteSectionTitle: "Delete account",
    deleteSectionBody:
      "Deleting your account removes your profile, goals, tasks, and contact history from this app. This action cannot be undone.",
    deleteButton: "Delete account",
    deleting: "Deleting…",
    deleteConfirmTitle: "Delete your account?",
    deleteConfirmBody:
      "Deleting your account does not automatically cancel your subscription. Please cancel it from the payment management screen first.",
    deleteConfirmFinalTitle: "Final confirmation",
    deleteConfirmFinalBody:
      "Your account deletion will now be completed. Your profile, goals, tasks, and contact history will be all deleted from this app. This action cannot be undone.",
    deleteConfirmYes: "Delete",
    deleteConfirmNo: "Cancel",
    deleteSuccessTitle: "Your account was deleted",
    deleteSuccessBody: "Thank you for using Ideal Gap.",
    deleteError:
      "We could not delete your account. Check your connection and try again.",
    validation: {
      username: "Please enter a username",
      email: "Invalid email format",
      password: "Password must be at least 6 characters",
    },
  },
  fr: {
    title: "Mise à jour du profil",
    subtitle: "Gardez vos informations à jour.",
    usernameLabel: "Nom d’utilisateur",
    emailLabel: "E-mail",
    passwordLabel: "Mot de passe (facultatif)",
    usernamePlaceholder: "Saisissez votre nom d’utilisateur",
    emailPlaceholder: "Saisissez votre adresse e-mail",
    passwordPlaceholder: "Nouveau mot de passe",
    externalProviderPasswordPlaceholder: "Géré par votre compte Apple/Google",
    externalProviderNotice:
      "Vous êtes connecté avec un fournisseur externe. Ce profil ne peut donc pas être modifié dans l’application.",
    externalProviderNoticeApple:
      "Vous êtes connecté avec Apple. Ce profil ne peut donc pas être modifié dans l’application.",
    externalProviderNoticeGoogle:
      "Vous êtes connecté avec Google. Ce profil ne peut donc pas être modifié dans l’application.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    save: "Mettre à jour",
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
    deleteSectionTitle: "Supprimer le compte",
    deleteSectionBody:
      "La suppression du compte efface votre profil, vos objectifs, vos tâches et votre historique de contact dans cette application. Cette action est irréversible.",
    deleteButton: "Supprimer le compte",
    deleting: "Suppression…",
    deleteConfirmTitle: "Supprimer votre compte ?",
    deleteConfirmBody:
      "La suppression de votre compte n’annule pas automatiquement votre abonnement. Veuillez d’abord l’annuler depuis l’écran de gestion du paiement.",
    deleteConfirmFinalTitle: "Confirmation finale",
    deleteConfirmFinalBody:
      "La suppression du compte va être confirmée. Votre profil, vos objectifs, vos tâches et votre historique de contact seront entièrement supprimés de cette application. Cette action est irréversible.",
    deleteConfirmYes: "Supprimer",
    deleteConfirmNo: "Annuler",
    deleteSuccessTitle: "Votre compte a été supprimé",
    deleteSuccessBody: "Merci d’avoir utilisé Ideal Gap.",
    deleteError:
      "Impossible de supprimer votre compte. Vérifiez votre connexion et réessayez.",
    validation: {
      username: "Veuillez saisir un nom d’utilisateur",
      email: "Format d’e-mail invalide",
      password: "Le mot de passe doit contenir au moins 6 caractères",
    },
  },
};
