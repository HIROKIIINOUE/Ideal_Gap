import { LinearGradient } from "expo-linear-gradient";
import { Href, Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import MoreSheet from "../components/MoreSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { supabase } from "../lib/supabaseClient";
import { useFunPlan } from "../providers/FunPlanProvider";

type CardKey =
  | "idealSelf"
  | "annualGoals"
  | "monthlyGoals"
  | "weeklyGoals"
  | "focusMusic"
  | "breakReminders"
  | "nextFunPlan";

type DashboardCard = {
  key: CardKey;
  href: Href;
};

const alternatingGradients: readonly [readonly [string, string], readonly [string, string]] = [
  ["rgba(110,152,255,0.26)", "rgba(24,44,72,0.84)"],
  ["rgba(198,225,255,0.2)", "rgba(24,44,72,0.82)"],
];
const HERO_GRADIENT: readonly [string, string] = ["rgba(110,168,255,0.4)", "rgba(15,28,47,0.92)"];

export default function Dashboard() {
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common", { keyPrefix: "moreSheet" });
  const { emailUpdated } = useLocalSearchParams<{ emailUpdated?: string }>();
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [nextFunPlan, setNextFunPlan] = useState<string | null>(null);
  const { funPlanVisible, toggleFunPlan } = useFunPlan();

  const showLogoutToast = () => {
    const message = tCommon("logoutSuccess");
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  //　メールアドレス更新完了のポップアップメッセージ
  useEffect(() => {
    if (!emailUpdated) return;
    Alert.alert(t("notifications.emailUpdated"));
    router.replace("/dashboard");
  }, [emailUpdated, t]);


  // ハンバーガーメニューのハンドラー
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
    if (key === "contact") {
      router.push("/contact");
    }
  };

  // ディスパッチャーである[feature].tsxに遷移させ、paramsを渡す
  const cards: DashboardCard[] = useMemo(
    () => [
      { key: "idealSelf", href: { pathname: "/feature/[feature]", params: { feature: "ideal-self" } } },
      { key: "annualGoals", href: { pathname: "/feature/[feature]", params: { feature: "annual-goals" } } },
      { key: "monthlyGoals", href: { pathname: "/feature/[feature]", params: { feature: "monthly-goals" } } },
      { key: "weeklyGoals", href: { pathname: "/feature/[feature]", params: { feature: "weekly-goals" } } },
      { key: "focusMusic", href: { pathname: "/feature/[feature]", params: { feature: "focus-music" } } },
      { key: "breakReminders", href: { pathname: "/feature/[feature]", params: { feature: "break-reminders" } } },
    ],
    [],
  );

  // ダッシュボード遷移時に最新の楽しい予定リストの1番目を取得する
  const fetchNextFunPlan = useCallback(async () => {
    const session = await supabase.auth.getSession();
    const uid = session.data.session?.user?.id;
    if (!uid || !funPlanVisible) {
      setNextFunPlan(null);
      return;
    }
    const { data, error } = await supabase
      .from("fun_plans")
      .select("id, description, order")
      .eq("user_id", uid)
      .order("order", { ascending: true })
      .limit(1);
    if (error) {
      setNextFunPlan(null);
      return;
    }
    setNextFunPlan(((data as any[]) ?? [])[0]?.description ?? null);
  }, [funPlanVisible]);

  useFocusEffect(
    useCallback(() => {
      fetchNextFunPlan();
    }, [fetchNextFunPlan]),
  );

  // 6つの機能ページへ遷移する各カードを展開
  const renderCard = (card: DashboardCard, index: number) => {
    const rowIndex = Math.floor(index / 2);
    const isEvenRow = rowIndex % 2 === 0;
    const pair = isEvenRow ? alternatingGradients : [alternatingGradients[1], alternatingGradients[0]];
    const gradient = pair[index % 2];

    return (
      <Pressable
        key={card.key}
        accessibilityRole="button"
        onPress={() => router.push(card.href)}
        style={({ pressed }) => [
          styles.tile,
          shadows.card,
          pressed && styles.tilePressed,
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tileGradient}
        />
        <View style={styles.tileHeader}>
          <Text style={styles.tileTitle} >
            {t(`cards.${card.key}.title`)}
          </Text>
          <Text style={styles.tileSubtitle} >
            {t(`cards.${card.key}.subtitle`)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          title: t("pageTitle"),
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>{t("pageTitle")}</Text>
          </View>
        </View>

        {funPlanVisible && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/feature/[feature]", params: { feature: "next-fun-plan" } })}
            style={({ pressed }) => [styles.heroCard, pressed && styles.heroPressed]}
          >
            <LinearGradient
              colors={HERO_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>{t("nextFunPlan.title")}</Text>
              <View style={styles.heroFooter}>
                <Text
                  style={styles.heroCta}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {nextFunPlan ?? t("nextFunPlan.cta")}
                </Text>
              </View>
            </View>
          </Pressable>
        )}

        <View style={styles.grid}>
          {cards.map((card, index) => renderCard(card, index))}
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
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    gap: spacing.lg,
    paddingBottom: spacing.xl * 1.25,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  languageButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  languageLabel: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.divider,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  heroContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: typography.md,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroBody: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
    lineHeight: typography.lg * 1.3,
  },
  heroFooter: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  heroCta: {
    color: colors.textPrimary,
    fontSize: typography.md * 1.3,
    fontWeight: "700",
  },
  heroHelper: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "49%",
    height: 180,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: "hidden",
    position: "relative",
  },
  tileGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tileHeader: {
    gap: spacing.xs,
  },
  tileTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
  },
  tileSubtitle: {
    color: "rgba(233,237,247,0.76)",
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  tilePressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  heroPressed: {
    opacity: 0.94,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  link: {
    color: colors.accentPrimary,
    fontSize: typography.md,
    fontWeight: "600",
  },
  extraLinkRow: {
    alignItems: "flex-start",
  },
});
