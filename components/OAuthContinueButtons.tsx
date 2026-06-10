// Google/Apple認証ボタン(signupもloginでも同じ)

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { radius, spacing, typography } from "../constants/theme";

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

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" testID="oauth-google-logo">
      <Path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.715v2.2582h2.9086c1.7018-1.5668 2.6837-3.8741 2.6837-6.6141z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1818l-2.9086-2.2582c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.0359-3.7105H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <Path
        fill="#FBBC05"
        d="M3.9641 10.7086c-.18-.54-.2836-1.1168-.2836-1.7086s.1036-1.1686.2836-1.7086V4.9595H.9573C.3477 6.1732 0 7.5486 0 9s.3477 2.8268.9573 4.0405l3.0068-2.3319z"
      />
      <Path
        fill="#EA4335"
        d="M9 3.5809c1.3214 0 2.5077.4541 3.4391 1.3459l2.5814-2.5814C13.4632.8918 11.4268 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9595l3.0068 2.3318C4.6718 5.1641 6.6559 3.5809 9 3.5809z"
      />
    </Svg>
  );
}

const buttonStyleByProvider = {
  apple: {
    backgroundColor: "#000000",
    borderColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    iconColor: "#FFFFFF",
    textColor: "#FFFFFF",
  },
  google: {
    backgroundColor: "#FFFFFF",
    borderColor: "#3C4043",
    borderWidth: 2,
    iconColor: "#1F1F1F",
    textColor: "#1F1F1F",
  },
} as const;

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
        const providerStyle = buttonStyleByProvider[provider];

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
              {
                backgroundColor: providerStyle.backgroundColor,
                borderColor: providerStyle.borderColor,
                borderWidth: providerStyle.borderWidth,
              },
              pressed && !buttonDisabled && styles.buttonPressed,
              buttonDisabled && styles.buttonDisabled,
            ]}
          >
            {provider === "google" ? (
              <GoogleLogo />
            ) : (
              <MaterialCommunityIcons
                name={iconByProvider[provider]}
                size={20}
                color={providerStyle.iconColor}
              />
            )}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.label, { color: providerStyle.textColor }]}
            >
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
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
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
