// Google/Apple認証ボタン(signupもloginでも同じ)

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../constants/theme";

export type OAuthProviderId = "apple" | "google";

type Props = {
  disabled?: boolean;
  googleLabel: string;
  appleLabel: string;
  loadingLabel: string;
  loadingProvider: OAuthProviderId | null;
  providers: OAuthProviderId[];
  onPress: (provider: OAuthProviderId) => void;
};

const iconByProvider: Record<OAuthProviderId, keyof typeof MaterialCommunityIcons.glyphMap> = {
  apple: "apple",
  google: "google",
};

export default function OAuthContinueButtons({
  disabled = false,
  googleLabel,
  appleLabel,
  loadingLabel,
  loadingProvider,
  providers,
  onPress,
}: Props) {
  const labelByProvider: Record<OAuthProviderId, string> = {
    apple: appleLabel,
    google: googleLabel,
  };

  return (
    <View style={styles.container}>
      {providers.map((provider) => {
        const isLoading = loadingProvider === provider;
        const buttonDisabled = disabled || Boolean(loadingProvider);
        const label = isLoading ? loadingLabel : labelByProvider[provider];

        return (
          <Pressable
            key={provider}
            accessibilityRole="button"
            accessibilityLabel={labelByProvider[provider]}
            accessibilityState={{ disabled: buttonDisabled }}
            disabled={buttonDisabled}
            onPress={() => onPress(provider)}
            style={({ pressed }) => [
              styles.button,
              pressed && !buttonDisabled && styles.buttonPressed,
              buttonDisabled && styles.buttonDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name={iconByProvider[provider]}
              size={20}
              color={colors.textPrimary}
            />
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.label}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  button: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.32)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: typography.md,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
});
