import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Keyboard,
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
import { useOfflineActionGuard } from "../../hooks/useOfflineActionGuard";
import { deleteMonthlyGoals } from "../../lib/api/supabase/goals/allItemDelete";
import { deleteMonthlyGoalWithWeeklyTasks } from "../../lib/api/supabase/goals/cascadeDelete";
import { buildOfflineCacheKey, readOfflineCache, writeOfflineCache } from "../../lib/offline/cache";
import { supabase } from "../../lib/supabaseClient";
import { useOffline } from "../../providers/OfflineProvider";
import { Database } from "../../types/database";
import Loading from "../Loading";
import OfflineRequiredScreen from "../OfflineRequiredScreen";

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

type MonthlyGoalRow = Database["public"]["Tables"]["monthly_goals"]["Row"];
type YearlyGoalRow = Database["public"]["Tables"]["yearly_goals"]["Row"];

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
const offlineMonthlyGoalsSchema = z.array(
  z.object({
    id: z.string(),
    description: z.string(),
    month: z.number().int().min(1).max(12),
    estimatedMinutes: z.number(),
    accumulatedMinutes: z.number(),
    yearlyGoalId: z.string(),
    order: z.number(),
    updatedAt: z.string().nullable().optional(),
  }),
);
const offlineYearlyGoalOptionsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
  }),
);

