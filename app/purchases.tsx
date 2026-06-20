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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SubscriptionLegalLinks from "../components/SubscriptionLegalLinks";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { getPlanBillingCopy, getPlanTrialCopy } from "../lib/planCopy";
import {
  fetchRevenueCatPackage,
  hasActiveEntitlement,
  purchaseSelectedPackage,
  RevenueCatPlan,
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
  const signupParam = params?.signup;
  const [plan, setPlan] = useState<RevenueCatPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isRedirectingToManagement, setIsRedirectingToManagement] = useState(false);
  const signupToastShownRef = useRef(false);

  const showToast = useCallback((message: string) => {
    Alert.alert(message);
  }, []);

  useEffect(() => {
    if (signupParam && !signupToastShownRef.current) {
      signupToastShownRef.current = true;
      showToast(t("signupCompleteTitle"));
      router.replace("/purchases");
    }
  }, [signupParam, showToast, t]);

  const loadPlan = useCallback(async () => {
    setIsLoadingPlan(true);
    setPlanError(null);
    try {
      const fetchedPlan = await fetchRevenueCatPackage();
      setPlan(fetchedPlan);
    } catch (error) {
      console.warn("Failed to load offering", error);
      setPlanError(t("planLoadError"));
      setPlan(null);
    } finally {
      setIsLoadingPlan(false);
    }
  }, [t]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (mounted) {
          setPlanError(t("planLoadError"));
          setIsLoadingPlan(false);
          setIsCheckingAccess(false);
        }
        return;
      }

      const uid = data.session?.user?.id;
      if (!uid) {
        if (mounted) {
          setIsLoadingPlan(false);
          setIsCheckingAccess(false);
        }
        router.replace("/login");
        return;
      }

      if (!mounted) return;
      setUserId(uid);

      try {
        const accessState = await getAccessStateForUser(uid);
        if (
          accessState.accessMode === "paid" ||
          accessState.accessMode === "friend_free"
        ) {
          if (!mounted) return;
          setIsRedirectingToManagement(true);
          setIsCheckingAccess(false);
          router.replace("/payment-management");
          setIsLoadingPlan(false);
          return;
        }
      } catch (subscriptionError) {
        console.warn("Failed to prepare subscription", subscriptionError);
      }

      if (!mounted) return;
      setIsCheckingAccess(false);
      await loadPlan();
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadPlan, t]);

  const storeName = useMemo(() => getStoreName(Platform.OS), []);
  const billedPriceLine = useMemo(() => getPlanBillingCopy(plan, t), [plan, t]);
  const trialInfoLine = useMemo(() => getPlanTrialCopy(plan, t), [plan, t]);
  const planBenefits = useMemo(
    () => [
      t("planBenefits.idealSelfUnlimited"),
      t("planBenefits.annualGoalsUnlimited"),
      t("planBenefits.weeklyTasksUnlimited"),
      t("planBenefits.focusMusicMonthly30"),
      t("planBenefits.funPlanUnlimited"),
      t("planBenefits.prioritySupport"),
    ],
    [t],
  );
  const upgradeNoticeText = useMemo(
    () => `${t("storeBillingNotice", { storeName })} ${t("cardInfoPolicy")}`,
    [storeName, t],
  );

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

  const handleReturnToDashboard = useCallback(() => {
    router.replace(userId ? "/dashboard" : "/");
  }, [userId]);

  if (isRedirectingToManagement) {
    return null;
  }

  if (isCheckingAccess) {
    return null;
  }

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
              onPress={handleReturnToDashboard}
              style={({ pressed }) => [
                styles.headerBackButton,
                pressed && styles.buttonPressed,
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
          <Text style={styles.body}>{t("freePlanBody")}</Text>

          <View
            style={[
              styles.planCard,
              Platform.OS === "ios" ? shadows.card : styles.planCardAndroid,
            ]}
          >
            <View style={styles.planTitleWrap}>
              <LinearGradient
                colors={["rgba(160,220,255,0.22)", "rgba(71,125,255,0.18)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.planTitleGlow}
              />
              <Text style={styles.planEyebrow}>Membership</Text>
              <Text style={styles.planTitle}>{t("planTitle")}</Text>
            </View>
            <Text style={styles.planDuration}>{t("planDuration")}</Text>
            {!isLoadingPlan && plan ? (
              <Text style={styles.planPrice}>{billedPriceLine}</Text>
            ) : null}
            {!isLoadingPlan && plan && trialInfoLine ? (
              <Text style={styles.trialNotice}>{trialInfoLine}</Text>
            ) : null}
            <Text style={styles.planDescription}>{t("planDescription", { storeName })}</Text>
            <View style={styles.benefitsList}>
              {planBenefits.map((benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={18}
                    color="#8FD3FF"
                    style={styles.benefitIcon}
                  />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
            {!plan && !planError && !isLoadingPlan ? (
              <Text style={styles.errorText}>{t("planUnavailable")}</Text>
            ) : null}
            {planError ? <Text style={styles.errorText}>{planError}</Text> : null}
            {planError ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
                onPress={() => {
                  if (isLoadingPlan) return;
                  loadPlan().catch((error) => {
                    console.warn("Failed to retry plan loading", error);
                  });
                }}
              >
                <Text style={styles.retryButtonLabel}>{t("retryPricingCta")}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{upgradeNoticeText}</Text>
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
              pressed && !(isProcessing || !plan || isLoadingPlan) && styles.buttonPressed,
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
            ]}
            onPress={handleReturnToDashboard}
          >
            <Text style={styles.secondaryLabel}>{t("returnHomeCta")}</Text>
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
  planTitleWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(170,214,255,0.32)",
    backgroundColor: "rgba(17,30,52,0.42)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    overflow: "hidden",
  },
  planTitleGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.md,
  },
  planEyebrow: {
    color: "#9FD8FF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  planTitle: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: 0.3,
    lineHeight: typography.xl * 1.1,
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
  planDescription: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  benefitsList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  benefitIcon: {
    marginTop: 1,
  },
  benefitText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.45,
    fontWeight: "600",
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
  buttonGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
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
});
