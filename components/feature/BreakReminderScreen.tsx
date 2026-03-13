import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useLanguage } from "../../providers/LanguageProvider";

type StoredReminder = {
  fireDate: number;
  notificationId: string;
};

const STORAGE_KEY = "break_reminder_schedule";

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

  // onChangeで通知スケジュールの設定
  const handleDateChange = (_event: any, date?: Date) => {
    if (!date) return;
    const normalized = new Date(date);
    normalized.setSeconds(0, 0);  // 引数でs、ms共に0にし指定の分単位で通知セットができる
    setSelectedDate(normalized);
  };

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
      if (!stored) return;
      const parsed = JSON.parse(stored) as StoredReminder;
      if (!parsed?.notificationId || !parsed?.fireDate) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return;
      }
      const list = await Notifications.getAllScheduledNotificationsAsync();
      const exists = Array.isArray(list) && list.some((item: any) => item.identifier === parsed.notificationId);
      if (exists) {
        if (parsed.fireDate <= Date.now()) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          return;
        }
        setScheduled(parsed);
        setSelectedDate(new Date(parsed.fireDate));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
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
      clearSchedule();
      return;
    }
    const minutes = Math.max(0, Math.ceil(diff / 60000));
    setRemainingMinutes(minutes);
  }, [clearSchedule]);


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
      const trigger: Notifications.DateTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: normalizedDate,
      };
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: t("notificationTitle"),
          body: t("notificationBody"),
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


  // 
  const pickerLocale = useMemo(() => localeFromLanguage(language), [language]);

  const scheduleLabel = useMemo(
    () => (scheduled ? formatDateTime(scheduled.fireDate, pickerLocale) : ""),
    [pickerLocale, scheduled],
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
              <DateTimePicker
                testID="break-reminder-datetime"
                value={selectedDate}
                mode="datetime"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                locale={pickerLocale}
                textColor={colors.textPrimary}
                style={styles.picker}
                onChange={handleDateChange}
              />
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
    paddingHorizontal: 0,
    justifyContent: "center",
    overflow: "hidden",
    alignSelf: "stretch",
    width: "100%",
    alignItems: "center",
  },
  picker: {
    width: "100%",
    alignSelf: "stretch",
    transform: [{ scaleX: 0.8 }, { scaleY: 0.94 }, { translateX: -spacing.xl * 1.4 }],
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
