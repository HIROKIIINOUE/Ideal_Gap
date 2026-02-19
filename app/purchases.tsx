import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { getPlanPriceCopy, getTrialLabel } from "../lib/planCopy";
import {
  fetchTestStorePackage,
  purchaseSelectedPackage,
  TestStorePlan,
} from "../lib/revenuecatOfferings";
import {
  ensureSignupAwaitSubscription,
  waitForActiveSubscription,
} from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";

export default function Purchases() {
  const { t } = useTranslation("purchases");
  const { t: tCommonNav } = useTranslation("common", { keyPrefix: "navigation" });
  const params = useLocalSearchParams();
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [plan, setPlan] = useState<TestStorePlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [billingEmail, setBillingEmail] = useState("");
  const signupToastShownRef = useRef(false);

  //　purchases画面のポップアップ画面機能
  const showToast = useCallback((message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  }, []);

  // URLクエリにsignup があれば「サインアップ完了」トーストを一度だけ表示。
  useEffect(() => {
    if (params?.signup && !signupToastShownRef.current) {
      signupToastShownRef.current = true;
      showToast(t("signupCompleteTitle"));
      router.replace("/purchases");
    }
  }, [params, showToast, t]);

  //　画面の初期化と課金済みユーザへのガード機能
  useEffect(() => {
    let mounted = true;


    const initialize = async () => {
      //　ログイン状態をチェック、エラーならプランエラー表示とロードの終了
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setPlanError(t("planLoadError"));
        setIsLoadingPlan(false);
        return;
      }
      const uid = data.session?.user?.id;
      if (!uid) {
        setIsLoadingPlan(false);
        router.replace("/login");
        return;
      }

      setUserId(uid);
      try {
        //　サインアップ待ちの購読レコードを保証、statusがsignupAwait以外ならdashboardへ遷移
        const subscription = await ensureSignupAwaitSubscription(uid);
        if (subscription.status && subscription.status !== "signupAwait") {
          if (mounted) setIsLoadingPlan(false);
          router.replace("/dashboard");
          return;
        }
      } catch (error) {
        console.warn("Failed to prepare subscription", error);
      }

      try {
        //　プランを取得
        const fetchedPlan = await fetchTestStorePackage();
        if (!mounted) return;
        setPlan(fetchedPlan);
      } catch (error) {
        console.warn("Failed to load offering", error);
        if (mounted) setPlanError(t("planLoadError"));
      } finally {
        if (mounted) setIsLoadingPlan(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [t]);

  const planPriceCopy = useMemo(() => getPlanPriceCopy(plan, t), [plan, t]);
  const trialLabel = useMemo(() => getTrialLabel(plan, t), [plan, t]);

  //　ボタン押下時の購入処理
  const handlePurchase = useCallback(async () => {
    if (!plan || !userId || isProcessing) return;
    setIsProcessing(true);

    try {
      await purchaseSelectedPackage(plan.package);
      const syncedSubscription = await waitForActiveSubscription(userId);
      if (!syncedSubscription) {
        throw new Error("subscription sync timed out");
      }
      showToast(t("purchaseSuccess"));
      router.replace("/dashboard");
    } catch (error) {
      const cancelled = (error as { userCancelled?: boolean })?.userCancelled;
      if (cancelled) {
        showToast(t("purchaseCancelled"));
      } else {
        showToast(t("purchaseError"));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, plan, showToast, t, userId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: t("pageLabel"), headerBackTitle: tCommonNav("back") }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>{t("pageLabel")}</Text>
          <Pressable onPress={() => router.replace("/")}>
            <Text style={styles.link}>{t("backToHome")}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>{t("headerTitle")}</Text>
          <Text style={styles.body}>{t("signupCompleteBody")}</Text>

          <View style={[styles.planCard, shadows.card]}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{t("planTitle")}</Text>
              {!isLoadingPlan && plan && (
                <Text style={styles.planPrice}>{planPriceCopy}</Text>
              )}
            </View>
            {isLoadingPlan && <Text style={styles.body}>{t("planDescription")}</Text>}
            {trialLabel && <Text style={styles.trialText}>{trialLabel}</Text>}
            <Text style={styles.trialNotice}>{t("trialCancelNotice")}</Text>
            <Text style={styles.helperText}>{t("planDescription")}</Text>
            {!isLoadingPlan && !plan && !planError && (
              <Text style={styles.errorText}>{t("planUnavailable")}</Text>
            )}
            {planError && <Text style={styles.errorText}>{planError}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t("billingLabel")}</Text>
            <TextInput
              placeholder={t("billingPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              keyboardAppearance="dark"
              autoCapitalize="none"
              keyboardType="email-address"
              value={billingEmail}
              onChangeText={setBillingEmail}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaButton,
              styles.primaryButton,
              styles.buttonShadow,
              (isProcessing || !plan || isLoadingPlan) && styles.buttonDisabled,
              pressed && !(isProcessing || isLoadingPlan) && styles.buttonPressed,
            ]}
            disabled={isProcessing || !plan || isLoadingPlan}
            onPress={handlePurchase}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGlass}
            />
            <Text style={styles.primaryLabel}>
              {isProcessing ? t("ctaLoading") : t("completeSignupCta")}
            </Text>
          </Pressable>
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
    backgroundColor: colors.surface,
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
  body: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  planTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  planPrice: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  trialText: {
    color: colors.accentPrimary,
    fontSize: typography.sm,
  },
  trialNotice: {
    color: colors.warning,
    fontSize: typography.sm,
    fontWeight: "700",
    lineHeight: typography.sm * 1.5,
    backgroundColor: "rgba(242,201,76,0.12)",
    borderColor: "rgba(242,201,76,0.5)",
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
    backgroundColor: colors.surface,
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
  errorText: {
    color: "#ff8a8a",
    fontSize: typography.sm,
    flexShrink: 1,
    lineHeight: typography.sm * 1.4,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonShadow: {
    ...shadows.button,
  },
  primaryLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
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
