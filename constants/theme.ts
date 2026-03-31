// 統一デザインの一括管理ファイル

import { Platform } from "react-native";
import { scaleFontSizeForIpad } from "../lib/ui/ipadLayout";

const isIpad = Platform.OS === "ios" && Platform.isPad === true;

export const colors = {
  background: "#0B0D11",
  surface: "#0F1C2F",
  overlay: "rgba(12,18,32,0.7)",
  accentPrimary: "#1E5EFF",
  accentSubtle: "#6EA8FF",
  textPrimary: "#E9EDF7",
  textSecondary: "#9FB2D0",
  divider: "rgba(255,255,255,0.08)",
  success: "#38D996",
  warning: "#F2C94C",
  error: "#F25F5C",
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

// iPadの時は文字サイズを大きくする
export const typography = {
  sm: scaleFontSizeForIpad(13, isIpad),
  md: scaleFontSizeForIpad(16, isIpad),
  lg: scaleFontSizeForIpad(20, isIpad),
  xl: scaleFontSizeForIpad(28, isIpad),
} as const;

export const shadows = {
  card: {
    shadowColor: "#0A1224",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 32,
    elevation: 24,
  },
  button: {
    shadowColor: "#1E5EFF",
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 16,
  },
} as const;
