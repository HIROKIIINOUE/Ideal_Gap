import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { z } from "zod";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { supabase } from "../../lib/supabaseClient";
import { Database } from "../../types/database";
import Loading from "../Loading";

type AnnualGoal = {
  id: string;
  description: string;
  goalColor: string;
  accumulatedMinutes: number;
  order: number;
  updatedAt: string | null;
};

type YearlyGoalRow = Database["public"]["Tables"]["yearly_goals"]["Row"];

const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;
const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;
const COLOR_OPTIONS = [
  "#1E5EFF", // primary blue
  "#6EA8FF", // soft blue
  "#4BD0FF", // cyan
  "#1EC6A0", // teal
  "#38D996", // green
  "#9B8CFF", // violet
  "#C677F2", // purple-mauve
  "#F25F5C", // coral red
  "#F2C94C", // yellow
  "#FF9F6E", // warm amber
] as const;

const goalSchema = z.object({
  description: z.string().trim().min(1),
  goalColor: z.string().trim().min(1),
});

// 分の合計値から「◯時間◯分」というフォーマットに変換する処理
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


// データベースから取得した年間目標の情報を必要なデータのみに整形する
const toAnnualGoal = (row: YearlyGoalRow): AnnualGoal => ({
  id: row.id,
  description: row.description,
  goalColor: row.year_goal_color,
  accumulatedMinutes: row.accumulated_time_year ?? 0,
  order: row.order ?? 0,
  updatedAt: row.updated_at ?? null,
});

