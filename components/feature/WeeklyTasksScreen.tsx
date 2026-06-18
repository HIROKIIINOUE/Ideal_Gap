import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useKeyboardDismissAccessory } from "../../hooks/useKeyboardDismissAccessory";
import { useOfflineActionGuard } from "../../hooks/useOfflineActionGuard";
import { deleteWeeklyTasks } from "../../lib/api/supabase/goals/allItemDelete";
import { buildOfflineCacheKey, readOfflineCache, writeOfflineCache } from "../../lib/offline/cache";
import { decryptFieldValue, encryptFieldValue } from "../../lib/security/fieldEncryption";
import { AccessMode, getAccessStateForUser } from "../../lib/subscription";
import { supabase } from "../../lib/supabaseClient";
import { getKeyboardAvoidingBehavior, shouldUseAndroidJapaneseTypography } from "../../lib/ui/platform";
import { hasReachedUsageLimit } from "../../lib/usageLimits";
import { useOffline } from "../../providers/OfflineProvider";
import { Database } from "../../types/database";
import KeyboardDismissButton from "../KeyboardDismissButton";
import Loading from "../Loading";
import OfflineRequiredScreen from "../OfflineRequiredScreen";
import UsageLimitUpgradeModal from "../UsageLimitUpgradeModal";
import { compactFeatureSpacing } from "./compactFeatureSpacing";

// 画面表示用データの型
type WeeklyTask = {
  id: string;
  title: string;
  yearlyGoalLabel: string;
  yearlyGoalId: string | null;
  loggedMinutes: number;
  completed: boolean;
  order: number;
};

//データベース用データの型
type WeeklyTaskRow = Database["public"]["Tables"]["weekly_tasks"]["Row"];
type WeeklyTaskInsert = Database["public"]["Tables"]["weekly_tasks"]["Insert"];
type WeeklyTaskUpdate = Database["public"]["Tables"]["weekly_tasks"]["Update"];
type WeeklyTaskListRow = Pick<
  WeeklyTaskRow,
  "id" | "description" | "yearly_goal_id" | "accumulated_time_week" | "order" | "is_done"
>;
type YearlyGoalRow = Database["public"]["Tables"]["yearly_goals"]["Row"];

type WeeklyTaskDraft = {
  title: string;
  yearlyGoalId: string | null;
};

// 合計minutesを受け取ってそれを元に表示する文言を返す(〇〇h 〇〇m)
const formatMinutes = (minutes: number) => {
  const safe = Math.max(0, Math.round(minutes)); //値が負の数にならないように
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;  // hourに換算できなかった端数の分を算出
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;
const COMPLETED_CARD_GRADIENT = ["rgba(56,217,150,0.2)", "rgba(10,28,24,0.96)"] as const;
const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;
const LAST_SELECTED_YEARLY_GOAL_ID_STORAGE_KEY = "weekly_tasks_last_selected_yearly_goal_id";
const offlineWeeklyTasksSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    yearlyGoalLabel: z.string(),
    yearlyGoalId: z.string().nullable(),
    loggedMinutes: z.number(),
    completed: z.boolean().optional().default(false),
    order: z.number(),
  }),
);
const offlineYearlyGoalOptionsSchema = z.array(
  z.object({
    id: z.string(),
    label: z.string(),
    color: z.string(),
  }),
);

