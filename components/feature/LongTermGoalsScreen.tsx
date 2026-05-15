// 「理想の自分ページ」「年間目標ページ」のハイブリッドのようなコードになっている。

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Controller, FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { z } from "zod";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAppZodForm } from "../../hooks/useAppZodForm";
import { useDeleteMode } from "../../hooks/useDeleteMode";
import { useKeyboardDismissAccessory } from "../../hooks/useKeyboardDismissAccessory";
import { useOfflineActionGuard } from "../../hooks/useOfflineActionGuard";
import { getUserId } from "../../lib/api/supabase/common";
import {
  deleteLongTermGoal,
  fetchCurrentPoint,
  fetchLongTermGoals,
  insertLongTermGoal,
  LongTermGoalRow,
  updateCurrentPoint,
  updateLongTermGoal,
  upsertLongTermGoals,
} from "../../lib/api/supabase/longTermGoals";
import { closedModalState, createAddModalState, createEditModalState, ModalState } from "../../lib/common/modalState";
import { buildOfflineCacheKey, readOfflineCache, writeOfflineCache } from "../../lib/offline/cache";
import { getKeyboardAvoidingBehavior, shouldUseAndroidJapaneseTypography } from "../../lib/ui/platform";
import { useOffline } from "../../providers/OfflineProvider";
import { compactFeatureSpacing } from "./compactFeatureSpacing";
import KeyboardDismissButton from "../KeyboardDismissButton";
import Loading from "../Loading";
import OfflineRequiredScreen from "../OfflineRequiredScreen";

type LongTermGoal = {
  id: string;
  untilWhen: string;
  description: string;
  completed: boolean;
  order: number;
  updatedAt: string | null;
};

const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;
const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;
const COMPLETED_CARD_GRADIENT = ["rgba(56,217,150,0.2)", "rgba(10,28,24,0.96)"] as const;