export default function MonthlyGoalsScreen() {
  const { t } = useTranslation("monthlyGoals");
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<YearlyGoalOption[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasOfflineCache, setHasOfflineCache] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const initialMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [draft, setDraft] = useState<{
    description: string;
    month: string;
    yearlyGoalId: string;
    estimatedHours: string;
  }>({
    description: "",
    month: String(initialMonth),
    yearlyGoalId: "",
    estimatedHours: "10",
  });
  const monthListRef = useRef<FlatList<number>>(null);
  const [isMonthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [isYearlyDropdownOpen, setYearlyDropdownOpen] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { offlineBlocked } = useOffline();
  const guardOfflineAction = useOfflineActionGuard();

  const dismissKeyboard = useCallback(() => {
    // キーボード非表示時にアイコンが瞬時に消える仕様(楽観的UI)
    setIsKeyboardVisible(false);
    Keyboard.dismiss();
  }, []);

  const toMonthlyGoal = (row: MonthlyGoalRow): MonthlyGoal => ({
    id: row.id,
    description: row.description,
    month: row.month,
    estimatedMinutes: row.estimated_time_month ?? 0,
    accumulatedMinutes: row.accumulated_time_month ?? 0,
    yearlyGoalId: row.yearly_goal_id,
    order: row.order ?? 0,
    updatedAt: row.updated_at ?? null,
  });

  const toMonthlyRow = (goal: MonthlyGoal, uid: string) => ({
    id: goal.id,
    user_id: uid,
    yearly_goal_id: goal.yearlyGoalId,
    month: goal.month,
    description: goal.description,
    estimated_time_month: goal.estimatedMinutes,
    accumulated_time_month: goal.accumulatedMinutes,
    order: goal.order,
  });

  // 月間ゴールリストを指定した月でフィルターし、指定月の目標リストとそれ以外の月の目標リストを返す。また該当月の目標リストはorderをもとにここで並び替えられる
  const reorderWithinMonth = (allGoals: MonthlyGoal[], month: number) => {
    const sameMonth = allGoals
      .filter((goal) => goal.month === month)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((goal, idx) => ({ ...goal, order: idx }));
    const others = allGoals.filter((goal) => goal.month !== month);
    return [...others, ...sameMonth];
  };

  // ログイン中のユーザ取得
  const fetchUserId = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;
    setUserId(uid);
    return uid;
  }, []);

  // 年間目標データと月間目標データを取得
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    const uid = await fetchUserId();
    if (!uid) {
      setErrorMessage(t("errors.loginMissing"));
      setLoading(false);
      return;
    }

    // ローカルキャッシュのキー名を生成
    const goalsCacheKey = buildOfflineCacheKey("monthly-goals", uid);
    const yearlyCacheKey = buildOfflineCacheKey("monthly-goals-yearly", uid);

    // オフラインの場合、生成したキー名を使ってローカルキャッシュデータを取りに行く(キャッシュデータがなければ後ほどオフラインページ表示へ遷移される)
    if (offlineBlocked) {
      const [cachedGoals, cachedYearly] = await Promise.all([
        readOfflineCache(goalsCacheKey, offlineMonthlyGoalsSchema),
        readOfflineCache(yearlyCacheKey, offlineYearlyGoalOptionsSchema),
      ]);
      if (cachedGoals && cachedYearly) {
        setGoals(cachedGoals);
        setYearlyGoals(cachedYearly);
        setHasOfflineCache(true);
      } else {
        setHasOfflineCache(false);
      }
      setLoading(false);
      return;　// オフラインの場合はここでデータフェッチ処理終了
    }

    const [{ data: yearlyData, error: yearlyError }, { data: monthlyData, error: monthlyError }] = await Promise.all([
      supabase
        .from("yearly_goals")
        .select("id, description, year_goal_color, order")
        .eq("user_id", uid)
        .order("order", { ascending: true }),
      supabase
        .from("monthly_goals")
        .select("id, yearly_goal_id, month, description, estimated_time_month, accumulated_time_month, order, updated_at")
        .eq("user_id", uid)
        .order("month", { ascending: true })
        .order("order", { ascending: true }),
    ]);

    // 年間ゴールもしくは月間ゴールのどちらか一方でも取得できなかったらエラーを返す
    if (yearlyError || monthlyError) {
      setErrorMessage(yearlyError?.message ?? monthlyError?.message ?? t("errors.fetchFailed"));
      setLoading(false);
      return;
    }

    const yearlyOptions = ((yearlyData as YearlyGoalRow[]) ?? []).map((row) => ({
      id: row.id,
      name: row.description,
      color: row.year_goal_color,
    }));
    const mappedMonthly = ((monthlyData as MonthlyGoalRow[]) ?? []).map(toMonthlyGoal);
    setYearlyGoals(yearlyOptions);
    setGoals(mappedMonthly);
    // データが空配列ではない場合、ローカルキャッシュに保存
    setHasOfflineCache(mappedMonthly.length > 0 && yearlyOptions.length > 0);
    await Promise.all([
      writeOfflineCache(goalsCacheKey, offlineMonthlyGoalsSchema, mappedMonthly),
      writeOfflineCache(yearlyCacheKey, offlineYearlyGoalOptionsSchema, yearlyOptions),
    ]);
    setLoading(false);
  }, [fetchUserId, offlineBlocked, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // このページにいる間はキーボードにリスナーが付与される
  // このリスナーはキーボードの表示・非表示を監視し、キーボードアイコンの表示非表示のトリガーになる
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 入力中の月間目標が年間目標と紐づいていない状態ならば年間目標リストの１番目がデフォルトでセットされる
  useEffect(() => {
    if (!draft.yearlyGoalId && yearlyGoals[0]?.id) {
      setDraft((prev) => ({ ...prev, yearlyGoalId: yearlyGoals[0].id }));
    }
  }, [draft.yearlyGoalId, yearlyGoals]);

  const monthNames = t("monthsShort", { returnObjects: true }) as string[];

  // 各言語の指定月の名称を返す
  const monthLabel = (month: number) => {
    const idx = Math.max(0, Math.min(11, month - 1)); // max処理で下限をインデックス0(1月)、min処理で上限をインデックス11(12月)と制御
    return monthNames[idx] ?? `M${month}`;
  };

  const monthsList = useMemo(() => Array.from({ length: 12 }, (_, idx) => idx + 1), []);

  // 選択月がリストの左から2番目付近に来るようにスクロール位置を計算するヘルパー関数
  const targetIndexForMonth = useCallback(
    (month: number) => {
      const idx = month - 2; // 選択月が左から2番目に来るように1つ前の月を先頭に
      if (idx < 0) return 0;
      if (idx > monthsList.length - 1) return monthsList.length - 1;
      return idx;
    },
    [monthsList.length],
  );

  // 【理解度△】targetIndexForMonthが返したidxを使い、FlatListを対象位置にスクロールさせる関数
  // 月選択時や初期読み込み時に選択付きが見える位置へ確実に移動させる
  const scrollToMonth = useCallback(
    (month: number, animated = true) => {
      const idx = targetIndexForMonth(month);
      try {
        monthListRef.current?.scrollToIndex({ index: idx, animated });
      } catch {
        // scrollToIndexが正しく取得できなかった時のフォールバック
        const offset = (MONTH_ITEM_WIDTH + spacing.xs) * idx;
        monthListRef.current?.scrollToOffset({ offset, animated: false });
      }
    },
    [targetIndexForMonth],
  );

  // AsyncStorageから月の初期値を取得
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

  // 新しくユーザに月が選択された時に発火
  useEffect(() => {
    scrollToMonth(selectedMonth, true);
  }, [selectedMonth, scrollToMonth]);


  // 選択された月の各月間目標をDB上のorderデータをもとにソート
  const filteredGoals = useMemo(
    () => goals.filter((goal) => goal.month === selectedMonth).sort((a, b) => a.order - b.order),
    [goals, selectedMonth],
  );

  // 月間目標に紐づいた年間目標idから年間目標データを抽出
  const getYearlyGoal = (id: string) => yearlyGoals.find((g) => g.id === id);

  // 「月間目標追加」タップ後のロジック、インプット項目を初期化
  const handleAddPress = () => {
    if (guardOfflineAction()) return;
    setEditingId(null);
    setDraft({
      description: "",
      month: String(selectedMonth),
      yearlyGoalId: yearlyGoals[0]?.id ?? "",
      estimatedHours: "10",
    });
    setModalError(null);
    setModalVisible(true);
    setMonthDropdownOpen(false);
    setYearlyDropdownOpen(false);
  };

  // 「月間目標編集」タップ後の露軸、インプット項目に既存データを配置
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

  // 削除モード切り替えロジック
  const handleToggleDeleteMode = () => {
    if (guardOfflineAction()) return;
    setDeleteMode((prev) => !prev);
  };

  // 指定月の全月間目標削除、12ヶ月分全ての月間目標削除のロジック
  const handleBulkDelete = async (scope: "all" | "current") => {
    if (guardOfflineAction()) return;
    const uid = userId ?? (await fetchUserId());
    if (!uid) {
      Alert.alert(t("deleteConfirmTitle"), t("errors.loginMissing"));
      return;
    }
    try {
      if (scope === "all") {
        await deleteMonthlyGoals({ userId: uid });
        setGoals([]);
      } else {
        await deleteMonthlyGoals({ userId: uid, month: selectedMonth });
        setGoals((prev) => prev.filter((goal) => goal.month !== selectedMonth));
      }
      if (scope === "all") {
        Alert.alert(t("bulkDeleteSuccess.title"), t("bulkDeleteSuccess.body"));
      } else {
        Alert.alert(t("deleteSuccess.title"), t("deleteSuccess.body"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.saveFailed");
      Alert.alert(t("deleteConfirmTitle"), message);
    }
  };

  // 月全削除機能後のポップアップで「全月削除or1ヶ月分削除」を選ばせhandleBulkDelete関数を操作
  const confirmBulkDelete = () => {
    Alert.alert(t("bulkDelete.title"), t("bulkDelete.message"), [
      {
        text: t("bulkDelete.all"),
        style: "destructive",
        onPress: () => handleBulkDelete("all"),
      },
      {
        text: t("bulkDelete.current", { month: monthLabel(selectedMonth) }),
        style: "destructive",
        onPress: () => handleBulkDelete("current"),
      },
      {
        text: t("bulkDelete.cancel"),
        style: "cancel",
      },
    ]);
  };


  // 表示月をユーザが選んだ際に発火する処理
  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    setDraft((prev) => ({ ...prev, month: String(month) }));
    AsyncStorage.setItem(STORAGE_KEY_SELECTED_MONTH, String(month)).catch((error) => {
      console.warn("Failed to persist selected month", error);
    });
    scrollToMonth(month, true);
  };

  // 削除処理
  const handleDelete = (goal: MonthlyGoal) => {
    if (guardOfflineAction()) return;
    Alert.alert(t("deleteConfirmTitle"), t("deleteConfirmBody"), [
      { text: t("deleteConfirmNo"), style: "cancel" },
      {
        text: t("deleteConfirmYes"),
        style: "destructive",
        onPress: async () => {
          const uid = userId ?? (await fetchUserId());
          if (!uid) {
            Alert.alert(t("deleteConfirmTitle"), t("errors.loginMissing"));
            return;
          }
          try {
            await deleteMonthlyGoalWithWeeklyTasks(goal.id);
          } catch (error) {
            const message = error instanceof Error ? error.message : t("errors.saveFailed");
            Alert.alert(t("deleteConfirmTitle"), message);
            return;
          }

          const remaining = goals.filter((g) => g.id !== goal.id);
          const reordered = reorderWithinMonth(remaining, goal.month);
          setGoals(reordered);

          const monthGoals = reordered.filter((g) => g.month === goal.month);

          let reorderError = false;
          if (monthGoals.length > 0) {
            const updates = monthGoals.map((g) => toMonthlyRow(g, uid));
            const { error: upsertError } = await supabase.from("monthly_goals").upsert(updates, { onConflict: "id" });
            if (upsertError) {
              Alert.alert(t("deleteConfirmTitle"), upsertError.message ?? t("errors.reorderSaveFailed"));
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


  // 追記・編集したdraftを保存する処理
  const handleSave = async () => {
    if (guardOfflineAction()) return;
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
        setModalError(t("modal.errorMonthRange"));
      } else if (hasEstimateError) {
        setModalError(t("modal.errorEstimated"));
      } else {
        setModalError(t("modal.errorRequired"));
      }
      return;
    }

    const uid = userId ?? (await fetchUserId());
    if (!uid) {
      setModalError(t("errors.loginMissing"));
      return;
    }

    //編集モーダルの保存処理（データベースupdate）
    if (editingId) {
      const { data, error } = await supabase
        .from("monthly_goals")
        .update({
          description: parsed.data.description,
          month: parsed.data.month,
          yearly_goal_id: parsed.data.yearlyGoalId,
          estimated_time_month: parsed.data.estimatedMinutes,
        })
        .eq("id", editingId)
        .select("id, yearly_goal_id, month, description, estimated_time_month, accumulated_time_month, order, updated_at")
        .single();

      if (error) {
        setModalError(error.message ?? t("errors.saveFailed"));
        return;
      }
      const row = data as unknown as MonthlyGoalRow;
      setGoals((prev) => {
        const updated = prev.map((goal) => (goal.id === editingId ? toMonthlyGoal(row) : goal));
        return reorderWithinMonth(updated, row.month);
      });
    } else {
      // 新規追加モーダルの保存処理（データベースinsert）
      const monthGoals = goals
        .filter((g) => g.month === parsed.data.month)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((g, idx) => ({ ...g, order: idx + 1 }));

      const { data, error } = await supabase
        .from("monthly_goals")
        .insert({
          user_id: uid,
          yearly_goal_id: parsed.data.yearlyGoalId,
          month: parsed.data.month,
          description: parsed.data.description,
          estimated_time_month: parsed.data.estimatedMinutes,
          accumulated_time_month: 0,
          order: 0,
        })
        .select("id, yearly_goal_id, month, description, estimated_time_month, accumulated_time_month, order, updated_at")
        .single();

      if (error) {
        setModalError(error.message ?? t("errors.saveFailed"));
        return;
      }

      const row = data as unknown as MonthlyGoalRow;
      const newGoal = toMonthlyGoal(row);
      // 新しいデータを挿入しorder順に並び替えられた月の目標リスト(新しいデータを含む)
      const reorderedMonthGoals = reorderWithinMonth([...monthGoals, newGoal], newGoal.month).filter(
        (goal) => goal.month === newGoal.month,
      );

      const upsertPayload = reorderedMonthGoals.map((goal) => toMonthlyRow(goal, uid));
      const { error: upsertError } = await supabase.from("monthly_goals").upsert(upsertPayload, { onConflict: "id" });
      if (upsertError) {
        setModalError(upsertError.message ?? t("errors.saveFailed"));
        return;
      }

      setGoals((prev) => {
        const others = prev.filter((g) => g.month !== newGoal.month);
        return [...others, ...reorderedMonthGoals];
      });
    }

    setMonthDropdownOpen(false);
    setYearlyDropdownOpen(false);
    setModalVisible(false);
    setEditingId(null);
    setModalError(null);
  };

  // ドラッグの順番並び替えが終わった時に発火
  const handleDragEnd = async ({ data }: { data: MonthlyGoal[] }) => {
    if (guardOfflineAction()) return;
    const uid = userId ?? (await fetchUserId());
    if (!uid) {
      Alert.alert(t("deleteConfirmTitle"), t("errors.loginMissing"));
      return;
    }
    const reordered = data.map((goal, idx) => ({ ...goal, order: idx }));
    setGoals((prev) => reorderWithinMonth([...prev.filter((g) => g.month !== selectedMonth), ...reordered], selectedMonth));

    const updates = reordered.map((goal) => toMonthlyRow(goal, uid));
    const { error } = await supabase.from("monthly_goals").upsert(updates, { onConflict: "id" });
    if (error) {
      Alert.alert(t("deleteConfirmTitle"), error.message ?? t("errors.reorderSaveFailed"));
    }
  };

  // 指定のPressable要素の長押しドラッグを可能にするロジック
  const renderGoalCard = ({ item, drag, isActive }: RenderItemParams<MonthlyGoal>) => {
    const progress = item.estimatedMinutes > 0 ? Math.min(1, item.accumulatedMinutes / item.estimatedMinutes) : 0;
    const remaining = Math.max(0, item.estimatedMinutes - item.accumulatedMinutes);
    return (
      <View
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("reorderHandle", { defaultValue: "Drag to reorder" })}
          style={[styles.dragHandleButton, isActive && styles.dragHandleButtonActive]}
          onLongPress={drag}
          delayLongPress={200}
          hitSlop={14}
        >
          <MaterialCommunityIcons name="swap-vertical-bold" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.goalTitle}>{item.description}</Text>


        <View style={styles.progressBarContainer}>
          <View style={styles.progressTrack} />
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.goalFooterRow}>
          <View style={styles.goalStat}>
            <Text style={styles.statLabel}>{t("summary.targetLabel")}</Text>
            <Text style={styles.statValue} numberOfLines={1} ellipsizeMode="tail">
              {formatMinutes(item.estimatedMinutes)}
            </Text>
          </View>
          <View style={styles.goalStat}>
            <Text style={styles.statLabel}>{t("summary.loggedLabel")}</Text>
            <Text style={styles.statValue} numberOfLines={1} ellipsizeMode="tail">
              {formatMinutes(item.accumulatedMinutes)}
            </Text>
          </View>
          <View style={styles.goalStat}>
            <Text style={styles.statLabel}>{t("summary.remainingLabel", { defaultValue: "Remaining" })}</Text>
            <Text style={styles.statValue} numberOfLines={1} ellipsizeMode="tail">
              {formatMinutes(remaining)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={deleteMode ? t("delete") : t("modal.editTitle")}
            onPress={() => (deleteMode ? handleDelete(item) : handleEditPress(item))}
            style={[deleteMode ? styles.dangerButton : styles.editButton, styles.iconButtonRow]}
          >
            <MaterialCommunityIcons
              name={deleteMode ? "trash-can-outline" : "pencil-outline"}
              size={16}
              color={deleteMode ? colors.error : colors.textPrimary}
            />
          </Pressable>
        </View>
      </View>
    );
  };

  const modalTitle = editingId ? t("modal.editTitle") : t("modal.addTitle");

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
        data={filteredGoals}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        renderItem={renderGoalCard}
        activationDistance={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.goalGrid}
        ListHeaderComponent={(
          <View style={[styles.card, shadows.card]}>
            <LinearGradient colors={HEADER_CARD_GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerRow}>
              <Text style={styles.pageTitle}>{t("pageTitle")}</Text>
            </View>

            <View style={styles.monthSelector}>
              <Text style={styles.label}>{t("monthSelector.label")}</Text>
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
                onScrollToIndexFailed={() => {
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

            <View style={styles.actionRow}>
              {!deleteMode && (
                <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress} disabled={offlineBlocked}>
                  <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
                  <Text style={styles.primaryButtonText}>{t("add")}</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                style={[styles.secondaryButton, deleteMode && styles.secondaryButtonActive]}
                onPress={handleToggleDeleteMode}
                disabled={offlineBlocked}
              >
                <MaterialCommunityIcons
                  name={deleteMode ? "close" : "trash-can-outline"}
                  size={20}
                  color={colors.textPrimary}
                />
                <Text style={styles.secondaryButtonText}>{deleteMode ? t("deleteExit") : t("delete")}</Text>
              </Pressable>
              {deleteMode && (
                <Pressable
                  accessibilityRole="button"
                  style={[styles.secondaryButton, styles.bulkDeleteButton]}
                  onPress={confirmBulkDelete}
                  disabled={offlineBlocked}
                >
                  <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={colors.textPrimary} />
                  <Text style={styles.secondaryButtonText}>
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
            <Text style={styles.emptyTitle}>{t("empty.title")}</Text>
            <Text style={styles.emptyBody}>{t("empty.body")}</Text>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress} disabled={offlineBlocked}>
              <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
              <Text style={styles.primaryButtonText}>{t("add")}</Text>
            </Pressable>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={dismissKeyboard}
          testID="monthly-goals-modal-overlay"
        >
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: "padding", android: undefined })}
            style={styles.modalContainer}
            testID="monthly-goals-modal-kav"
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="monthly-goals-modal-scroll"
            >
              <Pressable
                style={[styles.modalCard, shadows.card]}
                onPress={(event) => event.stopPropagation()}
              >
                <Text style={styles.modalTitle}>{modalTitle}</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t("modal.descriptionLabel")}</Text>
                  <TextInput
                    multiline
                    placeholder={t("modal.descriptionPlaceholder")}
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
                  <Text style={styles.label}>{t("modal.monthLabel")}</Text>
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
                  <Text style={styles.label}>{t("modal.yearlyGoalLabel")}</Text>
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
                        {yearlyGoals.map((option) => (
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
                  <Text style={styles.label}>{t("modal.targetLabel")}</Text>
                  <TextInput
                    placeholder={t("modal.targetPlaceholder")}
                    placeholderTextColor={colors.textSecondary}
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={draft.estimatedHours}
                    onChangeText={(text) => {
                      setDraft((prev) => ({ ...prev, estimatedHours: text }));
                      setModalError(null);
                    }}
                  />
                  <Text style={styles.helperText}>{t("modal.targetHelper")}</Text>
                </View>

                {!!modalError && <Text style={styles.modalError}>{modalError}</Text>}

                <View style={styles.modalFooterRow}>
                  {isKeyboardVisible && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Dismiss keyboard"
                      onPress={dismissKeyboard}
                      style={styles.keyboardIconButton}
                      testID="monthly-goals-modal-keyboard-button"
                    >
                      <MaterialCommunityIcons
                        name="keyboard-outline"
                        size={20}
                        color={colors.textPrimary}
                      />
                    </Pressable>
                  )}

                  <View style={[styles.modalActions, styles.modalActionsRight]}>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.secondaryButton}
                      onPress={() => {
                        setModalVisible(false);
                        setMonthDropdownOpen(false);
                        setYearlyDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>{t("modal.cancel")}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleSave}>
                      <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.textPrimary} />
                      <Text style={styles.primaryButtonText}>{t("modal.save")}</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    lineHeight: typography.xl * 1.3,
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
  bulkDeleteButton: {
    borderColor: colors.error,
    backgroundColor: "rgba(242,95,92,0.12)",
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
    backgroundColor: "#1c3358",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    overflow: "hidden",
  },
  goalCardDragging: {
    borderColor: "rgba(110,168,255,0.6)",
    backgroundColor: "rgba(30,94,255,0.08)",
  },
  goalCardDeleteMode: {
    borderColor: "rgba(242,95,92,0.5)",
  },
  goalTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
    lineHeight: typography.lg * 1.5,
    paddingRight: spacing.xl * 2,
    minHeight: 40,
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
    marginTop: spacing.xs,
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
    borderWidth: 1,
    borderColor: colors.accentPrimary,
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
  dragHandleButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
    zIndex: 1,
  },
  dragHandleButtonActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.16)",
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
  listHeader: {
    marginBottom: spacing.md,
  },
  goalGrid: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  emptyCard: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
});