export default function WeeklyTasksScreen() {
  const { t, i18n } = useTranslation("weeklyTasks");
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [accessMode, setAccessMode] = useState<AccessMode>("free");
  const [deleteMode, setDeleteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasOfflineCache, setHasOfflineCache] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [yearlyGoalOptions, setYearlyGoalOptions] = useState<
    { id: string; label: string; color: string }[]
  >([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGoalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const weeklyTaskSchema = z.object({
    title: z.string().trim().min(1),
    yearlyGoalId: z.string().trim().nullable(),
  });

  // draft...追加・編集モーダルで「まだ確定していない入力中の値」
  const [draft, setDraft] = useState<WeeklyTaskDraft>({
    title: "",
    yearlyGoalId: yearlyGoalOptions[0]?.id ?? null,
  });
  const { offlineBlocked } = useOffline();
  const guardOfflineAction = useOfflineActionGuard();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isFrench = currentLanguage.startsWith("fr");
  const isAndroidJapanese = shouldUseAndroidJapaneseTypography(currentLanguage);

  const hasLoadedRef = useRef(false);
  const hasYearlyGoals = yearlyGoalOptions.length > 0;
  // 無料ユーザならここでデータ数上限に達してるかどうかをbooleanで判定
  const limitReached = hasReachedUsageLimit({
    feature: "weeklyTasks",
    accessMode,
    currentCount: tasks.length,
  });

  // 以前使用した紐づく年間目標をAsyncStorageから取り出す(追加モーダルでデフォルト表示するため)
  // AsyncStorageに記録がない場合は先頭の年間目標を表示する。
  const getPreferredYearlyGoalId = useCallback(async (): Promise<string | null> => {
    const savedId = await AsyncStorage.getItem(LAST_SELECTED_YEARLY_GOAL_ID_STORAGE_KEY);
    if (savedId && yearlyGoalOptions.some((opt) => opt.id === savedId)) {
      return savedId;
    }
    if (savedId) {
      await AsyncStorage.removeItem(LAST_SELECTED_YEARLY_GOAL_ID_STORAGE_KEY);
    }
    return yearlyGoalOptions[0]?.id ?? null;
  }, [yearlyGoalOptions]);

  // 年間目標登録時に「直近の紐づく年間目標」としてAsyncStorageに保存
  // 該当の年間目標がなければAsyncStorageをクリーンアップする
  const persistPreferredYearlyGoalId = useCallback(async (yearlyGoalId: string | null) => {
    if (!yearlyGoalId) {
      await AsyncStorage.removeItem(LAST_SELECTED_YEARLY_GOAL_ID_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(LAST_SELECTED_YEARLY_GOAL_ID_STORAGE_KEY, yearlyGoalId);
  }, []);

  const handleDeleteTask = (task: WeeklyTask) => {
    if (guardOfflineAction()) return;
    Alert.alert(t("deleteConfirm.title"), t("deleteConfirm.body"), [
      { text: t("deleteConfirm.no"), style: "cancel" },
      {
        text: t("deleteConfirm.yes"),
        style: "destructive",
        onPress: async () => {
          const uid = userId ?? (await fetchUserId());
          if (!uid) {
            Alert.alert(t("deleteConfirm.title"), t("modal.errorRequired"));
            return;
          }
          const { error } = await supabase.from("weekly_tasks").delete().eq("id", task.id);
          if (error) {
            Alert.alert(t("deleteConfirm.title"), error.message);
            return;
          }

          // 削除後に残りのタスクのorder値を更新し、正しく並び替える
          const remaining = tasks.filter((t) => t.id !== task.id);
          const reordered = reorderTasks(remaining);
          setTasks(reordered);

          let reorderFailed = false;
          // 削除後に既存のタスクがあれば、上で処理した新しいorderをDBに反映する
          if (reordered.length > 0) {
            const updates = reordered.map((item) => toWeeklyRow(item, uid));
            const { error: upsertError } = await supabase
              .from("weekly_tasks")
              .upsert(updates, { onConflict: "id" });
            if (upsertError) {
              Alert.alert(t("deleteConfirm.title"), upsertError.message ?? t("modal.errorRequired"));
              reorderFailed = true;
            }
          }

          if (reorderFailed) return;
        },
      },
    ]);
  };

  //　作業タイマーへ遷移する
  const handleOpenTimer = (task: WeeklyTask) => {
    if (guardOfflineAction()) return;
    router.push({
      pathname: "/task-timer",
      params: {
        taskId: task.id,
        yearlyGoalId: task.yearlyGoalId,
        title: task.title,
        yearlyGoal: task.yearlyGoalLabel,
        logged: String(task.loggedMinutes),
      },
    });
  };

  const fetchUserId = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;
    setUserId(uid);
    return uid;
  }, []);

  //  データベースの行データから画面表示用のWeeklyTask型に変換
  const toWeeklyTask = React.useCallback(
    (row: WeeklyTaskListRow, goalLookup: Record<string, { label: string; color: string }>): WeeklyTask => ({
      id: row.id,
      title: decryptFieldValue(row.description),
      yearlyGoalId: row.yearly_goal_id ?? null,
      yearlyGoalLabel: goalLookup[row.yearly_goal_id ?? ""]?.label ?? t("modal.unlinkedYearlyGoal"),
      loggedMinutes: row.accumulated_time_week ?? 0,
      completed: row.is_done ?? false,
      order: row.order ?? 0,
    }),
    [t],
  );

  // 画面表示用のWeeklyTaskデータをデータベースに保存する形へ変換
  const toWeeklyRow = React.useCallback(
    (task: WeeklyTask, uid: string): WeeklyTaskInsert => ({
      id: task.id,
      user_id: uid,
      description: encryptFieldValue(task.title),
      yearly_goal_id: task.yearlyGoalId ?? null,
      accumulated_time_week: task.loggedMinutes,
      is_done: task.completed,
      order: task.order,
    }),
    [],
  );

  // タスクの順番を反映データ(weekly_tasks.order)に反映させる
  const reorderTasks = React.useCallback((list: WeeklyTask[]) => {
    return [...list]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((task, idx) => ({ ...task, order: idx }));
  }, []);


  // 最新データ(週間タスクと年間目標)の取得
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    const uid = await fetchUserId();
    if (!uid) {
      setErrorMessage(t("list.loadError"));
      setLoading(false);
      return;
    }

    // ローカルキャッシュのキー名を生成
    const taskCacheKey = buildOfflineCacheKey("weekly-tasks", uid);
    const goalCacheKey = buildOfflineCacheKey("weekly-yearly-goals", uid);

    if (!offlineBlocked) {
      const accessState = await getAccessStateForUser(uid);
      setAccessMode(accessState.accessMode);
    }

    // オフラインの場合、生成したキー名を使ってローカルキャッシュデータを取りに行く(キャッシュデータがなければ後ほどオフラインページ表示へ遷移される)
    if (offlineBlocked) {
      const [cachedTasks, cachedGoals] = await Promise.all([
        readOfflineCache(taskCacheKey, offlineWeeklyTasksSchema),
        readOfflineCache(goalCacheKey, offlineYearlyGoalOptionsSchema),
      ]);
      if (cachedTasks && cachedGoals) {
        setTasks(cachedTasks);
        setYearlyGoalOptions(cachedGoals);
        setHasOfflineCache(true);
      } else {
        setHasOfflineCache(false);
      }
      setLoading(false);
      return; // オフラインの場合はここでデータフェッチ処理終了
    }

    const [{ data: yearlyData, error: yearlyError }, { data: weeklyData, error: weeklyError }] = await Promise.all([
      supabase
        .from("yearly_goals")
        .select("id, description, year_goal_color")
        .eq("user_id", uid)
        .order("order", { ascending: true }),
      supabase
        .from("weekly_tasks")
        .select("id, description, yearly_goal_id, accumulated_time_week, order, is_done")
        .eq("user_id", uid)
        .order("order", { ascending: true }),
    ]);

    if (yearlyError || weeklyError) {
      setErrorMessage(yearlyError?.message ?? weeklyError?.message ?? "Failed to load data");
      setLoading(false);
      return;
    }

    // 年間目標データを週間タスクページで使用しやすいフォーマットに変換
    const yearlyOptions = ((yearlyData as YearlyGoalRow[] | null) ?? []).map((goalRow) => {
      return {
        id: goalRow.id,
        label: decryptFieldValue(goalRow.description),
        color: goalRow.year_goal_color ?? colors.accentPrimary,
      };
    });
    // 年間目標リスト配列から{ [id]: { label, color, month} }　の辞書のようなものを作る
    // コードがシンプルになり、パフォーマンスが安定する
    const goalLookup = yearlyOptions.reduce<Record<string, { label: string; color: string }>>((acc, item) => {
      acc[item.id] = { label: item.label, color: item.color };
      return acc;
    }, {});

    const weekly = reorderTasks(
      ((weeklyData as WeeklyTaskListRow[] | null) ?? []).map((row) => toWeeklyTask(row, goalLookup)),
    );

    setYearlyGoalOptions(yearlyOptions);
    setTasks(weekly);

    // データが空配列ではない場合、ローカルキャッシュに保存
    setHasOfflineCache(weekly.length > 0 && yearlyOptions.length > 0);
    await Promise.all([
      writeOfflineCache(taskCacheKey, offlineWeeklyTasksSchema, weekly),
      writeOfflineCache(goalCacheKey, offlineYearlyGoalOptionsSchema, yearlyOptions),
    ]);
    setLoading(false);
  }, [fetchUserId, offlineBlocked, reorderTasks, t, toWeeklyTask]);

  // 初回マウント時にもデータを1回だけ取得し、以降はフォーカス時に再取得する
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadData();
  }, [loadData]);

  // useFocusEffectを使用することでタイマーページから戻ってきた時も確実に最新情報を取得できる
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
      }
      loadData();
    }, [loadData]),
  );

  // draftは追加・編集モーダルで「まだ確定していない入力中の値」
  // yearlyGoalOptionsはDBをもとにした正確なデータ
  // draft.yearlyGoalIdが常に現在のyearlyGoalOptionsと矛盾しないように補正する
  useEffect(() => {
    let cancelled = false;

    const syncDraftYearlyGoal = async () => {
      // DB上に年間目標データがないのに下書きdraftに以前の年間データが残ってしまっている場合は紐づく年間目標をnullにする
      if (yearlyGoalOptions.length === 0) {
        if (draft.yearlyGoalId) {
          setDraft((prev) => ({ ...prev, yearlyGoalId: null }));
        }
        return;
      }

      if (draft.yearlyGoalId === null) {
        return;
      }

      // 下書きdraftにすでに紐づく年間情報(DBの正しい情報)が存在する場合はその情報をそのまま使用
      if (yearlyGoalOptions.some((opt) => opt.id === draft.yearlyGoalId)) {
        return;
      }

      // 下書きdraftに紐づく年間情報が存在しない場合は直近のデータ(preferredYearlyGoalId)をデフォルトとする
      const preferredYearlyGoalId = await getPreferredYearlyGoalId();
      if (cancelled) return;

      setDraft((prev) => ({
        ...prev,
        yearlyGoalId: preferredYearlyGoalId,
      }));
    };

    syncDraftYearlyGoal();

    return () => {
      cancelled = true;
    };
  }, [draft.yearlyGoalId, getPreferredYearlyGoalId, yearlyGoalOptions]);

  // 「追加ボタン」からモーダルを開いた時のロジック
  const handleOpenAdd = async () => {
    if (guardOfflineAction()) return;
    if (limitReached) {
      setLimitModalVisible(true);
      return;
    }
    const preferredYearlyGoalId = await getPreferredYearlyGoalId();
    setEditingId(null);
    setGoalDropdownOpen(false);
    setDraft({
      title: "",
      yearlyGoalId: preferredYearlyGoalId,
    });
    setModalError(null);
    setModalVisible(true);
  };

  // 全ての週間タスク削除機能
  const handleBulkDelete = async () => {
    if (guardOfflineAction()) return;
    const uid = userId ?? (await fetchUserId());
    if (!uid) {
      Alert.alert(t("deleteConfirm.title"), t("modal.errorRequired"));
      return;
    }
    try {
      await deleteWeeklyTasks({ userId: uid });
      setTasks([]);
      Alert.alert(t("bulkDeleteSuccess.title"), t("bulkDeleteSuccess.body"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modal.errorRequired");
      Alert.alert(t("deleteConfirm.title"), message);
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
      { text: t("bulkDelete.cancel"), style: "cancel" },
    ]);
  };

  // 「編集ボタン」からモーダルを開いた時のロジック
  const handleOpenEdit = (task: WeeklyTask) => {
    if (guardOfflineAction()) return;
    setEditingId(task.id);
    setGoalDropdownOpen(false);
    setDraft({
      title: task.title,
      yearlyGoalId: task.yearlyGoalId,
    });
    setModalError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (guardOfflineAction()) return;
    if (saving) return;

    const parse = weeklyTaskSchema.safeParse(draft);
    if (!parse.success) {
      setModalError(t("modal.errorRequired"));
      return;
    }
    await persistPreferredYearlyGoalId(parse.data.yearlyGoalId);

    const uid = userId ?? (await fetchUserId());
    if (!uid) {
      Alert.alert(t("modal.errorRequired"));
      return;
    }

    setSaving(true);
    try {
      // 編集保存処理
      if (editingId) {
        const existing = tasks.find((task) => task.id === editingId);
        const payload: WeeklyTaskUpdate = {
          description: encryptFieldValue(parse.data.title),
          yearly_goal_id: parse.data.yearlyGoalId ?? null,
          accumulated_time_week: existing?.loggedMinutes ?? 0,
        };
        const { error } = await supabase
          .from("weekly_tasks")
          .update(payload)
          .eq("id", editingId);
        if (error) {
          Alert.alert("更新に失敗しました", error.message);
          return;
        }
      } else {
        // 追加保存処理
        // 新規タスクを一番上に持ってくるために既存のタスクのorderを+1する
        const orderedExisting = reorderTasks(tasks).map((task, idx) => ({ ...task, order: idx + 1 }));
        const { data: inserted, error } = await supabase
          .from("weekly_tasks")
          .insert({
            description: encryptFieldValue(parse.data.title),
            yearly_goal_id: parse.data.yearlyGoalId ?? null,
            accumulated_time_week: 0,
            is_done: false,
            user_id: uid,
            order: 0,
          })
          .select("id, description, yearly_goal_id, accumulated_time_week, order, is_done")
          .single();
        if (error || !inserted) {
          Alert.alert("追加に失敗しました", error?.message ?? "Failed to add");
          return;
        }

        const goalLookup = yearlyGoalOptions.reduce<Record<string, { label: string; color: string }>>(
          (acc, item) => {
            acc[item.id] = { label: item.label, color: item.color };
            return acc;
          },
          {},
        );
        const newTask = toWeeklyTask(inserted as WeeklyTaskListRow, goalLookup);
        const reordered = reorderTasks([...orderedExisting, newTask]);
        const updates = reordered.map((task) => toWeeklyRow(task, uid));
        const { error: reorderError } = await supabase.from("weekly_tasks").upsert(updates, { onConflict: "id" });
        if (reorderError) {
          Alert.alert("追加に失敗しました", reorderError.message ?? "Failed to reorder");
          return;
        }
        setTasks(reordered);
      }

      setModalVisible(false);
      const goalLookup = yearlyGoalOptions.reduce<Record<string, { label: string; color: string }>>(
        (acc, item) => {
          acc[item.id] = { label: item.label, color: item.color };
          return acc;
        },
        {},
      );
      // ↓ 追加・更新後に再度Supabase DBから週間タスクを取得する
      const { data: weeklyData, error: weeklyError } = await supabase
        .from("weekly_tasks")
        .select("id, description, yearly_goal_id, accumulated_time_week, order, is_done")
        .eq("user_id", uid)
        .order("order", { ascending: true });
      if (!weeklyError && weeklyData) {
        setTasks(
          reorderTasks(((weeklyData as WeeklyTaskListRow[] | null) ?? []).map((row) => toWeeklyTask(row, goalLookup))),
        );
      }
      setLoading(false);
    } finally {
      setSaving(false);
    }
  };

  // ドラッグの順番並び替えが終わった時に発火
  const handleDragEnd = async ({ data }: { data: WeeklyTask[] }) => {
    if (guardOfflineAction()) return;
    const uid = userId ?? (await fetchUserId());
    if (!uid) {
      Alert.alert(t("deleteConfirm.title"), t("modal.errorRequired"));
      return;
    }
    const reordered = data.map((task, idx) => ({ ...task, order: idx }));
    setTasks(reordered);
    if (reordered.length === 0) return;

    const updates = reordered.map((task) => toWeeklyRow(task, uid));
    const { error } = await supabase.from("weekly_tasks").upsert(updates, { onConflict: "id" });
    if (error) {
      Alert.alert(t("deleteConfirm.title"), error.message ?? t("modal.errorRequired"));
    }
  };

  const handleToggleCompleted = async (taskId: string) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) return;

    const nextCompleted = !currentTask.completed;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: nextCompleted } : task,
      ),
    );

    try {
      const { error } = await supabase
        .from("weekly_tasks")
        .update({ is_done: nextCompleted })
        .eq("id", taskId);

      if (error) {
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modal.errorRequired");
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: currentTask.completed } : task,
        ),
      );
      Alert.alert(t("deleteConfirm.title"), message);
    }
  };

  // 指定のPressable要素の長押しドラッグを可能にするロジック
  const renderTaskCard = ({ item, drag, isActive }: RenderItemParams<WeeklyTask>) => {
    return (
      <View
        style={[
          styles.taskCard,
          item.completed && styles.taskCardCompleted,
          shadows.card,
          isActive && styles.taskCardDragging,
          deleteMode && styles.taskCardDeleteMode,
        ]}
        testID={`weekly-task-card-${item.id}`}
      >
        <LinearGradient
          colors={item.completed ? COMPLETED_CARD_GRADIENT : LIST_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.cardBorderOverlay} />
        <View style={styles.taskControlRow} testID={`weekly-task-controls-${item.id}`}>
          <Text
            testID={`weekly-task-total-${item.id}`}
            style={[styles.totalInlineText, item.completed && styles.goalTimeCompleted]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatMinutes(item.loggedMinutes)}
          </Text>
          {item.completed ? (
            <View style={styles.completedBadge} testID={`weekly-task-completed-badge-${item.id}`}>
              <Text style={styles.completedBadgeText}>{t("completion.badge")}</Text>
            </View>
          ) : null}
          <View style={styles.taskActionGroup}>
            {deleteMode ? (
              <Pressable
                testID={`weekly-task-delete-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={t("actions.delete")}
                style={({ pressed }) => [
                  styles.goalActionIconButton,
                  styles.dangerButton,
                  pressed && styles.secondaryPressed,
                  offlineBlocked && styles.buttonDisabled,
                ]}
                onPress={() => handleDeleteTask(item)}
                disabled={offlineBlocked}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
              </Pressable>
            ) : (
              <>
                {!item.completed ? (
                  <Pressable
                    testID={`weekly-task-timer-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t("task.openTimer")}
                    disabled={offlineBlocked}
                    onPress={() => handleOpenTimer(item)}
                    style={({ pressed }) => [
                      styles.goalActionIconButton,
                      styles.timerActionButton,
                      pressed && styles.secondaryPressed,
                      offlineBlocked && styles.buttonDisabled,
                    ]}
                  >
                    <MaterialCommunityIcons name="timer-outline" size={20} color={colors.textPrimary} />
                  </Pressable>
                ) : null}
                {!item.completed ? (
                  <Pressable
                    testID={`weekly-task-edit-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t("modal.editTitle")}
                    style={({ pressed }) => [
                      styles.goalActionIconButton,
                      styles.dragHandleButton,
                      pressed && styles.secondaryPressed,
                      offlineBlocked && styles.buttonDisabled,
                    ]}
                    onPress={() => handleOpenEdit(item)}
                    disabled={offlineBlocked}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textPrimary} />
                  </Pressable>
                ) : null}
                <Pressable
                  testID={`weekly-task-complete-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={item.completed ? t("completion.undo") : t("completion.complete")}
                  disabled={offlineBlocked}
                  onPress={() => handleToggleCompleted(item.id)}
                  style={({ pressed }) => [
                    styles.goalActionIconButton,
                    styles.completeButton,
                    item.completed && styles.completeButtonActive,
                    pressed && styles.secondaryPressed,
                    offlineBlocked && styles.buttonDisabled,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.completed ? "check-circle" : "check-circle-outline"}
                    size={20}
                    color={item.completed ? colors.success : colors.textPrimary}
                  />
                </Pressable>
                <Pressable
                  testID={`weekly-task-reorder-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t("reorderHandle", { defaultValue: "Drag to reorder" })}
                  style={[styles.goalActionIconButton, styles.dragHandleButton, isActive && styles.dragHandleButtonActive]}
                  onLongPress={drag}
                  delayLongPress={200}
                  hitSlop={14}
                >
                  <MaterialCommunityIcons name="swap-vertical-bold" size={20} color={colors.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        </View>
        <View style={styles.taskHeader}>
          <Text style={[styles.taskTitle, item.completed && styles.goalTitleCompleted]} testID={`weekly-task-title-${item.id}`}>
            {item.title}
          </Text>
        </View>
      </View>
    );
  };

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
      <DraggableFlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        renderItem={renderTaskCard}
        activationDistance={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <>
            <View style={[styles.headerCard, shadows.card]}>
              <LinearGradient
                colors={HEADER_CARD_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.headerTop}>
                <Text style={[styles.pageTitle, isFrench && styles.pageTitleFrench, isAndroidJapanese && styles.pageTitleAndroidJa]}>{t("pageTitle")}</Text>

                <View style={styles.actionsRow}>
                  {!deleteMode && (
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
                      onPress={handleOpenAdd}
                      disabled={offlineBlocked}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
                      <Text style={[styles.primaryButtonText, isFrench && styles.headerButtonTextFrench]}>
                        {t("actions.add")}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.secondaryPressed,
                      deleteMode && styles.secondaryButtonActive,
                    ]}
                    onPress={() => setDeleteMode((prev) => !prev)}
                    disabled={offlineBlocked}
                  >
                    <MaterialCommunityIcons
                      name={deleteMode ? "close" : "trash-can-outline"}
                      size={20}
                      color={colors.textPrimary}
                    />
                    <Text style={[styles.secondaryButtonText, isFrench && styles.headerButtonTextFrench]}>
                      {deleteMode ? t("actions.deleteExit") ?? t("actions.delete") : t("actions.delete")}
                    </Text>
                  </Pressable>
                  {deleteMode && (
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.secondaryPressed,
                        styles.bulkDeleteButton,
                      ]}
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
              </View>
            </View>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </>
        )}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={(
          <View style={[styles.emptyBox, shadows.card]}>
            <LinearGradient
              colors={LIST_CARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.emptyTitle}>{t("list.emptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("list.emptyBody")}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={handleOpenAdd}
              disabled={offlineBlocked}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
              <Text style={styles.primaryButtonText}>{t("list.emptyCta")}</Text>
            </Pressable>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={dismissKeyboard}
          testID="weekly-tasks-modal-overlay"
        >
          <KeyboardAvoidingView
            behavior={getKeyboardAvoidingBehavior()}
            style={styles.modalContainer}
            testID="weekly-tasks-modal-kav"
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="weekly-tasks-modal-scroll"
            >
              <Pressable
                style={[styles.modalCard, shadows.card]}
                onPress={(event) => event.stopPropagation()}
              >
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
                  <Text style={styles.label}>{t("modal.yearlyGoalLabel")}</Text>
                  <Pressable
                    accessibilityRole="button"
                    testID="weekly-tasks-yearly-goal-select"
                    style={[
                      styles.selectInput,
                      isGoalDropdownOpen && styles.selectInputActive,
                      !hasYearlyGoals && styles.selectInputDisabled,
                    ]}
                    onPress={() => setGoalDropdownOpen((prev) => !prev)}
                  >
                    <View style={styles.selectValueRow}>
                      <View
                        style={[
                          styles.categoryDot,
                          {
                            backgroundColor:
                              yearlyGoalOptions.find((opt) => opt.id === draft.yearlyGoalId)?.color ?? colors.accentPrimary,
                          },
                        ]}
                      />
                      {hasYearlyGoals && draft.yearlyGoalId ? (
                        <Text style={styles.selectValue} numberOfLines={2} ellipsizeMode="tail">
                          {yearlyGoalOptions.find((opt) => opt.id === draft.yearlyGoalId)?.label ?? t("modal.unlinkedYearlyGoal")}
                        </Text>
                      ) : hasYearlyGoals ? (
                        <Text style={styles.selectValue} numberOfLines={2} ellipsizeMode="tail">
                          {t("modal.unlinkedYearlyGoal")}
                        </Text>
                      ) : (
                        <Text style={styles.selectValue} numberOfLines={2} ellipsizeMode="tail">
                          {t("modal.noYearlyGoal")}
                        </Text>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name={isGoalDropdownOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                  {isGoalDropdownOpen && hasYearlyGoals && (
                    <View style={styles.selectList}>
                      <View style={styles.selectEdge}>
                        <MaterialCommunityIcons name="chevron-double-up" size={14} color={colors.textSecondary} />
                      </View>
                      <ScrollView style={styles.selectListScroll} showsVerticalScrollIndicator>
                        <Pressable
                          accessibilityRole="button"
                          testID="weekly-tasks-yearly-goal-option-none"
                          style={[styles.selectOption, !draft.yearlyGoalId && styles.selectOptionActive]}
                          onPress={async () => {
                            setDraft((prev) => ({ ...prev, yearlyGoalId: null }));
                            await persistPreferredYearlyGoalId("");
                            setGoalDropdownOpen(false);
                          }}
                        >
                          <View style={styles.selectValueRow}>
                            <View style={[styles.categoryDot, { backgroundColor: colors.divider }]} />
                            <Text
                              style={[styles.selectOptionText, !draft.yearlyGoalId && styles.selectOptionTextActive]}
                              numberOfLines={2}
                              ellipsizeMode="tail"
                            >
                              {t("modal.unlinkedYearlyGoal")}
                            </Text>
                          </View>
                        </Pressable>
                        {yearlyGoalOptions.map((opt) => {
                          const active = opt.id === draft.yearlyGoalId;
                          return (
                            <Pressable
                              key={opt.id}
                              accessibilityRole="button"
                              testID={`weekly-tasks-yearly-goal-option-${opt.id}`}
                              style={[styles.selectOption, active && styles.selectOptionActive]}
                              onPress={async () => {
                                setDraft((prev) => ({ ...prev, yearlyGoalId: opt.id }));
                                await persistPreferredYearlyGoalId(opt.id);
                                setGoalDropdownOpen(false);
                              }}
                            >
                              <View style={styles.selectValueRow}>
                                <View style={[styles.categoryDot, { backgroundColor: opt.color }]} />
                                <Text
                                  style={[styles.selectOptionText, active && styles.selectOptionTextActive]}
                                  numberOfLines={2}
                                  ellipsizeMode="tail"
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

                {modalError ? <Text style={styles.errorText}>{modalError}</Text> : null}

                <View style={styles.modalFooterRow}>
                  <View style={[styles.modalActions, styles.modalActionsRight]}>
                    <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => setModalVisible(false)}>
                      <Text style={styles.secondaryButtonText}>{t("modal.cancel")}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      testID="weekly-tasks-modal-save"
                      style={[styles.primaryButton, saving && styles.buttonDisabled]}
                      onPress={handleSave}
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

      <UsageLimitUpgradeModal
        visible={limitModalVisible}
        title={t("limitAlert.title")}
        message={t("limitAlert.body")}
        backLabel={t("limitAlert.back")}
        upgradeLabel={t("limitAlert.upgrade")}
        onClose={() => setLimitModalVisible(false)}
        onUpgrade={() => {
          setLimitModalVisible(false);
          router.push("/purchases");
        }}
      />

    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  ghRoot: {
    flex: 1,
  },
  listHeader: {
    marginBottom: spacing.lg,
  },
  headerCard: {
    backgroundColor: "#1c3358",
    borderRadius: radius.lg,
    overflow: "hidden",
    padding: compactFeatureSpacing.titleCardPadding,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    gap: spacing.md,
  },
  headerTop: {
    gap: spacing.sm,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    lineHeight: typography.xl * 1.3,
  },
  pageTitleFrench: {
    fontSize: 24,
    lineHeight: 31,
  },
  pageTitleAndroidJa: {
    fontSize: 24,
    lineHeight: 31,
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
  buttonDisabled: {
    opacity: 0.5,
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
  headerButtonTextFrench: {
    fontSize: 14,
  },
  secondaryButtonActive: {
    borderColor: colors.accentSubtle,
    backgroundColor: "rgba(110,168,255,0.08)",
  },
  bulkDeleteButton: {
    borderColor: colors.error,
    backgroundColor: "rgba(242,95,92,0.12)",
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
  },
  emptyBox: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    backgroundColor: "#1c3358",
    alignItems: "flex-start",
    gap: spacing.sm,
    overflow: "hidden",
  },
  listContent: {
    paddingBottom: spacing.xl * 2,
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    opacity: 0.85,
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
  taskCard: {
    padding: 9,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    backgroundColor: "#1c3358",
    gap: 4,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  taskCardCompleted: {
    borderColor: "rgba(56,217,150,0.55)",
    shadowColor: colors.success,
    shadowOpacity: 0.22,
  },
  taskCardDragging: {
    borderColor: "rgba(110,168,255,0.6)",
    backgroundColor: "rgba(30,94,255,0.08)",
  },
  taskCardDeleteMode: {
    borderColor: "rgba(242,95,92,0.5)",
    backgroundColor: "rgba(242,95,92,0.08)",
  },
  taskHeader: {
    minHeight: 24,
    justifyContent: "center",
  },
  taskTitle: {
    marginHorizontal: spacing.xs,
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "800",
    lineHeight: typography.md * 1.15,
  },
  goalTitleCompleted: {
    color: "rgba(233,237,247,0.78)",
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dragHandleButtonActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.16)",
  },
  dangerButton: {
    backgroundColor: "rgba(242,95,92,0.14)",
    borderColor: colors.error,
  },
  taskControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs / 2,
  },
  totalInlineText: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: spacing.xs,
    color: colors.accentSubtle,
    fontSize: typography.sm,
    fontWeight: "800",
  },
  goalTimeCompleted: {
    color: "rgba(56,217,150,0.92)",
  },
  taskActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs / 1.5,
  },
  goalActionIconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dragHandleButton: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: colors.divider,
  },
  timerActionButton: {
    backgroundColor: "rgba(30,94,255,0.2)",
    borderColor: colors.accentPrimary,
  },
  completeButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(56,217,150,0.3)",
  },
  completeButtonActive: {
    backgroundColor: "rgba(56,217,150,0.14)",
    borderColor: "rgba(56,217,150,0.65)",
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
  manualCard: {
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
  manualTaskBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: spacing.xs,
  },
  manualTaskTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  manualSummaryBox: {
    marginTop: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  manualSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  manualSummaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  manualSummaryValue: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  manualSummaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  manualSummaryTotal: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "800",
  },
  manualInputsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  manualInputGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  manualNumberInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: typography.lg,
    height: 56,
  },
  manualHelperRow: {
    gap: spacing.xs / 2,
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
  selectInputDisabled: {
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.02)",
    opacity: 0.7,
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
    maxHeight: 140,
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
  modalActionsRight: {
    marginLeft: "auto",
  },
  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.md,
    marginTop: spacing.sm,
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
  primaryButtonDisabled: {
    opacity: 0.6,
  },
});
