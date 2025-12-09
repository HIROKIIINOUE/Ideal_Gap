import { LinearGradient } from "expo-linear-gradient";
import { Href, router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import MoreSheet from "../components/MoreSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

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
  ["rgba(77,125,255,0.16)", "rgba(15,28,47,0.92)"],
  ["rgba(160,195,255,0.12)", "rgba(15,28,47,0.9)"],
];

export default function Dashboard() {
  const { t } = useTranslation("dashboard");
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);

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
          <Text style={styles.tileTitle}>{t(`cards.${card.key}.title`)}</Text>
          <Text style={styles.tileSubtitle}>{t(`cards.${card.key}.subtitle`)}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{t("pageTitle")}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>{t("pageTitle")}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/feature/[feature]", params: { feature: "next-fun-plan" } })}
          style={({ pressed }) => [styles.heroCard, pressed && styles.heroPressed]}
        >
          <LinearGradient
            colors={["rgba(30,94,255,0.28)", "rgba(12,18,32,0.92)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>{t("nextFunPlan.title")}</Text>
            <View style={styles.heroFooter}>
              <Text style={styles.heroCta}>{t("nextFunPlan.cta")}</Text>
              <Text style={styles.heroHelper}>{t("nextFunPlan.emptyLabel")}</Text>
            </View>
          </View>
        </Pressable>

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
      <MoreSheet visible={moreSheetVisible} onClose={() => setMoreSheetVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  heroContent: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroLabel: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
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
    fontSize: typography.md,
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
    width: "48%",
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
    position: "relative",
  },
  tileGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
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
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pillText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
    letterSpacing: 0.2,
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
