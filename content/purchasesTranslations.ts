import { LanguageKey } from "../types/i18n";

export type PurchasesTranslations = {
  pageLabel: string;
  headerTitle: string;
  backToHome: string;
  signupCompleteTitle: string;
  signupCompleteBody: string;
  freePlanBody: string;
  planTitle: string;
  planDuration: string;
  planDescription: string;
    planBenefits: {
      idealSelfUnlimited: string;
      annualGoalsUnlimited: string;
      weeklyTasksUnlimited: string;
      focusMusicMonthly30: string;
      funPlanUnlimited: string;
      prioritySupport: string;
    };
  planRenewalPrice: string;
  trialInfo: string;
  planUnavailable: string;
  planLoadError: string;
  trialLabelDay: string;
  trialLabelWeek: string;
  trialLabelMonth: string;
  trialLabelYear: string;
  trialCancelNotice: string;
  storeBillingNotice: string;
  cardInfoPolicy: string;
  privacyPolicyLabel: string;
  termsOfUseLabel: string;
  retryPricingCta: string;
  returnHomeCta: string;
  returningHomeCta: string;
  returnHomeError: string;
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
      headerTitle: "料金プラン変更",
      backToHome: "ホームへ戻る",
      signupCompleteTitle: "ユーザー作成が完了しました",
      signupCompleteBody:
        "メール認証が完了しました。お支払いを完了して利用を開始してください。",
      freePlanBody:
        "無料枠の上限に達した時や有料プランへ切り替えたい時は、この画面から変更できます。",
      planTitle: "Pro Plan",
      planDuration: "30日ごとの自動更新",
      planDescription: "{{storeName}} に登録済みの支払い方法を利用します。",
      planBenefits: {
        idealSelfUnlimited: "理想の自分カード追加無制限",
        annualGoalsUnlimited: "年間目標カード追加無制限",
        weeklyTasksUnlimited: "週間タスクカード追加無制限",
        focusMusicMonthly30: "音楽月間ダウンロード数最大30曲",
        funPlanUnlimited: "次回の楽しい予定リスト追加無制限",
        prioritySupport: "お問い合わせ優先対応",
      },
      planRenewalPrice: "{{price}}/月",
      trialInfo: "{{trial}}の後に {{price}}/月で自動更新されます。",
      planUnavailable: "プラン情報を取得できませんでした",
      planLoadError:
        "価格の取得に失敗しました。時間をおいて再度お試しください。",
      trialLabelDay: "{{count}}日間無料",
      trialLabelWeek: "{{count}}週間無料",
      trialLabelMonth: "{{count}}か月無料",
      trialLabelYear: "{{count}}年間無料",
      trialCancelNotice: "無料期間中にキャンセルすれば請求は発生しません。",
      storeBillingNotice:
        "支払い情報は {{storeName}} で安全に管理されます。",
      cardInfoPolicy:
        "このアプリがクレジットカード番号を保存することはありません。",
      privacyPolicyLabel: "プライバシーポリシー",
      termsOfUseLabel: "利用規約",
      retryPricingCta: "価格を再取得",
      returnHomeCta: "ダッシュボードへ戻る",
      returningHomeCta: "戻っています...",
      returnHomeError:
        "ホームへ戻れませんでした。時間をおいて再度お試しください。",
      billingLabel: "請求先メールアドレス (任意)",
      billingPlaceholder: "you@example.com",
      completeSignupCta: "お支払いへ",
      ctaLoading: "処理中...",
      purchaseError: "購入に失敗しました。再度お試しください。",
      purchaseCancelled: "購入をキャンセルしました",
      purchaseSuccess: "支払いが完了しました。ダッシュボードに移動します。",
    },
    en: {
      pageLabel: "Purchase",
      headerTitle: "Change plan",
      backToHome: "Back to Home",
      signupCompleteTitle: "Account ready",
      signupCompleteBody: "Your account is confirmed. Finish payment to start.",
      freePlanBody:
        "Upgrade here whenever you hit a free-tier limit or want to switch to the paid plan.",
      planTitle: "Pro Plan",
      planDuration: "Auto-renews every 30 days",
      planDescription: "Uses your {{storeName}} billing method.",
      planBenefits: {
        idealSelfUnlimited: "Unlimited Ideal Self cards",
        annualGoalsUnlimited: "Unlimited Annual Goal cards",
        weeklyTasksUnlimited: "Unlimited Weekly Task cards",
        focusMusicMonthly30: "Up to 30 music downloads per month",
        funPlanUnlimited: "Unlimited Next Fun Plan items",
        prioritySupport: "Priority support",
      },
      planRenewalPrice: "{{price}}/month",
      trialInfo: "{{trial}}, then renews at {{price}}/month.",
      planUnavailable: "Plan info unavailable",
      planLoadError: "Could not load pricing. Please try again.",
      trialLabelDay: "Free for {{count}} day",
      trialLabelWeek: "Free for {{count}} week",
      trialLabelMonth: "Free for {{count}} month",
      trialLabelYear: "Free for {{count}} year",
      trialCancelNotice:
        "If you cancel during the free trial, you will not be charged.",
      storeBillingNotice:
        "Payment details are managed securely by {{storeName}}.",
      cardInfoPolicy: "We never store your credit card number in this app.",
      privacyPolicyLabel: "Privacy Policy",
      termsOfUseLabel: "Terms of Use",
      retryPricingCta: "Retry pricing",
      returnHomeCta: "Return to dashboard",
      returningHomeCta: "Returning...",
      returnHomeError: "Could not return home. Please try again.",
      billingLabel: "Billing contact email (optional)",
      billingPlaceholder: "you@example.com",
      completeSignupCta: "Continue to payment",
      ctaLoading: "Processing...",
      purchaseError: "Purchase failed. Please try again.",
      purchaseCancelled: "Purchase cancelled",
      purchaseSuccess: "Payment completed. Redirecting to dashboard...",
    },
    fr: {
      pageLabel: "Achat",
      headerTitle: "Changer de forfait",
      backToHome: "Retour à l’accueil",
      signupCompleteTitle: "Compte prêt",
      signupCompleteBody:
        "Votre compte est confirmé. Finalisez le paiement pour commencer.",
      freePlanBody:
        "Passez au forfait payant ici lorsque vous atteignez une limite gratuite ou souhaitez changer de formule.",
      planTitle: "Pro Plan",
      planDuration: "Renouvellement automatique tous les 30 jours",
      planDescription: "Utilise votre moyen de paiement {{storeName}}.",
      planBenefits: {
        idealSelfUnlimited: "Cartes Ideal Self illimitées",
        annualGoalsUnlimited: "Cartes objectifs annuels illimitées",
        weeklyTasksUnlimited: "Cartes tâches hebdomadaires illimitées",
        focusMusicMonthly30: "Jusqu’à 30 téléchargements audio par mois",
        funPlanUnlimited: "Éléments Next Fun Plan illimités",
        prioritySupport: "Assistance prioritaire",
      },
      planRenewalPrice: "{{price}}/mois",
      trialInfo: "{{trial}}, puis renouvellement à {{price}}/mois.",
      planUnavailable: "Paiement indisponible",
      planLoadError: "Impossible de récupérer le paiement. Veuillez réessayer.",
      trialLabelDay: "{{count}} jour gratuit",
      trialLabelWeek: "{{count}} semaine gratuite",
      trialLabelMonth: "{{count}} mois gratuit",
      trialLabelYear: "{{count}} an gratuit",
      trialCancelNotice:
        "Si vous annulez pendant l'essai gratuit, vous ne serez pas facturé.",
      storeBillingNotice:
        "Les informations de paiement sont gérées en sécurité par {{storeName}}.",
      cardInfoPolicy:
        "Cette application ne stocke jamais votre numéro de carte bancaire.",
      privacyPolicyLabel: "Politique de confidentialité",
      termsOfUseLabel: "Conditions d’utilisation",
      retryPricingCta: "Réessayer le tarif", //マリー再チェック
      returnHomeCta: "Retour au tableau de bord", //マリー再チェック
      returningHomeCta: "Retour en cours...", //マリー再チェック
      returnHomeError: "Impossible de revenir à l’accueil. Veuillez réessayer.", //マリー再チェック
      billingLabel: "E-mail de facturation (optionnel)",
      billingPlaceholder: "vous@exemple.com",
      completeSignupCta: "Continuer vers le paiement",
      ctaLoading: "Traitement...",
      purchaseError: "Échec de l’achat. Veuillez réessayer.",
      purchaseCancelled: "Achat annulé",
      purchaseSuccess:
        "Paiement terminé. Redirection vers le tableau de bord...",
    },
  };
