import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radius, spacing, typography } from "../constants/theme";

export type MoreActionKey =
  | "logout"
  | "toggleFunPlan"
  | "payment"
  | "profile"
  | "contact";

type MoreSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect?: (key: MoreActionKey) => void;
  funPlanVisible?: boolean;
  onToggleFunPlan?: () => void;
};

type ActionConfig = {
  key: MoreActionKey;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const actions: ActionConfig[] = [
  { key: "logout", icon: "logout" },
  { key: "toggleFunPlan", icon: "calendar-heart" },
  { key: "payment", icon: "credit-card-outline" },
  { key: "profile", icon: "account-circle-outline" },
  { key: "contact", icon: "message-text-outline" },
];

const MoreSheet = memo(({ visible, onClose, onSelect, funPlanVisible = true, onToggleFunPlan }: MoreSheetProps) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);
  const { t } = useTranslation("common", { keyPrefix: "moreSheet" });

  useEffect(() => {
    if (visible) {
      setRendered(true);
      progress.setValue(0);
      Animated.spring(progress, {
        toValue: 1,
        damping: 16,
        stiffness: 220,
        mass: 0.7,
        overshootClamping: true,
        restDisplacementThreshold: 0.3,
        restSpeedThreshold: 2,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setRendered(false));
    }
  }, [progress, visible]);

  const optionList = useMemo(() => {
    return actions.map((action) => {
      if (action.key === "toggleFunPlan") {
        const variantPrefix = funPlanVisible ? "items.toggleFunPlan.hide" : "items.toggleFunPlan.show";
        return {
          ...action,
          title: t(`${variantPrefix}.title`),
          subtitle: t(`${variantPrefix}.subtitle`),
        };
      }
      return {
        ...action,
        title: t(`items.${action.key}.title`),
        subtitle: t(`items.${action.key}.subtitle`),
      };
    });
  }, [funPlanVisible, t]);

  if (!rendered) return null;

  const backdropStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.45],
    }),
  };

  const sheetStyle = {
    transform: [
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
          extrapolate: "clamp",
        }),
      },
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
          extrapolate: "clamp",
        }),
      },
    ],
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  };

  return (
    <Modal visible transparent presentationStyle="overFullScreen" animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View style={[styles.backdropOverlay, backdropStyle]} />
        </Pressable>

        <Animated.View style={[styles.sheet, sheetStyle]}>
          <LinearGradient
            colors={["rgba(12,18,32,0.96)", "rgba(12,18,32,0.9)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{t("title")}</Text>

          <View style={styles.optionList}>
            {optionList.map((option) => (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityLabel={option.title}
                onPress={() => {
                  if (option.key === "toggleFunPlan") {
                    onToggleFunPlan?.();
                  } else {
                    onSelect?.(option.key);
                  }
                  onClose();
                }}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.iconBadge}>
                    <MaterialCommunityIcons
                      name={option.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={20}
                      color={colors.textPrimary}
                    />
                  </View>
                  <View style={styles.optionTextCol}>
                    <Text style={styles.optionLabel}>{option.title}</Text>
                    <Text style={styles.optionHelper}>{option.subtitle}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            style={({ pressed }) => [styles.dismissButton, pressed && styles.dismissPressed]}
            onPress={onClose}
          >
            <Text style={styles.dismissLabel}>{t("close")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
});

MoreSheet.displayName = "MoreSheet";

export default MoreSheet;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  optionList: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  optionPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.divider,
  },
  optionTextCol: {
    flexDirection: "column",
    gap: spacing.xs / 2,
    flex: 1,
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  optionHelper: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    letterSpacing: 0.2,
  },
  dismissButton: {
    marginTop: spacing.lg,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  dismissLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "600",
  },
  dismissPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
});
