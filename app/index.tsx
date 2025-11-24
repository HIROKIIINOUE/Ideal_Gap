import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { ReactNode, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

export default function Index() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;

  // ヒーロー画面のフェードイン
  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 800,
      delay: 320,
      useNativeDriver: true,
    }).start();
  }, [heroAnim]);

  // スクロール時のカードフェードイン
  const fadeUp = (inputStart: number, inputEnd: number) => ({
    opacity: scrollY.interpolate({
      inputRange: [inputStart, inputEnd],
      outputRange: [0, 1],
      extrapolate: "clamp",
    }),
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [inputStart, inputEnd],
          outputRange: [28, 0],
          extrapolate: "clamp",
        }),
      },
    ],
  });

  const overviewHighlights = useMemo(
    () => [
      "理想の自分を可視化し、年間・月間・週間の目標を一本の線でつなぐ",
      "タスク集中音楽と休憩通知で、集中と回復のリズムを整える",
      "マルチデバイス・マルチ言語対応（日本語/英語/フランス語）",
    ],
    [],
  );

  // カード共通コンポーネント
  const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
    <View style={[styles.cardShell, style]}>
      <View style={styles.card}>
        <LinearGradient
          colors={["rgba(30,94,255,0.18)", "rgba(15,28,47,0.8)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    </View>
  );

  const billingDetails = useMemo(
    () => [
      "初月無料・次月以降 8.5 CAD/月 (30日ごと課金)",
      "支払いステータス: 有効 / 支払い失敗 / キャンセル予約",
      "再サインアップ時は無料プラン適用なし",
    ],
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.heroShell,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroCard}>
            <LinearGradient
              colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.logo}>Ideal Gap</Text>
            <Text style={styles.title}>理想に向けた最初の一歩を。</Text>
            <Text style={styles.subtitle}>
              Apple HIG に沿ったシンプルで高級感のある体験で、続けやすさをデザイン。
            </Text>
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>初月無料・次月以降 8.5 CAD/月 (30日)</Text>
            </View>
            <View style={styles.actions}>
              <Link href="/signup" asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.buttonShell,
                    styles.buttonShadow,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonInner}
                  >
                    <Text style={styles.primaryLabel}>無料で始める</Text>
                  </LinearGradient>
                </Pressable>
              </Link>
              <Link href="/login" asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.buttonShell,
                    styles.buttonShadow,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.buttonInner, styles.secondaryInner]}
                  >
                    <Text style={styles.secondaryLabel}>サインイン</Text>
                  </LinearGradient>
                </Pressable>
              </Link>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.section, fadeUp(60, 200)]}>
          <Text style={styles.sectionLabel}>Why Ideal Gap</Text>
          <Text style={styles.sectionTitle}>理想と日常を結ぶ、6 つの柱</Text>
          <Card>
            <Text style={styles.cardHeading}>アプリの概要</Text>
            <Text style={styles.cardBody}>
              理想の自分を定義し、年間・月間・週間の目標、集中できるタスクタイマー、タスク集中音楽、休憩通知で習慣化を支える。
              すべてのデータはシンプルな UI に整理され、毎日の進捗が明確に見える。
            </Text>
            <View style={styles.bulletList}>
              {overviewHighlights.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View style={[styles.section, fadeUp(220, 360)]}>
          <Text style={styles.sectionLabel}>Membership</Text>
          <Text style={styles.sectionTitle}>シンプルな定額プラン</Text>
          <View style={styles.cardRow}>
            <Card style={styles.planCard}>
              <Text style={styles.planPrice}>8.5 CAD</Text>
              <Text style={styles.planPeriod}>/月 (30日ごと)</Text>
              <Text style={styles.cardBody}>
                初月無料。登録日を起点に 30 日ごとに自動更新。いつでもキャンセル予約が可能。
              </Text>
              <View style={styles.bulletList}>
                {billingDetails.map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <View style={styles.bulletDotAccent} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            </Card>
            <Card style={styles.planCard}>
              <Text style={styles.cardHeading}>安心の運用</Text>
              <Text style={styles.cardBody}>
                支払い失敗時はステータスを明示し、再開もスムーズ。
                無料プランは初回のみ適用。再サインアップ時は有料プランから開始。
              </Text>
              <Text style={styles.caption}>
                アプリ内決済や詳細フローは今後の実装で追加予定です。
              </Text>
            </Card>
          </View>
        </Animated.View>

        <Animated.View style={[styles.section, fadeUp(360, 520)]}>
          <Text style={styles.sectionLabel}>Get Started</Text>
          <Text style={styles.sectionTitle}>まずはサインアップから</Text>
          <Card>
            <Text style={styles.cardBody}>
              目標設定・タスク集中音楽・休憩通知をまとめて体験。無料期間終了後も 8.5 CAD/月で継続できます。
            </Text>
            <View style={styles.actions}>
              <Link href="/signup" asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.buttonShell,
                    styles.buttonShadow,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonInner}
                  >
                    <Text style={styles.primaryLabel}>無料で始める</Text>
                  </LinearGradient>
                </Pressable>
              </Link>
              <Link href="/login" asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.buttonShell,
                    styles.buttonShadow,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonInner}
                  >
                    <Text style={styles.primaryLabel}>サインイン</Text>
                  </LinearGradient>
                </Pressable>
              </Link>
            </View>
          </Card>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroShell: {
    borderRadius: radius.xl,
    ...shadows.card,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    overflow: "hidden",
  },
  logo: {
    fontSize: typography.sm,
    color: colors.accentSubtle,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: typography.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: typography.xl * 1.2,
  },
  subtitle: {
    fontSize: typography.md,
    color: colors.textSecondary,
    lineHeight: typography.md * 1.5,
  },
  pricePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.overlay,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    marginVertical: spacing.sm,
  },
  priceText: {
    color: colors.textPrimary,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "nowrap",
    alignItems: "stretch",
    width: "100%",
    justifyContent: "space-between",
  },
  buttonShell: {
    borderRadius: radius.lg,
    overflow: "hidden",
    flex: 1,
    minWidth: 0,
  },

  buttonInner: {
    width: "100%",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)", // primary の場合
    borderColor: "rgba(155,193,255,0.9)",
  },

  // secondary 用にバリエーション作るなら
  secondaryInner: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.28)",
  },
  primaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(155,193,255,0.9)",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.28)",
  },
  primaryLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: typography.md,
  },
  buttonShadow: {
    ...shadows.button,
  },
  buttonPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  buttonGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  cardGradient: {
    borderRadius: radius.lg,
    opacity: 0.6,
  },
  heroGradient: {
    borderRadius: radius.xl,
    opacity: 0.75,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.18)",
    gap: spacing.md,
    overflow: "hidden",
  },
  cardShell: {
    borderRadius: radius.lg,
    ...shadows.card,
  },
  cardRow: {
    flexDirection: "column",
    gap: spacing.md,
  },
  cardHeading: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.divider,
    marginTop: spacing.xs / 2,
  },
  bulletDotAccent: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentPrimary,
    marginTop: spacing.xs / 2,
  },
  bulletText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    flex: 1,
    lineHeight: typography.md * 1.4,
  },
  planCard: {
    flex: 1,
  },
  planPrice: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
  },
  planPeriod: {
    color: colors.textSecondary,
    fontSize: typography.md,
    marginBottom: spacing.sm,
  },
  primaryBackground: {
    backgroundColor: colors.accentPrimary,
  },
  radiusSm: {
    borderRadius: radius.md,
  },
  radiusLg: {
    borderRadius: radius.lg,
  },
});
