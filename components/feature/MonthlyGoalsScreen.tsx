import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { z } from "zod";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";

type YearlyGoalOption = {
  id: string;
  name: string;
  color: string;
};

type MonthlyGoal = {
  id: string;
  description: string;
  month: number; // 1-12
  estimatedMinutes: number; // 目標時間（分）
  accumulatedMinutes: number; // 実績時間（分）
  yearlyGoalId: string;
  order: number;
  updatedAt?: string | null;
};

const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;
const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;
const MAX_OPTION_LABEL = 32; // 長い年間目標名をUI崩れなく省略表示する上限
const MONTH_ITEM_WIDTH = 86;
const STORAGE_KEY_SELECTED_MONTH = "monthlyGoals:selectedMonth";

// h/m表記の共通フォーマット
const formatMinutes = (minutes: number) => {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hrs}h`;
  }
  return `${hrs}h ${mins}m`;
};

const truncateLabel = (label: string, maxLength = MAX_OPTION_LABEL) => {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 3).trimEnd()}...`;
};

const monthlyGoalSchema = z.object({
  description: z.string().trim().min(1),
  month: z.number().int().min(1).max(12),
  yearlyGoalId: z.string().trim().min(1),
  estimatedMinutes: z.number().positive(),
});

const seedYearlyGoals: YearlyGoalOption[] = [
  {
    id: "yg-health",
    name: "Deep health routine with consistent sleep and workouts",
    color: "#1E5EFF",
  },
  {
    id: "yg-career",
    name: "Career leap with shipped projects and portfolio refresh",
    color: "#6EA8FF",
  },
  {
    id: "yg-learning",
    name: "Learning and writing habit",
    color: "#4BD0FF",
  },
];

const seedMonthlyGoals: MonthlyGoal[] = [
  {
    id: "mg-feb-1",
    description: "Sleep 7+ hours consistently",
    month: 2,
    estimatedMinutes: 1800, // 30h
    accumulatedMinutes: 900, // 15h
    yearlyGoalId: "yg-health",
    order: 0,
    updatedAt: "2025-02-01T09:00:00Z",
  },
  {
    id: "mg-feb-2",
    description: "Ship portfolio case studies update",
    month: 2,
    estimatedMinutes: 1200, // 20h
    accumulatedMinutes: 600, // 10h
    yearlyGoalId: "yg-career",
    order: 1,
    updatedAt: "2025-02-03T09:00:00Z",
  },
  {
    id: "mg-jan-1",
    description: "Read and summarize two books",
    month: 1,
    estimatedMinutes: 600, // 10h
    accumulatedMinutes: 300, // 5h
    yearlyGoalId: "yg-learning",
    order: 0,
    updatedAt: "2025-01-15T09:00:00Z",
  },
];

