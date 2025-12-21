import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { z } from "zod";

type BucketKey = "current" | "next_memo" | "last_week";

type WeeklyTask = {
  id: string;
  title: string;
  monthlyGoalLabel: string;
  monthlyGoalId: string;
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
    monthlyGoalLabel: "4月 - UX改善",
    monthlyGoalId: "m1",
    estimatedMinutes: 600,
    loggedMinutes: 340,
    bucket: "current",
  },
  {
    id: "w2",
    title: "英語インプット 5h",
    monthlyGoalLabel: "4月 - 英語強化",
    monthlyGoalId: "m2",
    estimatedMinutes: 300,
    loggedMinutes: 120,
    bucket: "current",
  },
  {
    id: "w3",
    title: "筋トレメニュー更新",
    monthlyGoalLabel: "5月 - 体力維持",
    monthlyGoalId: "m3",
    estimatedMinutes: 180,
    loggedMinutes: 0,
    bucket: "next_memo",
  },
  {
    id: "w4",
    title: "読書メモ整理",
    monthlyGoalLabel: "3月 - インプット整理",
    monthlyGoalId: "m4",
    estimatedMinutes: 240,
    loggedMinutes: 240,
    bucket: "last_week",
  },
];

export default function WeeklyTasksScreen() {
  const { t } = useTranslation("weeklyTasks");
  const [bucket, setBucket] = useState<BucketKey>("current");
  const [tasks, setTasks] = useState<WeeklyTask[]>(sampleTasks);
  const [deleteMode, setDeleteMode] = useState(false);

  const filteredTasks = useMemo(() => tasks.filter((task) => task.bucket === bucket), [bucket, tasks]);

  const totals = useMemo(() => {
    const target = filteredTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
    const logged = filteredTasks.reduce((sum, task) => sum + task.loggedMinutes, 0);
    const progress = target > 0 ? Math.min(1, logged / target) : 0;
    return { target, logged, progress };
  }, [filteredTasks]);

  const bucketTabs: { key: BucketKey; label: string }[] = [
    { key: "current", label: t("bucket.current") },
    { key: "next_memo", label: t("bucket.next") },
    { key: "last_week", label: t("bucket.last") },
  ];

  const monthlyGoalOptions = useMemo(
    () => [
      { id: "m1", label: "4月 - UX改善", color: "#38D996" },
      { id: "m2", label: "4月 - 英語強化", color: "#6EA8FF" },
      { id: "m3", label: "5月 - 体力維持", color: "#F2C94C" },
      { id: "m4", label: "3月 - インプット整理", color: "#1E5EFF" },
    ],
    [],
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGoalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const weeklyTaskSchema = z.object({
    title: z.string().trim().min(1),
    bucket: z.union([z.literal("current"), z.literal("next_memo"), z.literal("last_week")]),
    monthlyGoalId: z.string().trim().min(1),
    estimatedHours: z.coerce.number().positive(),
  });

  const [draft, setDraft] = useState({
    title: "",
    bucket: "current" as BucketKey,
    monthlyGoalId: monthlyGoalOptions[0]?.id ?? "",
    estimatedHours: "10",
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setDraft({
      title: "",
      bucket,
      monthlyGoalId: monthlyGoalOptions[0]?.id ?? "",
      estimatedHours: "10",
    });
    setModalError(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (task: WeeklyTask) => {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      bucket: task.bucket,
      monthlyGoalId: task.monthlyGoalId,
      estimatedHours: String(Math.max(1, task.estimatedMinutes) / 60),
    });
    setModalError(null);
    setModalVisible(true);
  };

  const saveDraft = () => {
    const parse = weeklyTaskSchema.safeParse(draft);
    if (!parse.success) {
      const hasEstimated = parse.error.issues.some((issue) => issue.path.includes("estimatedHours"));
      setModalError(hasEstimated ? t("modal.errorEstimated") : t("modal.errorRequired"));
      return;
    }
    const { title, bucket: draftBucket, monthlyGoalId, estimatedHours } = parse.data;
    const selectedGoal = monthlyGoalOptions.find((opt) => opt.id === monthlyGoalId);
    const estimatedMinutes = Math.round(estimatedHours * 60);

    if (editingId) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingId
            ? {
                ...task,
                title,
                bucket: draftBucket,
                monthlyGoalId,
                monthlyGoalLabel: selectedGoal?.label ?? task.monthlyGoalLabel,
                estimatedMinutes,
              }
            : task,
        ),
      );
    } else {
      setTasks((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          title,
          bucket: draftBucket,
          monthlyGoalId,
          monthlyGoalLabel: selectedGoal?.label ?? "",
          estimatedMinutes,
          loggedMinutes: 0,
        },
      ]);
    }

    setModalVisible(false);
  };

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
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
              onPress={handleOpenAdd}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
              <Text style={styles.primaryButtonText}>{t("actions.add")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryPressed,
                deleteMode && styles.secondaryButtonActive,
              ]}
              onPress={() => setDeleteMode((prev) => !prev)}
            >
              <MaterialCommunityIcons
                name={deleteMode ? "close" : "trash-can-outline"}
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.secondaryButtonText}>
                {deleteMode ? t("actions.deleteExit") ?? t("actions.delete") : t("actions.delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {filteredTasks.length === 0 ? (
        <View style={[styles.emptyBox, shadows.card]}>
          <Text style={styles.emptyTitle}>{t("list.emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{t("list.emptyBody")}</Text>
        </View>
      ) : (
        filteredTasks.map((task) => {
          const progress = task.estimatedMinutes > 0 ? Math.min(1, task.loggedMinutes / task.estimatedMinutes) : 0;
          const remaining = Math.max(0, task.estimatedMinutes - task.loggedMinutes);
          return (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                shadows.card,
                deleteMode && styles.taskCardDeleteMode,
              ]}
            >
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
                <Pressable
                  accessibilityRole="button"
                  style={[styles.editButton, deleteMode && styles.dangerButton]}
                  onPress={() => {
                    if (deleteMode) {
                      setTasks((prev) => prev.filter((t) => t.id !== task.id));
                    } else {
                      handleOpenEdit(task);
                    }
                  }}
                >
                  <MaterialCommunityIcons
                    name={deleteMode ? "trash-can-outline" : "pencil-outline"}
                    size={18}
                    color={deleteMode ? colors.error : colors.textPrimary}
                  />
                  <Text style={deleteMode ? styles.dangerButtonText : styles.editButtonText}>
                    {deleteMode ? t("actions.delete") : t("task.edit")}
                  </Text>
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

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.card]}>
            <Text style={styles.modalTitle}>{editingId ? t("modal.editTitle") : t("modal.addTitle")}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("modal.titleLabel")}</Text>
              <TextInput
                multiline
                placeholder={t("modal.titlePlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={styles.modalInput}
                value={draft.title}
                onChangeText={(text) => {
                  setDraft((prev) => ({ ...prev, title: text }));
                  setModalError(null);
                }}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("modal.bucketLabel")}</Text>
              <View style={styles.bucketRow}>
                {bucketTabs.map((tab) => {
                  const active = tab.key === draft.bucket;
                  return (
                    <Pressable
                      key={tab.key}
                      accessibilityRole="button"
                      style={[styles.monthChip, active && styles.monthChipActive]}
                      onPress={() => {
                        setDraft((prev) => ({ ...prev, bucket: tab.key as BucketKey }));
                      }}
                    >
                      <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{tab.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("modal.monthlyGoalLabel")}</Text>
              <Pressable
                accessibilityRole="button"
                style={[styles.selectInput, isGoalDropdownOpen && styles.selectInputActive]}
                onPress={() => setGoalDropdownOpen((prev) => !prev)}
              >
                <View style={styles.selectValueRow}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: monthlyGoalOptions.find((opt) => opt.id === draft.monthlyGoalId)?.color ?? colors.accentPrimary },
                    ]}
                  />
                  <Text style={styles.selectValue}>
                    {monthlyGoalOptions.find((opt) => opt.id === draft.monthlyGoalId)?.label ?? t("task.monthlyLink")}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={isGoalDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textPrimary}
                />
              </Pressable>
              {isGoalDropdownOpen && (
                <View style={styles.selectList}>
                  <View style={styles.selectEdge}>
                    <MaterialCommunityIcons name="chevron-double-up" size={14} color={colors.textSecondary} />
                  </View>
                  <ScrollView style={styles.selectListScroll} showsVerticalScrollIndicator>
                    {monthlyGoalOptions.map((opt) => {
                      const active = opt.id === draft.monthlyGoalId;
                      return (
                        <Pressable
                          key={opt.id}
                          accessibilityRole="button"
                          style={[styles.selectOption, active && styles.selectOptionActive]}
                          onPress={() => {
                            setDraft((prev) => ({ ...prev, monthlyGoalId: opt.id }));
                            setGoalDropdownOpen(false);
                          }}
                        >
                          <View style={styles.selectValueRow}>
                            <View style={[styles.categoryDot, { backgroundColor: opt.color }]} />
                            <Text
                              style={[styles.selectOptionText, active && styles.selectOptionTextActive]}
                              numberOfLines={1}
                            >
                              {opt.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <View style={[styles.selectEdge, styles.selectEdgeBottom]}>
                    <MaterialCommunityIcons name="chevron-double-down" size={14} color={colors.textSecondary} />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("modal.targetLabel")}</Text>
              <TextInput
                placeholder={t("modal.targetPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={styles.modalInput}
                value={draft.estimatedHours}
                keyboardType="numeric"
                onChangeText={(text) => {
                  setDraft((prev) => ({ ...prev, estimatedHours: text }));
                  setModalError(null);
                }}
              />
              <Text style={styles.helperText}>{t("modal.targetHelper")}</Text>
            </View>

            {modalError ? <Text style={styles.errorText}>{modalError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.secondaryButtonText}>{t("modal.cancel")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={saveDraft}>
                <Text style={styles.primaryButtonText}>{t("modal.save")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  monthChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  monthChipActive: {
    backgroundColor: colors.accentPrimary,
    borderColor: "rgba(30,94,255,0.7)",
  },
  monthChipText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: typography.sm,
  },
  monthChipTextActive: {
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
  secondaryButtonActive: {
    borderColor: colors.accentSubtle,
    backgroundColor: "rgba(110,168,255,0.08)",
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
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
  taskCardDeleteMode: {
    borderColor: colors.error,
    backgroundColor: "rgba(242,95,92,0.08)",
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
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: "rgba(242,95,92,0.14)",
    borderColor: colors.error,
    borderWidth: 1,
  },
  dangerButtonText: {
    color: colors.error,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: "#1f3a63",
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    width: "100%",
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  formGroup: {
    gap: spacing.xs,
  },
  formGroupTight: {
    marginBottom: -spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    color: colors.textPrimary,
    minHeight: 54,
    textAlignVertical: "top",
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  bucketRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectInputActive: {
    borderColor: colors.accentSubtle,
    backgroundColor: "rgba(110,168,255,0.1)",
  },
  selectValue: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    flexShrink: 1,
    flex: 1,
    marginRight: spacing.sm,
  },
  selectValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  selectList: {
    width: "100%",
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(12,18,32,0.7)",
    overflow: "hidden",
  },
  selectListScroll: {
    maxHeight: 260,
  },
  selectOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  selectOptionActive: {
    backgroundColor: "rgba(30,94,255,0.12)",
  },
  selectOptionText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    flexShrink: 1,
  },
  selectOptionTextActive: {
    fontWeight: "700",
  },
  selectEdge: {
    alignItems: "center",
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  selectEdgeBottom: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
});
