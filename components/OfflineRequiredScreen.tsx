// ネットが必要な全ページにおいて、オフライン時(かつキャッシュデータがない時)に表示するフォールバック

import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOffline } from "../providers/OfflineProvider";

export default function OfflineRequiredScreen() {
  const { t } = useTranslation("common");
  const { refresh } = useOffline();

  return (
    <View style={[styles.card, shadows.card]}>
      <Text style={styles.heading}>{t("offline.noConnectionTitle")}</Text>
      <Text style={styles.body}>{t("offline.noConnectionBody")}</Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
        onPress={() => refresh().catch(() => { })}
      >
        <Text style={styles.retryLabel}>{t("offline.retry")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.md,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  retryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.accentSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(110,168,255,0.12)",
  },
  retryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  retryLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
});
