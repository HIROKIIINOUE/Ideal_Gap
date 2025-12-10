import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../../components/Footer";
import LanguageSheet from "../../components/LanguageSheet";
import MoreSheet from "../../components/MoreSheet";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { supabase } from "../../lib/supabaseClient";
import { useFunPlan } from "../../providers/FunPlanProvider";

type FeatureId =
  | "ideal-self"
  | "annual-goals"
  | "monthly-goals"
  | "weekly-goals"
  | "focus-music"
  | "break-reminders"
  | "next-fun-plan";

const featureKeys: Record<FeatureId, string> = {
  "ideal-self": "cards.idealSelf.title",
  "annual-goals": "cards.annualGoals.title",
  "monthly-goals": "cards.monthlyGoals.title",
  "weekly-goals": "cards.weeklyGoals.title",
  "focus-music": "cards.focusMusic.title",
  "break-reminders": "cards.breakReminders.title",
  "next-fun-plan": "cards.nextFunPlan.title",
};

export default function FeaturePlaceholder() {
  const router = useRouter();
  const params = useLocalSearchParams<{ feature?: FeatureId }>();
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common", { keyPrefix: "moreSheet" });
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const { toggleFunPlan, funPlanVisible } = useFunPlan();

  const showLogoutToast = () => {
    const message = tCommon("logoutSuccess");
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  const handleMoreSelect = async (key: string) => {
    if (key === "logout") {
      Alert.alert(
        tCommon("confirmTitle"),
        tCommon("confirmBody"),
        [
          { text: tCommon("confirmNo"), style: "cancel" },
          {
            text: tCommon("confirmYes"),
            style: "destructive",
            onPress: async () => {
              await supabase.auth.signOut();
              showLogoutToast();
              router.replace("/");
            },
          },
        ],
        { cancelable: true },
      );
    }
    if (key === "toggleFunPlan") {
      toggleFunPlan();
    }
    if (key === "profile") {
      router.push("/profile-update");
    }
  };

  const featureTitle = useMemo(() => {
    const key = params.feature as FeatureId | undefined;
    if (!key || !(key in featureKeys)) return t("pageTitle");
    const translationKey = featureKeys[key];
    return t(translationKey);
  }, [params.feature, t]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.heading}>{t("details.heading", { title: featureTitle })}</Text>
          <Text style={styles.body}>{t("details.body")}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/dashboard")}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonLabel}>{t("details.back")}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Footer
        isAuthenticated
        onLanguagePress={() => setLanguageSheetVisible(true)}
        onMorePress={() => setMoreSheetVisible(true)}
      />
      <LanguageSheet visible={languageSheetVisible} onClose={() => setLanguageSheetVisible(false)} />
      <MoreSheet
        visible={moreSheetVisible}
        onClose={() => setMoreSheetVisible(false)}
        funPlanVisible={funPlanVisible}
        onToggleFunPlan={toggleFunPlan}
        onSelect={handleMoreSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    lineHeight: typography.xl * 1.3,
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
  },
  buttonLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
});
