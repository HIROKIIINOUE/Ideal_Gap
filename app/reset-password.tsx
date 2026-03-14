import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { Link, Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import Footer from "../components/Footer";
import KeyboardDismissButton from "../components/KeyboardDismissButton";
import LanguageSheet from "../components/LanguageSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useKeyboardDismissAccessory } from "../hooks/useKeyboardDismissAccessory";
import { useRedirectAuthenticated } from "../hooks/useRedirectAuthenticated";
import {
  completePasswordReset,
  requestPasswordResetEmail,
  setSessionFromRecoveryLink,
} from "../lib/auth";

const resetEmailSchema = z.object({
  email: z.string().trim().check(z.email()),
});

const newPasswordSchema = z.object({
  newPassword: z.string().min(6),
});

export default function ResetPassword() {
  useRedirectAuthenticated(); // ログインユーザをダッシュボードへ強制遷移
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const { t } = useTranslation("resetPassword");
  const { t: tCommon } = useTranslation("common", { keyPrefix: "navigation" });
  const { replace, push } = useRouter();
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();

  const sendValidation = useMemo(() => resetEmailSchema.safeParse({ email }), [email]);
  const updateValidation = useMemo(
    () => newPasswordSchema.safeParse({ newPassword }),
    [newPassword],
  );
  const sendDisabled = !sendValidation.success || isSending;
  const updateDisabled = !updateValidation.success || isUpdating || !recoveryReady;

  const showToast = useCallback((message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert(message);
  }, []);

  // メールのリカバリリンクからパスワード更新の可否を設定
  useEffect(() => {
    let mounted = true; // 非同期処理中にページがマウントされた時用のフラグ
    const handleUrl = async (url: string | null | undefined) => {
      const ready = await setSessionFromRecoveryLink(url);
      if (mounted && ready) {
        setRecoveryReady(true);
        setStatusMessage(t("sessionReady"));
        setUpdateError(null);
      }
    };

    // ↓メールリンクよりアプリ起動した直後にOSから渡された最初のURLをhandleUrlに引数として渡し発火
    Linking.getInitialURL().then(handleUrl).catch(() => { });
    // ↓既に起動済みのアプリがバックグラウンドにいる場合は以下でhandleUrlを発火
    const subscription = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [t]);

  // パスワード変更許可メール送信機能(from supabase)
  const handleSendReset = useCallback(async () => {
    if (sendDisabled) return;
    setIsSending(true);
    setSendError(null);
    setStatusMessage(null);
    try {
      const parsed = resetEmailSchema.parse({ email });
      const result = await requestPasswordResetEmail(parsed.email);

      if (!result.ok) {
        const message =
          result.reason === "user_not_found"
            ? t("errorUserNotFound")
            : result.reason === "rate_limited"
              ? t("errorRateLimited")
              : t("errorUnknown");
        setSendError(message);
        return;
      }

      setStatusMessage(t("linkSent"));
    } finally {
      setIsSending(false);
    }
  }, [email, sendDisabled, t]);

  // パスワード更新機能
  const handleUpdatePassword = useCallback(async () => {
    if (updateDisabled) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const parsed = newPasswordSchema.parse({ newPassword });
      const result = await completePasswordReset(parsed.newPassword);

      if (!result.ok) {
        const message =
          result.reason === "missing_session"
            ? t("sessionNotReady")
            : result.reason === "rate_limited"
              ? t("errorRateLimited")
              : t("errorUnknown");
        setUpdateError(message);
        return;
      }

      showToast(t("updateSuccess"));
      replace("/login");
    } finally {
      setIsUpdating(false);
    }
  }, [newPassword, replace, showToast, t, updateDisabled]);

  // メールリンククリック後のアプリ再遷移時に表示(要確認)
  const recoveryHint = useMemo(
    () => (recoveryReady ? t("sessionReady") : t("sessionNotReady")),
    [recoveryReady, t],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Ideal Gap", headerBackTitle: tCommon("back") }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>{t("pageLabel")}</Text>
          <Link href="/login" style={styles.link}>
            {t("backToLogin")}
          </Link>
        </View>

        <View style={[styles.card, shadows.card]}>
          <LinearGradient
            colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.title}>{t("introTitle")}</Text>
          <Text style={styles.body}>{t("introBody")}</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t("emailLabel")}</Text>
            <TextInput
              placeholder={t("emailPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              keyboardAppearance="dark"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleSendReset}
            accessibilityState={{ disabled: sendDisabled }}
            disabled={sendDisabled}
            style={({ pressed }) => [
              styles.ctaButton,
              styles.primaryButton,
              styles.buttonShadow,
              pressed && styles.buttonPressed,
              sendDisabled && styles.buttonDisabled,
            ]}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGlass}
            />
            <Text style={styles.primaryLabel}>{isSending ? t("sending") : t("sendCta")}</Text>
          </Pressable>

          {!!statusMessage && (
            <View style={[styles.alertBox, styles.infoBox]}>
              <Text style={styles.alertBody}>{statusMessage}</Text>
            </View>
          )}
          {!!sendError && (
            <View style={[styles.alertBox, styles.errorBox]}>
              <Text style={styles.alertBody}>{sendError}</Text>
            </View>
          )}
        </View>

        {recoveryReady && (
          <View style={[styles.card, shadows.card]}>
            <LinearGradient
              colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.cardHeading}>{t("newPasswordTitle")}</Text>
            <Text style={styles.body}>{recoveryHint}</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("newPasswordLabel")}</Text>
              <TextInput
                placeholder={t("newPasswordPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                secureTextEntry
                keyboardAppearance="dark"
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            {!!updateError && (
              <View style={[styles.alertBox, styles.errorBox]}>
                <Text style={styles.alertBody}>{updateError}</Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={handleUpdatePassword}
              accessibilityState={{ disabled: updateDisabled }}
              disabled={updateDisabled}
              style={({ pressed }) => [
                styles.ctaButton,
                styles.secondaryButton,
                styles.buttonShadow,
                pressed && styles.buttonPressed,
                updateDisabled && styles.buttonDisabled,
              ]}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.buttonGlass, styles.secondaryOverlay]}
              />
              <Text style={styles.secondaryLabel}>
                {isUpdating ? t("updating") : t("updateCta")}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <Footer
        isAuthenticated={false}
        onLanguagePress={() => setLanguageSheetVisible(true)}
        onContactPress={() => push("/contact")}
      />
      <LanguageSheet
        visible={languageSheetVisible}
        onClose={() => setLanguageSheetVisible(false)}
      />
      {keyboardVisible ? (
        <KeyboardDismissButton keyboardHeight={keyboardHeight} onPress={dismissKeyboard} />
      ) : null}
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
    paddingBottom: spacing.xl * 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    color: colors.accentSubtle,
    letterSpacing: 0.6,
    fontSize: typography.sm,
    textTransform: "uppercase",
  },
  link: {
    color: colors.accentPrimary,
    fontSize: typography.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    overflow: "hidden",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
  },
  cardHeading: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.divider,
    fontSize: typography.md,
  },
  ctaButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 1.35,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    gap: spacing.sm,
    position: "relative",
  },
  primaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(155,193,255,0.9)",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.28)",
  },
  primaryLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonShadow: {
    ...shadows.button,
  },
  buttonPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  buttonGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  secondaryOverlay: {
    opacity: 0.85,
  },
  alertBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  alertBody: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  errorBox: {
    borderColor: "#ff8a8a",
    backgroundColor: "rgba(255,138,138,0.08)",
  },
  infoBox: {
    borderColor: "rgba(93, 217, 168, 0.5)",
    backgroundColor: "rgba(55, 178, 133, 0.12)",
  },
});
