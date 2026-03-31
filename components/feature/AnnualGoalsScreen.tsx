import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PieChart } from "react-native-gifted-charts";
import { z } from "zod";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAppZodForm } from "../../hooks/useAppZodForm";
import { useDeleteMode } from "../../hooks/useDeleteMode";
import { useKeyboardDismissAccessory } from "../../hooks/useKeyboardDismissAccessory";
import { useOfflineActionGuard } from "../../hooks/useOfflineActionGuard";
import { deleteYearlyGoal, fetchYearlyGoals, insertYearlyGoal, updateYearlyGoal, upsertYearlyGoals, YearlyGoalRow } from "../../lib/api/supabase/annualGoals";
import { getUserId } from "../../lib/api/supabase/common";
import { deleteYearlyGoals } from "../../lib/api/supabase/goals/allItemDelete";
import { closedModalState, createAddModalState, createEditModalState, ModalState } from "../../lib/common/modalState";
import { buildOfflineCacheKey, readOfflineCache, writeOfflineCache } from "../../lib/offline/cache";
import { useOffline } from "../../providers/OfflineProvider";
import KeyboardDismissButton from "../KeyboardDismissButton";
import Loading from "../Loading";
import OfflineRequiredScreen from "../OfflineRequiredScreen";

type AnnualGoal = {
  id: string;
  description: string;
  goalColor: string;
  accumulatedMinutes: number;
  order: number;
  updatedAt: string | null;
  completed: boolean;
};

const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;
const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;
const COMPLETED_CARD_GRADIENT = ["rgba(56,217,150,0.2)", "rgba(10,28,24,0.96)"] as const;
const COLOR_OPTIONS = [
  "#2E5FB3", // vivid royal
  "#3F7CF5", // bright cobalt
  "#5A9BFF", // clear blue
  "#7AB7FF", // light azure
  "#1FB8E8", // electric cyan
  "#2EC7A6", // crisp teal
  "#55D38D", // bright green-teal
  "#A68BFF", // clear violet for contrast
  "#c41a78ff", // red
  "#838485ff", // gray
] as const;

const goalSchema = z.object({
  description: z.string().trim().min(1),
  goalColor: z.string().trim().min(1),
});

type GoalFormValues = z.infer<typeof goalSchema>;
const offlineAnnualGoalSchema = z.array(
  z.object({
    id: z.string(),
    description: z.string(),
    goalColor: z.string(),
    accumulatedMinutes: z.number(),
    order: z.number(),
    updatedAt: z.string().nullable(),
    completed: z.boolean().optional().default(false),
  }),
);

const DEFAULT_FORM_VALUES: GoalFormValues = {
  description: "",
  goalColor: COLOR_OPTIONS[0],
};

// 更新日表示の文章を生成
const formatUpdatedDate = (iso?: string | null, suffix?: string) => {
  if (!iso) return "";
  try {
    return `${new Date(iso).toLocaleDateString()} ${suffix ?? ""}`.trim();
  } catch {
    return suffix ?? "";
  }
};

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


// 合計時間、各年間目標の積上時間の表記が9桁を超えた場合は...で折りたたむ
const truncateText = (value: string, maxLength = 9) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
};


// データベースから取得した年間目標の情報を必要なデータのみに整形する
const toAnnualGoal = (row: YearlyGoalRow): AnnualGoal => ({
  id: row.id,
  description: row.description,
  goalColor: row.year_goal_color,
  accumulatedMinutes: row.accumulated_time_year ?? 0,
  order: row.order ?? 0,
  updatedAt: row.updated_at ?? null,
  completed: row.is_done ?? false,
});

