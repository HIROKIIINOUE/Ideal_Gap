// マリー再チェック　全文フランス語

import { LanguageKey } from "../types/i18n";

export type PaymentManagementTranslations = {
  pageTitle: string;
  heading: string;
  body: string;
  statusLabel: string;
  statusValue: {
    trial: string;
    active: string;
    friendFree: string;
    canceled: string;
    expired: string;
    unknown: string;
  };
  cancellationNotice: {
    active: string;
    trial: string;
  };
  manageButton: string;
  openingButton: string;
  manageHint: string;
  openError: string;
  loadError: string;
};

export const paymentManagementTranslations: Record<
  LanguageKey,
  PaymentManagementTranslations
> = {
  ja: {
    pageTitle: "支払い方法の変更・退会",
    heading: "支払い設定を管理",
    body: "支払い情報の変更・退会（サブスク解約）は {{storeName}} の管理画面で行います。",
    statusLabel: "現在の契約ステータス",
    statusValue: {
      trial: "無料トライアル中",
      active: "サブスクリプション中(月額390円)",
      friendFree: "友人向け無料アクセス",
      canceled: "キャンセル済み",
      expired: "期限切れ",
      unknown: "未確認",
    },
    cancellationNotice: {
      active:
        "キャンセル済みです。次回のお支払いは発生しません。前回支払い分の期間中は引き続きアプリを使用できます。再開する場合は以下のボタンから支払い設定を開いてください。",
      trial:
        "キャンセル済みです。次回のお支払いは発生しません。無料トライアル期間中は引き続きアプリを使用できます。再開する場合は以下のボタンから支払い設定を開いてください。",
    },
    manageButton: "支払い設定を開く",
    openingButton: "開いています...",
    manageHint: "遷移先で支払い方法の確認・変更・退会ができます。",
    openError: "支払い設定を開けませんでした。時間をおいて再度お試しください。",
    loadError: "契約ステータスの取得に失敗しました",
  },
  en: {
    pageTitle: "Manage payment",
    heading: "Manage billing settings",
    body: "You can review your payment method, update it, and cancel your subscription in {{storeName}} settings.",
    statusLabel: "Current subscription status",
    statusValue: {
      trial: "Free Trial",
      active: "Active",
      friendFree: "Friend free access",
      canceled: "Canceled",
      expired: "Expired",
      unknown: "Unknown",
    },
    cancellationNotice: {
      active:
        "Your subscription has been canceled. No further payments will be charged. You can continue using the app during the period covered by your last payment. To resume your subscription, open your billing settings with the button below.",
      trial:
        "Your subscription has been canceled. No further payments will be charged. You can continue using the app during your free trial period. To resume your subscription, open your billing settings with the button below.",
    },
    manageButton: "Open Billing Settings",
    openingButton: "Opening...",
    manageHint:
      "On the next screen, you can review, update, or cancel your subscription.",
    openError: "Could not open billing settings. Please try again later.",
    loadError: "Failed to load subscription status",
  },
  fr: {
    pageTitle: "Gérer le paiement",
    heading: "Gérer les paramètres de facturation",
    body: "La vérification, la modification du moyen de paiement et la résiliation s'effectuent dans {{storeName}}.",
    statusLabel: "Statut actuel de l'abonnement",
    statusValue: {
      trial: "Période d'essai",
      active: "Actif",
      friendFree: "Acces gratuit invite",
      canceled: "Annulé",
      expired: "Expiré",
      unknown: "Inconnu",
    },
    cancellationNotice: {
      active:
        "Votre abonnement a été annulé. Aucun autre paiement ne sera facturé. Vous pouvez continuer à utiliser l'application pendant la période couverte par votre dernier paiement. Pour reprendre votre abonnement, ouvrez les paramètres de paiement avec le bouton ci-dessous.",
      trial:
        "Votre abonnement a été annulé. Aucun autre paiement ne sera facturé. Vous pouvez continuer à utiliser l'application pendant votre période d'essai gratuite. Pour reprendre votre abonnement, ouvrez les paramètres de paiement avec le bouton ci-dessous.",
    },
    manageButton: "Ouvrir les paramètres de paiement",
    openingButton: "Ouverture...",
    manageHint:
      "Sur l'écran suivant, vous pouvez vérifier, modifier ou résilier.",
    openError:
      "Impossible d'ouvrir les paramètres de paiement. Réessayez plus tard.",
    loadError: "Échec du chargement du statut de l'abonnement",
  },
};
