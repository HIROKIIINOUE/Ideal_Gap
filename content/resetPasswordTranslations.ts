import { LanguageKey } from "../types/i18n";

export type ResetPasswordTranslations = {
  pageLabel: string;
  backToLogin: string;
  introTitle: string;
  introBody: string;
  emailLabel: string;
  emailPlaceholder: string;
  sendCta: string;
  sending: string;
  linkSent: string;
  newPasswordTitle: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  updateCta: string;
  updating: string;
  sessionReady: string;
  sessionNotReady: string;
  updateSuccess: string;
  errorUserNotFound: string;
  errorRateLimited: string;
  errorUnknown: string;
};

export const resetPasswordTranslations: Record<
  LanguageKey,
  ResetPasswordTranslations
> = {
  ja: {
    pageLabel: "パスワード再設定",
    backToLogin: "ログインへ戻る",
    introTitle: "パスワードをリセットしますか？",
    introBody:
      "登録メールアドレスを入力してください。安全なリンクを送信します。この端末でリンクを開くと新しいパスワードを設定できます。",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    sendCta: "リセットメールを送信",
    sending: "送信中...",
    linkSent: "リセット用メールを送信しました。受信ボックスをご確認ください。",
    newPasswordTitle: "新しいパスワードを設定",
    newPasswordLabel: "新しいパスワード",
    newPasswordPlaceholder: "New password",
    updateCta: "パスワードを更新してログインへ",
    updating: "更新中...",
    sessionReady: "認証リンクを確認しました。新しいパスワードを設定できます。",
    sessionNotReady: "メールのリンクをこの端末で開いてから続行してください。",
    updateSuccess: "パスワードを更新しました。ログインし直してください。",
    errorUserNotFound: "アカウントが見つかりません。",
    errorRateLimited:
      "短時間にリクエストが集中しています。1分ほど待ってから再度お試しください。",
    errorUnknown:
      "エラーが発生しました。もう一度お試しください。前回と同じパスワードは使用できません。",
  },
  en: {
    pageLabel: "Reset-password",
    backToLogin: "Back to Log In",
    introTitle: "Need a reset?",
    introBody:
      "Enter your email to receive a secure link. Open it on this device to set a new password.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    sendCta: "Send reset email",
    sending: "Sending...",
    linkSent: "We sent a reset email. Please check your inbox.",
    newPasswordTitle: "Set a new password",
    newPasswordLabel: "New password",
    newPasswordPlaceholder: "New password",
    updateCta: "Update password and log in",
    updating: "Updating...",
    sessionReady: "Recovery link confirmed. You can set a new password now.",
    sessionNotReady: "Open the email link on this device to continue.",
    updateSuccess: "Password updated. Please log in again.",
    errorUserNotFound: "No account found for that email.",
    errorRateLimited:
      "Too many requests. Please wait around 1 minutes and try again.",
    errorUnknown:
      "Something went wrong. Please try again. Your new password must be different from previous one",
  },
  fr: {
    pageLabel: "Reset-password",
    backToLogin: "Retour à la connexion",
    introTitle: "Besoin de réinitialiser ?",
    introBody:
      "Saisissez votre e-mail pour recevoir un lien sécurisé. Ouvrez-le sur cet appareil pour définir un nouveau mot de passe.",
    emailLabel: "E-mail",
    emailPlaceholder: "vous@example.com",
    sendCta: "Envoyer l’e-mail de réinitialisation",
    sending: "Envoi...",
    linkSent: "E-mail envoyé. Consultez votre boîte de réception.",
    newPasswordTitle: "Définir un nouveau mot de passe",
    newPasswordLabel: "Nouveau mot de passe",
    newPasswordPlaceholder: "Nouveau mot de passe",
    updateCta: "Mettre à jour et revenir à la connexion",
    updating: "Mise à jour...",
    sessionReady:
      "Lien de récupération confirmé. Vous pouvez définir un nouveau mot de passe.",
    sessionNotReady: "Ouvrez le lien reçu sur cet appareil pour continuer.",
    updateSuccess: "Mot de passe mis à jour. Connectez-vous à nouveau.",
    errorUserNotFound: "Aucun compte trouvé pour cet e-mail.",
    errorRateLimited:
      "Trop de demandes. Veuillez patienter 1 minutes puis réessayer.",
    errorUnknown:
      "Un problème est survenu. Veuillez réessayer. Votre nouveau mot de passe doit être différent du précédent.",
  },
};
