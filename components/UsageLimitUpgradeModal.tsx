// 無料ユーザが各データの追加上限に達した時に表示する共通モーダル画面
// 課金プランへのアップグレードを促す

import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

type UsageLimitUpgradeModalProps = {
  visible: boolean;
  title: string;
  message: string;
  backLabel: string;
  upgradeLabel: string;
  onClose: () => void;
  onUpgrade: () => void;
};

export default function UsageLimitUpgradeModal({
  visible,
  title,
  message,
  backLabel,
  upgradeLabel,
  onClose,
  onUpgrade,
}: UsageLimitUpgradeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        testID="usage-limit-upgrade-modal-overlay"
      >
        <View style={styles.container}>
          <Pressable
            style={[styles.card, shadows.card]}
            onPress={(event) => event.stopPropagation()}
            testID="usage-limit-upgrade-modal"
          >
            <LinearGradient
              colors={["rgba(46,92,156,0.97)", "rgba(24,40,68,0.98)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={onClose}
                testID="usage-limit-upgrade-modal-back"
              >
                <Text style={styles.secondaryButtonText}>{backLabel}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.primaryButton, shadows.button]}
                onPress={onUpgrade}
                testID="usage-limit-upgrade-modal-upgrade"
              >
                <Text style={styles.primaryButtonText}>{upgradeLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.lg,
  },
  container: {
    width: "100%",
  },
  card: {
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.28)",
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: "#22385A",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentPrimary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.divider,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: typography.md,
    fontWeight: "700",
  },
});
