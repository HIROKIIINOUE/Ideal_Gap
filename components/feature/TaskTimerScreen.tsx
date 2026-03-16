import { MaterialCommunityIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
  useWindowDimensions,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "../../constants/theme";
import { useKeyboardDismissAccessory } from "../../hooks/useKeyboardDismissAccessory";
import { updateAccumulatedTimes } from "../../lib/api/supabase/timeTracking/updateAccumulatedTimes";
import { supabase } from "../../lib/supabaseClient";
import {
  getTaskTimerIpadLayout,
  scaleFontSizeForIpad,
} from "../../lib/ui/ipadLayout";
import { isCompactScreen } from "../../lib/ui/responsive";
import { useFocusMusic } from "../../providers/FocusMusicProvider";
import { InstalledFocusTrack } from "../../types/focus-music";
import KeyboardDismissButton from "../KeyboardDismissButton";

type TimerStatus = "idle" | "running" | "paused" | "finished";

const PRESETS = [
  // { label: "add10s", minutes: 10 / 60 }, // これはテスト用
  // { label: "add1m", minutes: 1 }, // これはテスト用
  { label: "add5", minutes: 5 },
  { label: "add10", minutes: 10 },
  { label: "add30", minutes: 30 },
  { label: "add1h", minutes: 60 },
  { label: "add2h", minutes: 120 },
] as const;

// 〇〇〇〇秒から「〇時間〇分〇秒」の表示用フォーマットに変換する
const formatDigital = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
};

const gradientCard = ["rgba(30,94,255,0.18)", "rgba(12,18,32,0.95)"] as const;
const TIMER_NOTIFICATION_CHANNEL = "task-timer";
// iPad用UIのための定数群
const isIpadDevice = Platform.OS === "ios" && Platform.isPad === true;
const taskTimerLayout = getTaskTimerIpadLayout(isIpadDevice);

