// スプラッシュ画面用

import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../constants/theme";

type SplashOverlayProps = {
  visible: boolean;
};

const DOT_INTERVAL_MS = 333;  // ここでドット３つの感覚を調整
const LOGO_SOURCE = require("../assets/images/splash-icon.png");

const SplashOverlay = ({ visible }: SplashOverlayProps) => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    if (!visible) return undefined;
    const interval = setInterval(() => {
      setDotCount((prev) => ((prev % 3) + 1));
    }, DOT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [visible]);

  const dots = useMemo(() => ".".repeat(dotCount), [dotCount]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Image source={LOGO_SOURCE} style={styles.logo} resizeMode="contain" />
        <Text style={styles.dots}>{dots}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  logo: {
    width: 220,
    height: 220,
  },
  dots: {
    color: colors.textSecondary,
    fontSize: typography.xl * 4,
    letterSpacing: 4,
    minHeight: typography.xl,
    marginTop: - spacing.xl * 4
  },
});

export default SplashOverlay;
