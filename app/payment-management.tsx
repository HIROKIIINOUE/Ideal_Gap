import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, Pressable, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import MoreSheet from "../components/MoreSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { signOutCurrentSession } from "../lib/logout";
import { getSubscriptionForUser } from "../lib/subscription";
import { openSubscriptionManagementPortal } from "../lib/subscriptionManagement";
import { supabase } from "../lib/supabaseClient";
import { useFunPlan } from "../providers/FunPlanProvider";

export default function PaymentManagement() {
  const { t } = useTranslation("paymentManagement");
  const { t: tCommonNav } = useTranslation("common", { keyPrefix: "navigation" });
  const { t: tCommon } = useTranslation("common", { keyPrefix: "moreSheet" });
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [statusKey, setStatusKey] = useState<
    "signupAwait" | "trial" | "active" | "canceled" | "expired" | "unknown"
  >("unknown");
  const [isOpening, setIsOpening] = useState(false);
  const { funPlanVisible, toggleFunPlan } = useFunPlan();

  // トーストメッセージの雛形
  const showToast = useCallback((message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  }, []);

  // ログアウト成功時のトースト(ハンバーガーメニューより)
  const showLogoutToast = useCallback(() => {
    showToast(tCommon("logoutSuccess"));
  }, [showToast, tCommon]);


  // 現在のユーザのサブスク状況をDBから取得し、UIに表示させる
  useEffect(() => {
    let active = true;

    const loadSubscription = async () => {
      const { data, error } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (error || !userId) {
        if (active) router.replace("/login");
        return;
      }

      const subscription = await getSubscriptionForUser(userId);
      if (!active) return;

      const status = subscription?.status;
      if (
        status === "signupAwait" ||
        status === "trial" ||
        status === "active" ||
        status === "canceled" ||
        status === "expired"
      ) {
        setStatusKey(status);
      } else {
        setStatusKey("unknown");
      }
    };

    loadSubscription().catch((error) => {
      console.warn("Failed to load subscription status", error);
      if (active) {
        showToast(t("loadError"));
        setStatusKey("unknown");
      }
    });

    return () => {
      active = false;
    };
  }, [showToast, t]);


  // 「支払い設定を開く」ボタン押下時の処理
  // 「支払い設定を開く」ボタンを押してから設定が開かれるまではisOpeningをtrueにして他のボタンなどを制御
  const handleOpenManagement = useCallback(async () => {
    if (isOpening) return;
    setIsOpening(true);
    try {
      await openSubscriptionManagementPortal();
    } catch (error) {
      console.warn("Failed to open subscription management portal", error);
      showToast(t("openError"));
    } finally {
      setIsOpening(false);
    }
  }, [isOpening, showToast, t]);

  const statusText = useMemo(() => {
    return t(`statusValue.${statusKey}`);
  }, [statusKey, t]);


  // ハンバーガーメニュー内の各ボタン処理
  const handleMoreSelect = async (key: string) => {
    if (key === "logout") {
      Alert.alert(tCommon("confirmTitle"), tCommon("confirmBody"), [
        { text: tCommon("confirmNo"), style: "cancel" },
        {
          text: tCommon("confirmYes"),
          style: "destructive",
          onPress: async () => {
            try {
              await signOutCurrentSession();
            } catch (error) {
              console.warn("Failed to sign out from payment management", error);
              return;
            }
            showLogoutToast();
            router.replace("/");
          },
        },
      ]);
    }
    if (key === "toggleFunPlan") {
      toggleFunPlan();
    }
    if (key === "payment") {
      router.push("/payment-management");
    }
    if (key === "profile") {
      router.push("/profile-update");
    }
    if (key === "contact") {
      router.push("/contact");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Ideal Gap", headerBackTitle: tCommonNav("back") }} />
      <View style={styles.content}>
        <View style={[styles.card, shadows.card]}>
          <LinearGradient
            colors={["rgba(30,94,255,0.24)", "rgba(15,28,47,0.92)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.heading}>{t("heading")}</Text>
          <Text style={styles.body}>{t("body")}</Text>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>{t("statusLabel")}</Text>
            <Text style={styles.statusValue}>{statusText}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleOpenManagement}
            disabled={isOpening}
            style={({ pressed }) => [
              styles.manageButton,
              pressed && styles.buttonPressed,
              isOpening && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.manageButtonLabel}>{isOpening ? t("openingButton") : t("manageButton")}</Text>
          </Pressable>

          <Text style={styles.hint}>{t("manageHint")}</Text>
        </View>
      </View>
      <Footer
        isAuthenticated
        onLanguagePress={() => setLanguageSheetVisible(true)}
        onMorePress={() => setMoreSheetVisible(true)}
      />
      <LanguageSheet visible={languageSheetVisible} onClose={() => setLanguageSheetVisible(false)} />
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
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(194,224,255,0.42)",
    backgroundColor: "rgba(28, 54, 90, 0.95)",
    overflow: "hidden",
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.45,
  },
  statusCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: spacing.md,
    gap: spacing.xs,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  statusValue: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  manageButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(170,199,255,0.5)",
    backgroundColor: "rgba(56,116,255,0.35)",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  manageButtonLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  hint: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