// カウントダウン終了時刻を算出するロジック
const formatEndTimeLabel = (timestamp: number | null) => {
  if (!timestamp) return "--:--";
  const date = new Date(timestamp); // カウントダウンスタートもしくは再開時の時刻
  const hours = String(date.getHours()).padStart(2, "0"); //
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function TaskTimerScreen() {
  const { t } = useTranslation("taskTimer");
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  // ユーザ端末からアプリの表示領域(width)、OSの文字サイズ設定(fontScale)を取得する
  const { width, fontScale } = useWindowDimensions();
  const compactScreen = isCompactScreen(width, fontScale);
  const { installedTracks, selectedTrack, selectTrack, playSelected, pause, stop } =
    useFocusMusic();
  const params = useLocalSearchParams<{
    title?: string;
    monthlyGoal?: string;
    estimated?: string;
    logged?: string;
    taskId?: string;
    monthlyGoalId?: string;
  }>();

  // タイマーの初期値は常に0から開始する
  const initialSeconds = 0;

  const [inputSeconds, setInputSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [userNotificationOn, setUserNotificationOn] = useState(true);
  const [expectedEndAt, setExpectedEndAt] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [completionElapsedSeconds, setCompletionElapsedSeconds] = useState(0);
  const [nextStartNote, setNextStartNote] = useState("");
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);
  const [nextStartPoint, setNextStartPoint] = useState<string | null>(null);
  const [viewStartModalVisible, setViewStartModalVisible] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionFiredRef = useRef(false);
  const scheduledNotificationIdRef = useRef<string | null>(null);
  const lastScheduledEndAtRef = useRef<number | null>(null);

  const taskTitle = params.title || t("pageTitle");
  const taskId = params.taskId ?? null;
  const monthlyGoalId = params.monthlyGoalId ?? null;
  const monthlyGoalIdSafe = monthlyGoalId || null;
  const previousLoggedMinutes = useMemo(
    () => Math.max(0, Math.round(Number(params.logged ?? 0))),
    [params.logged],
  );
  const [loggedBaseline, setLoggedBaseline] = useState(previousLoggedMinutes);
  const hasDuration = inputSeconds > 0;
  const hasInstalledMusic = installedTracks.length > 0;
  const activeTrack = selectedTrack;

  // 「経過した時間 / 設定作業時間」からどの割合進んだかを算出してリターンする
  const progress = useMemo(() => {
    if (!hasDuration) return 0;
    const elapsed = Math.max(0, inputSeconds - remainingSeconds);
    return Math.min(1, elapsed / inputSeconds);
  }, [hasDuration, inputSeconds, remainingSeconds]);

  // 進捗ドーナッツの中央部に表示する値
  const durationLabel = `${formatDigital(remainingSeconds)} / ${formatDigital(inputSeconds)}`;
  const endTimeText = useMemo(
    () => formatEndTimeLabel(expectedEndAt),
    [expectedEndAt],
  );
  // 作業完了モーダル画面で表示する値
  const completionDurationLabel = useMemo(
    () => formatDigital(completionElapsedSeconds),
    [completionElapsedSeconds],
  );
  const completionMinutes = useMemo(
    () => Math.max(0, Math.round(completionElapsedSeconds / 60)),
    [completionElapsedSeconds],
  );

  const fetchUserId = useCallback(async () => {
    if (userId) return userId;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;
    setUserId(uid);
    return uid;
  }, [userId]);

  // マウント時にユーザの端末がアプリ通知ONになっているか状態チェック
  useEffect(() => {
    let isMounted = true;
    const loadNotificationPermission = async () => {
      try {
        const { status, granted } = await Notifications.getPermissionsAsync();
        if (!isMounted) return;
        const isNotificationsOn = status === "granted" || granted;
        setUserNotificationOn(isNotificationsOn);
      } catch {
        if (!isMounted) return;
        setUserNotificationOn(true);
      }
    };

    loadNotificationPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  // 初回レンダリング時に紐づく週間タスクの最新データをDBから取得
  const fetchLatestLogged = useCallback(
    async (uid: string, weeklyTaskId: string) => {
      const { data, error } = await supabase
        .from("weekly_tasks" as any)
        .select("accumulated_time_week, monthly_goal_id, next_start_point")
        .eq("id", weeklyTaskId)
        .eq("user_id", uid)
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return {
        accumulated: Math.max(
          0,
          Math.round((data as any)?.accumulated_time_week ?? 0),
        ),
        monthlyGoalId: ((data as any)?.monthly_goal_id ?? null) as
          | string
          | null,
        nextStartPoint: ((data as any)?.next_start_point ?? null) as
          | string
          | null,
      };
    },
    [],
  );

  // 1秒ごとにカウントする役割を持つtickRef.currentをリセットする
  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // ページから離れた時やタイマー完了時に音楽を止めるためのロジック
  const stopFocusMusic = useCallback(() => {
    setMusicPlaying(false);
    void stop();
  }, [stop]);

  // 通知機能の予約をキャンセルする
  const clearScheduledNotification = useCallback(async () => {
    const currentId = scheduledNotificationIdRef.current;
    if (!currentId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(currentId);
    } catch {
      // ignore cancel failures
    } finally {
      scheduledNotificationIdRef.current = null;
      lastScheduledEndAtRef.current = null;
    }
  }, []);


  // ユーザが端末で本アプリの通知機をONにしているかチェック
  const ensureNotificationPermission = useCallback(async () => {
    try {
      const current = await Notifications.getPermissionsAsync();
      const granted =
        current.granted ||
        current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      if (granted) {
        setUserNotificationOn(true);
        return true;
      }
      const request = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      const requestGranted =
        request.granted ||
        request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      setUserNotificationOn(requestGranted);
      return requestGranted;
    } catch {
      setUserNotificationOn(false);
      return false;
    }
  }, []);

  // 通知機のスケージュールを予約する(iOS)
  const scheduleTimerNotification = useCallback(
    async (endAt: number) => {
      if (endAt <= Date.now()) return;
      if (lastScheduledEndAtRef.current === endAt) return;
      const permitted = await ensureNotificationPermission();
      if (!permitted) return;

      await clearScheduledNotification();
      const seconds = Math.max(1, Math.ceil((endAt - Date.now()) / 1000));
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: t("timerNotification.title"),
            body: t("timerNotification.body"),
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
            channelId: TIMER_NOTIFICATION_CHANNEL,
          },
        });
        scheduledNotificationIdRef.current = id;
        lastScheduledEndAtRef.current = endAt;
      } catch {
        // scheduling failed
      }
    },
    [clearScheduledNotification, ensureNotificationPermission, t],
  );

  // 「カウントダウン終了モーダル」「手動でタイマー終了モーダル」の両方を開く時に実行される処理
  const openCompletionModal = useCallback(
    (elapsedSeconds: number) => {
      clearTick();
      void clearScheduledNotification();
      stopFocusMusic();
      completionFiredRef.current = true;
      const safeElapsed = Math.max(0, Math.round(elapsedSeconds));
      const completed = safeElapsed >= inputSeconds;
      setCompletionElapsedSeconds(safeElapsed);
      setCompletionModalVisible(true);
      if (completed) {
        setRemainingSeconds(0);
        setStatus("finished");
      } else {
        setStatus("paused");
      }
      setExpectedEndAt(null);
    },
    [clearScheduledNotification, clearTick, inputSeconds, stopFocusMusic],
  );

  // 作業完了モーダルの「キャンセル」押下時の処理
  const handleDismissCompletion = useCallback(() => {
    setCompletionModalVisible(false);
    setIsSavingCompletion(false);
    completionFiredRef.current = false;
    if (completionElapsedSeconds >= inputSeconds) {
      setRemainingSeconds(0);
      setStatus("finished");
      return;
    }
    setStatus("paused");
  }, [completionElapsedSeconds, inputSeconds]);

  // 状態がidle,finishedの時のみ残り時間とユーザの設定作業時間を一致させる
  // paused時は残り時間とユーザ設定時間が異なるのでここの処理は走らせない
  useEffect(() => {
    if (status === "idle" || status === "finished") {
      setRemainingSeconds(inputSeconds);
    }
  }, [inputSeconds, status]);

  // 初期表示時に最新の実績と次回スタート地点を取得
  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      const uid = await fetchUserId();
      if (!uid || !taskId) return;
      try {
        const latest = await fetchLatestLogged(uid, taskId);
        if (!mounted) return;
        setLoggedBaseline(latest.accumulated);
        setNextStartPoint(latest.nextStartPoint ?? null);
      } catch {
        // エラー時もここで画面表示を止めない
      }
    };
    hydrate();
    return () => {
      mounted = false;
    };
  }, [fetchLatestLogged, fetchUserId, taskId]);

  // クリーンアップ関数でアンマウント時(ページから離れた場合)はタイマーをリセット
  // アプリ離脱→アプリ再開をした時はシンプルにアンマウント→再マウントの流れで処理が走る
  useEffect(() => {
    return () => {
      clearTick();
      stopFocusMusic();
    };
  }, [clearTick, stopFocusMusic]);

  // 共通のトースト表示(ポップアップメッセージ)処理
  const showToast = useCallback((message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert(message);
  }, []);

  // iOS設定画面へ遷移する処理、Androidは要検討
  const handleOpenSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn("Failed to open settings", error);
      showToast(t("feedback.startError"));
    } finally {
      setUserNotificationOn(true);
    }
  }, [showToast, t]);

  // カウントダウンが「idle」「paused」の各条件下でプリセットボタンで設定作業時間を追加するロジック
  const handlePreset = (minutes: number) => {
    if (status === "running") return;
    const delta = Math.round(minutes * 60);
    // カウント一時停止中の時
    if (status === "paused") {
      const nextRemaining = Math.max(0, remainingSeconds + delta);
      const nextInput = Math.max(nextRemaining, inputSeconds + delta);
      setInputSeconds(nextInput);
      setRemainingSeconds(nextRemaining);
      return;
    }
    // カウント開始前の時
    const next = Math.max(0, inputSeconds + delta);
    setInputSeconds(next);
    setRemainingSeconds(next);
    setStatus("idle");
  };

  // クリアボタン押下時
  const handleClear = () => {
    if (status === "running") return;
    clearTick();
    void clearScheduledNotification();
    setInputSeconds(0);
    setRemainingSeconds(0);
    setStatus("idle");
    setExpectedEndAt(null);
    setCompletionModalVisible(false);
    setIsSavingCompletion(false);
    setNextStartNote("");
    completionFiredRef.current = false;
  };

  // スタートボタン押下時
  const handleStart = () => {
    if (!hasDuration) {
      showToast(t("feedback.startError"));
      return;
    }
    completionFiredRef.current = false;
    setRemainingSeconds(inputSeconds);
    setStatus("running");
    setExpectedEndAt(Date.now() + inputSeconds * 1000);
  };

  // 一時停止orリスタート ボタン押下時
  // リスタート時はリスタート時点の時刻と残り時間で終了時刻を計算する
  const handlePauseResume = () => {
    if (status === "running") {
      setStatus("paused");
      setExpectedEndAt(null);
      completionFiredRef.current = false;
      return;
    }
    if (status === "paused") {
      setStatus("running");
      setExpectedEndAt(Date.now() + remainingSeconds * 1000);
    }
  };

  // 「今回実行された作業時間」を紐づく週間タスクの最新の作業実績時間データに積み上げる
  const persistElapsedAndExit = useCallback(
    async (elapsedSeconds: number, nextStartPayload?: string | null) => {
      const uid = await fetchUserId();
      if (!uid || !taskId) {
        Alert.alert(
          t("controls.completeConfirmTitle"),
          t("feedback.startError"),
        );
        return false;
      }

      const elapsedMinutes = Math.max(0, Math.round(elapsedSeconds / 60));
      const latest = await fetchLatestLogged(uid, taskId);
      const baseLogged = latest.accumulated ?? loggedBaseline;
      const newLoggedMinutes = baseLogged + elapsedMinutes;

      try {
        await updateAccumulatedTimes({
          userId: uid,
          taskId,
          monthlyGoalId: latest.monthlyGoalId ?? monthlyGoalIdSafe,
          newLoggedMinutes,
          previousLoggedMinutes: baseLogged,
          nextStartPoint:
            typeof nextStartPayload === "undefined"
              ? undefined
              : nextStartPayload,
        });
        setLoggedBaseline(newLoggedMinutes);
        if (typeof nextStartPayload !== "undefined") {
          setNextStartPoint(nextStartPayload || null);
        } else {
          setNextStartPoint(latest.nextStartPoint ?? null);
        }
        // 完了時は状態とタイマーをリセットし、画面を閉じる
        setStatus("finished");
        setExpectedEndAt(null);
        setRemainingSeconds(0);
        setInputSeconds(0);
        showToast(t("controls.completeToast"));
        router.back();
        return true;
      } catch (error) {
        Alert.alert(
          t("controls.completeConfirmTitle"),
          error instanceof Error ? error.message : String(error),
        );
        return false;
      }
    },
    [
      fetchLatestLogged,
      fetchUserId,
      loggedBaseline,
      monthlyGoalIdSafe,
      showToast,
      t,
      taskId,
    ],
  );

  // タイマーがカウント中(running)に切り替わった時に発火しsetIntervalをスタートさせる
  useEffect(() => {
    if (status !== "running") {
      clearTick();
      void clearScheduledNotification();
      return;
    }

    // 1秒ごとに残りの時間数を更新する。バックグランドでは動かないが、UI更新用なので動かなくても良い。
    tickRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTick();
          if (!completionFiredRef.current) {
            openCompletionModal(Math.max(0, inputSeconds));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTick;
  }, [status, inputSeconds, clearTick, clearScheduledNotification, openCompletionModal]);


  // タイマーstatusが変更された時に新しく通知スケジュールをセットする
  useEffect(() => {
    if (status !== "running") return;
    if (!expectedEndAt) return;
    void scheduleTimerNotification(expectedEndAt);
  }, [expectedEndAt, scheduleTimerNotification, status]);


  // 端末OSがAndroidの場合、以下の処理で最初にチャンネルを作成し、通知を予約するscheduleTimerNotificationでそのチャンネルに通知スケジュールをセットする。
  useEffect(() => {
    if (Platform.OS !== "android") return;
    Notifications.setNotificationChannelAsync(TIMER_NOTIFICATION_CHANNEL, {
      name: "Task Timer",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
    }).catch(() => { });
  }, []);

  // ユーザがアプリに戻ってきた時に発火し、残り秒数を計算、残り時間が0秒なら完了モーダルを表示し、それ以外なら残り時間をセットしてカウントダウンUI復帰
  // AppStateには「active」「background」の二つがある。(細かい他の状態もあるがほとんど使わない)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      if (status !== "running" || !expectedEndAt) return;
      const remaining = Math.max(0, Math.round((expectedEndAt - Date.now()) / 1000));
      if (remaining <= 0) {
        if (!completionFiredRef.current) {
          openCompletionModal(Math.max(0, inputSeconds));
        }
        return;
      }
      setRemainingSeconds(remaining);
    });
    return () => subscription?.remove?.();
  }, [expectedEndAt, inputSeconds, openCompletionModal, status]);

  // 作業完了ボタン押下時の処理
  const handleComplete = () => {
    if (!hasDuration) {
      showToast(t("feedback.startError"));
      return;
    }
    if (completionModalVisible) return;
    const elapsedSeconds = Math.max(0, inputSeconds - remainingSeconds);
    openCompletionModal(elapsedSeconds);
  };

  // 作業モーダルの「完了」ボタン押下時の処理
  const handleConfirmCompletion = useCallback(async () => {
    if (isSavingCompletion) return;

    // ネットワーク状況を確認し、オフラインの場合はポップアップ画面で保存できない旨を伝え、週間タスクページに遷移させる。
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) {
      Alert.alert(
        t("controls.completeConfirmTitle"),
        t("feedback.offlineSaveBlocked"),
        [{ text: t("feedback.offlineSaveBlockedAction"), onPress: () => router.back() }],
      );
      return;
    }
    setIsSavingCompletion(true);
    const trimmedNextStart = nextStartNote.trim();
    const nextStartPayload =
      trimmedNextStart.length > 0 ? trimmedNextStart : null;
    const success = await persistElapsedAndExit(
      completionElapsedSeconds,
      nextStartPayload,
    );
    if (success) {
      setCompletionModalVisible(false);
      setNextStartNote("");
    }
    setIsSavingCompletion(false);
  }, [
    completionElapsedSeconds,
    isSavingCompletion,
    nextStartNote,
    persistElapsedAndExit,
    t,
  ]);

  const handleSelectMusic = (option: InstalledFocusTrack) => {
    selectTrack(option.id);
    setMusicPlaying(true);
    setMusicModalVisible(false);
  };

  const pauseResumeLabel =
    status === "running" ? t("controls.pause") : t("controls.resume");
  const pauseResumeIcon =
    status === "running" ? "timer-off-outline" : "timer-outline";
  const musicLabel = !hasInstalledMusic
    ? t("controls.musicUnavailable")
    : musicPlaying
      ? t("controls.musicPause")
      : t("controls.musicPlay");
  const statusLabel =
    status === "running"
      ? t("timerCard.running")
      : status === "paused"
        ? t("timerCard.paused")
        : undefined;

  //「音楽再生フラグが ON のときに、選択中の曲を再生し続ける」ための同期処理 
  // 選択が無い／再生失敗なら自動停止
  useEffect(() => {
    if (!musicPlaying) return;
    if (!selectedTrack) {
      setMusicPlaying(false);
      return;
    }
    playSelected().catch(() => {
      setMusicPlaying(false);
    });
  }, [musicPlaying, playSelected, selectedTrack]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["left", "right", "bottom"]}
      testID="task-timer-screen"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {!userNotificationOn && (
          <View style={[styles.noticeCard, shadows.card]}>
            <Text style={styles.noticeText}>
              {t("header.notificationTitle")}
            </Text>
            <View style={styles.noticeActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setUserNotificationOn(true)}
                style={({ pressed }) => [
                  styles.noticeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.noticeButtonText}>
                  {t("header.notificationDismiss")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleOpenSettings}
                style={({ pressed }) => [
                  styles.noticePrimary,
                  pressed && styles.primaryPressed,
                ]}
              >
                <Text style={styles.noticePrimaryText}>
                  {t("header.notificationAction")}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={[styles.card, styles.timerCard, shadows.card]}>
          <LinearGradient
            colors={gradientCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text
            style={[styles.focusTitle, compactScreen && styles.focusTitleCompact]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {taskTitle}
          </Text>
          {nextStartPoint && status !== "running" && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setViewStartModalVisible(true)}
              style={({ pressed }) => [
                styles.nextStartBox,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.nextStartLabel}>
                {t("completionModal.currentStartLabel")}
              </Text>
              <Text
                style={styles.nextStartValue}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {nextStartPoint}
              </Text>
            </Pressable>
          )}

          <View style={styles.timerWrapper}>
            <View style={styles.progressWrapper}>
              <AnimatedCircularProgress
                size={taskTimerLayout.ringSize}
                width={taskTimerLayout.ringStrokeWidth}
                fill={progress * 100}
                tintColor={colors.accentPrimary}
                backgroundColor={colors.divider}
                lineCap="round"
                rotation={0}
                backgroundWidth={taskTimerLayout.ringBackgroundStrokeWidth}
                style={styles.circularProgress}
              >
                {() => (
                  <View style={styles.ringCenter}>
                    <Text
                      style={[styles.durationLabel, compactScreen && styles.durationLabelCompact]}
                      testID="timer-duration"
                    >
                      {durationLabel}
                    </Text>
                    <Text style={[styles.remainingLabel, compactScreen && styles.remainingLabelCompact]}>
                      {t("timerCard.endTimeLabel", { time: endTimeText })}
                    </Text>
                    {statusLabel && (
                      <Text style={styles.statusInline}>{statusLabel}</Text>
                    )}
                  </View>
                )}
              </AnimatedCircularProgress>
            </View>
          </View>

          <View style={styles.presetsRow}>
            {PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
                testID={`timer-preset-${preset.label}`}
                accessibilityRole="button"
                disabled={status === "running"}
                onPress={() => handlePreset(preset.minutes)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.presetButton,
                  pressed && styles.secondaryPressed,
                  status === "running" && styles.buttonDisabled,
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, styles.presetButtonText, compactScreen && styles.presetButtonTextCompact]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t(`presets.${preset.label}`)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              testID="timer-preset-clear"
              accessibilityRole="button"
              onPress={handleClear}
              disabled={status === "running"}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.presetButton,
                styles.clearButton,
                pressed && styles.secondaryPressed,
                status === "running" && styles.buttonDisabled,
                status === "running" && styles.clearButtonDisabled,
              ]}
            >
              <Text
                style={[styles.clearButtonText, styles.presetButtonText, compactScreen && styles.presetButtonTextCompact]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t("presets.clear")}
              </Text>
            </Pressable>
          </View>

          {(status === "idle" || status === "finished") && (
            <Pressable
              testID="start-button"
              accessibilityRole="button"
              disabled={!hasDuration}
              onPress={handleStart}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.startButton,
                pressed && styles.primaryPressed,
                !hasDuration && styles.primaryButtonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {t("timerCard.start")}
              </Text>
              {!hasDuration && (
                <Text style={styles.startHelper}>
                  {t("timerCard.startDisabled")}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        <View style={[styles.card, shadows.card]} testID="control-card">
          <Text style={styles.cardTitle}>{t("controls.title")}</Text>
          <View style={styles.controlsGrid}>
            <Pressable
              testID="pause-resume-button"
              accessibilityRole="button"
              disabled={status === "idle" || status === "finished"}
              onPress={handlePauseResume}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.controlButton,
                pressed && styles.secondaryPressed,
                (status === "idle" || status === "finished") &&
                styles.buttonDisabled,
              ]}
            >
              <MaterialCommunityIcons
                testID="pause-resume-icon"
                name={pauseResumeIcon}
                size={22}
                color={colors.textPrimary}
              />
              <Text style={styles.secondaryButtonText}>{pauseResumeLabel}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleComplete}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.controlButton,
                pressed && styles.secondaryPressed,
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={22}
                color={colors.textPrimary}
              />
              <Text style={styles.secondaryButtonText}>
                {t("controls.complete")}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!hasInstalledMusic) return;
                if (musicPlaying) {
                  pause();
                  setMusicPlaying(false);
                  return;
                }
                playSelected()
                  .then((played) => {
                    setMusicPlaying(played);
                  })
                  .catch(() => {
                    setMusicPlaying(false);
                  });
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.controlButton,
                pressed && styles.secondaryPressed,
                !hasInstalledMusic && styles.buttonDisabled,
              ]}
            >
              <MaterialCommunityIcons
                name={musicPlaying ? "music-off" : "music"}
                size={22}
                color={colors.textPrimary}
              />
              <Text style={styles.secondaryButtonText}>{musicLabel}</Text>
            </Pressable>

            <Pressable
              testID="music-select-button"
              accessibilityRole="button"
              onPress={() => setMusicModalVisible(true)}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.controlButton,
                pressed && styles.secondaryPressed,
                !hasInstalledMusic && styles.buttonDisabled,
              ]}
            >
              <MaterialCommunityIcons
                name="music-note"
                size={22}
                color={colors.textPrimary}
              />
              <Text style={styles.secondaryButtonText}>
                {t("controls.musicSelect")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.musicFooter}>
            <Text style={styles.musicLabel}>
              {activeTrack
                ? t("controls.musicSelected", { title: activeTrack.title })
                : t("controls.musicNone")}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={completionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismissCompletion}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: "padding", android: undefined })}
            style={styles.modalContainer}
            testID="completion-modal-keyboard-avoiding"
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="completion-modal-scroll"
            >
              <Pressable
                style={[styles.modalCard, styles.completionCard, shadows.card]}
                onPress={(event) => event.stopPropagation()}
                testID="completion-modal"
              >
                <Text style={styles.modalTitle}>{t("completionModal.title")}</Text>
                <Text style={styles.modalSubtitle}>
                  {t("completionModal.description")}
                </Text>

                <View style={styles.completionSummary}>
                  <Text style={styles.summaryLabel}>
                    {t("completionModal.actualTimeLabel")}
                  </Text>
                  <Text style={styles.summaryTime}>{completionDurationLabel}</Text>
                  <Text style={styles.summaryHint}>
                    {t("completionModal.minutesLabel", {
                      minutes: completionMinutes,
                    })}
                  </Text>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    {t("completionModal.nextStartLabel")}
                  </Text>
                  <TextInput
                    value={nextStartNote}
                    onChangeText={setNextStartNote}
                    placeholder={t("completionModal.nextStartPlaceholder")}
                    placeholderTextColor={colors.textSecondary}
                    style={styles.textInput}
                    multiline
                  />
                  <Text style={styles.fieldHelper}>
                    {t("completionModal.nextStartHelper")}
                  </Text>
                </View>

                <View style={styles.completionActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleDismissCompletion}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      styles.controlButton,
                      pressed && styles.secondaryPressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {t("controls.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleConfirmCompletion}
                    disabled={isSavingCompletion}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.controlButton,
                      styles.completionPrimary,
                      pressed && styles.primaryPressed,
                      isSavingCompletion && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {t("completionModal.confirm")}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
          {keyboardVisible ? (
            <KeyboardDismissButton keyboardHeight={keyboardHeight} onPress={dismissKeyboard} />
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={viewStartModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewStartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, styles.startViewerCard, shadows.card]}
            testID="start-viewer-modal"
          >
            <Text style={styles.modalTitle}>
              {t("completionModal.currentStartLabel")}
            </Text>
            <ScrollView
              style={styles.startScroll}
              contentContainerStyle={styles.startScrollContent}
            >
              <Text style={styles.startFullText}>{nextStartPoint}</Text>
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setViewStartModalVisible(false)}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.fullWidthButton,
                pressed && styles.primaryPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {t("header.notificationDismiss")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={musicModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMusicModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.card]} testID="music-modal">
            <Text style={styles.modalTitle}>
              {t("controls.musicModalTitle")}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t("controls.musicModalSubtitle")}
            </Text>
            <View style={styles.musicList}>
              {installedTracks.length === 0 ? (
                <View style={styles.musicEmpty}>
                  <Text style={styles.musicEmptyTitle}>
                    {t("controls.musicEmptyTitle")}
                  </Text>
                  <Text style={styles.musicEmptyBody}>
                    {t("controls.musicEmptyBody")}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setMusicModalVisible(false);
                      router.push({
                        pathname: "/feature/[feature]",
                        params: { feature: "focus-music" },
                      });
                    }}
                    style={({ pressed }) => [
                      styles.musicEmptyButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.musicEmptyButtonText}>
                      {t("controls.musicEmptyCta")}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                installedTracks.map((option) => (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    onPress={() => handleSelectMusic(option)}
                    style={({ pressed }) => [
                      styles.musicItem,
                      pressed && styles.pressed,
                      option.id === activeTrack?.id && styles.musicItemActive,
                    ]}
                  >
                    <View style={styles.musicItemHeader}>
                      <Text style={styles.musicItemTitle}>{option.title}</Text>
                    </View>
                    {option.id === activeTrack?.id && (
                      <Text style={styles.musicSelected}>
                        {t("controls.musicSelected", { title: option.title })}
                      </Text>
                    )}
                  </Pressable>
                ))
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setMusicModalVisible(false)}
              style={({ pressed }) => [
                styles.modalClose,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.modalCloseText}>
                {t("header.notificationDismiss")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xl * 1.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
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
    textAlign: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    textAlign: "center",
  },
  secondaryPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  backLabel: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accentPrimary,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  timerCard: {
    gap: 0,
  },
  noticeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  noticeText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  noticeActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  noticeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  noticeButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
    textAlign: "center",
  },
  noticePrimary: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentPrimary,
  },
  noticePrimaryText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
    textAlign: "center",
  },
  focusTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  focusTitleCompact: {
    fontSize: typography.md * 1.15,
    lineHeight: typography.lg * 1.2,
  },
  nextStartBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: spacing.xs / 2,
    marginBottom: spacing.sm,
    alignItems: "center",
  },
  nextStartLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    textAlign: "center",
  },
  nextStartValue: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    lineHeight: typography.md * 1.4,
    textAlign: "center",
  },
  timerWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
    marginBottom: taskTimerLayout.timerWrapperMarginBottom,
    maxHeight: isIpadDevice ? 800 : undefined,
    width: "100%",
  },
  progressWrapper: {
    width: "100%",
    maxWidth: taskTimerLayout.ringMaxWidth,
    maxHeight: isIpadDevice ? 500 : undefined,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    alignSelf: "center",
  },
  circularProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  durationLabel: {
    color: colors.textPrimary,
    fontSize: scaleFontSizeForIpad(20, isIpadDevice),
    fontWeight: "800",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  durationLabelCompact: {
    fontSize: scaleFontSizeForIpad(18, isIpadDevice),
  },
  remainingLabel: {
    color: colors.textSecondary,
    fontSize: scaleFontSizeForIpad(18, isIpadDevice),
    marginTop: spacing.xs,
    textAlign: "center",
  },
  remainingLabelCompact: {
    fontSize: scaleFontSizeForIpad(15, isIpadDevice),
  },
  statusInline: {
    marginTop: spacing.xs / 2,
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.sm,
    marginTop: taskTimerLayout.presetsMarginTop,
    justifyContent: "center",
  },
  presetButton: {
    flexBasis: "31%",
    maxWidth: "31%",
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    marginHorizontal: "1%",
  },
  presetButtonText: {
    fontSize: typography.md * 0.92,
    lineHeight: typography.md * 1.05,
  },
  presetButtonTextCompact: {
    fontSize: typography.md,
  },
  clearButton: {
    borderColor: colors.error,
    backgroundColor: "rgba(242,95,92,0.1)",
  },
  clearButtonDisabled: {
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  clearButtonText: {
    color: colors.error,
    fontSize: typography.md,
    fontWeight: "700",
    textAlign: "center",
  },
  startButton: {
    marginTop: spacing.md,
    alignSelf: "stretch",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs / 2,
  },
  startHelper: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    textAlign: "center",
  },
  controlsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  controlButton: {
    flex: 1,
    minWidth: "47%",
    justifyContent: "center",
  },
  musicFooter: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  musicLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  musicDuration: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#1f3a63",
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
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
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  completionCard: {
    gap: spacing.md,
  },
  completionSummary: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: spacing.xs,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  summaryTime: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  summaryHint: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    minHeight: 72,
    textAlignVertical: "top",
    lineHeight: typography.md * 1.4,
  },
  fieldHelper: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  completionActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  completionPrimary: {
    backgroundColor: "rgba(30,94,255,0.2)",
    borderColor: colors.accentPrimary,
  },
  fullWidthButton: {
    width: "100%",
    marginTop: spacing.xs,
  },
  startViewerCard: {
    gap: spacing.md,
  },
  startScroll: {
    maxHeight: 320,
  },
  startScrollContent: {
    paddingVertical: spacing.xs,
  },
  startFullText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  musicList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  musicEmpty: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: spacing.xs,
  },
  musicEmptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  musicEmptyBody: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  musicEmptyButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    alignSelf: "flex-start",
  },
  musicEmptyButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  musicItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  musicItemActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.1)",
  },
  musicItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  musicItemTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  musicItemDuration: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  musicSelected: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    marginTop: spacing.xs,
  },
  modalClose: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    alignSelf: "flex-end",
  },
  modalCloseText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  primaryPressed: {
    opacity: 0.92,
    transform: [{ translateY: 1 }],
  },
});