export default function AnnualGoalsScreen() {
  const { t, i18n } = useTranslation("annualGoals");
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  const [goals, setGoals] = useState<AnnualGoal[]>([]);
  const { deleteMode, toggleDeleteMode, disableDeleteMode } = useDeleteMode();
  const [modalState, setModalState] = useState<ModalState>(closedModalState);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasOfflineCache, setHasOfflineCache] = useState(false);
  const { offlineBlocked } = useOffline();
  const guardOfflineAction = useOfflineActionGuard();
  const updatedLabel = t("updatedSuffix");
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isFrench = currentLanguage.startsWith("fr");
  const {
    control, // Controller が使う“フォーム管理本体”
    handleSubmit,
    reset,
    clearErrors,
    setValue,
    watch,
    formState: { errors }, // バリデーション結果（Zodが作ったメッセージ等）
  } = useAppZodForm({
    schema: goalSchema,
    defaultValues: DEFAULT_FORM_VALUES,
  });
  const goalColor = watch("goalColor");

  // データベースからユーザの年間目標データを取得し必要なデータのみに絞った上で状態変数goalsにセットするロジック
  useEffect(() => {
    let active = true;
    const fetchGoals = async () => {
      setLoading(true);
      setErrorMessage(null);
      const uid = await getUserId();
      if (!uid) {
        if (active) setErrorMessage(t("errors.loginMissing"));
        setLoading(false);
        return;
      }

      // ローカルキャッシュのキー名を生成
      const cacheKey = buildOfflineCacheKey("annual-goals", uid);
      // オフラインの場合、生成したキー名を使ってローカルキャッシュデータを取りに行く(キャッシュデータがなければ後ほどオフラインページ表示へ遷移される)
      if (offlineBlocked) {
        const cached = await readOfflineCache(cacheKey, offlineAnnualGoalSchema);
        if (active) {
          if (cached) {
            setGoals(cached);
            setHasOfflineCache(true);
          } else {
            setHasOfflineCache(false);
          }
          setLoading(false);
        }
        return; // オフラインの場合はここでデータフェッチ処理終了
      }

      const { data, error } = await fetchYearlyGoals(uid);

      if (error) {
        if (active) setErrorMessage(error.message ?? t("errors.fetchFailed"));
      } else if (active) {
        const mapped = ((data as YearlyGoalRow[]) ?? []).map(toAnnualGoal);
        setGoals(mapped);
        // データが空配列ではない場合、ローカルキャッシュに保存
        setHasOfflineCache(mapped.length > 0);
        await writeOfflineCache(cacheKey, offlineAnnualGoalSchema, mapped);
      }
      if (active) setLoading(false);
    };

    fetchGoals();
    return () => {
      active = false;
    };
  }, [offlineBlocked, t]);

  // 合計時間の算出
  const totalMinutes = useMemo(
    () => goals.reduce((sum, goal) => sum + Math.max(goal.accumulatedMinutes, 0), 0),
    [goals],
  );

  // ドーナツ型円グラフ作成のためのデータ取得
  const chartData = useMemo(() => {
    if (goals.length === 0) {
      return [{ value: 1, color: "#000000" }];
    }
    const hasAnyProgress = totalMinutes > 0;
    return goals.map((goal, idx) => ({
      value: hasAnyProgress ? Math.max(goal.accumulatedMinutes, 0) : 1,
      color: goal.goalColor || COLOR_OPTIONS[idx % COLOR_OPTIONS.length],
    }));
  }, [goals, totalMinutes]);

  const handleAddPress = () => {
    if (guardOfflineAction()) return;
    setModalError(null);
    reset(DEFAULT_FORM_VALUES);
    setModalState(createAddModalState());
    clearErrors();
  };

  // 全ての年間目標削除機能
  const handleBulkDelete = async () => {
    if (guardOfflineAction()) return;
    const uid = await getUserId();
    if (!uid) {
      Alert.alert(t("deleteConfirmTitle"), t("errors.loginMissing"));
      return;
    }
    try {
      await deleteYearlyGoals({ userId: uid });
      setGoals([]);
      Alert.alert(t("bulkDeleteSuccess.title"), t("bulkDeleteSuccess.body"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.deleteFailed");
      Alert.alert(t("deleteConfirmTitle"), message);
    }
  };

  // 全削除機能後のポップアップメッセージ、全削除ならhandleBulkDeleteが発火される
  const confirmBulkDelete = () => {
    Alert.alert(t("bulkDelete.title"), t("bulkDelete.message"), [
      {
        text: t("bulkDelete.all"),
        style: "destructive",
        onPress: handleBulkDelete,
      },
      {
        text: t("bulkDelete.cancel"),
        style: "cancel",
      },
    ]);
  };

  const handleEditPress = (goal: AnnualGoal) => {
    if (guardOfflineAction()) return;
    reset({
      description: goal.description,
      goalColor: goal.goalColor,
    });
    setModalState(createEditModalState(goal.id, { updatedAt: goal.updatedAt }));
    setModalError(null);
    clearErrors();
  };

  // 目標完了トグルボタンロジック
  const handleToggleCompleted = async (goalId: string) => {
    const currentGoal = goals.find((goal) => goal.id === goalId);
    if (!currentGoal) return;

    const nextCompleted = !currentGoal.completed;
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId ? { ...goal, completed: nextCompleted } : goal,
      ),
    );

    try {
      const { data, error } = await updateYearlyGoal(goalId, { is_done: nextCompleted });
      if (error) {
        throw error;
      }
      if (!data) return;
      const row = data as unknown as YearlyGoalRow;
      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === goalId ? { ...toAnnualGoal(row), completed: row.is_done ?? false } : goal,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.saveFailed");
      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === goalId ? { ...goal, completed: currentGoal.completed } : goal,
        ),
      );
      Alert.alert(t("errors.saveFailed"), message);
    }
  };

  const handleDelete = (goal: AnnualGoal) => {
    if (guardOfflineAction()) return;
    Alert.alert(t("deleteConfirmTitle"), t("deleteConfirmBody"), [
      { text: t("deleteConfirmNo"), style: "cancel" },
      {
        text: t("deleteConfirmYes"),
        style: "destructive",
        onPress: async () => {
          const uid = await getUserId();
          if (!uid) {
            Alert.alert(t("errors.deleteFailed"), t("errors.loginMissing"));
            return;
          }
          // データベースから削除するロジック
          try {
            await deleteYearlyGoal(goal.id);
          } catch (error) {
            const message = error instanceof Error ? error.message : t("errors.deleteFailed");
            Alert.alert(t("errors.deleteFailed"), message);
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

          let reorderError = false;
          if (nextGoals.length > 0) {
            // 定数updatesに正しい順番の年間目標をセットし、データベース更新に使用
            const updates = nextGoals.map((item, idx) => ({
              id: item.id,
              description: item.description,
              year_goal_color: item.goalColor,
              accumulated_time_year: item.accumulatedMinutes,
              is_done: item.completed,
              order: idx,
              user_id: uid,
            }));

            const { error: upsertError } = await upsertYearlyGoals(updates);
            if (upsertError) {
              Alert.alert(t("errors.reorderSaveFailed"), upsertError.message);
              reorderError = true;
            }
          }

          if (!reorderError) {
            Alert.alert(t("deleteSuccess.title"), t("deleteSuccess.body"));
          }
        },
      },
    ]);
  };

  // 新規追加・アップデートの「追加ボタン」ロジック
  const onValidSubmit = async ({ description, goalColor }: GoalFormValues) => {
    if (guardOfflineAction()) return;
    setSaving(true);
    setModalError(null);
    try {
      const uid = await getUserId();
      if (!uid) {
        setModalError(t("errors.loginMissing"));
        setSaving(false);
        return;
      }

      // 「編集ボタン」からモーダルを開いた場合の処理
      if (modalState.editingId) {
        const { data, error } = await updateYearlyGoal(modalState.editingId, {
          description,
          year_goal_color: goalColor,
        });
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as YearlyGoalRow;
        setGoals((prev) =>
          prev.map((goal) =>
            goal.id === modalState.editingId ? toAnnualGoal(row) : goal,
          ),
        );
      } else {
        // 「新規追加ボタン」からモーダルを開いた場合の処理
        // ↓ 既存のgoalsのorderを＋１に更新し、新しいデータをorder0として処理する準備をする
        const shiftedExisting = goals.map((goal, idx) => ({
          id: goal.id,
          description: goal.description,
          year_goal_color: goal.goalColor,
          is_done: goal.completed,
          accumulated_time_year: goal.accumulatedMinutes,
          order: idx + 1,
          user_id: uid,
        }));
        const { data, error } = await insertYearlyGoal({
          user_id: uid,
          description,
          year_goal_color: goalColor,
          is_done: false,
          accumulated_time_year: 0,
          order: 0,
        });
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as YearlyGoalRow;
        const { error: upsertError } = await upsertYearlyGoals([
          ...shiftedExisting,
          {
            id: row.id,
            description: row.description,
            year_goal_color: row.year_goal_color,
            is_done: row.is_done ?? false,
            accumulated_time_year: row.accumulated_time_year ?? 0,
            order: 0,
            user_id: uid,
          },
        ]);

        if (upsertError) {
          setModalError(upsertError.message);
          setSaving(false);
          return;
        }
        setGoals((prev) => [toAnnualGoal(row), ...prev.map((goal, idx) => ({ ...goal, order: idx + 1 }))]);
      }
      setModalState(closedModalState);
      reset(DEFAULT_FORM_VALUES);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("errors.saveFailed");
      setModalError(message);
    } finally {
      setSaving(false);
    }
  };

  const onInvalidSubmit = (formErrors: FieldErrors<GoalFormValues>) => {
    setModalError(t("modal.errorRequired"));
  };

  // ドラッグの順番並び替えが終わった時に発火
  const handleDragEnd = async ({ data }: { data: AnnualGoal[] }) => {
    if (guardOfflineAction()) return;
    setGoals(
      data.map((goal, idx) => ({
        ...goal,
        order: idx,
      })),
    );
    const uid = await getUserId();
    if (!uid) {
      Alert.alert(t("errors.reorderSaveFailed"), t("errors.loginMissing"));
      return;
    }

    const updates = data.map((goal, idx) => ({
      id: goal.id,
      description: goal.description,
      year_goal_color: goal.goalColor,
      is_done: goal.completed,
      accumulated_time_year: goal.accumulatedMinutes,
      order: idx,
      user_id: uid,
    }));

    //　ここで更新された情報をデータベースに反映
    const { error } = await upsertYearlyGoals(updates);
    if (error) {
      Alert.alert(t("errors.reorderSaveFailed"), error.message);
    }
  };

  // 指定のPressable要素の長押しドラッグを可能にするロジック
  const renderGoalCard = ({ item, drag, isActive }: RenderItemParams<AnnualGoal>) => (
    <View
      style={[
        styles.goalCard,
        item.completed && styles.goalCardCompleted,
        shadows.card,
        isActive && styles.goalCardDragging,
        deleteMode && styles.goalCardDeleteMode,
      ]}
      testID={`annual-goal-card-${item.id}`}
    >
      <LinearGradient
        colors={item.completed ? COMPLETED_CARD_GRADIENT : LIST_CARD_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={[styles.goalTitle, item.completed && styles.goalTitleCompleted]}>
        {item.description}
      </Text>
      <View style={styles.goalFooter}>
        <View style={styles.colorRow}>
          <View style={[styles.colorDot, { backgroundColor: item.goalColor }]} />
          <Text
            style={[styles.goalTime, item.completed && styles.goalTimeCompleted]}
            testID={`annual-goal-card-time-${item.id}`}
          >
            {truncateText(formatMinutes(item.accumulatedMinutes))}
          </Text>
          {item.completed ? (
            <View style={styles.completedBadge} testID={`annual-goal-card-completed-badge-${item.id}`}>
              <Text style={styles.completedBadgeText}>{t("completion.badge")}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.goalActions} testID={`annual-goal-card-actions-${item.id}`}>
          {deleteMode ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => handleDelete(item)}
              style={[styles.dangerButton, styles.iconButtonRow]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
              <Text style={styles.dangerButtonText}>{t("delete")}</Text>
            </Pressable>
          ) : (
            <>
              {!item.completed ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("modal.editTitle")}
                  onPress={() => handleEditPress(item)}
                  style={[styles.goalActionIconButton, styles.dragHandleButton]}
                  testID={`annual-goal-card-edit-${item.id}`}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textPrimary} />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.completed ? t("completion.undo") : t("completion.complete")}
                onPress={() => handleToggleCompleted(item.id)}
                style={[styles.goalActionIconButton, styles.completeButton, item.completed && styles.completeButtonActive]}
                testID={`annual-goal-card-complete-${item.id}`}
              >
                <MaterialCommunityIcons
                  name={item.completed ? "check-circle" : "check-circle-outline"}
                  size={20}
                  color={item.completed ? colors.success : colors.textPrimary}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("reorderHandle", { defaultValue: "Drag to reorder" })}
                style={[styles.goalActionIconButton, styles.dragHandleButton, isActive && styles.dragHandleButtonActive]}
                onLongPress={drag}
                delayLongPress={200}
                hitSlop={14}
                testID={`annual-goal-card-reorder-${item.id}`}
              >
                <MaterialCommunityIcons name="swap-vertical-bold" size={20} color={colors.textSecondary} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const hasGoals = goals.length > 0;
  const modalTitle = modalState.editingId ? t("modal.editTitle") : t("modal.addTitle");
  const modalUpdatedText = modalState.meta?.updatedAt ? formatUpdatedDate(modalState.meta.updatedAt, updatedLabel) : null;

  if (loading) {
    return (
      <GestureHandlerRootView style={styles.ghRoot}>
        <Loading />
      </GestureHandlerRootView>
    );
  }

  // オフラインかつキャッシュデータがない場合は専用のオフラインページを表示する
  if (offlineBlocked && !hasOfflineCache) {
    return (
      <GestureHandlerRootView style={styles.ghRoot}>
        <OfflineRequiredScreen />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.ghRoot}>
      {/* DraggableFlatListは１つのコンポーネントとして記載している */}
      {/* 各属性としてDOMなどを設定する特殊な書き方なので注意 */}
      {/* データが空の時にDOM表示する”ListEmptyComponent”など特殊な属性が使われている */}
      <DraggableFlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalCard}
        onDragEnd={handleDragEnd}
        activationDistance={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.goalGrid}
        ListHeaderComponent={(
          <View style={[styles.card, shadows.card]}>
            <LinearGradient
              colors={HEADER_CARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.headingArea}>
              <Text style={[styles.heading, isFrench && styles.headingFrench]}>{t("pageTitle")}</Text>
            </View>
            {hasGoals && (
              <View style={styles.chartContainer}>
                <View style={styles.chartSummaryRow}>
                  <PieChart
                    data={chartData}
                    donut
                    radius={70}
                    innerRadius={58}
                    innerCircleColor="#1c3358"
                    showText={false}
                    strokeWidth={0}
                    focusOnPress={false}
                    centerLabelComponent={() => (
                      <View style={styles.centerLabel}>
                        <Text style={styles.centerLabelTitle}>{t("chart.title")}</Text>
                      </View>
                    )}
                  />
                  <View style={styles.chartSummary}>
                    <Text style={styles.centerLabelSubTitle}>{t("chart.totalLabel")}</Text>
                    <Text style={styles.centerLabelValue} testID="annual-goals-total-time">
                      {truncateText(formatMinutes(totalMinutes))}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.actionRow}>
              {!deleteMode && (
                <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress} disabled={offlineBlocked}>
                  <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
                  <Text style={[styles.primaryButtonText, isFrench && styles.headerButtonTextFrench]}>{t("add")}</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                style={[styles.secondaryButton, deleteMode && styles.secondaryButtonActive]}
                onPress={toggleDeleteMode}
                disabled={offlineBlocked}
              >
                <MaterialCommunityIcons
                  name={deleteMode ? "close" : "trash-can-outline"}
                  size={20}
                  color={colors.textPrimary}
                />
                <Text style={[styles.secondaryButtonText, isFrench && styles.headerButtonTextFrench]}>
                  {deleteMode ? t("deleteExit") : t("delete")}
                </Text>
              </Pressable>
              {deleteMode && (
                <Pressable
                  accessibilityRole="button"
                  style={[styles.secondaryButton, styles.bulkDeleteButton]}
                  onPress={confirmBulkDelete}
                  disabled={offlineBlocked}
                >
                  <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={colors.textPrimary} />
                  <Text style={[styles.secondaryButtonText, isFrench && styles.headerButtonTextFrench]}>
                    {t("bulkDelete.button", { defaultValue: "Delete all" })}
                  </Text>
                </Pressable>
              )}
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        )}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={(
          <View style={[styles.card, shadows.card, styles.emptyCard]}>
            <LinearGradient
              colors={LIST_CARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("emptyBody")}</Text>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress} disabled={offlineBlocked}>
              <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
              <Text style={styles.primaryButtonText}>{t("emptyCta")}</Text>
            </Pressable>
          </View>
        )}
      />

      <Modal
        visible={modalState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalState(closedModalState);
          disableDeleteMode();
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={dismissKeyboard}
          testID="annual-goals-modal-overlay"
        >
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: "padding", android: undefined })}
            style={styles.modalContainer}
            testID="annual-goals-modal-kav"
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="annual-goals-modal-scroll"
            >
              <Pressable
                style={[styles.modalCard, shadows.card]}
                onPress={(event) => event.stopPropagation()}
              >
                <Text style={styles.modalTitle}>{modalTitle}</Text>

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{t("modal.descriptionLabel")}</Text>
                  </View>
                  {modalUpdatedText ? (
                    <View style={styles.modalMeta}>
                      <Text style={styles.modalMetaText}>{modalUpdatedText}</Text>
                    </View>
                  ) : null}
                  <Controller
                    control={control}
                    name="description"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        multiline
                        placeholder={t("modal.placeholder")}
                        placeholderTextColor={colors.textSecondary}
                        style={styles.modalInput}
                        value={value}
                        onChangeText={(text) => {
                          onChange(text);
                          setModalError(null);
                          clearErrors("description");
                        }}
                        onBlur={onBlur}
                      />
                    )}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t("modal.colorLabel")}</Text>
                  <View style={styles.swatchRow}>
                    {COLOR_OPTIONS.map((option) => (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityLabel={t("modal.colorA11y", { color: option })}
                        onPress={() => {
                          setValue("goalColor", option, { shouldValidate: true });
                          setModalError(null);
                          clearErrors("goalColor");
                        }}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: option },
                          goalColor === option && styles.colorSwatchActive,
                        ]}
                      >
                        {goalColor === option && (
                          <MaterialCommunityIcons name="check" size={16} color={colors.textPrimary} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>

                {(modalError || errors.description?.message || errors.goalColor?.message) && (
                  <Text style={styles.modalError}>
                    {modalError ?? errors.description?.message ?? errors.goalColor?.message}
                  </Text>
                )}
                <View style={styles.modalFooterRow}>
                  <View style={[styles.modalActions, styles.modalActionsRight]}>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.secondaryButton}
                      onPress={() => setModalState(closedModalState)}
                    >
                      <Text style={styles.secondaryButtonText}>{t("modal.cancel")}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.primaryButton, saving && styles.buttonDisabled]}
                      onPress={handleSubmit(onValidSubmit, onInvalidSubmit)}
                      disabled={saving}
                    >
                      <Text style={styles.primaryButtonText}>{t("modal.save")}</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
          {keyboardVisible ? (
            <KeyboardDismissButton keyboardHeight={keyboardHeight} onPress={dismissKeyboard} />
          ) : null}
        </Pressable>
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
  headingFrench: {
    fontSize: 24,
    lineHeight: 31,
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
    marginBottom: spacing.md,
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
  bulkDeleteButton: {
    borderColor: colors.error,
    backgroundColor: "rgba(242,95,92,0.12)",
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  headerButtonTextFrench: {
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
  },
  goalGrid: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
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
  goalCardCompleted: {
    borderColor: "rgba(56,217,150,0.55)",
    shadowColor: colors.success,
    shadowOpacity: 0.22,
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
    marginTop: spacing.xs,
  },
  goalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
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
  goalTimeCompleted: {
    color: "rgba(56,217,150,0.92)",
  },
  goalTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
    lineHeight: typography.lg * 1.4,
    minHeight: 40,
  },
  goalTitleCompleted: {
    color: "rgba(233,237,247,0.72)",
    textDecorationLine: "line-through",
  },
  goalActionIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  completeButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(56,217,150,0.3)",
  },
  completeButtonActive: {
    backgroundColor: "rgba(56,217,150,0.14)",
    borderColor: "rgba(56,217,150,0.65)",
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
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs / 1.5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 1.5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(56,217,150,0.45)",
    backgroundColor: "rgba(56,217,150,0.12)",
  },
  completedBadgeText: {
    color: colors.success,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  dragHandleButton: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: colors.divider,
  },
  dragHandleButtonActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.16)",
  },
  emptyCard: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  listHeader: {
    marginBottom: spacing.md,
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
    maxHeight: "100%",
  },
  modalScroll: {
    width: "100%",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
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
  modalMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  modalMetaText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
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
  modalActionsRight: {
    marginLeft: "auto",
  },
  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.md,
  },
  keyboardIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
