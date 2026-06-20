import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Href, Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import MoreSheet from "../components/MoreSheet";
import OfflineRequiredScreen from "../components/OfflineRequiredScreen";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { signOutCurrentSession } from "../lib/logout";
import { navigateToPaymentScreen } from "../lib/paymentNavigation";
import { getAccessStateForUser } from "../lib/subscription";
import { decryptFieldValue } from "../lib/security/fieldEncryption";
import { supabase } from "../lib/supabaseClient";
import { shouldUseAndroidJapaneseTypography } from "../lib/ui/platform";
import { isCompactScreen } from "../lib/ui/responsive";
import { useFunPlan } from "../providers/FunPlanProvider";
import { useOffline } from "../providers/OfflineProvider";

type CardKey =
  | "idealSelf"
  | "annualGoals"
  | "weeklyGoals"
  | "taskTimer"
  | "focusMusic"
  | "breakReminders"
  | "nextFunPlan";

type DashboardCard = {
  key: CardKey;
  href?: Href;
};

type DashboardWeeklyTaskOption = {
  id: string;
  title: string;
  yearlyGoalId: string | null;
  loggedMinutes: number;
  color: string;
};

type DashboardFunPlan = {
  description: string;
  eventDate: string | null;
};

const alternatingGradients: readonly [readonly [string, string], readonly [string, string]] = [
  ["rgba(110,152,255,0.26)", "rgba(24,44,72,0.84)"],
  ["rgba(198,225,255,0.2)", "rgba(24,44,72,0.82)"],
];
const HERO_GRADIENT: readonly [string, string] = ["rgba(110,168,255,0.4)", "rgba(15,28,47,0.92)"];

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const getFunPlanCountdownLabel = (eventDate: string | null, todayLabel: string, daysLeftLabel: (count: number) => string) => {
  if (!eventDate) return null;
  const planDate = parseDateOnly(eventDate);
  if (!planDate) return null;
  const today = getStartOfToday();
  const diffDays = Math.floor((planDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return null;
  if (diffDays === 0) return todayLabel;
  return daysLeftLabel(diffDays);
};

export default function Dashboard() {
  const { t, i18n } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common", { keyPrefix: "moreSheet" });
  // ユーザ端末からアプリの表示領域(width)、OSの文字サイズ設定(fontScale)を取得する
  const { width, fontScale } = useWindowDimensions();
  const compact = isCompactScreen(width, fontScale);
  // i18n より現在の設定言語を取得
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isFrench = currentLanguage.startsWith("fr");
  const isAndroidJapanese = shouldUseAndroidJapaneseTypography(currentLanguage);
  const { emailUpdated } = useLocalSearchParams<{ emailUpdated?: string }>();
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [nextFunPlan, setNextFunPlan] = useState<DashboardFunPlan | null>(null);
  const [taskTimerModalVisible, setTaskTimerModalVisible] = useState(false);
  const [taskTimerTasks, setTaskTimerTasks] = useState<DashboardWeeklyTaskOption[]>([]);
  const [selectedTaskTimerTaskId, setSelectedTaskTimerTaskId] = useState<string | null>(null);
  const [taskTimerDropdownOpen, setTaskTimerDropdownOpen] = useState(false);
  const [taskTimerTasksLoading, setTaskTimerTasksLoading] = useState(false);
  const [taskTimerTasksError, setTaskTimerTasksError] = useState<string | null>(null);
  const [accessVerificationPending, setAccessVerificationPending] = useState(false);
  const { funPlanVisible, toggleFunPlan } = useFunPlan();
  const { offlineBlocked } = useOffline();

  const showLogoutToast = () => {
    const message = tCommon("logoutSuccess");
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  //　メールアドレス更新完了のポップアップメッセージ
  useEffect(() => {
    if (!emailUpdated) return;
    Alert.alert(t("notifications.emailUpdated"));
    router.replace("/dashboard");
  }, [emailUpdated, t]);


  // ハンバーガーメニューのハンドラー
  const handleMoreSelect = async (key: string) => {
    if (key === "logout") {
      Alert.alert(
        tCommon("confirmTitle"),
        tCommon("confirmBody"),
        [
          { text: tCommon("confirmNo"), style: "cancel" },
          {
            text: tCommon("confirmYes"),
            style: "destructive",
            onPress: async () => {
              try {
                await signOutCurrentSession();
              } catch (error) {
                console.warn("Failed to sign out from dashboard", error);
                return;
              }
              showLogoutToast();
              router.replace("/");
            },
          },
        ],
        { cancelable: true },
      );
    }
    if (key === "toggleFunPlan") {
      toggleFunPlan();
    }
    if (key === "profile") {
      router.push("/profile-update");
    }
    if (key === "contact") {
      router.push("/contact");
    }
    if (key === "payment") {
      await navigateToPaymentScreen(router);
    }
  };

  // ディスパッチャーである[feature].tsxに遷移させ、paramsを渡す
  const cards: DashboardCard[] = useMemo(
    () => [
      { key: "idealSelf", href: { pathname: "/feature/[feature]", params: { feature: "ideal-self" } } },
      { key: "annualGoals", href: { pathname: "/feature/[feature]", params: { feature: "annual-goals" } } },
      { key: "weeklyGoals", href: { pathname: "/feature/[feature]", params: { feature: "weekly-goals" } } },
      { key: "taskTimer" },
      { key: "focusMusic", href: { pathname: "/feature/[feature]", params: { feature: "focus-music" } } },
      { key: "breakReminders", href: { pathname: "/feature/[feature]", params: { feature: "break-reminders" } } },
    ],
    [],
  );

  // タスクタイマー遷移モーダルに必要な週間タスクデータを取得
  const fetchTaskTimerTasks = useCallback(async () => {
    setTaskTimerTasksLoading(true);
    setTaskTimerTasksError(null);
    const session = await supabase.auth.getSession();
    const uid = session.data.session?.user?.id;
    if (!uid) {
      setTaskTimerTasks([]);
      setSelectedTaskTimerTaskId(null);
      setTaskTimerTasksLoading(false);
      return;
    }

    const [{ data: yearlyData, error: yearlyError }, { data, error }] = await Promise.all([
      supabase
        .from("yearly_goals")
        .select("id, year_goal_color")
        .eq("user_id", uid)
        .order("order", { ascending: true }),
      supabase
        .from("weekly_tasks")
        .select("id, description, yearly_goal_id, accumulated_time_week, order")
        .eq("user_id", uid)
        .order("order", { ascending: true }),
    ]);

    if (yearlyError || error) {
      setTaskTimerTasks([]);
      setSelectedTaskTimerTaskId(null);
      setTaskTimerTasksError(t("taskTimerModal.error"));
      setTaskTimerTasksLoading(false);
      return;
    }

    // タスクタイマーモーダルで紐付ける週間タスクオプションに表示する年間目標カラーを取得
    const goalColorLookup = ((yearlyData as any[]) ?? []).reduce<Record<string, string>>((acc, row) => {
      acc[row.id] = row.year_goal_color ?? colors.accentPrimary;
      return acc;
    }, {});
    const nextTasks = ((data as any[]) ?? []).map((row): DashboardWeeklyTaskOption => ({
      id: row.id,
      title: decryptFieldValue(row.description),
      yearlyGoalId: row.yearly_goal_id ?? null,
      loggedMinutes: Math.max(0, Math.round(row.accumulated_time_week ?? 0)),
      color: row.yearly_goal_id ? (goalColorLookup[row.yearly_goal_id] ?? colors.accentPrimary) : colors.divider,
    }));
    setTaskTimerTasks(nextTasks);
    setSelectedTaskTimerTaskId(null);
    setTaskTimerTasksLoading(false);
  }, [t]);

  // タスクタイマー週間タスク選択モーダルのオープン処理
  const handleOpenTaskTimerModal = useCallback(() => {
    setTaskTimerModalVisible(true);
    setTaskTimerDropdownOpen(false);
    setSelectedTaskTimerTaskId(null);
    void fetchTaskTimerTasks();
  }, [fetchTaskTimerTasks]);

  // タスクタイマー週間タスク選択モーダルのクローズ処理
  const handleCloseTaskTimerModal = useCallback(() => {
    setTaskTimerModalVisible(false);
    setTaskTimerDropdownOpen(false);
    setTaskTimerTasksError(null);
  }, []);

  const handleStartTaskTimer = useCallback(() => {
    const selectedTask = taskTimerTasks.find((task) => task.id === selectedTaskTimerTaskId);
    setTaskTimerModalVisible(false);
    setTaskTimerDropdownOpen(false);

    // 週間タスクが紐づけられなかった場合
    if (!selectedTask) {
      router.push({
        pathname: "/task-timer",
        params: { source: "dashboard" },
      });
      return;
    }

    // 特定の週間タスクが紐付けられた場合
    const params: Record<string, string> = {
      source: "dashboard",
      taskId: selectedTask.id,
      title: selectedTask.title,
      logged: String(selectedTask.loggedMinutes),
    };
    // 該当週間タスクに紐づく年間目標が存在する場合はその情報も投げる
    if (selectedTask.yearlyGoalId) {
      params.yearlyGoalId = selectedTask.yearlyGoalId;
    }
    router.push({
      pathname: "/task-timer",
      params,
    });
  }, [selectedTaskTimerTaskId, taskTimerTasks]);

  // ダッシュボード遷移時に最新の楽しい予定リストの1番目を取得する
  const fetchNextFunPlan = useCallback(async () => {
    const session = await supabase.auth.getSession();
    const uid = session.data.session?.user?.id;
    if (!uid || !funPlanVisible) {
      setNextFunPlan(null);
      return;
    }
    const { data, error } = await supabase
      .from("fun_plans")
      .select("id, description, event_date, order")
      .eq("user_id", uid)
      .order("order", { ascending: true })
      .limit(1);
    if (error) {
      setNextFunPlan(null);
      return;
    }
    const firstPlan = ((data as any[]) ?? [])[0];
    setNextFunPlan(
      firstPlan
        ? {
            description: decryptFieldValue(firstPlan.description),
            eventDate: firstPlan.event_date ?? null,
          }
        : null,
    );
  }, [funPlanVisible]);

  const nextFunPlanCountdown = useMemo(
    () =>
      getFunPlanCountdownLabel(
        nextFunPlan?.eventDate ?? null,
        t("nextFunPlan.today"),
        (count) => t("nextFunPlan.daysLeft", { count }),
      ),
    [nextFunPlan?.eventDate, t],
  );
  const isTodayCountdown = nextFunPlanCountdown === t("nextFunPlan.today");

  useFocusEffect(
    useCallback(() => {
      fetchNextFunPlan();
    }, [fetchNextFunPlan]),
  );

  // ログイン済みユーザは free でも到達可能。paid相当は trial / active / canceled。
  // それ以外の場合はダッシュボードに辿り着けないようにここで制御
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const guardDashboardAccess = async () => {
        const { data, error } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (error) {
          if (active) setAccessVerificationPending(true);
          return;
        }
        if (!userId) {
          if (offlineBlocked) {
            if (active) setAccessVerificationPending(true);
            return;
          }
          if (active) router.replace("/login");
          return;
        }
        const accessState = await getAccessStateForUser(userId);
        if (accessState.resolution === "unknown" && accessState.canAccessApp) {
          if (active) setAccessVerificationPending(true);
          return;
        }
        if (active) setAccessVerificationPending(false);
        if (!accessState.canAccessApp && active) {
          router.replace("/purchases");
        }
      };
      guardDashboardAccess().catch((guardError) => {
        console.warn("Failed to guard dashboard access", guardError);
        if (active) setAccessVerificationPending(true);
      });
      return () => {
        active = false;
      };
    }, [offlineBlocked]),
  );

  // 6つの機能ページへ遷移する各カードを展開
  const renderCard = (card: DashboardCard, index: number) => {
    const rowIndex = Math.floor(index / 2);
    const isEvenRow = rowIndex % 2 === 0;
    const pair = isEvenRow ? alternatingGradients : [alternatingGradients[1], alternatingGradients[0]];
    const gradient = pair[index % 2];

    return (
      <Pressable
        key={card.key}
        testID={`dashboard-card-${card.key}`}
        accessibilityRole="button"
        onPress={() => {
          if (card.key === "taskTimer") {
            handleOpenTaskTimerModal();
            return;
          }
          if (card.href) {
            router.push(card.href);
          }
        }}
        style={({ pressed }) => [
          styles.tile,
          shadows.card,
          pressed && styles.tilePressed,
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tileGradient}
        />
        <View style={styles.tileHeader}>
          <Text
            style={[
              styles.tileTitle,
              isFrench ? styles.tileTitleFr : styles.tileTitleJaEn,
              compact && (isFrench ? styles.tileTitleCompactFr : styles.tileTitleCompactJaEn),
              isAndroidJapanese && styles.tileTitleAndroidJa,
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {t(`cards.${card.key}.title`)}
          </Text>
          <Text
            style={[
              styles.tileSubtitle,
              isFrench ? styles.tileSubtitleFr : styles.tileSubtitleJaEn,
              compact && (isFrench ? styles.tileSubtitleCompactFr : styles.tileSubtitleCompactJaEn),
            ]}
            numberOfLines={6} // 最大表示行数(...で折りたたまれる)
            ellipsizeMode="tail"
          >
            {t(`cards.${card.key}.subtitle`)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Ideal Gap",
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>{t("pageTitle")}</Text>
          </View>
        </View>

        {accessVerificationPending ? <OfflineRequiredScreen /> : null}

        {funPlanVisible && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/feature/[feature]", params: { feature: "next-fun-plan" } })}
            style={({ pressed }) => [styles.heroCard, pressed && styles.heroPressed]}
          >
            <LinearGradient
              colors={HERO_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.heroContent, compact && styles.heroContentCompact]}>
              <Text style={[styles.heroLabel, compact && styles.heroLabelCompact]}>{t("nextFunPlan.title")}</Text>
              <View style={styles.heroFooter}>
                <Text
                  style={[styles.heroCta, compact && styles.heroCtaCompact]}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {nextFunPlan?.description ?? t("nextFunPlan.cta")}
                </Text>
              </View>
              {nextFunPlanCountdown ? (
                <Text
                  style={[
                    styles.heroCountdown,
                    isTodayCountdown ? styles.heroCountdownToday : styles.heroCountdownDefault,
                    compact && styles.heroCountdownCompact,
                  ]}
                >
                  {nextFunPlanCountdown}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}

        <View style={styles.grid}>
          {cards.map((card, index) => renderCard(card, index))}
        </View>

      </ScrollView>
      <Footer
        isAuthenticated
        onLanguagePress={() => setLanguageSheetVisible(true)}
        onMorePress={() => setMoreSheetVisible(true)}
      />
      <LanguageSheet visible={languageSheetVisible} onClose={() => setLanguageSheetVisible(false)} />
      {/* タスクタイマーと紐づける週間タスク選択モーダル */}
      <Modal
        visible={taskTimerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseTaskTimerModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseTaskTimerModal}>
          <Pressable
            style={[styles.modalCard, shadows.card]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{t("taskTimerModal.title")}</Text>
            <Text style={styles.modalDescription}>{t("taskTimerModal.description")}</Text>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>{t("taskTimerModal.taskLabel")}</Text>
              {taskTimerTasksError ? <Text style={styles.modalError}>{taskTimerTasksError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                testID="dashboard-task-timer-task-select"
                style={[
                  styles.selectInput,
                  taskTimerDropdownOpen && styles.selectInputActive,
                ]}
                onPress={() => setTaskTimerDropdownOpen((prev) => !prev)}
              >
                <View style={styles.selectValueRow}>
                  <View
                    style={[
                      styles.categoryDot,
                      {
                        backgroundColor:
                          taskTimerTasks.find((task) => task.id === selectedTaskTimerTaskId)?.color ??
                          colors.divider,
                      },
                    ]}
                  />
                  <Text style={styles.selectValue} numberOfLines={2} ellipsizeMode="tail">
                    {taskTimerTasks.find((task) => task.id === selectedTaskTimerTaskId)?.title ??
                      t("taskTimerModal.noTaskOption")}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={taskTimerDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textPrimary}
                />
              </Pressable>
              {taskTimerTasks.length === 0 && !taskTimerTasksLoading ? (
                <Text
                  style={styles.modalWarning}
                  testID="dashboard-task-timer-no-tasks-message"
                >
                  {t("taskTimerModal.noTasksMessage")}
                </Text>
              ) : null}

              {taskTimerDropdownOpen ? (
                <View style={styles.selectList}>
                  <View style={styles.selectEdge}>
                    <MaterialCommunityIcons name="chevron-double-up" size={14} color={colors.textSecondary} />
                  </View>
                  <ScrollView style={styles.selectListScroll} showsVerticalScrollIndicator>
                    <Pressable
                      accessibilityRole="button"
                      testID="dashboard-task-timer-option-none"
                      style={[styles.selectOption, !selectedTaskTimerTaskId && styles.selectOptionActive]}
                      onPress={() => {
                        setSelectedTaskTimerTaskId(null);
                        setTaskTimerDropdownOpen(false);
                      }}
                    >
                      <View style={styles.selectValueRow}>
                        <View style={[styles.categoryDot, { backgroundColor: colors.divider }]} />
                        <Text
                          style={[styles.selectOptionText, !selectedTaskTimerTaskId && styles.selectOptionTextActive]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {t("taskTimerModal.noTaskOption")}
                        </Text>
                      </View>
                    </Pressable>
                    {taskTimerTasksLoading ? (
                      <View style={styles.selectLoadingOption}>
                        <Text style={styles.modalHelper}>{t("taskTimerModal.loading")}</Text>
                      </View>
                    ) : (
                      taskTimerTasks.map((task) => {
                        const active = task.id === selectedTaskTimerTaskId;
                        return (
                          <Pressable
                            key={task.id}
                            accessibilityRole="button"
                            testID={`dashboard-task-timer-option-${task.id}`}
                            style={[styles.selectOption, active && styles.selectOptionActive]}
                            onPress={() => {
                              setSelectedTaskTimerTaskId(task.id);
                              setTaskTimerDropdownOpen(false);
                            }}
                          >
                            <View style={styles.selectValueRow}>
                              <View style={[styles.categoryDot, { backgroundColor: task.color }]} />
                              <Text
                                style={[styles.selectOptionText, active && styles.selectOptionTextActive]}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {task.title}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                  <View style={[styles.selectEdge, styles.selectEdgeBottom]}>
                    <MaterialCommunityIcons name="chevron-double-down" size={14} color={colors.textSecondary} />
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.modalFooterRow}>
              <View style={[styles.modalActions, styles.modalActionsRight]}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.secondaryButton}
                  onPress={handleCloseTaskTimerModal}
                >
                  <Text style={styles.secondaryButtonText}>{t("taskTimerModal.back")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  testID="dashboard-task-timer-next"
                  style={styles.primaryButton}
                  onPress={handleStartTaskTimer}
                >
                  <Text style={styles.primaryButtonText}>{t("taskTimerModal.next")}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <MoreSheet
        visible={moreSheetVisible}
        onClose={() => setMoreSheetVisible(false)}
        funPlanVisible={funPlanVisible}
        onToggleFunPlan={toggleFunPlan}
        onSelect={handleMoreSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    gap: spacing.lg,
    paddingBottom: spacing.xl * 1.25,
  },
  contentCompact: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.xl * 1.1,
    fontWeight: "900",
    letterSpacing: 0.6,
    lineHeight: typography.xl * 1.18,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  languageButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  languageLabel: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.divider,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  heroContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroContentCompact: {
    padding: spacing.md,
  },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: typography.md,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroLabelCompact: {
    fontSize: typography.md * 0.9,
  },
  heroBody: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
    lineHeight: typography.lg * 1.3,
  },
  heroFooter: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  heroCta: {
    color: colors.textPrimary,
    fontSize: typography.md * 1.3,
    fontWeight: "700",
    lineHeight: typography.md * 1.45,
  },
  heroCtaCompact: {
    fontSize: typography.md * 1.08,
  },
  heroCountdown: {
    fontSize: typography.sm,
    fontWeight: "700",
  },
  heroCountdownDefault: {
    color: colors.textPrimary,
  },
  heroCountdownToday: {
    color: colors.warning,
  },
  heroCountdownCompact: {
    fontSize: typography.sm * 0.95,
  },
  heroHelper: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "49%",
    minHeight: 168,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: "hidden",
    position: "relative",
  },
  tileGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tileHeader: {
    gap: spacing.xs,
  },
  tileTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    flexShrink: 1,
  },
  // 6カードタイトル 日本語英語スタイル
  tileTitleJaEn: {
    fontSize: typography.lg,
  },
  tileTitleAndroidJa: {
    fontSize: typography.lg * 0.9,
    lineHeight: typography.lg * 1.15,
  },
  // 6カードタイトル フランス語スタイル
  tileTitleFr: {
    fontSize: typography.md * 1.05,
  },
  // 6カードタイトル(compact screen) 日本語英語スタイル
  tileTitleCompactJaEn: {
    fontSize: typography.md * 1.18,
  },
  // 6カードタイトル(compact screen) フランス語スタイル
  tileTitleCompactFr: {
    fontSize: typography.md,
  },
  tileSubtitle: {
    color: "rgba(233,237,247,0.76)",
    flexShrink: 1,
  },
  // 6カード説明文 日本語英語スタイル
  tileSubtitleJaEn: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  // 6カード説明文 フランス語スタイル
  tileSubtitleFr: {
    fontSize: typography.sm * 0.95,
    lineHeight: typography.sm * 1.32,
  },
  // 6カード説明文(compact screen) 日本語英語スタイル
  tileSubtitleCompactJaEn: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.3,
  },
  // 6カード説明文(compact screen) フランス語スタイル
  tileSubtitleCompactFr: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.22,
  },
  tilePressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  heroPressed: {
    opacity: 0.94,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  link: {
    color: colors.accentPrimary,
    fontSize: typography.md,
    fontWeight: "600",
  },
  extraLinkRow: {
    alignItems: "flex-start",
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
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.xl,
    gap: spacing.md,
    width: "100%",
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  modalDescription: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  modalFormGroup: {
    gap: spacing.xs,
  },
  modalLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  modalHelper: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  modalWarning: {
    color: colors.error,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  modalError: {
    color: colors.error,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
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
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
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
  selectLoadingOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
});
