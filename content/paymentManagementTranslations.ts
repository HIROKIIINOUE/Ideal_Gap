// マリー再チェック　全文フランス語

import { LanguageKey } from "../types/i18n";

export type PaymentManagementTranslations = {
  pageTitle: string;
  heading: string;
  body: string;
  statusLabel: string;
  statusValue: {
    signupAwait: string;
    trial: string;
    active: string;
    friendFree: string;
    canceled: string;
    expired: string;
    unknown: string;
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
    body: "支払い情報の変更・退会（サブスク解約）は App Store / Google Play の管理画面で行います。",
    statusLabel: "現在の契約ステータス",
    statusValue: {
      signupAwait: "支払い待ち",
      trial: "無料トライアル中",
      active: "サブスクリプション中(月額390円)",
      friendFree: "友人向け無料アクセス",
      canceled: "キャンセル済み",
      expired: "期限切れ",
      unknown: "未確認",
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
    body: "You can review your payment method, updates it, and cancel your subscription in App Store / Google Play management. You can press the Open Billing Setting button below.",
    statusLabel: "Current subscription status",
    statusValue: {
      signupAwait: "Awaiting payment",
      trial: "Free Trial",
      active: "Active",
      friendFree: "Friend free access",
      canceled: "Canceled",
      expired: "Expired",
      unknown: "Unknown",
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
    body: "La vérification, la modification du moyen de paiement et la résiliation s'effectuent dans App Store / Google Play.",
    statusLabel: "Statut actuel de l'abonnement",
    statusValue: {
      signupAwait: "En attente de paiement",
      trial: "Période d'essai",
      active: "Actif",
      friendFree: "Acces gratuit invite",
      canceled: "Annulé",
      expired: "Expiré",
      unknown: "Inconnu",
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
