import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { signUpWithEmailConfirmation } from "../lib/auth";
import { getPlanPriceCopy, getTrialLabel } from "../lib/planCopy";
import { fetchTestStorePackage, TestStorePlan } from "../lib/revenuecatOfferings";
import { ensureSignupAwaitSubscription, getSubscriptionForUser } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "../providers/LanguageProvider";

const signupSchema = z.object({
  username: z.string().trim().min(1),
  email: z.string().trim().check(z.email()),
  password: z.string().min(6),
});

export default function Signup() {
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const { t } = useTranslation("signup");
  const { language } = useLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<TestStorePlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  // touched状態変数群でinputに1度でもFocusしたかどうかを判定しエラーメッセージ出力の有無に利用
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submissionState, setSubmissionState] = useState<"idle" | "success">("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const planPriceCopy = useMemo(() => getPlanPriceCopy(plan, t), [plan, t]);
  const trialLabel = useMemo(() => getTrialLabel(plan, t), [plan, t]);

  //　画面が表示されたときの初期処理(ログイン状態時のみ、状況に応じて各ページに遷移される)
  useEffect(() => {
    let mounted = true;

    //　現在のログイン状況と購読状況を確認
    const checkExistingSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return;
      const userId = data.session?.user?.id;
      if (!userId) return;
      const subscription = await getSubscriptionForUser(userId);
      if (!subscription || subscription.status === "signupAwait") {
        try {
          await ensureSignupAwaitSubscription(userId);
        } catch (error) {
          console.warn("failed to ensure signupAwait subscription", error);
        }
        router.replace("/purchases?from=signup");
        return;
      }
      if (subscription.status === "active" || subscription.status === "trial") {
        router.replace("/dashboard");
      }
    };

    //　ユーザのプラン情報の取得
    const loadPlan = async () => {
      try {
        const offering = await fetchTestStorePackage();
        if (!mounted) return;
        setPlan(offering);
      } catch (error) {
        console.warn("Failed to load offering", error);
        if (mounted) setPlanError(t("planLoadError"));
      } finally {
        if (mounted) setIsLoadingPlan(false);
      }
    };

    checkExistingSession().catch((error) => console.warn("signup guard failed", error));
    loadPlan();

    return () => {
      mounted = false;
    };
  }, [t]);

  const handleSubmit = useCallback(async () => {
    //ユーザがinputを触らずに送信した場合も各inputを検証しエラーを出力する
    setUsernameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!isFormValid || isSubmitting) {
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
        if (result.reason === "email_exists") {
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
  }, [email, isFormValid, isSubmitting, language, password, t, username]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>{t("pageLabel")}</Text>
          <Link href="/" style={styles.link}>
            {t("backToHome")}
          </Link>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>{t("heroTitle")}</Text>
          <Text style={styles.body}>{t("heroBody", { planCopy: planPriceCopy })}</Text>

          <View style={[styles.planCard, shadows.card]}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{t("planTitle")}</Text>
              {!isLoadingPlan && <Text style={styles.planPrice}>{planPriceCopy}</Text>}
            </View>
            {trialLabel && <Text style={styles.trialText}>{trialLabel}</Text>}
            <Text style={styles.helperText}>{t("planDescription")}</Text>
            {planError && <Text style={styles.errorText}>{planError}</Text>}
          </View>

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
            {!isUsernameValid && usernameTouched && <Text style={styles.errorText}>{t("usernameInvalid")}</Text>}
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
            <TextInput
              placeholder={t("passwordPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              secureTextEntry
              keyboardAppearance="dark"
              value={password}
              onChangeText={setPassword}
              onBlur={() => setPasswordTouched(true)}
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
              (!isFormValid || isSubmitting) && styles.buttonDisabled,
              pressed && isFormValid && !isSubmitting && styles.buttonPressed,
            ]}
            disabled={!isFormValid || isSubmitting}
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
          {submissionError && (
            <View style={[styles.alertBox, styles.errorBox]}>
              <Text style={styles.alertBody}>{submissionError}</Text>
            </View>
          )}
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{t("noteText")}</Text>
          </View>
        </View>
        <View style={[styles.card, shadows.card]}>
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
      <Footer
        isAuthenticated={false}
        onLanguagePress={() => setLanguageSheetVisible(true)}
        onContactPress={() => router.push("/contact")}
      />
      <LanguageSheet
        visible={languageSheetVisible}
        onClose={() => setLanguageSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
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
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.18)",
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
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  planTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    flexShrink: 1,
    flexGrow: 1,
  },
  planPrice: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    flexShrink: 0,
  },
  trialText: {
    color: colors.accentPrimary,
    fontSize: typography.sm,
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
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.divider,
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
  buttonPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  buttonGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  noteBox: {
    backgroundColor: colors.overlay,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
});
