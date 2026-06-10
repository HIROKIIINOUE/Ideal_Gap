// iOSとAndroidの挙動の違いをここで条件分けする

import { Platform } from "react-native";

export const getKeyboardAvoidingBehavior = (platform: string = Platform.OS) =>
  platform === "ios" ? "padding" : "height";

export const shouldUseAndroidJapaneseTypography = (
  language: string,
  platform: string = Platform.OS,
) => platform === "android" && language.startsWith("ja");
