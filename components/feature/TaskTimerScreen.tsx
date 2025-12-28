import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { supabase } from "../../lib/supabaseClient";
import { updateAccumulatedTimes } from "../../lib/timeTracking/updateAccumulatedTimes";

type TimerStatus = "idle" | "running" | "paused" | "finished";

type MusicOption = {
  id: string;
  title: string;
  duration: string;
};

const PRESETS = [
  // { label: "add10s", minutes: 10 / 60 }, // これはテスト用
  // { label: "add1m", minutes: 1 }, // これはテスト用
  { label: "add5", minutes: 5 },
  { label: "add10", minutes: 10 },
  { label: "add30", minutes: 30 },
  { label: "add1h", minutes: 60 },
  { label: "add2h", minutes: 120 },
] as const;

const MUSIC_OPTIONS: MusicOption[] = [
  { id: "calm-sea", title: "Calm Sea", duration: "2:12" },
  { id: "night-drive", title: "Night Drive", duration: "2:48" },
  { id: "lofi-rain", title: "Lo-fi Rain", duration: "3:05" },
  { id: "piano-drift", title: "Piano Drift", duration: "2:34" },
  { id: "wave-bloom", title: "Wave Bloom", duration: "2:26" },
];

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

// カウントダウン終了時刻を算出するロジック
const formatEndTimeLabel = (timestamp: number | null) => {
  if (!timestamp) return "--:--";
  const date = new Date(timestamp);  // カウントダウンスタートもしくは再開時の時刻
  const hours = String(date.getHours()).padStart(2, "0"); //
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function TaskTimerScreen() {
  const { t } = useTranslation("taskTimer");
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
  const [selectedMusic, setSelectedMusic] = useState<MusicOption>(MUSIC_OPTIONS[0]);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(true);
  const [expectedEndAt, setExpectedEndAt] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionFiredRef = useRef(false);

  const taskTitle = params.title || t("pageTitle");
  const taskId = params.taskId ?? null;
  const monthlyGoalId = params.monthlyGoalId ?? null;
  const monthlyGoalIdSafe = monthlyGoalId || null;
  const previousLoggedMinutes = useMemo(() => Math.max(0, Math.round(Number(params.logged ?? 0))), [params.logged]);
  const [loggedBaseline, setLoggedBaseline] = useState(previousLoggedMinutes);
  const hasDuration = inputSeconds > 0;

  // 「経過した時間 / 設定作業時間」からどの割合進んだかを算出してリターンする
  const progress = useMemo(() => {
    if (!hasDuration) return 0;
    const elapsed = Math.max(0, inputSeconds - remainingSeconds);
    return Math.min(1, elapsed / inputSeconds);
  }, [hasDuration, inputSeconds, remainingSeconds]);


  // 進捗ドーナッツの中央部に表示する値
  const durationLabel = `${formatDigital(remainingSeconds)} / ${formatDigital(inputSeconds)}`;
  const endTimeText = useMemo(() => formatEndTimeLabel(expectedEndAt), [expectedEndAt]);

  const fetchUserId = useCallback(async () => {
    if (userId) return userId;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;
    setUserId(uid);
    return uid;
  }, [userId]);


  // 初回レンダリング時に紐づく週間タスクの最新データをDBから取得
  const fetchLatestLogged = useCallback(async (uid: string, weeklyTaskId: string) => {
    const { data, error } = await supabase
      .from("weekly_tasks" as any)
      .select("accumulated_time_week, monthly_goal_id")
      .eq("id", weeklyTaskId)
      .eq("user_id", uid)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return {
      accumulated: Math.max(0, Math.round((data as any)?.accumulated_time_week ?? 0)),
      monthlyGoalId: ((data as any)?.monthly_goal_id ?? null) as string | null,
    };
  }, []);


  // 1秒ごとにカウントする役割を持つtickRef.currentをリセットする
  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  // 状態がidle,finishedの時のみ残り時間とユーザの設定作業時間を一致させる
  // paused時は残り時間とユーザ設定時間が異なるのでここの処理は走らせない
  useEffect(() => {
    if (status === "idle" || status === "finished") {
      setRemainingSeconds(inputSeconds);
    }
  }, [inputSeconds, status]);

  // クリーンアップ関数でアンマウント時(ページから離れた場合)はタイマーをリセット
  // アプリ離脱→アプリ再開をした時はシンプルにアンマウント→再マウントの流れで処理が走る
  useEffect(() => {
    return () => clearTick();
  }, []);

  // 共通のトースト表示(ポップアップメッセージ)処理
  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert(message);
  };

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
    setInputSeconds(0);
    setRemainingSeconds(0);
    setStatus("idle");
    setExpectedEndAt(null);
    completionFiredRef.current = false;
  };

  // スタートボタン押下時
  const handleStart = () => {
    if (!hasDuration) {
      showToast(t("feedback.startError"));
      return;
    }
    setRemainingSeconds(inputSeconds);
    setStatus("running");
    setExpectedEndAt(Date.now() + inputSeconds * 1000);
    completionFiredRef.current = false;
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

  // タイマーカウントダウンが完了 or 作業完了ボタンが押下された時に発火
  // 「今回実行された作業時間」を紐づく週間タスクの最新の作業実績時間データに積み上げる
  const persistElapsedAndExit = useCallback(async (elapsedSeconds: number) => {
    const uid = await fetchUserId();
    if (!uid || !taskId) {
      Alert.alert(t("controls.completeConfirmTitle"), t("feedback.startError"));
      return;
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
      });
      setLoggedBaseline(newLoggedMinutes);
      setStatus("finished");
      setExpectedEndAt(null);
      showToast(t("controls.completeToast"));
      router.back();
    } catch (error) {
      Alert.alert(t("controls.completeConfirmTitle"), error instanceof Error ? error.message : String(error));
    }
  }, [fetchLatestLogged, fetchUserId, loggedBaseline, monthlyGoalIdSafe, t, taskId]);

  // タイマーがカウント中(running)に切り替わった時に発火しsetIntervalをスタートさせる
  useEffect(() => {
    if (status !== "running") {
      clearTick();
      return;
    }

    // 1秒ごとに残りの時間数を更新する。バックグランドでは動かないが、UI更新用なので動かなくても良い。
    tickRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTick();
          if (!completionFiredRef.current) {
            completionFiredRef.current = true;
            void persistElapsedAndExit(Math.max(0, inputSeconds));
          }
          setStatus("finished");
          setExpectedEndAt(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTick;
  }, [status, inputSeconds, persistElapsedAndExit]);

  // 作業完了ボタン押下時の処理
  const handleComplete = () => {
    if (!hasDuration) {
      showToast(t("feedback.startError"));
      return;
    }
    Alert.alert(t("controls.completeConfirmTitle"), t("controls.completeConfirmBody"), [
      { text: t("controls.cancel"), style: "cancel" },
      {
        text: t("controls.confirm"),
        style: "destructive",
        onPress: async () => {
          if (completionFiredRef.current) return;
          completionFiredRef.current = true;
          clearTick();
          const elapsedSeconds = Math.max(0, inputSeconds - remainingSeconds);
          await persistElapsedAndExit(elapsedSeconds);
        },
      },
    ]);
  };

  const handleSelectMusic = (option: MusicOption) => {
    setSelectedMusic(option);
    setMusicPlaying(true);
    setMusicModalVisible(false);
  };

  const pauseResumeLabel = status === "running" ? t("controls.pause") : t("controls.resume");
  const musicLabel = musicPlaying ? t("controls.musicPause") : t("controls.musicPlay");
  const statusLabel = status === "running" ? t("timerCard.running") : status === "paused" ? t("timerCard.paused") : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]} testID="task-timer-screen">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {showNotificationPrompt && (
          <View style={[styles.noticeCard, shadows.card]}>
            <Text style={styles.noticeText}>{t("header.notificationTitle")}</Text>
            <View style={styles.noticeActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowNotificationPrompt(false)}
                style={({ pressed }) => [styles.noticeButton, pressed && styles.pressed]}
              >
                <Text style={styles.noticeButtonText}>{t("header.notificationDismiss")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowNotificationPrompt(false)}
                style={({ pressed }) => [styles.noticePrimary, pressed && styles.primaryPressed]}
              >
                <Text style={styles.noticePrimaryText}>{t("header.notificationAction")}</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={[styles.card, styles.timerCard, shadows.card]}>
          <LinearGradient colors={gradientCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={styles.focusTitle} numberOfLines={2} ellipsizeMode="tail">
            {taskTitle}
          </Text>

          <View style={styles.timerWrapper}>
            <View style={styles.progressWrapper}>
              <AnimatedCircularProgress
                size={260}
                width={24}
                fill={progress * 100}
                tintColor={colors.accentPrimary}
                backgroundColor={colors.divider}
                lineCap="round"
                rotation={0}
                backgroundWidth={20}
                style={styles.circularProgress}
              >
                {() => (
                  <View style={styles.ringCenter}>
                    <Text style={styles.durationLabel} testID="timer-duration">
                      {durationLabel}
                    </Text>
                    <Text style={styles.remainingLabel}>
                      {t("timerCard.endTimeLabel", { time: endTimeText })}
                    </Text>
                    {statusLabel && <Text style={styles.statusInline}>{statusLabel}</Text>}
                  </View>
                )}
              </AnimatedCircularProgress>
            </View>
          </View>

          <View style={styles.presetsRow}>
            {PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
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
                <Text style={styles.secondaryButtonText}>{t(`presets.${preset.label}`)}</Text>
              </Pressable>
            ))}
            <Pressable
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
              <Text style={styles.clearButtonText}>{t("presets.clear")}</Text>
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
              <Text style={styles.primaryButtonText}>{t("timerCard.start")}</Text>
              {!hasDuration && <Text style={styles.startHelper}>{t("timerCard.startDisabled")}</Text>}
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
                (status === "idle" || status === "finished") && styles.buttonDisabled,
              ]}
            >
              <MaterialCommunityIcons name="pause-circle" size={22} color={colors.textPrimary} />
              <Text style={styles.secondaryButtonText}>{pauseResumeLabel}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleComplete}
              style={({ pressed }) => [styles.secondaryButton, styles.controlButton, pressed && styles.secondaryPressed]}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.textPrimary} />
              <Text style={styles.secondaryButtonText}>{t("controls.complete")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setMusicPlaying((prev) => !prev)}
              style={({ pressed }) => [styles.secondaryButton, styles.controlButton, pressed && styles.secondaryPressed]}
            >
              <MaterialCommunityIcons name={musicPlaying ? "music-off" : "music"} size={22} color={colors.textPrimary} />
              <Text style={styles.secondaryButtonText}>{musicLabel}</Text>
            </Pressable>

            <Pressable
              testID="music-select-button"
              accessibilityRole="button"
              onPress={() => setMusicModalVisible(true)}
              style={({ pressed }) => [styles.secondaryButton, styles.controlButton, pressed && styles.secondaryPressed]}
            >
              <MaterialCommunityIcons name="music-note" size={22} color={colors.textPrimary} />
              <Text style={styles.secondaryButtonText}>{t("controls.musicSelect")}</Text>
            </Pressable>
          </View>

          <View style={styles.musicFooter}>
            <Text style={styles.musicLabel}>{t("controls.musicSelected", { title: selectedMusic.title })}</Text>
            <Text style={styles.musicDuration}>{selectedMusic.duration}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={musicModalVisible} transparent animationType="fade" onRequestClose={() => setMusicModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.card]} testID="music-modal">
            <Text style={styles.modalTitle}>{t("controls.musicModalTitle")}</Text>
            <Text style={styles.modalSubtitle}>{t("controls.musicModalSubtitle")}</Text>
            <View style={styles.musicList}>
              {MUSIC_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  onPress={() => handleSelectMusic(option)}
                  style={({ pressed }) => [
                    styles.musicItem,
                    pressed && styles.pressed,
                    option.id === selectedMusic.id && styles.musicItemActive,
                  ]}
                >
                  <View style={styles.musicItemHeader}>
                    <Text style={styles.musicItemTitle}>{option.title}</Text>
                    <Text style={styles.musicItemDuration}>{option.duration}</Text>
                  </View>
                  {option.id === selectedMusic.id && <Text style={styles.musicSelected}>{t("controls.musicSelected", { title: option.title })}</Text>}
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setMusicModalVisible(false)}
              style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
            >
              <Text style={styles.modalCloseText}>{t("header.notificationDismiss")}</Text>
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
    backgroundColor: colors.background,
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
  timerWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
    width: "100%",
  },
  progressWrapper: {
    width: "100%",
    maxWidth: 260,
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
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  remainingLabel: {
    color: colors.textSecondary,
    fontSize: 18,
    marginTop: spacing.xs,
    textAlign: "center",
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
    gap: spacing.sm,
    marginTop: -spacing.lg,  //【ここチェック】 他のデバイスでもデザインが崩れないかどうか
  },
  presetButton: {
    minWidth: 92,
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
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
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
  musicList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
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
