import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { LanguageKey } from "../types/i18n";
import { colors, radius, spacing, typography } from "../constants/theme";
import { useLanguage } from "../providers/LanguageProvider";

type LanguageSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type LanguageOptionProps = {
  option: { key: LanguageKey; label: string; helper: string };
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

const LanguageOption = ({ option, active, onPress, accessibilityLabel }: LanguageOptionProps) => (
  <Pressable
    key={option.key}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.optionPressed]}
    onPress={onPress}
  >
    <View style={styles.optionTextCol}>
      <Text style={styles.optionLabel}>{option.label}</Text>
      <Text style={styles.optionHelper}>{option.helper}</Text>
    </View>
    {active ? (
      <MaterialCommunityIcons name="check-circle" size={22} color={colors.accentPrimary} />
    ) : (
      <MaterialCommunityIcons name="circle-outline" size={22} color={colors.textSecondary} />
    )}
  </Pressable>
);

const LanguageSheet = memo(({ visible, onClose }: LanguageSheetProps) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);
  const { language: currentLanguage, setLanguage } = useLanguage();
  const { t } = useTranslation("common");

  const languages = useMemo(
    () => [
      { key: "ja" as LanguageKey, label: t("languageNames.ja"), helper: t("languageHelpers.ja") },
      { key: "en" as LanguageKey, label: t("languageNames.en"), helper: t("languageHelpers.en") },
      { key: "fr" as LanguageKey, label: t("languageNames.fr"), helper: t("languageHelpers.fr") },
    ],
    [t],
  );

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

  if (!rendered) {
    return null;
  }

  const activeLanguage = currentLanguage ?? "en";

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
          <Text style={styles.sheetTitle}>{t("languageSheet.title")}</Text>
          <View style={styles.optionList}>
            {languages.map((option) => (
              <LanguageOption
                key={option.key}
                option={option}
                active={option.key === activeLanguage}
                accessibilityLabel={`${t("languageSheet.title")} ${option.label}`}
                onPress={() => {
                  setLanguage(option.key);
                  onClose();
                }}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("languageSheet.close")}
            style={({ pressed }) => [styles.dismissButton, pressed && styles.dismissPressed]}
            onPress={onClose}
          >
            <Text style={styles.dismissLabel}>{t("languageSheet.close")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
});

LanguageSheet.displayName = "LanguageSheet";

export default LanguageSheet;

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
  optionActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.08)",
  },
  optionPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  optionTextCol: {
    flexDirection: "column",
    gap: spacing.xs / 2,
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
