import { LinearGradient } from "expo-linear-gradient";
import { Link, Stack, router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
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
import OAuthContinueButtons, { OAuthProviderId } from "../components/OAuthContinueButtons";
import PasswordField from "../components/PasswordField";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useKeyboardDismissAccessory } from "../hooks/useKeyboardDismissAccessory";
import { useLoginLockout } from "../hooks/useLoginLockout";
import { useRedirectAuthenticated } from "../hooks/useRedirectAuthenticated";
import { isSupportedLanguage } from "../i18n";
import { continueWithOAuthProvider, signInWithEmailPassword } from "../lib/auth";
import { resolveAuthenticatedEntryDestination } from "../lib/authEntry";
import {
  getAccessStateForUser,
} from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";
import { getKeyboardAvoidingBehavior } from "../lib/ui/platform";

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export default function Login() {
  useRedirectAuthenticated(); // ログインユーザをダッシュボードへ強制遷移
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProviderId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { t, i18n } = useTranslation("login");
  const { t: tCommon } = useTranslation("common", { keyPrefix: "navigation" });
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  const { isLocked, remainingText, checkLockout, recordFailure, clearLockout } = useLoginLockout({
    email,
    t,
  });
  const loginValidation = useMemo(() => {
    const result = loginSchema.safeParse({ email, password });
    if (result.success) {
      return { isValid: true };
    }
    return { isValid: false };
  }, [email, password]);
  const disabled = !loginValidation.isValid || isSubmitting || isLocked || Boolean(oauthProvider);
  const oauthProviders = useMemo<OAuthProviderId[]>(
    () => (Platform.OS === "ios" ? ["apple", "google"] : ["google"]),
    [],
  );
  const oauthLanguage = useMemo(
    () => (isSupportedLanguage(i18n.language) ? i18n.language : "en"),
    [i18n.language],
  );

  const showToast = useCallback((message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert(message);
  }, []);

  const handleLogin = useCallback(async () => {
    if (disabled) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const parsed = loginSchema.parse({ email, password });
      const lockoutStatus = await checkLockout(parsed.email);
      if (lockoutStatus.locked) {
        setErrorMessage(t("errorLocked"));
        return;
      }
      const result = await signInWithEmailPassword({
        email: parsed.email,
        password: parsed.password,
      });

      //　打ち込んだEmailのユーザが存在するか、パスワードは正しいかを検証
      if (!result.ok) {
        if (result.reason === "email_unconfirmed") {
          setSuccessMessage(t("errorEmailUnconfirmed"));
          return;
        }
        const lockout = await recordFailure(parsed.email);
        const message =
          lockout.locked
            ? t("errorLocked")
            : result.reason === "user_not_found"
              ? t("errorUserNotFound")
              : result.reason === "invalid_password"
                ? t("errorWrongPassword")
                : result.message ?? t("errorWrongPassword");
        setErrorMessage(message);
        return;
      }

      setErrorMessage(null);
      setSuccessMessage(null);
      await clearLockout(parsed.email);

      // ログイン情報が正しい時、Authのユーザ情報からSubscriptionデータを取得し、それに応じてユーザを各ページに遷移させる
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (userId) {
        const accessState = await getAccessStateForUser(userId);
        if (accessState.canAccessApp) {
          router.replace("/dashboard");
        } else {
          router.replace("/purchases?from=login");
        }
      }

      showToast(t("loginSuccess"));
    } finally {
      setIsSubmitting(false);
    }
  }, [checkLockout, clearLockout, disabled, email, password, recordFailure, showToast, t]);

  // Google/Apple認証処理
  const handleOAuthContinue = useCallback(
    async (provider: OAuthProviderId) => {
      if (oauthProvider || isSubmitting) return;

      setErrorMessage(null);
      setSuccessMessage(null);
      setOauthProvider(provider);

      try {
        // google/apple認証の結果と該当ユーザのセッション情報を受け取る
        const result = await continueWithOAuthProvider(provider);
        if (!result.ok) {
          if (result.reason !== "cancelled") {
            setErrorMessage(t("oauthError"));
          }
          return;
        }

        // Google/Apple認証完了ユーザと紐づくDBデータを参照(必要データがなければ作成)し
        // 認証処理完了後の遷移先(ダッシュボードor支払い画面)を確定する
        const destination = await resolveAuthenticatedEntryDestination({
          source: "login",
          user: result.user,
          language: oauthLanguage,
        });
        router.replace(destination);
        showToast(t("loginSuccess"));
      } catch (error) {
        console.warn("OAuth login flow failed", error);
        setErrorMessage(t("oauthError"));
      } finally {
        setOauthProvider(null);
      }
    },
    [isSubmitting, oauthLanguage, oauthProvider, showToast, t],
  );

  const errorLabel = useMemo(() => errorMessage, [errorMessage]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Ideal Gap", headerBackTitle: tCommon("back") }} />
      <KeyboardAvoidingView style={styles.formContainer} behavior={getKeyboardAvoidingBehavior()} testID="login-form-kav">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Text style={styles.label}>{t("pageLabel")}</Text>
            <Link href="/" style={styles.link}>
              {t("backToHome")}
            </Link>
          </View>

          <View style={[styles.card, shadows.card]}>
            <LinearGradient
              colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.title}>{t("welcomeTitle")}</Text>
            <Text style={styles.body}>{t("welcomeBody")}</Text>

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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("passwordLabel")}</Text>
              <PasswordField
                placeholder={t("passwordPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                keyboardAppearance="dark"
                value={password}
                onChangeText={setPassword}
                showPasswordLabel={t("showPassword")}
                hidePasswordLabel={t("hidePassword")}
              />
            </View>

            <OAuthContinueButtons
              providers={oauthProviders}
              googleLabel={t("continueWithGoogle")}
              appleLabel={t("continueWithApple")}
              loadingLabel={t("oauthLoading")}
              loadingProvider={oauthProvider}
              disabled={isSubmitting || isLocked}
              onPress={handleOAuthContinue}
            />

            <Pressable
              accessibilityRole="button"
              onPress={handleLogin}
              accessibilityState={{ disabled }}
              disabled={disabled}
              style={({ pressed }) => [
                styles.ctaButton,
                styles.primaryButton,
                styles.buttonShadow,
                Platform.OS === "android" && styles.buttonShadowAndroidFix,
                pressed && styles.buttonPressed,
                disabled && styles.buttonDisabled,
              ]}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGlass}
              />
              <Text style={styles.primaryLabel}>{isSubmitting ? t("loggingIn") : t("loginCta")}</Text>
            </Pressable>

            {!!errorLabel && (
              <View style={[styles.alertBox, styles.errorBox]}>
                <Text style={styles.alertBody}>{errorLabel}</Text>
              </View>
            )}
            {!!successMessage && (
              <View style={[styles.alertBox, styles.successBox]}>
                <Text style={styles.alertBody}>{successMessage}</Text>
              </View>
            )}
            {!!remainingText && (
              <View style={[styles.alertBox, styles.infoBox]}>
                <Text style={styles.alertBody}>{remainingText}</Text>
              </View>
            )}

            <Link href="/reset-password" asChild>
              <Pressable accessibilityRole="button" style={styles.subtleButton}>
                <Text style={styles.subtleLabel}>{t("forgotPassword")}</Text>
              </Pressable>
            </Link>
          </View>

          <View style={[styles.card, shadows.card]}>
            <LinearGradient
              colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.cardHeading}>{t("firstTimeHeading")}</Text>
            <Text style={styles.body}>{t("firstTimeBody")}</Text>
            <Link href="/signup" asChild>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  pressed && styles.buttonPressed,
                ]}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.buttonGlass, styles.ctaButton,
                  styles.secondaryButton,
                  styles.buttonShadow,
                  Platform.OS === "android" && styles.buttonShadowAndroidFix]}
                >
                  <Text style={styles.secondaryLabel}>{t("signupCta")}</Text>
                </LinearGradient>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Footer
        isAuthenticated={false}
        onLanguagePress={() => setLanguageSheetVisible(true)}
        onContactPress={() => router.push("/contact")}
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
  formContainer: {
    flex: 1,
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
    overflow: "hidden",
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
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  buttonShadow: {
    ...shadows.button,
  },
  buttonShadowAndroidFix: {
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  buttonGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  alertBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  alertBody: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  errorBox: {
    backgroundColor: "rgba(255,138,138,0.08)",
    borderColor: "#ff8a8a",
  },
  successBox: {
    borderColor: "rgba(56,217,150,0.9)",
    backgroundColor: "rgba(56,217,150,0.12)",
  },
  infoBox: {
    backgroundColor: "rgba(110,168,255,0.12)",
    borderColor: "rgba(110,168,255,0.28)",
  },
  subtleButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  subtleLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
});