export default function MonthlyGoalsScreen() {
  const { t: tMonthly } = useTranslation("monthlyGoals");
  const [goals, setGoals] = useState<MonthlyGoal[]>(seedMonthlyGoals);
  const [deleteMode, setDeleteMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const initialMonth = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const hasSeedForCurrent = seedMonthlyGoals.some((goal) => goal.month === currentMonth);
    return hasSeedForCurrent ? currentMonth : seedMonthlyGoals[0]?.month ?? currentMonth;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [draft, setDraft] = useState<{
    description: string;
    month: string;
    yearlyGoalId: string;
    estimatedHours: string;
  }>({
    description: "",
    month: String(initialMonth),
    yearlyGoalId: seedYearlyGoals[0]?.id ?? "",
    estimatedHours: "10",
  });
  const monthListRef = useRef<FlatList<number>>(null);
  const [isMonthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [isYearlyDropdownOpen, setYearlyDropdownOpen] = useState(false);

  const monthNames = tMonthly("monthsShort", { returnObjects: true }) as string[];

  const monthLabel = (month: number) => {
    const idx = Math.max(0, Math.min(11, month - 1));
    return monthNames[idx] ?? `M${month}`;
  };

  const monthsList = useMemo(() => Array.from({ length: 12 }, (_, idx) => idx + 1), []);

  const targetIndexForMonth = useCallback(
    (month: number) => {
      const idx = month - 2; // 選択月が左から2番目に来るように1つ前を先頭に
      if (idx < 0) return 0;
      if (idx > monthsList.length - 1) return monthsList.length - 1;
      return idx;
    },
    [monthsList.length],
  );

  const scrollToMonth = useCallback(
    (month: number, animated = true) => {
      const idx = targetIndexForMonth(month);
      try {
        monthListRef.current?.scrollToIndex({ index: idx, animated });
      } catch {
        const offset = (MONTH_ITEM_WIDTH + spacing.xs) * idx;
        monthListRef.current?.scrollToOffset({ offset, animated: false });
      }
    },
    [targetIndexForMonth],
  );

  useEffect(() => {
    const loadSelectedMonth = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_SELECTED_MONTH);
        if (stored) {
          const parsed = Number(stored);
          if (parsed >= 1 && parsed <= 12) {
            setSelectedMonth(parsed);
            setDraft((prev) => ({ ...prev, month: String(parsed) }));
            scrollToMonth(parsed, false);
          }
        }
      } catch (error) {
        console.warn("Failed to load selected month", error);
      }
    };
    loadSelectedMonth();
  }, [scrollToMonth]);

  useEffect(() => {
    scrollToMonth(selectedMonth, true);
  }, [selectedMonth, scrollToMonth]);

  const filteredGoals = useMemo(
    () => goals.filter((goal) => goal.month === selectedMonth).sort((a, b) => a.order - b.order),
    [goals, selectedMonth],
  );

  const totalTarget = filteredGoals.reduce((sum, goal) => sum + goal.estimatedMinutes, 0);
  const totalLogged = filteredGoals.reduce((sum, goal) => sum + goal.accumulatedMinutes, 0);
  const progressRatio = totalTarget > 0 ? Math.min(1, totalLogged / totalTarget) : 0;

  const getYearlyGoal = (id: string) => seedYearlyGoals.find((g) => g.id === id);

  const handleAddPress = () => {
    setEditingId(null);
    setDraft({
      description: "",
      month: String(selectedMonth),
      yearlyGoalId: seedYearlyGoals[0]?.id ?? "",
      estimatedHours: "10",
    });
    setModalError(null);
    setModalVisible(true);
    setMonthDropdownOpen(false);
    setYearlyDropdownOpen(false);
  };

  const handleEditPress = (goal: MonthlyGoal) => {
    setEditingId(goal.id);
    setDraft({
      description: goal.description,
      month: String(goal.month),
      yearlyGoalId: goal.yearlyGoalId,
      estimatedHours: String(Math.max(1, Math.round(goal.estimatedMinutes / 60))),
    });
    setModalError(null);
    setModalVisible(true);
    setMonthDropdownOpen(false);
    setYearlyDropdownOpen(false);
  };

  const handleToggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
  };

  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    setDraft((prev) => ({ ...prev, month: String(month) }));
    AsyncStorage.setItem(STORAGE_KEY_SELECTED_MONTH, String(month)).catch((error) => {
      console.warn("Failed to persist selected month", error);
    });
    scrollToMonth(month, true);
  };

  const handleDelete = (goal: MonthlyGoal) => {
    Alert.alert(tMonthly("deleteConfirmTitle"), tMonthly("deleteConfirmBody"), [
      { text: tMonthly("deleteConfirmNo"), style: "cancel" },
      {
        text: tMonthly("deleteConfirmYes"),
        style: "destructive",
        onPress: () => {
          const nextGoals = goals
            .filter((g) => g.id !== goal.id)
            .map((g, idx) => ({
              ...g,
              order: idx,
            }));
          setGoals(nextGoals);
        },
      },
    ]);
  };

  const handleSave = () => {
    const parsed = monthlyGoalSchema.safeParse({
      description: draft.description,
      month: Number(draft.month),
      yearlyGoalId: draft.yearlyGoalId,
      estimatedMinutes: Number(draft.estimatedHours) * 60,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues;
      const hasMonthError = issues.some((issue) => issue.path[0] === "month");
      const hasEstimateError = issues.some((issue) => issue.path[0] === "estimatedMinutes");
      if (hasMonthError) {
        setModalError(tMonthly("modal.errorMonthRange"));
      } else if (hasEstimateError) {
        setModalError(tMonthly("modal.errorEstimated"));
      } else {
        setModalError(tMonthly("modal.errorRequired"));
      }
      return;
    }

    const payload: MonthlyGoal = {
      id: editingId ?? `mg-${Date.now()}`,
      description: parsed.data.description,
      month: parsed.data.month,
      estimatedMinutes: parsed.data.estimatedMinutes,
      accumulatedMinutes: editingId
        ? goals.find((g) => g.id === editingId)?.accumulatedMinutes ?? 0
        : 0,
      yearlyGoalId: parsed.data.yearlyGoalId,
      order: editingId ? goals.find((g) => g.id === editingId)?.order ?? 0 : 0,
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      setGoals((prev) =>
        prev
          .map((goal) => (goal.id === editingId ? { ...payload } : goal))
          .map((goal, idx) => ({ ...goal, order: idx })),
      );
    } else {
      setGoals((prev) => [
        payload,
        ...prev.map((goal, idx) => ({ ...goal, order: idx + 1 })),
      ]);
    }

    setMonthDropdownOpen(false);
    setYearlyDropdownOpen(false);
    setModalVisible(false);
    setEditingId(null);
    setModalError(null);
  };

  const handleDragEnd = ({ data }: { data: MonthlyGoal[] }) => {
    const next = data.map((goal, idx) => ({ ...goal, order: idx }));
    setGoals(next);
  };

  const renderGoalCard = ({ item, drag, isActive }: RenderItemParams<MonthlyGoal>) => {
    const progress = item.estimatedMinutes > 0 ? Math.min(1, item.accumulatedMinutes / item.estimatedMinutes) : 0;
    const remaining = Math.max(0, item.estimatedMinutes - item.accumulatedMinutes);
    return (
      <Pressable
        key={item.id}
        onLongPress={drag}
        delayLongPress={120}
        disabled={deleteMode && isActive}
        style={[
          styles.goalCard,
          shadows.card,
          isActive && styles.goalCardDragging,
          deleteMode && styles.goalCardDeleteMode,
        ]}
      >
        <LinearGradient
          colors={LIST_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.goalTitle}>{item.description}</Text>


        <View style={styles.progressBarContainer}>
          <View style={styles.progressTrack} />
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.goalFooterRow}>
          <View style={styles.goalStat}>
            <Text style={styles.statLabel}>{tMonthly("summary.targetLabel")}</Text>
            <Text style={styles.statValue}>{formatMinutes(item.estimatedMinutes)}</Text>
          </View>
          <View style={styles.goalStat}>
            <Text style={styles.statLabel}>{tMonthly("summary.loggedLabel")}</Text>
            <Text style={styles.statValue}>{formatMinutes(item.accumulatedMinutes)}</Text>
          </View>
          <View style={styles.goalStat}>
            <Text style={styles.statLabel}>{tMonthly("summary.remainingLabel", { defaultValue: "Remaining" })}</Text>
            <Text style={styles.statValue}>{formatMinutes(remaining)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => (deleteMode ? handleDelete(item) : handleEditPress(item))}
            style={[deleteMode ? styles.dangerButton : styles.editButton, styles.iconButtonRow]}
          >
            <MaterialCommunityIcons
              name={deleteMode ? "trash-can-outline" : "pencil-outline"}
              size={16}
              color={deleteMode ? colors.error : colors.textPrimary}
            />
            <Text style={deleteMode ? styles.dangerButtonText : styles.editButtonText}>
              {deleteMode ? tMonthly("delete") : tMonthly("modal.editTitle")}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const hasGoals = filteredGoals.length > 0;
  const modalTitle = editingId ? tMonthly("modal.editTitle") : tMonthly("modal.addTitle");

  return (
    <GestureHandlerRootView style={styles.ghRoot}>
      <View style={[styles.card, shadows.card]}>
        <LinearGradient colors={HEADER_CARD_GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>{tMonthly("pageTitle")}</Text>
        </View>

        <View style={styles.monthSelector}>
          <Text style={styles.label}>{tMonthly("monthSelector.label")}</Text>
          <FlatList
            ref={monthListRef}
            data={monthsList}
            keyExtractor={(item) => String(item)}
            horizontal
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={targetIndexForMonth(selectedMonth)}
            getItemLayout={(_, index) => ({
              length: MONTH_ITEM_WIDTH + spacing.xs,
              offset: (MONTH_ITEM_WIDTH + spacing.xs) * index,
              index,
            })}
            snapToInterval={MONTH_ITEM_WIDTH + spacing.xs}
            decelerationRate="fast"
            contentContainerStyle={styles.monthChips}
            onScrollToIndexFailed={(info) => {
              const fallbackIndex = targetIndexForMonth(selectedMonth);
              const offset = (MONTH_ITEM_WIDTH + spacing.xs) * fallbackIndex;
              monthListRef.current?.scrollToOffset({ offset, animated: false });
            }}
            renderItem={({ item: month }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={monthLabel(month)}
                onPress={() => handleSelectMonth(month)}
                style={[
                  styles.monthChip,
                  month === selectedMonth && styles.monthChipActive,
                ]}
              >
                <Text style={[styles.monthChipText, month === selectedMonth && styles.monthChipTextActive]}>
                  {monthLabel(month)}
                </Text>
              </Pressable>
            )}
          />
        </View>

        <View style={[styles.summaryCard, shadows.card]}>
          <Text style={styles.summaryTitle}>{tMonthly("summary.title")}</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressTrack} />
            <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.goalStat}>
              <Text style={styles.statLabel}>{tMonthly("summary.targetLabel")}</Text>
              <Text style={styles.statValue}>{formatMinutes(totalTarget)}</Text>
            </View>
            <View style={styles.goalStat}>
              <Text style={styles.statLabel}>{tMonthly("summary.loggedLabel")}</Text>
              <Text style={styles.statValue}>{formatMinutes(totalLogged)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{tMonthly("add")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, deleteMode && styles.secondaryButtonActive]}
            onPress={handleToggleDeleteMode}
          >
            <MaterialCommunityIcons
              name={deleteMode ? "close" : "trash-can-outline"}
              size={20}
              color={colors.textPrimary}
            />
            <Text style={styles.secondaryButtonText}>{deleteMode ? tMonthly("deleteExit") : tMonthly("delete")}</Text>
          </Pressable>
        </View>
      </View>

      {hasGoals ? (
        <View style={styles.listSpacing}>
          <DraggableFlatList
            data={filteredGoals}
            keyExtractor={(item) => item.id}
            onDragEnd={handleDragEnd}
            renderItem={renderGoalCard}
            scrollEnabled={false}
            contentContainerStyle={styles.goalGrid}
          />
        </View>
      ) : (
        <View style={[styles.card, shadows.card, styles.emptyCard, styles.listSpacing]}>
          <LinearGradient
            colors={LIST_CARD_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.emptyTitle}>{tMonthly("empty.title")}</Text>
          <Text style={styles.emptyBody}>{tMonthly("empty.body")}</Text>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{tMonthly("add")}</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.card]}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{tMonthly("modal.descriptionLabel")}</Text>
              <TextInput
                autoFocus
                multiline
                placeholder={tMonthly("modal.descriptionPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={styles.modalInput}
                value={draft.description}
                onChangeText={(text) => {
                  setDraft((prev) => ({ ...prev, description: text }));
                  setModalError(null);
                }}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{tMonthly("modal.monthLabel")}</Text>
              <Pressable
                accessibilityRole="button"
                style={[styles.selectInput, isMonthDropdownOpen && styles.selectInputActive]}
                onPress={() => {
                  setMonthDropdownOpen((prev) => !prev);
                  setYearlyDropdownOpen(false);
                }}
              >
                <Text style={styles.selectValue}>{monthLabel(Number(draft.month))}</Text>
                <MaterialCommunityIcons
                  name={isMonthDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textPrimary}
                />
              </Pressable>
              {isMonthDropdownOpen && (
                <View style={styles.selectList}>
                  <View style={styles.selectEdge}>
                    <MaterialCommunityIcons name="chevron-double-up" size={14} color={colors.textSecondary} />
                  </View>
                  <ScrollView style={styles.selectListScroll} showsVerticalScrollIndicator>
                    {monthsList.map((month) => (
                      <Pressable
                        key={month}
                        accessibilityRole="button"
                        accessibilityLabel={monthLabel(month)}
                        onPress={() => {
                          setDraft((prev) => ({ ...prev, month: String(month) }));
                          setMonthDropdownOpen(false);
                        }}
                        style={[
                          styles.selectOption,
                          Number(draft.month) === month && styles.selectOptionActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectOptionText,
                            Number(draft.month) === month && styles.selectOptionTextActive,
                          ]}
                        >
                          {monthLabel(month)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={[styles.selectEdge, styles.selectEdgeBottom]}>
                    <MaterialCommunityIcons name="chevron-double-down" size={14} color={colors.textSecondary} />
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.formGroup, styles.formGroupTight]}>
              <Text style={styles.label}>{tMonthly("modal.yearlyGoalLabel")}</Text>
              <Pressable
                accessibilityRole="button"
                style={[styles.selectInput, isYearlyDropdownOpen && styles.selectInputActive]}
                onPress={() => {
                  setYearlyDropdownOpen((prev) => !prev);
                  setMonthDropdownOpen(false);
                }}
              >
                <View style={styles.selectValueRow}>
                  <View
                    style={[styles.categoryDot, { backgroundColor: getYearlyGoal(draft.yearlyGoalId)?.color ?? colors.accentPrimary }]}
                  />
                  <Text style={styles.selectValue}>{truncateLabel(getYearlyGoal(draft.yearlyGoalId)?.name ?? "")}</Text>
                </View>
                <MaterialCommunityIcons
                  name={isYearlyDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textPrimary}
                />
              </Pressable>
              {isYearlyDropdownOpen && (
                <View style={styles.selectList}>
                  <View style={styles.selectEdge}>
                    <MaterialCommunityIcons name="chevron-double-up" size={14} color={colors.textSecondary} />
                  </View>
                  <ScrollView style={styles.selectListScroll} showsVerticalScrollIndicator>
                    {seedYearlyGoals.map((option) => (
                      <Pressable
                        key={option.id}
                        accessibilityRole="button"
                        onPress={() => {
                          setDraft((prev) => ({ ...prev, yearlyGoalId: option.id }));
                          setYearlyDropdownOpen(false);
                        }}
                        style={[
                          styles.selectOption,
                          draft.yearlyGoalId === option.id && styles.selectOptionActive,
                        ]}
                      >
                        <View style={[styles.categoryDot, { backgroundColor: option.color }]} />
                        <Text
                          style={[
                            styles.selectOptionText,
                            draft.yearlyGoalId === option.id && styles.selectOptionTextActive,
                          ]}
                        >
                          {truncateLabel(option.name)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={[styles.selectEdge, styles.selectEdgeBottom]}>
                    <MaterialCommunityIcons name="chevron-double-down" size={14} color={colors.textSecondary} />
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.formGroup, styles.formGroupAfterTight]}>
              <Text style={styles.label}>{tMonthly("modal.targetLabel")}</Text>
              <TextInput
                placeholder={tMonthly("modal.targetPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={styles.modalInput}
                keyboardType="numeric"
                value={draft.estimatedHours}
                onChangeText={(text) => {
                  setDraft((prev) => ({ ...prev, estimatedHours: text }));
                  setModalError(null);
                }}
              />
              <Text style={styles.helperText}>{tMonthly("modal.targetHelper")}</Text>
            </View>

            {!!modalError && <Text style={styles.modalError}>{modalError}</Text>}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={() => {
                  setModalVisible(false);
                  setMonthDropdownOpen(false);
                  setYearlyDropdownOpen(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>{tMonthly("modal.cancel")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleSave}>
                <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.primaryButtonText}>{tMonthly("modal.save")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  ghRoot: {
    flex: 1,
  },
  card: {
    backgroundColor: "#1c3358",
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  reorderHint: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
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
  secondaryButtonActive: {
    borderColor: colors.accentSubtle,
    backgroundColor: "rgba(110,168,255,0.08)",
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginBottom: spacing.xs,
  },
  monthSelector: {
    gap: spacing.xs,
  },
  monthChips: {
    paddingHorizontal: spacing.xs,
  },
  monthChip: {
    minWidth: MONTH_ITEM_WIDTH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginRight: spacing.xs,
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
    position: "relative",
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
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  goalCardDragging: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  goalCardDeleteMode: {
    borderColor: colors.error,
  },
  goalTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
  },
  goalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  orderChip: {
    marginLeft: "auto",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  orderChipText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  goalFooterRow: {
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
  editButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  dangerButtonText: {
    color: colors.error,
    fontWeight: "700",
  },
  iconButtonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
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
  formGroupAfterTight: {
    marginTop: -spacing.xs,
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
  selectValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  selectValue: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    flexShrink: 1,
  },
  selectList: {
    width: "100%",
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(12,18,32,0.7)",
    overflow: "hidden",
    alignSelf: "stretch",
  },
  selectListScroll: {
    maxHeight: 140,
    width: "100%",
  },
  selectOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  selectOptionActive: {
    backgroundColor: "rgba(30,94,255,0.14)",
  },
  selectOptionText: {
    color: colors.textSecondary,
    fontWeight: "700",
    flexShrink: 1,
  },
  selectOptionTextActive: {
    color: colors.textPrimary,
  },
  selectEdge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: spacing.md,
  },
  selectEdgeBottom: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  selectEdgeText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: spacing.xs / 2,
  },
  modalError: {
    color: colors.error,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  listSpacing: {
    marginTop: spacing.md,
  },
  goalGrid: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  emptyCard: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
});
