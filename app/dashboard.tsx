import { LinearGradient } from "expo-linear-gradient";
import { Href, Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import MoreSheet from "../components/MoreSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { canAccessDashboardWithSubscriptionStatus, getSubscriptionForUser } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";
import { isCompactScreen } from "../lib/ui/responsive";
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
  const { t, i18n } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common", { keyPrefix: "moreSheet" });
  // ユーザ端末からアプリの表示領域(width)、OSの文字サイズ設定(fontScale)を取得する
  const { width, fontScale } = useWindowDimensions();
  const compact = isCompactScreen(width, fontScale);
  // i18n より現在の設定言語を取得
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isFrench = currentLanguage.startsWith("fr");
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
    if (key === "payment") {
      router.push("/payment-management");
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

  // ダッシュボード到達はsubscriptions.statusがactive or trial の時だけ
  // それ以外の場合はダッシュボードに辿り着けないようにここで制御
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const guardDashboardAccess = async () => {
        const { data, error } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (error || !userId) {
          if (active) router.replace("/login");
          return;
        }
        const subscription = await getSubscriptionForUser(userId);
        if (!canAccessDashboardWithSubscriptionStatus(subscription?.status) && active) {
          router.replace("/purchases");
        }
      };
      guardDashboardAccess().catch((guardError) => {
        console.warn("Failed to guard dashboard access", guardError);
      });
      return () => {
        active = false;
      };
    }, []),
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
          <Text
            style={[
              styles.tileTitle,
              isFrench ? styles.tileTitleFr : styles.tileTitleJaEn,
              compact && (isFrench ? styles.tileTitleCompactFr : styles.tileTitleCompactJaEn),
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {t(`cards.${card.key}.title`)}
          </Text>
          <Text
            style={[
              styles.tileSubtitle,
              isFrench ? styles.tileSubtitleFr : styles.tileSubtitleJaEn,
              compact && (isFrench ? styles.tileSubtitleCompactFr : styles.tileSubtitleCompactJaEn),
            ]}
            numberOfLines={6} // 最大表示行数(...で折りたたまれる)
            ellipsizeMode="tail"
          >
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
          title: "Ideal Gap",
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        showsVerticalScrollIndicator={false}
      >
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
            <View style={[styles.heroContent, compact && styles.heroContentCompact]}>
              <Text style={[styles.heroLabel, compact && styles.heroLabelCompact]}>{t("nextFunPlan.title")}</Text>
              <View style={styles.heroFooter}>
                <Text
                  style={[styles.heroCta, compact && styles.heroCtaCompact]}
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
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    gap: spacing.lg,
    paddingBottom: spacing.xl * 1.25,
  },
  contentCompact: {
    paddingHorizontal: spacing.lg,
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
    fontSize: typography.xl * 1.1,
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
  heroContentCompact: {
    padding: spacing.md,
  },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: typography.md,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroLabelCompact: {
    fontSize: typography.md * 0.9,
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
    lineHeight: typography.md * 1.45,
  },
  heroCtaCompact: {
    fontSize: typography.md * 1.08,
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
    minHeight: 168,
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
    fontWeight: "700",
    flexShrink: 1,
  },
  // 6カードタイトル 日本語英語スタイル
  tileTitleJaEn: {
    fontSize: typography.lg,
  },
  // 6カードタイトル フランス語スタイル
  tileTitleFr: {
    fontSize: typography.md * 1.14,
  },
  // 6カードタイトル(compact screen) 日本語英語スタイル
  tileTitleCompactJaEn: {
    fontSize: typography.md * 1.2,
  },
  // 6カードタイトル(compact screen) フランス語スタイル
  tileTitleCompactFr: {
    fontSize: typography.md,
  },
  tileSubtitle: {
    color: "rgba(233,237,247,0.76)",
    flexShrink: 1,
  },
  // 6カード説明文 日本語英語スタイル
  tileSubtitleJaEn: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  // 6カード説明文 フランス語スタイル
  tileSubtitleFr: {
    fontSize: typography.sm * 0.95,
    lineHeight: typography.sm * 1.32,
  },
  // 6カード説明文(compact screen) 日本語英語スタイル
  tileSubtitleCompactJaEn: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.3,
  },
  // 6カード説明文(compact screen) フランス語スタイル
  tileSubtitleCompactFr: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.22,
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
