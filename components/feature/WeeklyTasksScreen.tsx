import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { z } from "zod";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useKeyboardDismissAccessory } from "../../hooks/useKeyboardDismissAccessory";
import { useOfflineActionGuard } from "../../hooks/useOfflineActionGuard";
import { deleteWeeklyTasks } from "../../lib/api/supabase/goals/allItemDelete";
import { updateAccumulatedTimes } from "../../lib/api/supabase/timeTracking/updateAccumulatedTimes";
import { buildOfflineCacheKey, readOfflineCache, writeOfflineCache } from "../../lib/offline/cache";
import { supabase } from "../../lib/supabaseClient";
import { useOffline } from "../../providers/OfflineProvider";
import { Database } from "../../types/database";
import KeyboardDismissButton from "../KeyboardDismissButton";
import Loading from "../Loading";
import OfflineRequiredScreen from "../OfflineRequiredScreen";

// 画面表示用データの型
type WeeklyTask = {
  id: string;
  title: string;
  monthlyGoalLabel: string;
  monthlyGoalId: string;
  loggedMinutes: number;
  order: number;
};

//データベース用データの型
type WeeklyTaskRow = {
  id: string;
  user_id?: string | null;
  description: string;
  monthly_goal_id: string | null;
  accumulated_time_week: number | null;
  order: number | null;
  updated_at?: string | null;
};
type MonthlyGoalRow = Database["public"]["Tables"]["monthly_goals"]["Row"];

type ManualLogState = {
  visible: boolean;
  task: WeeklyTask | null;
  hours: string;
  minutes: string;
  defaultMinutes: number;
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

// 分を時間へ変換し、小数第1位まで表示する
const formatCompactHours = (minutes: number) => {
  const safeMinutes = Math.max(0, minutes);
  const roundedHours = Math.round((safeMinutes / 60) * 10) / 10;
  const displayValue = Number.isInteger(roundedHours) ? String(roundedHours) : roundedHours.toFixed(1);
  return `${displayValue}h`;
};

const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;
const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;
const offlineWeeklyTasksSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    monthlyGoalLabel: z.string(),
    monthlyGoalId: z.string(),
    loggedMinutes: z.number(),
    order: z.number(),
  }),
);
const offlineMonthlyGoalOptionsSchema = z.array(
  z.object({
    id: z.string(),
    label: z.string(),
    color: z.string(),
    month: z.number().int().min(1).max(12),
  }),
);

