// offlineBlockedがtrueの時に表示されるオフラインバナー

import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, typography } from "../constants/theme";
import { useOffline } from "../providers/OfflineProvider";

export default function OfflineBanner() {
  const { t } = useTranslation("common");
  const { offlineBlocked } = useOffline();
  const insets = useSafeAreaInsets();

  if (!offlineBlocked) return null;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xs,
        },
      ]}
      pointerEvents="none"
      testID="offline-banner"
    >
      <Text style={styles.label}>{t("offline.banner")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    backgroundColor: "rgba(242,95,92,0.95)",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#FFFFFF",
    fontSize: typography.sm,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