const longTermGoalSchema = z.object({
  currentPoint: z.string().trim(),
  untilWhen: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

type LongTermFormValues = z.infer<typeof longTermGoalSchema>;

const offlineLongTermSchema = z.object({
  currentPoint: z.string().nullable(),
  goals: z.array(
    z.object({
      id: z.string(),
      untilWhen: z.string(),
      description: z.string(),
      completed: z.boolean(),
      order: z.number(),
      updatedAt: z.string().nullable(),
    }),
  ),
});

const DEFAULT_FORM_VALUES: LongTermFormValues = {
  currentPoint: "",
  untilWhen: "",
  description: "",
};

const toLongTermGoal = (row: LongTermGoalRow): LongTermGoal => ({
  id: row.id,
  untilWhen: row.until_when,
  description: row.description,
  completed: row.is_done ?? false,
  order: row.order ?? 0,
  updatedAt: row.updated_at ?? null,
});

const formatUpdatedDate = (iso?: string | null, suffix?: string) => {
  if (!iso) return "";
  try {
    return `${new Date(iso).toLocaleDateString()} ${suffix ?? ""}`.trim();
  } catch {
    return suffix ?? "";
  }
};

export default function LongTermGoalsScreen() {
  const { t, i18n } = useTranslation("longTermGoals");
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  const { deleteMode, toggleDeleteMode, disableDeleteMode } = useDeleteMode();
  const { offlineBlocked } = useOffline();
  const guardOfflineAction = useOfflineActionGuard();
  const [goals, setGoals] = useState<LongTermGoal[]>([]);
  const [currentPoint, setCurrentPoint] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(closedModalState);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasOfflineCache, setHasOfflineCache] = useState(false);
  const updatedLabel = t("updatedSuffix");
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isFrench = currentLanguage.startsWith("fr");
  const isAndroidJapanese = shouldUseAndroidJapaneseTypography(currentLanguage);
  const {
    control,
    handleSubmit,
    reset,
    clearErrors,
    formState: { errors },
  } = useAppZodForm({
    schema: longTermGoalSchema,
    defaultValues: DEFAULT_FORM_VALUES,
  });


  // ユーザを取得し「長期目標リスト」を取得、表示の準備
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setErrorMessage(null);
      const uid = await getUserId();
      if (!uid) {
        if (active) setErrorMessage(t("errors.loginMissing"));
        setLoading(false);
        return;
      }

      const cacheKey = buildOfflineCacheKey("long-term-goals", uid);

      if (offlineBlocked) {
        const cached = await readOfflineCache(cacheKey, offlineLongTermSchema);
        if (active) {
          if (cached) {
            setGoals(cached.goals);
            setCurrentPoint(cached.currentPoint);
            setHasOfflineCache(true);
          } else {
            setHasOfflineCache(false);
          }
          setLoading(false);
        }
        return;
      }

      const [{ data: goalData, error: goalError }, { data: userData, error: userError }] = await Promise.all([
        fetchLongTermGoals(uid),
        fetchCurrentPoint(uid),
      ]);

      if (goalError || userError) {
        if (active) {
          setErrorMessage(goalError?.message ?? userError?.message ?? t("errors.fetchFailed"));
          setLoading(false);
        }
        return;
      }

      if (!active) return;

      const mappedGoals = ((goalData as LongTermGoalRow[]) ?? []).map(toLongTermGoal);
      const nextCurrentPoint = userData?.current_point ?? null;
      setGoals(mappedGoals);
      setCurrentPoint(nextCurrentPoint);
      setHasOfflineCache(true);
      await writeOfflineCache(cacheKey, offlineLongTermSchema, {
        currentPoint: nextCurrentPoint,
        goals: mappedGoals,
      });
      setLoading(false);
    };

    loadData();
    return () => {
      active = false;
    };
  }, [offlineBlocked, t]);


  // 長期目標データが更新された時に最新のデータをローカルに保存してオフライン時に表示できるように準備
  const syncOfflineCache = async (uid: string, nextGoals: LongTermGoal[], nextCurrentPoint: string | null) => {
    const cacheKey = buildOfflineCacheKey("long-term-goals", uid);
    await writeOfflineCache(cacheKey, offlineLongTermSchema, {
      currentPoint: nextCurrentPoint,
      goals: nextGoals,
    });
  };

  // 追加インプットモーダル表示処理
  const handleAddPress = () => {
    if (guardOfflineAction()) return;
    setModalError(null);
    reset({
      currentPoint: currentPoint ?? "",
      untilWhen: "",
      description: "",
    });
    setModalState(createAddModalState());
    clearErrors();
  };

  // 編集インプットモーダル表示処理
  const handleEditPress = (goal: LongTermGoal) => {
    if (guardOfflineAction()) return;
    reset({
      currentPoint: currentPoint ?? "",
      untilWhen: goal.untilWhen,
      description: goal.description,
    });
    setModalState(createEditModalState(goal.id, { updatedAt: goal.updatedAt }));
    setModalError(null);
    clearErrors();
  };

  // 削除処理
  const handleDeletePress = (goal: LongTermGoal) => {
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

          const previousGoals = goals;
          const nextGoals = goals
            .filter((item) => item.id !== goal.id)
            .map((item, index) => ({ ...item, order: index }));

          setGoals(nextGoals);
          try {
            const { error } = await deleteLongTermGoal(goal.id);
            if (error) {
              throw error;
            }
            if (nextGoals.length > 0) {
              const { error: upsertError } = await upsertLongTermGoals(
                nextGoals.map((item, index) => ({
                  id: item.id,
                  user_id: uid,
                  until_when: item.untilWhen,
                  description: item.description,
                  is_done: item.completed,
                  order: index,
                })),
              );
              if (upsertError) {
                throw upsertError;
              }
            }
            await syncOfflineCache(uid, nextGoals, currentPoint);
          } catch (error) {
            const message = error instanceof Error ? error.message : t("errors.deleteFailed");
            setGoals(previousGoals);
            Alert.alert(t("errors.deleteFailed"), message);
          }
        },
      },
    ]);
  };

  // 完了トグル処理
  const handleToggleCompleted = async (goalId: string) => {
    const currentGoal = goals.find((goal) => goal.id === goalId);
    if (!currentGoal) return;

    const nextCompleted = !currentGoal.completed;
    const optimisticGoals = goals.map((goal) =>
      goal.id === goalId ? { ...goal, completed: nextCompleted } : goal,
    );
    setGoals(optimisticGoals);

    try {
      const { data, error } = await updateLongTermGoal(goalId, { is_done: nextCompleted });
      if (error) {
        throw error;
      }
      const uid = await getUserId();
      const row = data as LongTermGoalRow;
      const nextGoals = goals.map((goal) => (goal.id === goalId ? toLongTermGoal(row) : goal));
      setGoals(nextGoals);
      if (uid) {
        await syncOfflineCache(uid, nextGoals, currentPoint);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.saveFailed");
      setGoals(goals);
      Alert.alert(t("errors.saveFailed"), message);
    }
  };

  // 保存・更新ボタン両方を管理するロジック
  const onValidSubmit = async ({ currentPoint: draftCurrentPoint, untilWhen, description }: LongTermFormValues) => {
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

      const normalizedCurrentPoint = draftCurrentPoint.trim() ? draftCurrentPoint.trim() : null;
      const normalizedUntilWhen = untilWhen.trim();
      const normalizedDescription = description.trim();

      const { error: currentPointError } = await updateCurrentPoint(uid, normalizedCurrentPoint);
      if (currentPointError) {
        setModalError(currentPointError.message);
        setSaving(false);
        return;
      }

      let nextGoals = goals;
      if (modalState.editingId) {
        const { data, error } = await updateLongTermGoal(modalState.editingId, {
          until_when: normalizedUntilWhen,
          description: normalizedDescription,
        });
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as LongTermGoalRow;
        nextGoals = goals.map((goal) => (goal.id === modalState.editingId ? toLongTermGoal(row) : goal));
        setGoals(nextGoals);
      } else {
        const shiftedExisting = goals.map((goal, index) => ({
          id: goal.id,
          user_id: uid,
          until_when: goal.untilWhen,
          description: goal.description,
          is_done: goal.completed,
          order: index + 1,
        }));
        const { data, error } = await insertLongTermGoal({
          user_id: uid,
          until_when: normalizedUntilWhen,
          description: normalizedDescription,
          is_done: false,
          order: 0,
        });
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }

        const row = data as LongTermGoalRow;
        const { error: upsertError } = await upsertLongTermGoals([
          ...shiftedExisting,
          {
            id: row.id,
            user_id: uid,
            until_when: row.until_when,
            description: row.description,
            is_done: row.is_done ?? false,
            order: 0,
          },
        ]);
        if (upsertError) {
          setModalError(upsertError.message);
          setSaving(false);
          return;
        }

        nextGoals = [toLongTermGoal(row), ...goals.map((goal, index) => ({ ...goal, order: index + 1 }))];
        setGoals(nextGoals);
      }

      setCurrentPoint(normalizedCurrentPoint);
      await syncOfflineCache(uid, nextGoals, normalizedCurrentPoint);
      setModalState(closedModalState);
      reset(DEFAULT_FORM_VALUES);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("errors.saveFailed");
      setModalError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleInvalidSubmit = (_formErrors: FieldErrors<LongTermFormValues>) => {
    setModalError(t("modal.errorRequired"));
  };

  // ドラッグ並び替え終了時の配列データをセットする
  const handleDragEnd = async ({ data }: { data: LongTermGoal[] }) => {
    if (guardOfflineAction()) return;
    const nextGoals = data.map((goal, index) => ({
      ...goal,
      order: index,
    }));
    setGoals(nextGoals);

    const uid = await getUserId();
    if (!uid) {
      Alert.alert(t("errors.reorderSaveFailed"), t("errors.loginMissing"));
      return;
    }

    const { error } = await upsertLongTermGoals(
      nextGoals.map((goal, index) => ({
        id: goal.id,
        user_id: uid,
        until_when: goal.untilWhen,
        description: goal.description,
        is_done: goal.completed,
        order: index,
      })),
    );

    if (error) {
      Alert.alert(t("errors.reorderSaveFailed"), error.message);
      return;
    }

    await syncOfflineCache(uid, nextGoals, currentPoint);
  };

  // 指定のPressable要素の長押しドラッグを可能にするロジック
  const renderGoalCard = ({ item, drag, isActive }: RenderItemParams<LongTermGoal>) => (
    <View
      style={[
        styles.goalCard,
        item.completed && styles.goalCardCompleted,
        shadows.card,
        isActive && styles.goalCardDragging,
        deleteMode && styles.goalCardDeleteMode,
      ]}
      testID={`long-term-goal-card-${item.id}`}
      >
        <LinearGradient
          colors={item.completed ? COMPLETED_CARD_GRADIENT : LIST_CARD_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.goalHeaderRow} testID={`long-term-goal-card-footer-${item.id}`}>
        <View style={styles.goalFooterStatus}>
          {!item.completed ? (
            <View style={styles.untilWhenWrap} testID={`long-term-goal-card-until-when-${item.id}`}>
              <Text
                style={styles.untilWhenText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.untilWhen}
              </Text>
            </View>
          ) : null}
          {item.completed ? (
            <View style={styles.completedBadge} testID={`long-term-goal-card-completed-badge-${item.id}`}>
              <Text style={styles.completedBadgeText}>{t("completion.badge")}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.goalActions} testID={`long-term-goal-card-actions-${item.id}`}>
          {deleteMode ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("delete")}
              onPress={() => handleDeletePress(item)}
              style={[styles.goalActionIconButton, styles.dangerButton]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
            </Pressable>
          ) : (
            <>
              {!item.completed ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("modal.editTitle")}
                  onPress={() => handleEditPress(item)}
                  style={[styles.goalActionIconButton, styles.dragHandleButton]}
                  testID={`long-term-goal-edit-${item.id}`}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textPrimary} />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.completed ? t("completion.undo") : t("completion.complete")}
                onPress={() => handleToggleCompleted(item.id)}
                style={[styles.goalActionIconButton, styles.completeButton, item.completed && styles.completeButtonActive]}
                testID={`long-term-goal-complete-${item.id}`}
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
                testID={`long-term-goal-reorder-${item.id}`}
              >
                <MaterialCommunityIcons name="swap-vertical-bold" size={20} color={colors.textSecondary} />
              </Pressable>
            </>
          )}
        </View>
      </View>
      <Text style={[styles.goalDescription, item.completed && styles.goalTextCompleted]}>{item.description}</Text>
    </View>
  );

  const modalTitle = modalState.editingId ? t("modal.editTitle") : t("modal.addTitle");
  const modalUpdatedText = modalState.meta?.updatedAt ? formatUpdatedDate(modalState.meta.updatedAt, updatedLabel) : null;

  // ローディング画面
  if (loading) {
    return (
      <GestureHandlerRootView style={styles.ghRoot}>
        <Loading />
      </GestureHandlerRootView>
    );
  }

  //オフラインかつキャッシュデータがない場合は専用のオフラインページを表示する
  if (offlineBlocked && !hasOfflineCache) {
    return (
      <GestureHandlerRootView style={styles.ghRoot}>
        <OfflineRequiredScreen />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.ghRoot}>
      <DraggableFlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalCard}
        onDragEnd={handleDragEnd}
        activationDistance={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.goalGrid}
        ListHeaderComponent={(
          <View style={[styles.card, styles.titleCardCompact, shadows.card]}>
            <LinearGradient
              colors={HEADER_CARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.heading, isFrench && styles.headingFrench, isAndroidJapanese && styles.headingAndroidJa]}>{t("pageTitle")}</Text>
            {currentPoint ? (
              <Text style={styles.currentPoint}>{t("currentPointLabel")}: {currentPoint}</Text>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress} disabled={loading || offlineBlocked}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
                <Text style={[styles.primaryButtonText, isFrench && styles.headerButtonTextFrench]}>{t("add")}</Text>
              </Pressable>
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
          testID="long-term-goals-modal-overlay"
        >
          <KeyboardAvoidingView
            behavior={getKeyboardAvoidingBehavior()}
            style={styles.modalContainer}
            testID="long-term-goals-modal-kav"
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="long-term-goals-modal-scroll"
            >
              <Pressable
                style={[styles.modalCard, shadows.card]}
                onPress={(event) => event.stopPropagation()}
              >
                <Text style={styles.modalTitle}>{modalTitle}</Text>

                <View style={styles.formGroup}>
                  {modalUpdatedText ? (
                    <View style={styles.modalMeta}>
                      <Text style={styles.modalMetaText}>{modalUpdatedText}</Text>
                    </View>
                  ) : null}
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{t("modal.currentPointLabel")}</Text>
                  </View>
                  <Controller
                    control={control}
                    name="currentPoint"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t("modal.currentPointPlaceholder")}
                        placeholderTextColor={colors.textSecondary}
                        style={styles.modalInput}
                      />
                    )}
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{t("modal.untilWhenLabel")}</Text>
                  </View>
                  <Controller
                    control={control}
                    name="untilWhen"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t("modal.untilWhenPlaceholder")}
                        placeholderTextColor={colors.textSecondary}
                        style={styles.modalInput}
                      />
                    )}
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{t("modal.descriptionLabel")}</Text>
                  </View>
                  <Controller
                    control={control}
                    name="description"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t("modal.descriptionPlaceholder")}
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.modalInput, styles.textArea]}
                        multiline
                      />
                    )}
                  />
                </View>

                {(modalError || errors.untilWhen || errors.description) ? (
                  <Text style={styles.modalError}>
                    {modalError ?? errors.untilWhen?.message ?? errors.description?.message}
                  </Text>
                ) : null}

                <View style={styles.modalFooterRow}>
                  <View style={[styles.modalActions, styles.modalActionsRight]}>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.secondaryButton}
                      onPress={() => {
                        setModalState(closedModalState);
                        setModalError(null);
                        reset(DEFAULT_FORM_VALUES);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>{t("modal.cancel")}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.primaryButton, saving && styles.buttonDisabled]}
                      // handleSubmitがフォーム全体を検証し、OKならonValidSubmit(values)、NGならhandleInvalidSubmit(error)を発火
                      onPress={handleSubmit(onValidSubmit, handleInvalidSubmit)}
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
            <KeyboardDismissButton
              onPress={dismissKeyboard}
              keyboardHeight={keyboardHeight}
              testID="long-term-goals-modal-keyboard-button"
            />
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
  goalGrid: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm,
  },
  listHeader: {
    marginBottom: spacing.lg,
  },
  card: {
    overflow: "hidden",
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  titleCardCompact: {
    padding: compactFeatureSpacing.titleCardPadding,
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
  headingAndroidJa: {
    fontSize: 24,
    lineHeight: 31,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  currentPoint: {
    color: colors.accentSubtle,
    fontSize: typography.md,
    fontWeight: "700",
  },
  reorderHint: {
    color: colors.textSecondary,
    fontSize: typography.sm,
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
    backgroundColor: "rgba(30,94,255,0.2)",
    borderWidth: 1,
    borderColor: colors.accentPrimary,
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
    backgroundColor: "rgba(239,83,80,0.12)",
    borderColor: "rgba(239,83,80,0.4)",
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  headerButtonTextFrench: {
    fontSize: 14,
  },
  goalCard: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    backgroundColor: colors.surface,
  },
  goalCardCompleted: {
    borderColor: "rgba(56,217,150,0.45)",
  },
  goalCardDragging: {
    opacity: 0.92,
  },
  goalCardDeleteMode: {
    borderColor: "rgba(239,83,80,0.4)",
  },
  untilWhenWrap: {
    alignSelf: "flex-start",
    paddingBottom: 3,
    maxWidth: "100%",
    borderBottomWidth: 2,
    borderBottomColor: colors.accentSubtle,
  },
  untilWhenText: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    fontWeight: "800",
  },
  goalDescription: {
    color: colors.textPrimary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.3,
    fontWeight: "700",
  },
  goalTextCompleted: {
    color: "rgba(255,255,255,0.78)",
  },
  goalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  goalFooterStatus: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    minHeight: 34,
    paddingRight: spacing.xs,
  },
  goalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  goalActionIconButton: {
    width: 34,
    height: 34,
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
  dragHandleButton: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: colors.divider,
  },
  dragHandleButtonActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.16)",
  },
  dangerButton: {
    borderColor: "rgba(239,83,80,0.4)",
    backgroundColor: "rgba(239,83,80,0.12)",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs / 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  emptyCard: {
    alignItems: "flex-start",
    gap: spacing.sm,
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
  textArea: {
    minHeight: 120,
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
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
});
