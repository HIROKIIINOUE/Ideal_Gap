import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";

type BucketKey = "current" | "next_memo" | "last_week";

type WeeklyTask = {
  id: string;
  title: string;
  monthlyGoal: string;
  estimatedMinutes: number;
  loggedMinutes: number;
  bucket: BucketKey;
};

const formatMinutes = (minutes: number) => {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;

const sampleTasks: WeeklyTask[] = [
  {
    id: "w1",
    title: "プロダクト改善に3本着手",
    monthlyGoal: "4月 - UX改善",
    estimatedMinutes: 600,
    loggedMinutes: 340,
    bucket: "current",
  },
  {
    id: "w2",
    title: "英語インプット 5h",
    monthlyGoal: "4月 - 英語強化",
    estimatedMinutes: 300,
    loggedMinutes: 120,
    bucket: "current",
  },
  {
    id: "w3",
    title: "筋トレメニュー更新",
    monthlyGoal: "5月 - 体力維持",
    estimatedMinutes: 180,
    loggedMinutes: 0,
    bucket: "next_memo",
  },
  {
    id: "w4",
    title: "読書メモ整理",
    monthlyGoal: "3月 - インプット整理",
    estimatedMinutes: 240,
    loggedMinutes: 240,
    bucket: "last_week",
  },
];

export default function WeeklyTasksScreen() {
  const { t } = useTranslation("weeklyTasks");
  const [bucket, setBucket] = useState<BucketKey>("current");

  const tasks = useMemo(() => sampleTasks.filter((task) => task.bucket === bucket), [bucket]);

  const totals = useMemo(() => {
    const target = tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
    const logged = tasks.reduce((sum, task) => sum + task.loggedMinutes, 0);
    const progress = target > 0 ? Math.min(1, logged / target) : 0;
    return { target, logged, progress };
  }, [tasks]);

  const bucketTabs: { key: BucketKey; label: string }[] = [
    { key: "current", label: t("bucket.current") },
    { key: "next_memo", label: t("bucket.next") },
    { key: "last_week", label: t("bucket.last") },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.headerCard, shadows.card]}>
        <LinearGradient
          colors={["rgba(30,94,255,0.26)", "rgba(12,18,32,0.92)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.headerTop}>
          <Text style={styles.pageTitle}>{t("pageTitle")}</Text>

          <View style={styles.tabRow}>
            {bucketTabs.map((tab) => {
              const active = tab.key === bucket;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="button"
                  onPress={() => setBucket(tab.key)}
                  style={({ pressed }) => [
                    styles.tab,
                    active && styles.tabActive,
                    pressed && styles.tabPressed,
                  ]}
                >
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {bucket === "current" && (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.applyButton, pressed && styles.tabPressed]}
            >
              <Text style={styles.tabLabel}>{t("header.applyNextMemo")}</Text>
            </Pressable>
          )}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t("header.title")}</Text>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressTrack} />
              <View style={[styles.progressFill, { width: `${totals.progress * 100}%` }]} />
            </View>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryLabel}>{t("summary.target")}</Text>
                <Text style={styles.summaryValue}>{formatMinutes(totals.target)}</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryLabel}>{t("summary.logged")}</Text>
                <Text style={styles.summaryValue}>{formatMinutes(totals.logged)}</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryLabel}>{t("summary.remaining")}</Text>
                <Text style={styles.summaryValue}>{formatMinutes(Math.max(0, totals.target - totals.logged))}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
              <Text style={styles.primaryButtonText}>{t("actions.add")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}>
              <Text style={styles.secondaryButtonText}>{t("actions.delete")}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {tasks.length === 0 ? (
        <View style={[styles.emptyBox, shadows.card]}>
          <Text style={styles.emptyTitle}>{t("list.emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{t("list.emptyBody")}</Text>
        </View>
      ) : (
        tasks.map((task) => {
          const progress = task.estimatedMinutes > 0 ? Math.min(1, task.loggedMinutes / task.estimatedMinutes) : 0;
          const remaining = Math.max(0, task.estimatedMinutes - task.loggedMinutes);
          return (
            <View key={task.id} style={[styles.taskCard, shadows.card]}>
              <LinearGradient
                colors={LIST_CARD_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{task.title}</Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View style={styles.progressTrack} />
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>

              <View style={styles.taskFooterRow}>
                <View style={styles.goalStat}>
                  <Text style={styles.statLabel}>{t("summary.target")}</Text>
                  <Text style={styles.statValue}>{formatMinutes(task.estimatedMinutes)}</Text>
                </View>
                <View style={styles.goalStat}>
                  <Text style={styles.statLabel}>{t("summary.logged")}</Text>
                  <Text style={styles.statValue}>{formatMinutes(task.loggedMinutes)}</Text>
                </View>
                <View style={styles.goalStat}>
                  <Text style={styles.statLabel}>{t("summary.remaining")}</Text>
                  <Text style={styles.statValue}>{formatMinutes(remaining)}</Text>
                </View>
                <Pressable accessibilityRole="button" style={styles.editButton} onPress={() => {}}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.editButtonText}>{t("task.edit")}</Text>
                </Pressable>
              </View>

              {bucket === "current" && (
                <View style={[styles.actionsColumn, styles.taskActionsRow]}>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.primaryButtonFull, pressed && styles.primaryPressed]}
                  >
                    <MaterialCommunityIcons name="timer-outline" size={18} color={colors.textPrimary} />
                    <Text style={styles.primaryButtonText}>{t("task.openTimer")}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.secondaryButtonFull, pressed && styles.secondaryPressed]}
                  >
                    <MaterialCommunityIcons name="playlist-edit" size={18} color={colors.textPrimary} />
                    <Text style={styles.secondaryButtonText}>{t("task.manualLog")}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xl,
    gap: spacing.xl * 1.2,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.md,
  },
  headerTop: {
    gap: spacing.md,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
  },
  tabRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tabActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.14)",
  },
  tabPressed: {
    opacity: 0.9,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  headerDescription: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  applyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignSelf: "stretch",
    alignItems: "center",
    width: "100%",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.2)",
  },
  primaryPressed: {
    opacity: 0.92,
    transform: [{ translateY: 1 }],
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  secondaryPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.md,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  summaryStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  summaryStat: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
    position: "relative",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  progressTrack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.full,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accentPrimary,
    borderRadius: radius.full,
  },
  emptyBox: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  taskCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  taskHeader: {
    gap: spacing.xs,
  },
  taskTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  taskFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  goalStat: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignSelf: "flex-end",
    marginLeft: "auto",
  },
  editButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  taskActionsRow: {
    marginTop: spacing.sm,
  },
  actionsColumn: {
    gap: spacing.sm,
  },
  primaryButtonFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.2)",
    width: "100%",
    justifyContent: "center",
  },
  secondaryButtonFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.03)",
    width: "100%",
    justifyContent: "center",
  },
});
