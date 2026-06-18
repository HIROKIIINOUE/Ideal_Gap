import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, Stack, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import Footer from "../components/Footer";
import KeyboardDismissButton from "../components/KeyboardDismissButton";
import LanguageSheet from "../components/LanguageSheet";
import OAuthContinueButtons, { OAuthProviderId } from "../components/OAuthContinueButtons";
import PasswordField from "../components/PasswordField";
import SubscriptionLegalLinks from "../components/SubscriptionLegalLinks";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useKeyboardDismissAccessory } from "../hooks/useKeyboardDismissAccessory";
import { useRedirectAuthenticated } from "../hooks/useRedirectAuthenticated";
import { continueWithOAuthProvider, signUpWithEmailConfirmation } from "../lib/auth";
import { resolveAuthenticatedEntryDestination } from "../lib/authEntry";
import { getAccessStateForUser } from "../lib/subscription";
import { getStoreName } from "../lib/subscriptionLegal";
import { supabase } from "../lib/supabaseClient";
import { getKeyboardAvoidingBehavior } from "../lib/ui/platform";
import { useLanguage } from "../providers/LanguageProvider";

const signupSchema = z.object({
  username: z.string().trim().min(1),
  email: z.string().trim().check(z.email()),
  password: z.string().min(6),
});

