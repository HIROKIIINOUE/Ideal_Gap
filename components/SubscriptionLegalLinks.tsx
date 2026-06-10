// Privacy policy と Term of Use への遷移ボタン（サインアップページ、支払いページに設置）
// Privacy policyはiOSとAndroidで同じ、Term of UseはiOSの場合は公式ドキュメントAndroidの場合は自作のNotionページへ遷移
import { useCallback } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../constants/theme";
import {
  PRIVACY_POLICY_URL,
  getTermsOfUseUrl,
} from "../lib/subscriptionLegal";

type SubscriptionLegalLinksProps = {
  privacyPolicyLabel: string;
  termsOfUseLabel: string;
};

export default function SubscriptionLegalLinks({
  privacyPolicyLabel,
  termsOfUseLabel,
}: SubscriptionLegalLinksProps) {
  const termsOfUseUrl = getTermsOfUseUrl(Platform.OS);

  const openExternalLink = useCallback(async (url: string) => {
    await Linking.openURL(url);
  }, []);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        onPress={() => {
          openExternalLink(PRIVACY_POLICY_URL).catch((error) => {
            console.warn("Failed to open privacy policy", error);
          });
        }}
      >
        <Text style={styles.linkText}>{privacyPolicyLabel}</Text>
      </Pressable>
      <Text style={styles.separator}>•</Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => {
          openExternalLink(termsOfUseUrl).catch((error) => {
            console.warn("Failed to open terms of use", error);
          });
        }}
      >
        <Text style={styles.linkText}>{termsOfUseLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  linkText: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    textDecorationLine: "underline",
  },
  separator: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
});
