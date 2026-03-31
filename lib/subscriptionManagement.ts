// 支払い内容変更・退会ページで「支払い設定を開く」ボタンを押下した時の処理ロジック

import { Linking, Platform } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

export const APPLE_SUBSCRIPTIONS_URL =
  "https://apps.apple.com/account/subscriptions";
export const GOOGLE_PLAY_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions";

export type SubscriptionManagementOpenResult =
  | "customer_center"
  | "manage_subscriptions"
  | "store_url";

// RevenueCatが機能しなかった時用のフォールバックURL
const getStoreSubscriptionsUrl = () =>
  Platform.OS === "ios"
    ? APPLE_SUBSCRIPTIONS_URL
    : GOOGLE_PLAY_SUBSCRIPTIONS_URL;

// まずはRevenueCatの支払い管理画面への遷移にトライする。
// エラーになった時は各OSに応じてgetStoreSubscriptionsUrlで取得した設定画面を開く。
// （iOSの場合はその前にPurchases.showManageSubscriptions()をトライする）
export const openSubscriptionManagementPortal =
  async (): Promise<SubscriptionManagementOpenResult> => {
    try {
      await RevenueCatUI.presentCustomerCenter();
      return "customer_center";
    } catch (customerCenterError) {
      console.warn(
        "Failed to open RevenueCat customer center",
        customerCenterError,
      );
    }

    // RevenueCatが機能しなかった時、iOSの場合「App Store サブスクリプション管理画面」への遷移をトライ
    if (Platform.OS === "ios") {
      try {
        await Purchases.showManageSubscriptions();
        return "manage_subscriptions";
      } catch (manageError) {
        console.warn(
          "Failed to open App Store manage subscriptions",
          manageError,
        );
      }
    }

    // RevenueCatが機能しなかった時のAndroid設定画面への遷移
    // またPurchases.showManageSubscriptions()が機能しなかった時のiOS設定画面への遷移
    const storeUrl = getStoreSubscriptionsUrl();
    const canOpen = await Linking.canOpenURL(storeUrl);

    if (!canOpen) {
      throw new Error("Unable to open store subscriptions URL");
    }

    await Linking.openURL(storeUrl);
    return "store_url";
  };
