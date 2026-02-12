import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography } from "../constants/theme";

type LoadingProps = {
  message?: string;
};

const SPINNER_GRADIENT = ["rgba(110,168,255,0.8)", "rgba(30,94,255,0.25)"] as const;
const BACKDROP_GRADIENT = ["rgba(8,12,20,0.95)", "rgba(12,18,32,0.92)"] as const;

const Loading = ({ message }: LoadingProps) => {
  const { t } = useTranslation("common");
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotate]);

  const spin = useMemo(
    () =>
      rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    [rotate],
  );

  const label = message ?? t("loading");

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.overlay} accessibilityRole="progressbar" testID="loading" pointerEvents="auto">
        <LinearGradient colors={BACKDROP_GRADIENT} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
            <LinearGradient colors={SPINNER_GRADIENT} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,10,18,0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  content: {
    alignItems: "center",
    gap: spacing.md,
  },
  spinner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: "hidden",
    shadowColor: colors.accentPrimary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    borderWidth: 3,
    borderColor: "rgba(110,168,255,0.4)",
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export default Loading;