export default function Signup() {
  useRedirectAuthenticated(); // ログインユーザをダッシュボードへ強制遷移
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const { t } = useTranslation("signup");
  const { t: tCommon } = useTranslation("common", { keyPrefix: "navigation" });
  const { language } = useLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailSignupVisible, setIsEmailSignupVisible] = useState(false);
  // touched状態変数群でinputに1度でもFocusしたかどうかを判定しエラーメッセージ出力の有無に利用
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submissionState, setSubmissionState] = useState<
    "idle" | "success" | "verification_resent"
  >("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProviderId | null>(null);
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  const signupValidation = useMemo(() => {
    const result = signupSchema.safeParse({ username, email, password });
    if (result.success) {
      return { isValid: true, fieldErrors: {} as Record<string, string[]> };
    }
    return {
      isValid: false,
      fieldErrors: z.flattenError(result.error).fieldErrors,
    };
  }, [email, password, username]);
  const isUsernameValid = !signupValidation.fieldErrors.username;
  const isEmailValid = !signupValidation.fieldErrors.email;
  const isPasswordValid = !signupValidation.fieldErrors.password;
  const isFormValid = signupValidation.isValid;
  const oauthProviders = useMemo<OAuthProviderId[]>(
    () => (Platform.OS === "ios" ? ["apple", "google"] : ["google"]),
    [],
  );
  const localizedPrice = useMemo(() => (language === "ja" ? "390円" : "3.99CAD"), [language]);
  const storeName = useMemo(() => getStoreName(Platform.OS), []);
  const trialLabel = useMemo(() => t("trialLabelDay", { count: 14 }), [t]);
  const renewalPriceCopy = useMemo(
    () => t("planRenewalPrice", { price: localizedPrice }),
    [localizedPrice, t],
  );
  const trialInfoCopy = useMemo(
    () =>
      t("trialInfo", {
        trial: trialLabel,
        price: localizedPrice,
      }),
    [localizedPrice, t, trialLabel],
  );

  //　画面が表示されたときの初期処理(ログイン状態時のみ、状況に応じて各ページに遷移される)
  useEffect(() => {
    //　現在のログイン状況と購読状況を確認
    const checkExistingSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return;
      const userId = data.session?.user?.id;
      if (!userId) return;
      const accessState = await getAccessStateForUser(userId);
      if (accessState.canAccessApp) {
        router.replace("/dashboard");
        return;
      }
      router.replace("/purchases?from=signup");
    };

    checkExistingSession().catch((error) => console.warn("signup guard failed", error));
  }, [t]);

  const handleSubmit = useCallback(async () => {
    //ユーザがinputを触らずに送信した場合も各inputを検証しエラーを出力する
    setUsernameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!isFormValid || isSubmitting || oauthProvider) {
      return;
    }

    setSubmissionError(null);
    setSubmissionState("idle");
    setIsSubmitting(true);

    try {
      const parsed = signupSchema.parse({ username, email, password });

      const result = await signUpWithEmailConfirmation({
        email: parsed.email,
        password: parsed.password,
        username: parsed.username,
        language,
      });

      if (!result.ok) {
        if (result.reason === "email_unconfirmed") {
          setSubmissionState("verification_resent");
        } else if (result.reason === "email_exists") {
          setSubmissionError(t("emailExistsError"));
        } else {
          setSubmissionError(t("unknownError"));
        }
        return;
      }

      setSubmissionState("success");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isFormValid, isSubmitting, language, oauthProvider, password, t, username]);

  // Google/Apple認証処理
  const handleOAuthContinue = useCallback(
    async (provider: OAuthProviderId) => {
      if (oauthProvider || isSubmitting) return;

      setSubmissionError(null);
      setSubmissionState("idle");
      setOauthProvider(provider);

      try {
        // google/apple認証の結果と該当ユーザのセッション情報を受け取る
        const result = await continueWithOAuthProvider(provider);
        if (!result.ok) {
          if (result.reason !== "cancelled") {
            setSubmissionError(t("oauthError"));
          }
          return;
        }

        // Google?Apple認証完了ユーザと紐づくDBデータを参照(必要データがなければ作成)し
        // 認証処理完了後の遷移先(ダッシュボードor支払い画面)を確定する
        const destination = await resolveAuthenticatedEntryDestination({
          source: "signup",
          user: result.user,
          language,
        });
        router.replace(destination);
      } catch (error) {
        console.warn("OAuth signup flow failed", error);
        setSubmissionError(t("oauthError"));
      } finally {
        setOauthProvider(null);
      }
    },
    [isSubmitting, language, oauthProvider, t],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Ideal Gap", headerBackTitle: tCommon("back") }} />
      <KeyboardAvoidingView style={styles.formContainer} behavior={getKeyboardAvoidingBehavior()} testID="signup-form-kav">
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
            <Text style={styles.title}>{t("heroTitle")}</Text>
            <Text style={styles.body}>{t("heroBody", { storeName })}</Text>

            <View style={[styles.planCard, shadows.card]}>
              <Text style={styles.planTitle}>{t("planTitle")}</Text>
              <Text style={styles.planDuration}>{t("planDuration")}</Text>
              <Text style={styles.planPrice}>{renewalPriceCopy}</Text>
              <Text style={styles.trialPrice}>{trialInfoCopy}</Text>
              <Text style={styles.helperText}>{t("planDescription")}</Text>
            </View>
            <SubscriptionLegalLinks
              privacyPolicyLabel={t("privacyPolicyLabel")}
              termsOfUseLabel={t("termsOfUseLabel")}
            />

            <OAuthContinueButtons
              providers={oauthProviders}
              googleLabel={t("continueWithGoogle")}
              appleLabel={t("continueWithApple")}
              loadingLabel={t("oauthLoading")}
              loadingProvider={oauthProvider}
              disabled={isSubmitting}
              onPress={handleOAuthContinue}
            />
            {!isEmailSignupVisible ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsEmailSignupVisible(true)}
                style={({ pressed }) => [
                  styles.ctaButton,
                  styles.emailCtaButton,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={colors.textPrimary}
                  testID="continue-with-email-icon"
                />
                <Text style={styles.secondaryLabel}>{t("continueWithEmail")}</Text>
              </Pressable>
            ) : (
              <View style={styles.emailSignupSection}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t("usernameLabel")}</Text>
                  <TextInput
                    placeholder={t("usernamePlaceholder")}
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    keyboardAppearance="dark"
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                    onBlur={() => setUsernameTouched(true)}
                  />
                  {!isUsernameValid && usernameTouched && (
                    <Text style={styles.errorText}>{t("usernameInvalid")}</Text>
                  )}
                </View>

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
                    onBlur={() => setEmailTouched(true)}
                  />
                  {!isEmailValid && emailTouched && <Text style={styles.errorText}>{t("emailInvalid")}</Text>}
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
                    onBlur={() => setPasswordTouched(true)}
                    showPasswordLabel={t("showPassword")}
                    hidePasswordLabel={t("hidePassword")}
                  />
                  {!isPasswordValid && passwordTouched && (
                    <Text style={styles.errorText}>{t("passwordInvalid")}</Text>
                  )}
                </View>

                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.ctaButton,
                    styles.primaryButton,
                    styles.buttonShadow,
                    Platform.OS === "android" && styles.buttonShadowAndroidFix,
                    (!isFormValid || isSubmitting || oauthProvider) && styles.buttonDisabled,
                    pressed && isFormValid && !isSubmitting && !oauthProvider && styles.buttonPressed,
                  ]}
                  disabled={!isFormValid || isSubmitting || Boolean(oauthProvider)}
                  onPress={handleSubmit}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGlass}
                  />
                  <Text style={styles.primaryLabel}>
                    {isSubmitting ? t("primaryCtaLoading") : t("primaryCta")}
                  </Text>
                </Pressable>
                {submissionState === "success" && (
                  <View style={[styles.alertBox, styles.successBox]}>
                    <Text style={styles.alertTitle}>{t("verificationTitle")}</Text>
                    <Text style={styles.alertBody}>{t("verificationBody", { email })}</Text>
                  </View>
                )}
                {submissionState === "verification_resent" && (
                  <View style={[styles.alertBox, styles.successBox]}>
                    <Text style={styles.alertBody}>{t("unconfirmedVerificationBody")}</Text>
                  </View>
                )}
                {submissionError && (
                  <View style={[styles.alertBox, styles.errorBox]}>
                    <Text style={styles.alertBody}>{submissionError}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={[styles.card, shadows.card]}>
            <LinearGradient
              colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.cardHeading}>{t("existingAccountHeading")}</Text>
            <Link href="/login" asChild>
              <Pressable accessibilityRole="button" style={({ pressed }) => [pressed && styles.buttonPressed]}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.altCtaGradient, styles.altCtaPressable, styles.secondaryButton]}
                >
                  <Text style={styles.primaryLabel}>{t("goToLogin")}</Text>
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
  caption: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  planCard: {
    backgroundColor: colors.overlay,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  planTitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  planDuration: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  planPrice: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    flexShrink: 0,
    lineHeight: typography.xl * 1.2,
  },
  trialPrice: {
    color: colors.warning,
    fontSize: typography.sm,
    fontWeight: "700",
    lineHeight: typography.sm * 1.5,
  },
  emailSignupSection: {
    gap: spacing.md,
  },
  emailCtaButton: {
    flexDirection: "row",
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
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: spacing.xs / 2,
  },
  alertBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  successBox: {
    borderColor: "rgba(56,217,150,0.9)",
    backgroundColor: "rgba(56,217,150,0.12)",
  },
  errorBox: {
    borderColor: "#ff8a8a",
    backgroundColor: "rgba(255,138,138,0.08)",
  },
  alertTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  alertBody: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  errorText: {
    color: "#ff8a8a",
    fontSize: typography.sm,
    marginTop: spacing.xs / 2,
  },
  ctaButton: {
    width: "100%",
    alignSelf: "stretch",
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
  altCtaGradient: {
    width: "100%",
    alignSelf: "stretch",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(155,193,255,0.9)",
    overflow: "hidden",
  },
  altCtaPressable: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 1.35,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
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
});
