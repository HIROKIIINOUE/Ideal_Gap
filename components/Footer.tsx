import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../constants/theme";

type FooterProps = {
  isAuthenticated?: boolean;
};

const Footer = memo(({ isAuthenticated = false }: FooterProps) => {
  const actions = useMemo(
    () =>
      [
        {
          key: "language",
          label: "Language",
          icon: "earth",
          onPress: () => { },
        },
        {
          key: "dashboard",
          label: "ダッシュボード",
          icon: "view-dashboard-outline",
          onPress: () => { },
        },
        {
          key: "more",
          label: "その他",
          icon: "menu",
          onPress: () => { },
        },
      ].filter((item) => isAuthenticated || item.key === "language"),
    [isAuthenticated],
  );

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={["rgba(12,18,32,0.95)", "rgba(12,18,32,0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            onPress={action.onPress}
          >
            <MaterialCommunityIcons
              name={action.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={20}
              color={colors.textPrimary}
            />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

Footer.displayName = "Footer";

export default Footer;

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.overlay,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: "rgba(110,168,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  actionPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
});
