import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useLanguage } from "../../providers/LanguageProvider";

type StoredReminder = {
  fireDate: number;
  notificationId: string;
};

const STORAGE_KEY = "break_reminder_schedule";
const BREAK_REMINDER_CHANNEL = "break-reminder";

const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;

const formatDateTime = (timestamp: number, locale: string) => {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  return date.toLocaleString(locale, options);
};

// Androidで表示する休憩終了設定時刻表示UI用の時刻を整形する
const formatTime = (timestamp: number, locale: string) => {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleTimeString(locale, options);
};

// Androidで表示する休憩終了設定時刻表示UI用の日付を整形する
const formatDate = (timestamp: number, locale: string) => {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString(locale, options);
};

const localeFromLanguage = (language: string) => {
  switch (language) {
    case "ja":
      return "ja-JP";
    case "fr":
      return "fr-FR";
    case "en":
    default:
      return "en-GB";
  }
};

const INITIAL_OFFSET_MINUTES = 15;

// Android端末での通知予約
const ensureAndroidBreakReminderChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(BREAK_REMINDER_CHANNEL, {
    name: "Break Reminder",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
};

export default function BreakReminderScreen() {
  const { t } = useTranslation("breakReminder");
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(Date.now() + INITIAL_OFFSET_MINUTES * 60 * 1000));
  const [scheduled, setScheduled] = useState<StoredReminder | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  // 直接scheduled (useState) ではなく、useRefを使用することで毎回最新値を安全に取得することができる。
  const scheduledRef = useRef<StoredReminder | null>(null);
  scheduledRef.current = scheduled;

  const isAndroid = Platform.OS === "android";


  // 【Android】日付と時刻それぞれのpickerから選択された通知時間情報をもとにselectedDataを更新する
  const updateSelectedDate = useCallback(
    (nextDate: Date, preserveTime: boolean) => {
      const normalized = new Date(selectedDate);
      if (preserveTime) {
        normalized.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      } else {
        normalized.setHours(nextDate.getHours(), nextDate.getMinutes(), 0, 0);
      }
      normalized.setSeconds(0, 0);
      setSelectedDate(normalized);
    },
    [selectedDate],
  );

  // AndroidのDatePickerで通知の日付が設定された時に発火
  const handleDateChange = useCallback(
    (event: any, date?: Date) => {
      if (event?.type === "dismissed" || !date) return;
      updateSelectedDate(date, true);
    },
    [updateSelectedDate],
  );

  // AndroidのTimePickerで通知の時刻が設定された時に発火
  const handleTimeChange = useCallback(
    (event: any, date?: Date) => {
      if (event?.type === "dismissed" || !date) return;
      updateSelectedDate(date, false);
    },
    [updateSelectedDate],
  );

  // iOSのDateTimePickerで通知日付＋時刻が設定された時に発火
  const handleDateTimeChange = useCallback((event: any, date?: Date) => {
    if (event?.type === "dismissed" || !date) return;
    const normalized = new Date(date);
    normalized.setSeconds(0, 0);// 引数でs、ms共に0にし指定の分単位で通知セットができる
    setSelectedDate(normalized);
  }, []);

  // AndroidのTimePickerモーダル表示
  const handleOpenAndroidTimePicker = useCallback(() => {
    DateTimePickerAndroid.open({
      value: selectedDate,
      mode: "time",
      display: "clock",
      is24Hour: false,
      onChange: handleTimeChange,
    });
  }, [handleTimeChange, selectedDate]);

  // AndroidのDatePickerモーダル表示
  const handleOpenAndroidDatePicker = useCallback(() => {
    DateTimePickerAndroid.open({
      value: selectedDate,
      mode: "date",
      display: "calendar",
      onChange: handleDateChange,
    });
  }, [handleDateChange, selectedDate]);

  // ユーザを端末の通知設定画面へ遷移
  const handleOpenSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn("Failed to open settings", error);
      Alert.alert(t("permissionDenied"));
    }
  }, [t]);

  // 設定した通知スクジュールをキャンセルする
  const clearSchedule = useCallback(async () => {
    const current = scheduledRef.current;
    if (current?.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(current.notificationId);
      } catch {
      }
    }
    setScheduled(null);
    setRemainingMinutes(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);


  // 画面再描写時、アプリ再起動時でも設定済みの通知機能を再構築する。
  // AsyncStorageに保存済みの通知情報((notificationId, fireDate))を読み出し、情報がまだ通知機能として生きているかをNotifications.getAllScheduledNotificationsAsync()で通知機能側に確認し、生きていればnotificationId, fireDate)を復元し、失効していればストレージをクーンアップする。
  // ★★ asyncStorageに保存されているデータと通知機能に保存されているデータは別であることに注意 ★★
  const restoreSchedule = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setScheduled(null);
        setRemainingMinutes(null);
        return;
      }
      const parsed = JSON.parse(stored) as StoredReminder;
      if (!parsed?.notificationId || !parsed?.fireDate) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setScheduled(null);
        setRemainingMinutes(null);
        return;
      }
      const list = await Notifications.getAllScheduledNotificationsAsync();
      const exists = Array.isArray(list) && list.some((item: any) => item.identifier === parsed.notificationId);
      if (exists) {
        if (parsed.fireDate <= Date.now()) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setScheduled(null);
          setRemainingMinutes(null);
          return;
        }
        setScheduled(parsed);
        setSelectedDate(new Date(parsed.fireDate));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setScheduled(null);
        setRemainingMinutes(null);
      }
    } catch { }
  }, []);

  // 端末が通知完了を受け取った時に設定時刻をクリアする処理
  const handleNotificationReceived = useCallback(
    (notification: Notifications.Notification) => {
      const id = notification?.request?.identifier;
      if (id && scheduledRef.current?.notificationId === id) {
        Alert.alert(t("notificationTitle"), t("notificationBody"));
        clearSchedule();
      }
    },
    [clearSchedule, t],
  );

  // ユーザがバックグラウンドで通知を受け取り、それをタップした時に発火される
  // → アプリが バックグラウンド or 停止状態から戻ってきた時にも発火する
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const id = response?.notification?.request?.identifier;
      if (id && scheduledRef.current?.notificationId === id) {
        clearSchedule();
      }
    },
    [clearSchedule],
  );

  // setIntervalによって1秒ごとに呼び出される
  const updateRemaining = useCallback(() => {
    const current = scheduledRef.current;
    if (!current) {
      setRemainingMinutes(null);
      return;
    }
    const diff = current.fireDate - Date.now();
    // diffの単位はmsなので分に変換するために60000倍する
    if (diff <= 0) {
      setRemainingMinutes(0);
      return;
    }
    const minutes = Math.max(0, Math.ceil(diff / 60000));
    setRemainingMinutes(minutes);
  }, []);


  // ページがマウントされた時にデータを正しく復元し、通知機能発火のタイミングの監視をスタートする処理
  useEffect(() => {
    restoreSchedule();
    // アプリに通知が行ったかどうかを監視、通知が入った瞬間に引数内のコールバック関数を実行する( 今回はhandleNotificationReceive() )
    const subscription = Notifications.addNotificationReceivedListener(handleNotificationReceived);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => {
      // アンマウント時に監視をストップ
      subscription?.remove();
      responseSubscription?.remove();
    };
  }, [handleNotificationReceived, handleNotificationResponse, restoreSchedule]);


  // マウント時に「通知を受け取った時、このアプリ内でどう表示するか」を設定
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true, // iOS などで通知バナーを画面上に表示する
        shouldShowList: true,   // 通知センターの一覧にも残す
        shouldPlaySound: true,  // 通知音を鳴らす
        shouldSetBadge: false,  // アプリアイコンのバッジ数は変えない
      }),
    });
  }, []);

  // Androidの場合の通知音設定。チャンネルの詳細設定
  useEffect(() => {
    if (Platform.OS !== "android") return;
    ensureAndroidBreakReminderChannel().catch(() => { });
  }, []);

  // Androidの時だけアプリがactiveに戻ったときにもrestoreSchedule()を再実行
  // ※Androidで休憩通知時間が過ぎてもUIが設定画面(picker)に戻らないエラー解消のため
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      restoreSchedule().catch(() => { });
    });
    return () => subscription.remove();
  }, [restoreSchedule]);

  // 残り時間の表示を30秒ごとに更新し、不要なタイマーは残さない
  useEffect(() => {
    updateRemaining();
    if (!scheduled) return;
    const id = setInterval(updateRemaining, 30000);
    return () => clearInterval(id);
  }, [scheduled, updateRemaining]);


  // ユーザが通知機能をONにしているかどうかジャッジ
  const ensurePermission = useCallback(async () => {
    setPermissionError(false);
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      const request = await Notifications.requestPermissionsAsync();
      const granted = request.granted || request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      if (!granted) {
        setPermissionError(true);
        Alert.alert(t("permissionDenied"), undefined, [
          { text: t("permissionAction"), onPress: handleOpenSettings },
          { text: t("cancel"), style: "cancel" },
        ]);
        return false;
      }
      return true;
    } catch (error) {
      console.warn("Failed to resolve break reminder notification permission", error);
      setPermissionError(true);
      return false;
    }
  }, [handleOpenSettings, t]);


  // 通知機能実行ロジック
  const scheduleReminder = useCallback(async () => {
    const now = Date.now();
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setSeconds(0, 0);
    if (normalizedDate.getTime() <= now) {
      Alert.alert(t("errorPast"));
      return;
    }

    const permitted = await ensurePermission();
    if (!permitted) {
      return;
    }

    try {
      await ensureAndroidBreakReminderChannel();
      const trigger: Notifications.DateTriggerInput =
        Platform.OS === "android"
          ? {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: normalizedDate,
            channelId: BREAK_REMINDER_CHANNEL,
          }
          : {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: normalizedDate,
          };
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: t("notificationTitle"),
          body: t("notificationBody"),
          sound: "default",
        },
        trigger,
      });
      const next: StoredReminder = { fireDate: normalizedDate.getTime(), notificationId: id };
      setScheduled(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setPermissionError(true);
    }
  }, [ensurePermission, selectedDate, t]);
  const pickerLocale = useMemo(() => localeFromLanguage(language), [language]);

  const scheduleLabel = useMemo(
    () => (scheduled ? formatDateTime(scheduled.fireDate, pickerLocale) : ""),
    [pickerLocale, scheduled],
  );

  // AndroidのUI用
  const selectedTimeLabel = useMemo(
    () => formatTime(selectedDate.getTime(), pickerLocale),
    [pickerLocale, selectedDate],
  );

  // AndroidのUI用
  const selectedDateLabel = useMemo(
    () => formatDate(selectedDate.getTime(), pickerLocale),
    [pickerLocale, selectedDate],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      testID="break-reminder-scroll"
    >
      <View style={[styles.card, scheduled && styles.activeCard, shadows.card]}>
        {scheduled && (
          <LinearGradient
            colors={HEADER_CARD_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
            pointerEvents="none"
          />
        )}
        <Text style={styles.title}>{t("title")}</Text>
        <Text style={styles.subtitle}>{t("description")}</Text>

        {scheduled ? (
          <View style={styles.scheduleCard}>
            <View style={styles.scheduledBox}>
              <Text style={styles.activeTitle}>{t("activeTitle")}</Text>
              {remainingMinutes !== null && (
                <Text style={styles.remainingLabel}>{t("timeRemaining", { minutes: remainingMinutes })}</Text>
              )}
              <Text style={styles.scheduledLabel} testID="break-reminder-scheduled-label">
                {t("scheduledLabel", { time: scheduleLabel })}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={clearSchedule}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              testID="break-reminder-cancel-button"
            >
              <Text style={styles.cancelLabel}>{t("cancel")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.label}>{t("inputLabel")}</Text>
            <View style={styles.pickerWrapper}>
              {isAndroid ? (
                <View style={styles.androidPickerGroup}>
                  <View style={styles.androidPickerBlock}>
                    <Text style={styles.androidPickerLabel}>{t("inputDateLabel")}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleOpenAndroidDatePicker}
                      style={({ pressed }) => [styles.androidPickerButton, pressed && styles.pressed]}
                      testID="break-reminder-android-date-button"
                    >
                      <Text style={styles.androidPickerValue}>{selectedDateLabel}</Text>
                      <Text style={styles.androidPickerAction}>{t("pickDate")}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.androidPickerBlock}>
                    <Text style={styles.androidPickerLabel}>{t("inputTimeLabel")}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleOpenAndroidTimePicker}
                      style={({ pressed }) => [styles.androidPickerButton, pressed && styles.pressed]}
                      testID="break-reminder-android-time-button"
                    >
                      <Text style={styles.androidPickerValue}>{selectedTimeLabel}</Text>
                      <Text style={styles.androidPickerAction}>{t("pickTime")}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.pickerViewport}>
                  <View style={styles.pickerCenter}>
                    <DateTimePicker
                      testID="break-reminder-datetime"
                      value={selectedDate}
                      mode="datetime"
                      display="spinner"
                      locale={pickerLocale}
                      textColor={colors.textPrimary}
                      style={styles.picker}
                      onChange={handleDateTimeChange}
                    />
                  </View>
                </View>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={scheduleReminder}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              testID="break-reminder-schedule-button"
            >
              <Text style={styles.primaryLabel}>{t("schedule")}</Text>
            </Pressable>

            {permissionError && <Text style={styles.error}>{t("permissionDenied")}</Text>}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 0.5,
    borderColor: colors.divider,
    gap: spacing.md,
    overflow: "hidden",
  },
  activeCard: {
    backgroundColor: "rgba(110,168,255,0.12)",
    borderColor: colors.accentSubtle,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    lineHeight: typography.xl * 1.3,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.accentSubtle,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    minHeight: 220,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: "center",
    overflow: "hidden",
    alignSelf: "stretch",
    width: "100%",
    alignItems: "center",
  },
  pickerViewport: {
    width: "100%",
    alignItems: "center",
    overflow: "hidden",
  },
  pickerCenter: {
    width: 320,
    alignItems: "center",
  },
  picker: {
    width: 320,
    // iPhoneのPickerは中央基準で縮小して、端末幅依存のtranslateを避ける
    transform: [{ scaleX: 0.8 }, { scaleY: 0.94 }],
  },
  androidPickerGroup: {
    width: "100%",
    gap: spacing.md,
  },
  androidPickerBlock: {
    gap: spacing.sm,
    width: "100%",
  },
  androidPickerLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  androidPickerButton: {
    minHeight: 64,
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(15,28,47,0.72)",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.xs / 2,
  },
  androidPickerValue: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  androidPickerAction: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.accentPrimary,
    ...shadows.button,
  },
  primaryLabel: {
    color: "#fff",
    fontSize: typography.md,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm * 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.2)",
  },
  cancelLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
    letterSpacing: 0.2,
  },
  scheduleCard: {
    alignItems: "center",
    width: "100%",
  },
  scheduledBox: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginVertical: spacing.lg,
    backgroundColor: "rgba(15,28,47,0.7)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  activeTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
    textAlign: "center"
  },
  remainingLabel: {
    color: colors.accentSubtle,
    fontSize: typography.md,
    fontWeight: "700",
    textAlign: "center"
  },
  scheduledLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    textAlign: "center"
  },
  error: {
    color: colors.error,
    fontSize: typography.sm,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
});
