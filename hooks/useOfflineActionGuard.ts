// オフライン時、通信が必要なアクションを取ると
// 「エラーメッセージ表示＋実行キャンセル」となるようにここでコントロール

import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { useOffline } from "../providers/OfflineProvider";

export const useOfflineActionGuard = () => {
  const { t } = useTranslation("common");
  const { offlineBlocked } = useOffline();

  return () => {
    if (!offlineBlocked) return false;
    Alert.alert(t("offline.blockedTitle"), t("offline.blockedBody"));
    return true;
  };
};
