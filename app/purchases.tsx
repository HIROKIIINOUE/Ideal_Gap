import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SubscriptionLegalLinks from "../components/SubscriptionLegalLinks";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { signOutCurrentSession } from "../lib/logout";
import {
  getPlanBillingCopy,
  getPlanTrialCopy,
} from "../lib/planCopy";
import {
  fetchTestStorePackage,
  hasActiveEntitlement,
  purchaseSelectedPackage,
  TestStorePlan,
} from "../lib/revenuecatOfferings";
import { captureRevenueCatPurchaseError } from "../lib/sentry";
import {
  getAccessStateForUser,
  waitForActiveSubscription,
} from "../lib/subscription";
import { getStoreName } from "../lib/subscriptionLegal";
import { supabase } from "../lib/supabaseClient";

export default function Purchases() {
  const { t } = useTranslation("purchases");
  const { t: tCommonNav } = useTranslation("common", { keyPrefix: "navigation" });
  const params = useLocalSearchParams();
  const [plan, setPlan] = useState<TestStorePlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReturningHome, setIsReturningHome] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
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

  const loadPlan = useCallback(async () => {
    setIsLoadingPlan(true);
    setPlanError(null);
    try {
      const fetchedPlan = await fetchTestStorePackage();
      setPlan(fetchedPlan);
    } catch (error) {
      console.warn("Failed to load offering", error);
      setPlanError(t("planLoadError"));
      setPlan(null);
    } finally {
      setIsLoadingPlan(false);
    }
  }, [t]);

  //　画面の初期化と課金済みユーザへのガード機能
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (mounted) {
          setPlanError(t("planLoadError"));
          setIsLoadingPlan(false);
        }
        return;
      }
      const uid = data.session?.user?.id;
      if (!uid) {
        if (mounted) setIsLoadingPlan(false);
        router.replace("/login");
        return;
      }

      if (!mounted) return;
      setUserId(uid);
      try {
        const accessState = await getAccessStateForUser(uid);
        // サインアップから来た場合はこの画面を表示せず、ユーザが意図的に支払いページに来る時のみ表示できるようにサインアップから来たかどうかを判定する
        const openedFromSignup = Boolean(params?.signup || params?.from);
        if (
          accessState.accessMode === "paid" ||
          accessState.accessMode === "friend_free" ||
          (openedFromSignup && accessState.accessMode === "free")
        ) {
          if (mounted) setIsLoadingPlan(false);
          router.replace("/dashboard");
          return;
        }
      } catch (subscriptionError) {
        console.warn("Failed to prepare subscription", subscriptionError);
      }

      if (!mounted) return;
      await loadPlan();
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadPlan, params?.from, params?.signup, t]);

  const storeName = useMemo(() => getStoreName(Platform.OS), []);
  const billedPriceLine = useMemo(() => getPlanBillingCopy(plan, t), [plan, t]);
  const trialInfoLine = useMemo(() => getPlanTrialCopy(plan, t), [plan, t]);

  //　ボタン押下時の購入処理
  const handlePurchase = useCallback(async () => {
    if (!plan || !userId || isProcessing) return;
    setIsProcessing(true);

    try {
      const { customerInfo } = await purchaseSelectedPackage(plan.package);
      if (!hasActiveEntitlement(customerInfo)) {
        throw new Error("premium entitlement is not active");
      }
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
        captureRevenueCatPurchaseError(error);
        showToast(t("purchaseError"));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, plan, showToast, t, userId]);

  const handleReturnHome = useCallback(async () => {
    if (isReturningHome) return;
    setIsReturningHome(true);
    try {
      await signOutCurrentSession();
      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Failed to return home from purchases", message);
      showToast(t("returnHomeError"));
    } finally {
      setIsReturningHome(false);
    }
  }, [isReturningHome, showToast, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Ideal Gap",
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tCommonNav("back")}
              onPress={() => {
                handleReturnHome().catch((error) => {
                  console.warn("Failed to handle header back action", error);
                });
              }}
              disabled={isReturningHome}
              style={({ pressed }) => [
                styles.headerBackButton,
                pressed && styles.buttonPressed,
                isReturningHome && styles.buttonDisabled,
              ]}
            >
              <View style={styles.headerBackContent}>
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={22}
                  color={colors.textPrimary}
                />
                <Text style={styles.headerBackLabel}>{tCommonNav("back")}</Text>
              </View>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>{t("headerTitle")}</Text>
          <Text style={styles.body}>{t("signupCompleteBody")}</Text>

          <View
            style={[
              styles.planCard,
              Platform.OS === "ios" ? shadows.card : styles.planCardAndroid,
            ]}
          >
            {!isLoadingPlan && plan && (
              <>
                <Text style={styles.planTitle}>{t("planTitle")}</Text>
                <Text style={styles.planDuration}>{t("planDuration")}</Text>
                <Text style={styles.planPrice}>{billedPriceLine}</Text>
                {trialInfoLine ? (
                  <Text style={styles.trialPrice}>{trialInfoLine}</Text>
                ) : null}
                <Text style={styles.planDescription}>{t("planDescription", { storeName })}</Text>
              </>
            )}
            <Text style={styles.trialNotice}>{t("trialCancelNotice")}</Text>
            {!isLoadingPlan && !plan && !planError && (
              <Text style={styles.errorText}>{t("planUnavailable")}</Text>
            )}
            {planError && <Text style={styles.errorText}>{planError}</Text>}
            {planError && (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => {
                  if (isLoadingPlan) return;
                  loadPlan().catch((error) => {
                    console.warn("Failed to retry plan loading", error);
                  });
                }}
              >
                <Text style={styles.retryButtonLabel}>{t("retryPricingCta")}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              {`${t("storeBillingNotice", { storeName })} ${t("cardInfoPolicy")}`}
            </Text>
          </View>
          <SubscriptionLegalLinks
            privacyPolicyLabel={t("privacyPolicyLabel")}
            termsOfUseLabel={t("termsOfUseLabel")}
          />

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaButton,
              styles.primaryButton,
              styles.buttonShadow,
              Platform.OS === "android" && styles.buttonShadowAndroidFix,
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
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaButton,
              styles.secondaryButton,
              styles.returnHomeButton,
              pressed && styles.buttonPressed,
              isReturningHome && styles.buttonDisabled,
            ]}
            disabled={isReturningHome}
            onPress={handleReturnHome}
          >
            <Text style={styles.secondaryLabel}>
              {isReturningHome ? t("returningHomeCta") : t("returnHomeCta")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
  headerBackButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  headerBackContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  headerBackLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "rgba(28, 54, 90, 0.95)",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(194,224,255,0.42)",
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
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(192,222,255,0.4)",
    gap: spacing.sm,
  },
  planCardAndroid: {
    elevation: 0,
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
    flexShrink: 1,
    lineHeight: typography.xl * 1.2,
  },
  trialPrice: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: "600",
    flexShrink: 1,
    lineHeight: typography.sm * 1.5,
  },
  planDescription: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  trialNotice: {
    color: "#FFD56A",
    fontSize: typography.sm,
    fontWeight: "700",
    lineHeight: typography.sm * 1.5,
    backgroundColor: "rgba(255,213,106,0.18)",
    borderColor: "rgba(255,213,106,0.62)",
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  noticeCard: {
    borderRadius: radius.md,
    borderColor: "rgba(194,224,255,0.4)",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  noticeText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  errorText: {
    color: "#FFB0B0",
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
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentSubtle,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(188,216,255,0.55)",
  },
  returnHomeButton: {
    paddingVertical: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonShadow: {
    ...shadows.button,
  },
  buttonShadowAndroidFix: {
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontWeight: "600",
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
  retryButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(181,212,255,0.5)",
    backgroundColor: "rgba(170,199,255,0.22)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonLabel: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
});
