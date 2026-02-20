import { LanguageKey } from "../types/i18n";

export type PurchasesTranslations = {
  pageLabel: string;
  headerTitle: string;
  backToHome: string;
  signupCompleteTitle: string;
  signupCompleteBody: string;
  planTitle: string;
  planDescription: string;
  planPriceWithTrial: string;
  planPriceNoTrial: string;
  planUnavailable: string;
  planLoadError: string;
  trialLabelDay: string;
  trialLabelWeek: string;
  trialLabelMonth: string;
  trialLabelYear: string;
  trialCancelNotice: string;
  billingLabel: string;
  billingPlaceholder: string;
  completeSignupCta: string;
  ctaLoading: string;
  purchaseError: string;
  purchaseCancelled: string;
  purchaseSuccess: string;
};

export const purchasesTranslations: Record<LanguageKey, PurchasesTranslations> =
  {
    ja: {
      pageLabel: "お支払い",
      headerTitle: "お支払い方法の入力",
      backToHome: "ホームへ戻る",
      signupCompleteTitle: "ユーザー作成が完了しました",
      signupCompleteBody:
        "メール認証が完了しました。お支払いを完了して利用を開始してください。",
      planTitle: "スタンダードプラン",
      planDescription: "アプリストアに登録済みの支払い方法を利用します。",
      planPriceWithTrial: "14日間無料・その後 390円/月",
      planPriceNoTrial: "390円/月",
      planUnavailable: "プラン情報を取得できませんでした",
      planLoadError:
        "価格の取得に失敗しました。時間をおいて再度お試しください。",
      trialLabelDay: "{{count}}日間無料",
      trialLabelWeek: "{{count}}週間無料",
      trialLabelMonth: "{{count}}か月無料",
      trialLabelYear: "{{count}}年間無料",
      trialCancelNotice: "無料期間中にキャンセルすれば支払いは一切発生しません",
      billingLabel: "請求先メールアドレス (任意)",
      billingPlaceholder: "you@example.com",
      completeSignupCta: "サインアップ完了",
      ctaLoading: "処理中...",
      purchaseError: "購入に失敗しました。再度お試しください。",
      purchaseCancelled: "購入をキャンセルしました",
      purchaseSuccess: "支払いが完了しました。ダッシュボードに移動します。",
    },
    en: {
      pageLabel: "Purchase",
      headerTitle: "Add payment method",
      backToHome: "Back to Home",
      signupCompleteTitle: "Account ready",
      signupCompleteBody: "Your account is confirmed. Finish payment to start.",
      planTitle: "Standard plan",
      planDescription: "Uses your App Store/Google Play billing.",
      planPriceWithTrial: "Freefor 14 days • then 3.99CAD/month",
      planPriceNoTrial: "3.99CAD/month",
      planUnavailable: "Plan info unavailable",
      planLoadError: "Could not load pricing. Please try again.",
      trialLabelDay: "Free for {{count}} day",
      trialLabelWeek: "Free for {{count}} week",
      trialLabelMonth: "Free for {{count}} month",
      trialLabelYear: "Free for {{count}} year",
      trialCancelNotice:
        "If you cancel during the free trial, you will not be charged at all.",
      billingLabel: "Billing contact email (optional)",
      billingPlaceholder: "you@example.com",
      completeSignupCta: "Complete sign-up",
      ctaLoading: "Processing...",
      purchaseError: "Purchase failed. Please try again.",
      purchaseCancelled: "Purchase cancelled",
      purchaseSuccess: "Payment completed. Redirecting to dashboard...",
    },
    fr: {
      pageLabel: "Achat",
      headerTitle: "Ajouter un moyen de paiement",
      backToHome: "Retour à l’accueil",
      signupCompleteTitle: "Compte prêt",
      signupCompleteBody:
        "Votre compte est confirmé. Finalisez le paiement pour commencer.",
      planTitle: "Forfait standard",
      planDescription:
        "Utilisez votre moyen de paiement App Store/Google Play.",
      planPriceWithTrial: "14 jours gratuits • puis 3.99CAD/mois",
      planPriceNoTrial: "3.99CAD/mois",
      planUnavailable: "Paiement indisponible",
      planLoadError: "Impossible de récupérer le paiement. Veuillez réessayer.",
      trialLabelDay: "{{count}} jour gratuit",
      trialLabelWeek: "{{count}} semaine gratuite",
      trialLabelMonth: "{{count}} mois gratuit",
      trialLabelYear: "{{count}} an gratuit",
      trialCancelNotice:
        "Si vous annulez pendant l'essai gratuit, vous ne serez pas facturé.",
      billingLabel: "E-mail de facturation (optionnel)",
      billingPlaceholder: "vous@exemple.com",
      completeSignupCta: "Terminer l’inscription",
      ctaLoading: "Traitement...",
      purchaseError: "Échec de l’achat. Veuillez réessayer.",
      purchaseCancelled: "Achat annulé",
      purchaseSuccess:
        "Paiement terminé. Redirection vers le tableau de bord...",
    },
  };
