import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radius, spacing, typography } from "../constants/theme";
import { router } from "expo-router";

type FooterProps = {
  isAuthenticated?: boolean;
  onLanguagePress?: () => void;
  onDashboardPress?: () => void;
  onMorePress?: () => void;
  onContactPress?: () => void;
  onHomePress?: () => void;
  guestActions?: "contact" | "home";
};

type FooterAction = {
  key: "language" | "dashboard" | "more" | "contact" | "home";
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  showLabel: boolean;
  flex: number;
};

const Footer = memo(
  ({
    isAuthenticated = false,
    onLanguagePress,
    onDashboardPress,
    onMorePress,
    onContactPress,
    onHomePress,
    guestActions = "contact",
  }: FooterProps) => {
    const { t } = useTranslation("common");
    const noop = useCallback(() => {}, []);

    const actions = useMemo(() => {
      const actionConfig: FooterAction[] = isAuthenticated
        ? [
            {
              key: "language",
              label: t("footer.language"),
              icon: "earth",
              showLabel: false,
              flex: 0.6,
            },
            {
              key: "dashboard",
              label: t("footer.dashboard"),
              icon: "view-dashboard-outline",
              showLabel: true,
              flex: 1.4,
            },
            {
              key: "more",
              label: t("footer.more"),
              icon: "menu",
              showLabel: false,
              flex: 0.6,
            },
          ]
        : [
            {
              key: "language",
              label: t("footer.language"),
              icon: "earth",
              showLabel: true,
              flex: 1,
            },
            guestActions === "contact"
              ? {
                  key: "contact",
                  label: t("footer.contact"),
                  icon: "message-text-outline",
                  showLabel: true,
                  flex: 1,
                }
              : {
                  key: "home",
                  label: t("footer.home"),
                  icon: "home-outline",
                  showLabel: true,
                  flex: 1,
                },
          ];

      const handlers: Record<FooterAction["key"], () => void> = {
        language: onLanguagePress ?? noop,
        dashboard: onDashboardPress ?? (() => router.replace("/dashboard")),
        more: onMorePress ?? noop,
        contact: onContactPress ?? (() => router.push("/contact")),
        home: onHomePress ?? (() => router.replace("/")),
      };

      return actionConfig.map((action) => ({
        ...action,
        onPress: handlers[action.key],
      }));
    }, [isAuthenticated, onLanguagePress, onDashboardPress, onMorePress, onContactPress, onHomePress, guestActions, noop, t]);

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
              style={({ pressed }) => [
                styles.actionButton,
                { flexGrow: action.flex, flexShrink: 1, flexBasis: 0 },
                pressed && styles.actionPressed,
              ]}
              onPress={action.onPress}
            >
              <MaterialCommunityIcons
                name={action.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={20}
                color={colors.textPrimary}
              />
              {action.showLabel && <Text style={styles.actionLabel}>{action.label}</Text>}
            </Pressable>
          ))}
        </View>
      </View>
    );
  },
);

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
    flexGrow: 1,
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