export default function AnnualGoalsScreen() {
  const { t: tAnnual } = useTranslation("annualGoals");
  const [goals, setGoals] = useState<AnnualGoal[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUpdatedAt, setEditingUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ description: string; goalColor: string }>({
    description: "",
    goalColor: COLOR_OPTIONS[0],
  });

  // Supabase Authからログインユーザ情報を取得
  const fetchUserId = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;
    setUserId(uid);
    return uid;
  }, []);

  // データベースからユーザの年間目標データを取得し必要なデータのみに絞った上で状態変数goalsにセットするロジック
  useEffect(() => {
    let active = true;
    const fetchGoals = async () => {
      setLoading(true);
      setErrorMessage(null);
      const uid = await fetchUserId();
      if (!uid) {
        if (active) setErrorMessage(tAnnual("errors.loginMissing"));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("yearly_goals")
        .select("id, description, year_goal_color, accumulated_time_year, order, updated_at")
        .eq("user_id", uid)
        .order("order", { ascending: true });

      if (error) {
        if (active) setErrorMessage(error.message ?? tAnnual("errors.fetchFailed"));
      } else if (active) {
        const mapped = ((data as YearlyGoalRow[]) ?? []).map(toAnnualGoal);
        setGoals(mapped);
      }
      if (active) setLoading(false);
    };

    fetchGoals();
    return () => {
      active = false;
    };
  }, [fetchUserId, tAnnual]);

  // インストールから何日後か計算(92日前を仮のインストール日として計算している）
  const installDate = useMemo(() => new Date(Date.now() - 1000 * 60 * 60 * 24 * 92), []);
  const daysSinceInstall = useMemo(
    () => Math.max(1, Math.ceil((Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24))),
    [installDate],
  );

  // ドーナツ型円グラフ作成のためのデータ取得
  const chartData = useMemo(() => {
    if (goals.length === 0) return [];
    return goals.map((goal, idx) => ({
      value: Math.max(goal.accumulatedMinutes, 1),
      color: goal.goalColor || COLOR_OPTIONS[idx % COLOR_OPTIONS.length],
    }));
  }, [goals]);

  // 合計時間の算出
  const totalMinutes = useMemo(
    () => goals.reduce((sum, goal) => sum + Math.max(goal.accumulatedMinutes, 0), 0),
    [goals],
  );
  const averagePerDay = totalMinutes / daysSinceInstall;

  const handleAddPress = () => {
    setEditingId(null);
    setDraft({ description: "", goalColor: COLOR_OPTIONS[0] });
    setModalError(null);
    setModalVisible(true);
  };

  const handleToggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
  };

  const handleEditPress = (goal: AnnualGoal) => {
    setEditingId(goal.id);
    setDraft({
      description: goal.description,
      goalColor: goal.goalColor,
    });
    setEditingUpdatedAt(goal.updatedAt);
    setModalError(null);
    setModalVisible(true);
  };

  const handleDelete = (goal: AnnualGoal) => {
    Alert.alert(tAnnual("deleteConfirmTitle"), tAnnual("deleteConfirmBody"), [
      { text: tAnnual("deleteConfirmNo"), style: "cancel" },
      {
        text: tAnnual("deleteConfirmYes"),
        style: "destructive",
        onPress: async () => {
          const uid = userId ?? (await fetchUserId());
          if (!uid) {
            Alert.alert(tAnnual("errors.deleteFailed"), tAnnual("errors.loginMissing"));
            return;
          }
          // データベースから削除するロジック
          const { error } = await supabase.from("yearly_goals").delete().eq("id", goal.id);
          if (error) {
            Alert.alert(tAnnual("errors.deleteFailed"), error.message);
            return;
          }
          // 削除したデータを表示しないようにタイムリーにUIに反映させるロジック
          const nextGoals = goals
            .filter((g) => g.id !== goal.id)
            .map((g, idx) => ({
              ...g,
              order: idx,
            }));
          setGoals(nextGoals);

          if (nextGoals.length > 0) {
            // 定数updatesに正しい順番の年間目標をセットし、データベース更新に使用
            const updates = nextGoals.map((item, idx) => ({
              id: item.id,
              description: item.description,
              year_goal_color: item.goalColor,
              accumulated_time_year: item.accumulatedMinutes,
              order: idx,
              user_id: uid,
            }));

            const { error: upsertError } = await supabase.from("yearly_goals").upsert(updates, { onConflict: "id" });
            if (upsertError) {
              Alert.alert(tAnnual("errors.reorderSaveFailed"), upsertError.message);
            }
          }
        },
      },
    ]);
  };

  // 新規追加・アップデートの「追加ボタン」ロジック
  const handleSave = async () => {
    const parsed = goalSchema.safeParse(draft);
    if (!parsed.success) {
      setModalError(tAnnual("modal.errorRequired"));
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      const uid = userId ?? (await fetchUserId());
      if (!uid) {
        setModalError(tAnnual("errors.loginMissing"));
        setSaving(false);
        return;
      }

      // 「編集ボタン」からモーダルを開いた場合の処理
      if (editingId) {
        const { data, error } = await supabase
          .from("yearly_goals")
          .update({
            description: parsed.data.description,
            year_goal_color: parsed.data.goalColor,
          })
          .eq("id", editingId)
          .select("id, description, year_goal_color, accumulated_time_year, order, updated_at")
          .single();
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as YearlyGoalRow;
        setGoals((prev) => prev.map((goal) => (goal.id === editingId ? toAnnualGoal(row) : goal)));
      } else {
        // 「新規追加ボタン」からモーダルを開いた場合の処理
        // ↓ 既存のgoalsのorderを＋１に更新し、新しいデータをorder0として処理する準備をする
        const nextOrderGoals = goals.map((goal, idx) => ({ ...goal, order: idx + 1 }));
        const { data, error } = await supabase
          .from("yearly_goals")
          .insert({
            user_id: uid,
            description: parsed.data.description,
            year_goal_color: parsed.data.goalColor,
            accumulated_time_year: 0,
            order: 0,
          })
          .select("id, description, year_goal_color, accumulated_time_year, order, updated_at")
          .single();
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as YearlyGoalRow;
        const upsertPayload = [
          ...nextOrderGoals.map((goal, idx) => ({
            id: goal.id,
            description: goal.description,
            year_goal_color: goal.goalColor,
            accumulated_time_year: goal.accumulatedMinutes,
            order: idx + 1,
            user_id: uid,
          })),
          {
            id: row.id,
            description: row.description,
            year_goal_color: row.year_goal_color,
            accumulated_time_year: row.accumulated_time_year ?? 0,
            order: 0,
            user_id: uid,
          },
        ];

        // ここで更新された情報(upsertPayload)をデータベースに反映
        // upsert → onConflictで指定したキーがDBに存在すれば更新、存在しなければ挿入を実行
        const { error: upsertError } = await supabase.from("yearly_goals").upsert(upsertPayload, { onConflict: "id" });
        if (upsertError) {
          setModalError(upsertError.message);
          setSaving(false);
          return;
        }
        setGoals((prev) => [toAnnualGoal(row), ...prev.map((goal, idx) => ({ ...goal, order: idx + 1 }))]);
      }
      setModalVisible(false);
      setEditingId(null);
      setEditingUpdatedAt(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tAnnual("errors.saveFailed");
      setModalError(message);
    } finally {
      setSaving(false);
    }
  };

  // ドラッグの順番並び替えが終わった時に発火
  const handleDragEnd = async ({ data }: { data: AnnualGoal[] }) => {
    setGoals(
      data.map((goal, idx) => ({
        ...goal,
        order: idx,
      })),
    );
    const uid = userId ?? (await fetchUserId());
    if (!uid) {
      Alert.alert(tAnnual("errors.reorderSaveFailed"), tAnnual("errors.loginMissing"));
      return;
    }

    const updates = data.map((goal, idx) => ({
      id: goal.id,
      description: goal.description,
      year_goal_color: goal.goalColor,
      accumulated_time_year: goal.accumulatedMinutes,
      order: idx,
      user_id: uid,
    }));

    //　ここで更新された情報をデータベースに反映
    const { error } = await supabase.from("yearly_goals").upsert(updates, { onConflict: "id" });
    if (error) {
      Alert.alert(tAnnual("errors.reorderSaveFailed"), error.message);
    }
  };

  // 指定のPressable要素の長押しドラッグを可能にするロジック
  const renderGoalCard = ({ item, drag, isActive }: RenderItemParams<AnnualGoal>) => (
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
      <View style={styles.goalFooter}>
        <View style={styles.colorRow}>
          <View style={[styles.colorDot, { backgroundColor: item.goalColor }]} />
          <Text style={styles.goalTime}>{formatMinutes(item.accumulatedMinutes)}</Text>
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
            {deleteMode ? tAnnual("delete") : tAnnual("modal.editTitle")}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const hasGoals = goals.length > 0;
  const modalTitle = editingId ? tAnnual("modal.editTitle") : tAnnual("modal.addTitle");

  if (loading) {
    return (
      <GestureHandlerRootView style={styles.ghRoot}>
        <Loading />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.ghRoot}>
      <View style={[styles.card, shadows.card]}>
        <LinearGradient
          colors={HEADER_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headingArea}>
          <Text style={styles.heading}>{tAnnual("pageTitle")}</Text>
        </View>
        {hasGoals && (
          <View style={styles.chartContainer}>
            <View style={styles.chartSummaryRow}>
              <View style={styles.donutFallbackOuter}>
                <View
                  style={[
                    styles.donutFallbackRing,
                    {
                      borderTopColor: chartData[0]?.color ?? COLOR_OPTIONS[0],
                      borderRightColor: chartData[1]?.color ?? COLOR_OPTIONS[1],
                      borderBottomColor: chartData[2]?.color ?? COLOR_OPTIONS[2],
                      borderLeftColor: chartData[3]?.color ?? COLOR_OPTIONS[3],
                    },
                  ]}
                />
                <View style={styles.donutFallbackInner} />
                <View style={styles.centerLabel}>
                  <Text style={styles.centerLabelTitle}>{tAnnual("chart.title")}</Text>
                </View>
              </View>
              <View style={styles.chartSummary}>
                <Text style={styles.centerLabelSubTitle}>{tAnnual("chart.totalLabel")}</Text>
                <Text style={styles.centerLabelValue}>{formatMinutes(totalMinutes)}</Text>
                <Text style={styles.centerLabelCaption}>
                  {tAnnual("chart.avgPerDayLabel", { value: formatMinutes(averagePerDay) })}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{tAnnual("add")}</Text>
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
            <Text style={styles.secondaryButtonText}>{deleteMode ? tAnnual("deleteExit") : tAnnual("delete")}</Text>
          </Pressable>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

      {hasGoals ? (
        <View style={styles.listSpacing}>
          <DraggableFlatList
            data={goals}
            keyExtractor={(item) => item.id}
            renderItem={renderGoalCard}
            onDragEnd={handleDragEnd}
            scrollEnabled={false}
            activationDistance={10}
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
          <Text style={styles.emptyTitle}>{tAnnual("emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{tAnnual("emptyBody")}</Text>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{tAnnual("emptyCta")}</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={styles.modalContainer}>
            <View style={[styles.modalCard, shadows.card]}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{tAnnual("modal.descriptionLabel")}</Text>
                  {editingUpdatedAt ? (
                    <Text style={styles.labelMeta}>
                      {tAnnual("updatedSuffix")} {new Date(editingUpdatedAt).toLocaleDateString()}
                    </Text>
                  ) : null}
                </View>
                <TextInput
                  autoFocus
                  multiline
                  placeholder={tAnnual("modal.placeholder")}
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
                <Text style={styles.label}>{tAnnual("modal.colorLabel")}</Text>
                <View style={styles.swatchRow}>
                  {COLOR_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityLabel={tAnnual("modal.colorA11y", { color: option })}
                      onPress={() => setDraft((prev) => ({ ...prev, goalColor: option }))}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: option },
                        draft.goalColor === option && styles.colorSwatchActive,
                      ]}
                    >
                      {draft.goalColor === option && (
                        <MaterialCommunityIcons name="check" size={16} color={colors.textPrimary} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {!!modalError && <Text style={styles.modalError}>{modalError}</Text>}
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.secondaryButtonText}>{tAnnual("modal.cancel")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.primaryButton, saving && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.primaryButtonText}>{tAnnual("modal.save")}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
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
  headingArea: {
    flex: 1,
    gap: spacing.sm,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    lineHeight: typography.xl * 1.3,
  },
  chartContainer: {
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "transparent",
    alignSelf: "flex-start",
  },
  chartSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  centerLabelTitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    textAlign: "center",
  },
  centerLabelSubTitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    textAlign: "left",
  },
  centerLabelValue: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  centerLabelCaption: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    textAlign: "left",
  },
  centerLabel: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    width: 96,
  },
  donutFallbackOuter: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
  },
  donutFallbackRing: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 18,
    borderColor: "rgba(30,94,255,0.25)",
    backgroundColor: "transparent",
  },
  donutFallbackInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0F1C2F",
    position: "absolute",
  },
  chartSummary: {
    gap: spacing.xs,
    maxWidth: 200,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
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
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
  },
  goalGrid: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  goalCard: {
    backgroundColor: "#1c3358",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
  },
  goalCardDragging: {
    borderColor: "rgba(110,168,255,0.6)",
    backgroundColor: "rgba(30,94,255,0.08)",
  },
  goalCardDeleteMode: {
    borderColor: "rgba(242,95,92,0.5)",
  },
  goalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  goalTime: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  goalTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
    lineHeight: typography.lg * 1.4,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  editButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.sm,
  },
  dangerButton: {
    borderColor: "rgba(242,95,92,0.4)",
    backgroundColor: "rgba(242,95,92,0.08)",
  },
  dangerButtonText: {
    color: colors.error,
    fontWeight: "700",
    fontSize: typography.sm,
  },
  iconButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  emptyCard: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  listSpacing: {
    marginTop: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContainer: {
    width: "100%",
  },
  modalCard: {
    backgroundColor: "#1f3a63",
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  formGroup: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  labelMeta: {
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
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  colorSwatchActive: {
    borderColor: colors.textPrimary,
    shadowColor: "#0A1224",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  modalError: {
    color: colors.error,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
