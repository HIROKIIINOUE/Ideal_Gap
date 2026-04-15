// ６つのメイン機能のページの幹をここで管理。各機能画面へのディスパッチャー。各ページ詳細はcomponents/feature内に格納。
// ダッシュボードページの各リンクボタンでrouter.push({ pathname: "/feature/[feature]", params: { feature: "annual-goals" } })として呼び出される
// また、各機能ページ共通のレイアウトもここで実装している

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ComponentType, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, Pressable, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnnualGoalsScreen from "../../components/feature/AnnualGoalsScreen";
import BreakReminderScreen from "../../components/feature/BreakReminderScreen";
import FocusMusicScreen from "../../components/feature/FocusMusicScreen";
import FunPlanScreen from "../../components/feature/FunPlanScreen";
import IdealSelfScreen from "../../components/feature/IdealSelfScreen";
import LongTermGoalsScreen from "../../components/feature/LongTermGoalsScreen";
import WeeklyTasksScreen from "../../components/feature/WeeklyTasksScreen";
import Footer from "../../components/Footer";
import LanguageSheet from "../../components/LanguageSheet";
import MoreSheet from "../../components/MoreSheet";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { supabase } from "../../lib/supabaseClient";
import { useFunPlan } from "../../providers/FunPlanProvider";

type FeatureId =
  | "ideal-self"
  | "long-term-goals"
  | "annual-goals"
  | "weekly-goals"
  | "focus-music"
  | "break-reminders"
  | "next-fun-plan";

const featureKeys: Record<FeatureId, string> = {
  "ideal-self": "cards.idealSelf.title",
  "long-term-goals": "cards.longTermGoals.title",
  "annual-goals": "cards.annualGoals.title",
  "weekly-goals": "cards.weeklyGoals.title",
  "focus-music": "cards.focusMusic.title",
  "break-reminders": "cards.breakReminders.title",
  "next-fun-plan": "cards.nextFunPlan.title",
};

export default function FeatureScreen() {
  const router = useRouter();
  // useLocalSearchParamsでdashboardから渡された「params: { feature: "〇〇〇〇" } }」の値を読み取る
  const params = useLocalSearchParams<{ feature?: FeatureId }>();
  const { t: tDashboard } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common", { keyPrefix: "moreSheet" });
  const { t: tCommonNav } = useTranslation("common", { keyPrefix: "navigation" });
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
              try {
                await supabase.auth.signOut();
              } catch (error) {
                console.warn("Failed to sign out from feature screen", error);
                return;
              }
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
    if (key === "contact") {
      router.push("/contact");
    }
    if (key === "payment") {
      router.push("/payment-management");
    }
  };

  const featureTitle = useMemo(() => {
    const key = params.feature as FeatureId | undefined;
    if (!key || !(key in featureKeys)) return tDashboard("pageTitle");
    const translationKey = featureKeys[key];
    return tDashboard(translationKey);
  }, [params.feature, tDashboard]);

  const featureId = params.feature as FeatureId | undefined;

  // パラメーターとして受け取ったfeatureIdの値に応じて各コンポーネントへ誘導
  const ScreenComponent = useMemo<ComponentType | null>(() => {
    if (!featureId) return null;
    const mapping: Partial<Record<FeatureId, ComponentType>> = {
      "ideal-self": IdealSelfScreen,
      "long-term-goals": LongTermGoalsScreen,
      "annual-goals": AnnualGoalsScreen,
      "weekly-goals": WeeklyTasksScreen,
      "next-fun-plan": FunPlanScreen,
      "break-reminders": BreakReminderScreen,
      "focus-music": FocusMusicScreen,
    };
    return mapping[featureId] ?? null;
  }, [featureId]);


  // 不正なパラメータ(6つの機能以外のパラメータ)が入力された場合は以下のPlaceholderを表示
  const Placeholder = () => (
    <View style={[styles.card, shadows.card]}>
      <Text style={styles.heading}>{tDashboard("details.heading", { title: featureTitle })}</Text>
      <Text style={styles.body}>{tDashboard("details.body")}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/dashboard")}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonLabel}>{tDashboard("details.back")}</Text>
      </Pressable>
    </View>
  );

  return (
    // 白帯ヘッダーとタイトルカードの余白を狭める方法→edges={["left", "right", "bottom"]}
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Ideal Gap", headerBackTitle: tCommonNav("back") }} />
      <View style={styles.content}>
        {ScreenComponent ? <ScreenComponent /> : <Placeholder />}
      </View>
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
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: 0,
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