export default function WeeklyTasksScreen() {
  const { t, i18n } = useTranslation(["weeklyTasks", "monthlyGoals"]);
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasOfflineCache, setHasOfflineCache] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [manualLog, setManualLog] = useState<ManualLogState>({
    visible: false,
    task: null,
    hours: "0",
    minutes: "0",
    defaultMinutes: 0,
  });

  const manualHoursNumber = useMemo(() => Number(manualLog.hours || "0"), [manualLog.hours]);
  const manualMinutesNumber = useMemo(() => Math.min(59, Number(manualLog.minutes || "0")), [manualLog.minutes]);
  const manualAddedMinutes = useMemo(
    () => manualHoursNumber * 60 + manualMinutesNumber,
    [manualHoursNumber, manualMinutesNumber],
  );
  const manualFinalMinutes = useMemo(
    () => manualLog.defaultMinutes + manualAddedMinutes,
    [manualAddedMinutes, manualLog.defaultMinutes],
  );
  const manualHasInput = manualAddedMinutes > 0;
  const manualChanged = manualLog.task !== null && manualHasInput;
  const manualInRange = manualHasInput;

  const [monthlyGoalOptions, setMonthlyGoalOptions] = useState<
    { id: string; label: string; color: string; month: number }[]
  >([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGoalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const weeklyTaskSchema = z.object({
    title: z.string().trim().min(1),
    monthlyGoalId: z.string().trim().min(1),
  });

  const [draft, setDraft] = useState({
    title: "",
    monthlyGoalId: monthlyGoalOptions[0]?.id ?? "",
    month: new Date().getMonth() + 1,
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const { offlineBlocked } = useOffline();
  const guardOfflineAction = useOfflineActionGuard();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isFrench = currentLanguage.startsWith("fr");

  const monthsList = useMemo(() => Array.from({ length: 12 }, (_, idx) => idx + 1), []);
  const initializedDefaultGoal = useRef(false);
  const hasLoadedRef = useRef(false);
  // 各月名の配列の翻訳データを返している。(ns = name space)
  // returnObject:trueとすることで配列やオブジェクトの翻訳データをそのまま配列やオブジェクトとして扱える。
  // これがないと”[aaa, bbb, ccc]”のような一つの文字列として解釈されてしまう。
  const monthNames = useMemo(
    () => (t("monthsShort", { ns: "monthlyGoals", returnObjects: true }) as string[]) ?? [],
    [t],
  );
  // 各月名の配列の翻訳データからユーザが選択中のデータを返している
  const monthLabel = useCallback(
    (month: number) => {
      const idx = Math.max(0, Math.min(11, month - 1));
      return monthNames[idx] ?? String(month);
    },
    [monthNames],
  );
  const monthGoalsForSelected = useMemo(
    () => monthlyGoalOptions.filter((opt) => opt.month === selectedMonth),
    [monthlyGoalOptions, selectedMonth],
  );

  // 選択した月が月間目標を持つかどうかboolean
  const hasMonthlyGoals = monthGoalsForSelected.length > 0;

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
          const { error } = await supabase.from("weekly_tasks" as any).delete().eq("id", task.id);
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
              .from("weekly_tasks" as any)
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
        monthlyGoalId: task.monthlyGoalId,
        title: task.title,
        monthlyGoal: task.monthlyGoalLabel,
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
    (row: WeeklyTaskRow, goalLookup: Record<string, { label: string; color: string; month: number }>): WeeklyTask => ({
      id: row.id,
      title: row.description,
      monthlyGoalId: row.monthly_goal_id ?? "",
      monthlyGoalLabel: goalLookup[row.monthly_goal_id ?? ""]?.label ?? t("task.monthlyLink"),
      loggedMinutes: row.accumulated_time_week ?? 0,
      order: row.order ?? 0,
    }),
    [t],
  );

  // 画面表示用のWeeklyTaskデータをデータベースに保存する形へ変換
  const toWeeklyRow = React.useCallback(
    (task: WeeklyTask, uid: string) => ({
      id: task.id,
      user_id: uid,
      description: task.title,
      monthly_goal_id: task.monthlyGoalId,
      accumulated_time_week: task.loggedMinutes,
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


  // 最新データ(週間タスクと月間目標)の取得
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    const uid = await fetchUserId();
    if (!uid) {
      setErrorMessage(t("modal.errorRequired"));
      setLoading(false);
      return;
    }

    // ローカルキャッシュのキー名を生成
    const taskCacheKey = buildOfflineCacheKey("weekly-tasks", uid);
    const goalCacheKey = buildOfflineCacheKey("weekly-monthly-goals", uid);

    // オフラインの場合、生成したキー名を使ってローカルキャッシュデータを取りに行く(キャッシュデータがなければ後ほどオフラインページ表示へ遷移される)
    if (offlineBlocked) {
      const [cachedTasks, cachedGoals] = await Promise.all([
        readOfflineCache(taskCacheKey, offlineWeeklyTasksSchema),
        readOfflineCache(goalCacheKey, offlineMonthlyGoalOptionsSchema),
      ]);
      if (cachedTasks && cachedGoals) {
        setTasks(cachedTasks);
        setMonthlyGoalOptions(cachedGoals);
        setHasOfflineCache(true);
      } else {
        setHasOfflineCache(false);
      }
      setLoading(false);
      return; // オフラインの場合はここでデータフェッチ処理終了
    }

    const [{ data: monthlyData, error: monthlyError }, { data: weeklyData, error: weeklyError }] = await Promise.all([
      supabase
        .from("monthly_goals")
        .select("id, description, month, yearly_goal_id, yearly_goals(year_goal_color)")
        .eq("user_id", uid)
        .order("month", { ascending: true }),
      supabase
        .from("weekly_tasks" as any)
        .select("id, description, monthly_goal_id, accumulated_time_week, order")
        .eq("user_id", uid)
        .order("order", { ascending: true }),
    ]);

    if (monthlyError || weeklyError) {
      setErrorMessage(monthlyError?.message ?? weeklyError?.message ?? "Failed to load data");
      setLoading(false);
      return;
    }

    // 月間目標データを週間タスクページで使用しやすいフォーマットに変換
    const monthlyOptions = ((monthlyData as any[]) ?? []).map((row) => {
      const color = row?.yearly_goals?.year_goal_color ?? colors.accentPrimary;
      const goalRow = row as MonthlyGoalRow;
      return {
        id: goalRow.id,
        label: t("modal.monthOptionLabel", {
          monthLabel: monthLabel(goalRow.month),
          description: goalRow.description,
        }),
        color,
        month: goalRow.month,
      };
    });

    // 月間目標リスト配列から{ [id]: { label, color, month} }　の辞書のようなものを作る
    // コードがシンプルになり、パフォーマンスが安定する
    const goalLookup = monthlyOptions.reduce<Record<string, { label: string; color: string; month: number }>>((acc, item) => {
      acc[item.id] = { label: item.label, color: item.color, month: item.month };
      return acc;
    }, {});

    const weekly = reorderTasks(
      ((weeklyData as any[]) ?? []).map((row) => toWeeklyTask(row as WeeklyTaskRow, goalLookup)),
    );

    setMonthlyGoalOptions(monthlyOptions);
    setTasks(weekly);

    // データが空配列ではない場合、ローカルキャッシュに保存
    setHasOfflineCache(weekly.length > 0 && monthlyOptions.length > 0);
    await Promise.all([
      writeOfflineCache(taskCacheKey, offlineWeeklyTasksSchema, weekly),
      writeOfflineCache(goalCacheKey, offlineMonthlyGoalOptionsSchema, monthlyOptions),
    ]);
    if (monthlyOptions[0] && !initializedDefaultGoal.current) {
      initializedDefaultGoal.current = true;
      setDraft((prev) => ({ ...prev, monthlyGoalId: monthlyOptions[0].id, month: monthlyOptions[0].month }));
    }
    setLoading(false);
  }, [fetchUserId, initializedDefaultGoal, monthLabel, offlineBlocked, reorderTasks, t, toWeeklyTask]);

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

  // ユーザがタスク追加時に選んだ選択月を記憶して次回の追加時のデフォルトとしてセット
  useEffect(() => {
    const syncMonth = async () => {
      const storedMonth = await AsyncStorage.getItem("weeklyTasks:selectedMonth");
      if (storedMonth) {
        const parsed = Number(storedMonth);
        if (parsed >= 1 && parsed <= 12) {
          setSelectedMonth(parsed);
          setDraft((prev) => ({ ...prev, month: parsed }));
        }
      }
    };
    syncMonth();
  }, []);


  // 選択月に月間目標が存在し、ユーザが選択中の月間目標がその選択月に含まれない場合、ユーザの選択中の月間目標は「選択月の1番目の目標」に自動で設定される。
  // 選択付きに月間目標がなく、ユーザが既に月間目標を選んでいる場合、ユーザの選択中の月間目標は自動でnullとなる
  useEffect(() => {
    if (monthGoalsForSelected.length > 0 && !monthGoalsForSelected.some((opt) => opt.id === draft.monthlyGoalId)) {
      setDraft((prev) => ({ ...prev, monthlyGoalId: monthGoalsForSelected[0].id }));
    }
    if (monthGoalsForSelected.length === 0 && draft.monthlyGoalId) {
      setDraft((prev) => ({ ...prev, monthlyGoalId: "" }));
    }
  }, [draft.monthlyGoalId, monthGoalsForSelected, selectedMonth]);

  // 「追加ボタン」からモーダルを開いた時のロジック
  const handleOpenAdd = () => {
    if (guardOfflineAction()) return;
    setEditingId(null);
    setDraft({
      title: "",
      monthlyGoalId: monthGoalsForSelected[0]?.id ?? "",
      month: selectedMonth,
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
    const goalMonth = monthlyGoalOptions.find((opt) => opt.id === task.monthlyGoalId)?.month;
    setEditingId(task.id);
    setDraft({
      title: task.title,
      monthlyGoalId: task.monthlyGoalId,
      month: goalMonth ?? selectedMonth,
    });
    if (goalMonth) {
      setSelectedMonth(goalMonth);
    }
    setModalError(null);
    setModalVisible(true);
  };

  // 手動で作業時間積み上げモーダルをオープンする処理
  const handleOpenManualLog = (task: WeeklyTask) => {
    if (guardOfflineAction()) return;
    setManualLog({
      visible: true,
      task,
      hours: "0",
      minutes: "0",
      defaultMinutes: Math.max(0, task.loggedMinutes),
    });
  };

  const handleManualHoursChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "").slice(0, 4);
    setManualLog((prev) => ({ ...prev, hours: sanitized }));
  };

  const handleManualMinutesChange = (value: string) => {
    //奇数から数字以外を全てから文字に変換し、文字列内を数字だけにする。先頭から２桁までの数値を切り取ることで、値を必ず2桁までの数値に制御できる。
    const sanitized = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (sanitized === "") {
      setManualLog((prev) => ({ ...prev, minutes: "" }));
      return;
    }
    const numeric = Math.min(59, Number(sanitized));
    setManualLog((prev) => ({ ...prev, minutes: String(numeric) }));
  };

  const closeManualLog = () => {
    setManualLog({
      visible: false,
      task: null,
      hours: "0",
      minutes: "0",
      defaultMinutes: 0,
    });
  };

  const handleSubmitManualLog = () => {
    if (guardOfflineAction()) return;
    if (!manualLog.task || !manualInRange || !manualChanged) return;
    const safeTotal = Math.max(0, manualFinalMinutes);
    Alert.alert(
      t("manualModal.confirmTitle"),
      t("manualModal.confirmMessage", {
        total: formatMinutes(safeTotal),
        added: formatMinutes(manualAddedMinutes),
      }),
      [
        { text: t("manualModal.cancel"), style: "cancel" },
        {
          text: t("manualModal.confirm"),
          style: "default",
          onPress: async () => {
            const uid = userId ?? (await fetchUserId());
            if (!uid || !manualLog.task) {
              Alert.alert(t("manualModal.errorTitle"), t("modal.errorRequired"));
              closeManualLog();
              return;
            }
            try {
              const result = await updateAccumulatedTimes({
                userId: uid,
                taskId: manualLog.task.id,
                monthlyGoalId: manualLog.task.monthlyGoalId,
                newLoggedMinutes: safeTotal,
                previousLoggedMinutes: manualLog.defaultMinutes,
              });

              setTasks((prev) =>
                prev.map((task) =>
                  task.id === manualLog.task?.id ? { ...task, loggedMinutes: result.newLoggedMinutes } : task,
                ),
              );

              Alert.alert(t("manualModal.successTitle"), t("manualModal.successBody"));
            } catch (error) {
              const message = error instanceof Error ? error.message : t("modal.errorRequired");
              Alert.alert(t("manualModal.errorTitle"), message);
            } finally {
              closeManualLog();
            }
          },
        },
      ]);
  };



  const handleSave = async () => {
    if (guardOfflineAction()) return;
    // 選択月に月間目標がない場合は早期return
    if (!hasMonthlyGoals) {
      setModalError(t("modal.noMonthlyGoal", { monthLabel: monthLabel(selectedMonth) }));
      return;
    }

    const parse = weeklyTaskSchema.safeParse(draft);
    if (!parse.success) {
      setModalError(t("modal.errorRequired"));
      return;
    }

    const uid = userId ?? (await fetchUserId());
    if (!uid) {
      Alert.alert(t("modal.errorRequired"));
      return;
    }

    // 編集保存処理
    if (editingId) {
      const existing = tasks.find((task) => task.id === editingId);
      const { error } = await supabase
        .from("weekly_tasks" as any)
        .update({
          description: parse.data.title,
          monthly_goal_id: parse.data.monthlyGoalId,
          accumulated_time_week: existing?.loggedMinutes ?? 0,
        })
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
        .from("weekly_tasks" as any)
        .insert({
          description: parse.data.title,
          monthly_goal_id: parse.data.monthlyGoalId,
          accumulated_time_week: 0,
          user_id: uid,
          order: 0,
        })
        .select("id, description, monthly_goal_id, accumulated_time_week, order")
        .single();
      if (error || !inserted) {
        Alert.alert("追加に失敗しました", error?.message ?? "Failed to add");
        return;
      }

      // 月間目標リスト配列から{ [id]: { label, color, month} }　の辞書のようなものを作る
      // コードがシンプルになり、パフォーマンスが安定する
      const goalLookup = monthlyGoalOptions.reduce<Record<string, { label: string; color: string; month: number }>>(
        (acc, item) => {
          acc[item.id] = { label: item.label, color: item.color, month: item.month };
          return acc;
        },
        {},
      );
      const newTask = toWeeklyTask(inserted as unknown as WeeklyTaskRow, goalLookup);
      const reordered = reorderTasks([...orderedExisting, newTask]);
      const updates = reordered.map((task) => toWeeklyRow(task, uid));
      const { error: reorderError } = await supabase.from("weekly_tasks" as any).upsert(updates, { onConflict: "id" });
      if (reorderError) {
        Alert.alert("追加に失敗しました", reorderError.message ?? "Failed to reorder");
        return;
      }
      setTasks(reordered);
    }

    setModalVisible(false);


    // ↓ 追加・更新後に再度Supabase DBから週間タスクを取得する

    // 月間目標リスト配列から{ [id]: { label, color, month} }　の辞書のようなものを作る
    // コードがシンプルになり、パフォーマンスが安定する
    const goalLookup = monthlyGoalOptions.reduce<Record<string, { label: string; color: string; month: number }>>((acc, item) => {
      acc[item.id] = { label: item.label, color: item.color, month: item.month };
      return acc;
    }, {});
    const { data: weeklyData, error: weeklyError } = await supabase
      .from("weekly_tasks" as any)
      .select("id, description, monthly_goal_id, accumulated_time_week, order")
      .eq("user_id", uid)
      .order("order", { ascending: true });
    if (!weeklyError && weeklyData) {
      setTasks(
        reorderTasks(((weeklyData as any[]) ?? []).map((row) => toWeeklyTask(row as WeeklyTaskRow, goalLookup))),
      );
    }
    setLoading(false);
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
    const { error } = await supabase.from("weekly_tasks" as any).upsert(updates, { onConflict: "id" });
    if (error) {
      Alert.alert(t("deleteConfirm.title"), error.message ?? t("modal.errorRequired"));
    }
  };

  // 指定のPressable要素の長押しドラッグを可能にするロジック
  const renderTaskCard = ({ item, drag, isActive }: RenderItemParams<WeeklyTask>) => {
    return (
      <View
        style={[
          styles.taskCard,
          shadows.card,
          isActive && styles.taskCardDragging,
          deleteMode && styles.taskCardDeleteMode,
        ]}
      >
        <LinearGradient
          colors={LIST_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.cardBorderOverlay} />
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>
        </View>

        <View style={styles.taskControlRow}>
          <Text
            testID={`weekly-task-total-${item.id}`}
            style={styles.totalInlineText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatCompactHours(item.loggedMinutes)}
          </Text>
          <View style={styles.taskActionGroup}>
            <Pressable
              testID={`weekly-task-timer-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={t("task.openTimer")}
              disabled={deleteMode || offlineBlocked}
              onPress={() => handleOpenTimer(item)}
              style={({ pressed }) => [
                styles.goalActionIconButton,
                styles.timerActionButton,
                pressed && styles.secondaryPressed,
                (deleteMode || offlineBlocked) && styles.buttonDisabled,
              ]}
            >
              <MaterialCommunityIcons name="timer-outline" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              testID={`weekly-task-manual-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={t("task.manualLog")}
              disabled={deleteMode || offlineBlocked}
              onPress={() => handleOpenManualLog(item)}
              style={({ pressed }) => [
                styles.goalActionIconButton,
                styles.dragHandleButton,
                pressed && styles.secondaryPressed,
                (deleteMode || offlineBlocked) && styles.buttonDisabled,
              ]}
            >
              <MaterialCommunityIcons name="playlist-edit" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              testID={`weekly-task-edit-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={deleteMode ? t("actions.delete") : t("modal.editTitle")}
              style={({ pressed }) => [
                styles.goalActionIconButton,
                deleteMode ? styles.dangerButton : styles.dragHandleButton,
                pressed && styles.secondaryPressed,
                offlineBlocked && styles.buttonDisabled,
              ]}
              onPress={() => {
                if (deleteMode) {
                  handleDeleteTask(item);
                } else {
                  handleOpenEdit(item);
                }
              }}
              disabled={offlineBlocked}
            >
              <MaterialCommunityIcons
                name={deleteMode ? "trash-can-outline" : "pencil-outline"}
                size={20}
                color={deleteMode ? colors.error : colors.textPrimary}
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
          </View>
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
                <Text style={[styles.pageTitle, isFrench && styles.pageTitleFrench]}>{t("pageTitle")}</Text>

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
            behavior={Platform.select({ ios: "padding", android: undefined })}
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
                  <Text style={styles.label}>{t("modal.monthLabel")}</Text>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.selectInput, isMonthDropdownOpen && styles.selectInputActive]}
                    onPress={() => setMonthDropdownOpen((prev) => !prev)}
                  >
                    <Text style={styles.selectValue}>{t("modal.monthValue", { monthLabel: monthLabel(selectedMonth) })}</Text>
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
                            style={[styles.selectOption, month === selectedMonth && styles.selectOptionActive]}
                            onPress={async () => {
                              setSelectedMonth(month);
                              setDraft((prev) => ({ ...prev, month }));
                              await AsyncStorage.setItem("weeklyTasks:selectedMonth", String(month));
                              setMonthDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.selectOptionText, month === selectedMonth && styles.selectOptionTextActive]}>
                              {t("modal.monthValue", { monthLabel: monthLabel(month) })}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                      <View style={[styles.selectEdge, styles.selectEdgeBottom]}>
                        <MaterialCommunityIcons name="chevron-double-down" size={14} color={colors.textSecondary} />
                      </View>
                    </View>
                  )}

                  <Text style={styles.label}>{t("modal.monthlyGoalLabel")}</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!hasMonthlyGoals}
                    style={[
                      styles.selectInput,
                      isGoalDropdownOpen && styles.selectInputActive,
                      !hasMonthlyGoals && styles.selectInputDisabled,
                    ]}
                    onPress={() => setGoalDropdownOpen((prev) => !prev)}
                  >
                    <View style={styles.selectValueRow}>
                      <View
                        style={[
                          styles.categoryDot,
                          {
                            backgroundColor:
                              monthlyGoalOptions.find((opt) => opt.id === draft.monthlyGoalId)?.color ?? colors.accentPrimary,
                          },
                        ]}
                      />
                      {hasMonthlyGoals ? (
                        <Text style={styles.selectValue} numberOfLines={2} ellipsizeMode="tail">
                          {monthlyGoalOptions.find((opt) => opt.id === draft.monthlyGoalId)?.label ?? t("task.monthlyLink")}
                        </Text>
                      ) : (
                        <Text style={styles.selectValue} numberOfLines={2} ellipsizeMode="tail">
                          {t("modal.noMonthlyGoal", { monthLabel: monthLabel(selectedMonth) })}
                        </Text>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name={isGoalDropdownOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                  {isGoalDropdownOpen && hasMonthlyGoals && (
                    <View style={styles.selectList}>
                      <View style={styles.selectEdge}>
                        <MaterialCommunityIcons name="chevron-double-up" size={14} color={colors.textSecondary} />
                      </View>
                      <ScrollView style={styles.selectListScroll} showsVerticalScrollIndicator>
                        {monthlyGoalOptions
                          .filter((opt) => opt.month === selectedMonth)
                          .map((opt) => {
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
                      style={[styles.primaryButton, !hasMonthlyGoals && styles.primaryButtonDisabled]}
                      onPress={handleSave}
                      disabled={!hasMonthlyGoals}
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

      <Modal visible={manualLog.visible} transparent animationType="fade" onRequestClose={closeManualLog}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: "padding", android: undefined })}
            style={styles.modalContainer}
            testID="manual-log-modal-kav"
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="manual-log-modal-scroll"
            >
              <View style={[styles.manualCard, shadows.card]}>
                <Text style={styles.modalTitle}>{t("manualModal.title")}</Text>

                <View style={styles.manualTaskBox}>
                  <Text style={styles.manualTaskTitle} numberOfLines={2} ellipsizeMode="tail">
                    {manualLog.task?.title ?? "-"}
                  </Text>
                  <View style={styles.manualSummaryBox}>
                    <View style={styles.manualSummaryRow}>
                      <Text style={styles.manualSummaryLabel}>{t("manualModal.currentLabel")}</Text>
                      <Text style={styles.manualSummaryValue}>{formatMinutes(manualLog.defaultMinutes)}</Text>
                    </View>
                    <View style={styles.manualSummaryRow}>
                      <Text style={styles.manualSummaryLabel}>{t("manualModal.addedLabel")}</Text>
                      <Text style={styles.manualSummaryValue}>{formatMinutes(manualAddedMinutes)}</Text>
                    </View>
                    <View style={styles.manualSummaryDivider} />
                    <View style={styles.manualSummaryRow}>
                      <Text style={styles.manualSummaryLabel}>{t("manualModal.finalLabel")}</Text>
                      <Text style={styles.manualSummaryTotal}>{formatMinutes(manualFinalMinutes)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.manualInputsRow}>
                  <View style={styles.manualInputGroup}>
                    <Text style={styles.label}>{t("manualModal.hoursLabel")}</Text>
                    <TextInput
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      value={manualLog.hours}
                      onChangeText={handleManualHoursChange}
                      style={styles.manualNumberInput}
                    />
                  </View>
                  <View style={styles.manualInputGroup}>
                    <Text style={styles.label}>{t("manualModal.minutesLabel")}</Text>
                    <TextInput
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      value={manualLog.minutes}
                      onChangeText={handleManualMinutesChange}
                      style={styles.manualNumberInput}
                    />
                  </View>
                </View>

                <View style={styles.manualHelperRow}>
                  <Text style={styles.helperText}>{t("manualModal.rangeHelper")}</Text>
                </View>

                <View style={styles.modalActions}>
                  <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={closeManualLog}>
                    <Text style={styles.secondaryButtonText}>{t("manualModal.cancel")}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!manualLog.task || !manualInRange || !manualChanged}
                    onPress={handleSubmitManualLog}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.primaryPressed,
                      (!manualLog.task || !manualInRange || !manualChanged) && styles.primaryButtonDisabled,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>{t("manualModal.submit")}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
          {keyboardVisible ? (
            <KeyboardDismissButton keyboardHeight={keyboardHeight} onPress={dismissKeyboard} />
          ) : null}
        </View>
      </Modal>
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
    padding: spacing.xl,
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
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    backgroundColor: "#1c3358",
    gap: spacing.md,
    overflow: "hidden",
    marginBottom: spacing.sm,
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
    minHeight: 32,
    justifyContent: "center",
  },
  taskTitle: {
    color: colors.textPrimary,
    fontSize: typography.md + 1,
    fontWeight: "800",
    lineHeight: (typography.md + 1) * 1.45,
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
    gap: spacing.sm,
  },
  totalInlineText: {
    flex: 1,
    minWidth: 0,
    color: colors.accentSubtle,
    fontSize: typography.md,
    fontWeight: "800",
  },
  taskActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  goalActionIconButton: {
    width: 40,
    height: 40,
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
