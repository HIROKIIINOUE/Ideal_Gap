import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import MoreSheet from "../components/MoreSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { supabase } from "../lib/supabaseClient";
import { useFunPlan } from "../providers/FunPlanProvider";

const categoryKeys = ["bug", "request", "feedback", "other"] as const;
type CategoryKey = (typeof categoryKeys)[number];

const contactSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().check(z.email()),
  category: z.enum(categoryKeys),
  message: z.string().trim().min(6),
  honeypot: z.string().trim().max(0),
});

export default function Contact() {
  const { t } = useTranslation("contact");
  const { t: tCommonNav } = useTranslation("common", { keyPrefix: "navigation" });
  const { t: tCommon } = useTranslation("common", { keyPrefix: "moreSheet" });
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitted">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  // touched状態変数群で各inputに1度でもFocusしたかどうかを判定しエラーメッセージ出力の有無に利用
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const { funPlanVisible, toggleFunPlan } = useFunPlan();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const categoryOptions = useMemo(
    () =>
      categoryKeys.map((key) => ({
        key,
        label: t(`categories.${key}`),
      })),
    [t],
  );

  const validation = useMemo(
    () => contactSchema.safeParse({ name, email, category, message, honeypot }),
    [name, email, category, message, honeypot],
  );
  const fieldErrors = useMemo(() => {
    if (validation.success) return {};
    return z.flattenError(validation.error).fieldErrors;
  }, [validation]);
  const isValid = validation.success;

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const resetTouches = () => {
    setNameTouched(true);
    setEmailTouched(true);
    setCategoryTouched(true);
    setMessageTouched(true);
  };

  // コンタクトフォーム送信機能
  const handleSubmit = async () => {
    resetTouches();
    if (!isValid) return;
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      // Constantsを使ってユーザが使用しているアプリのバージョンを取得
      const appVersion =
        Constants.expoConfig?.version ||
        Constants.expoConfig?.runtimeVersion ||
        Constants.expoConfig?.extra?.appVersion ||
        "unknown";

      //OSがiOSかAndroidの時のみOSを取得
      const platform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : null;

      const payload = {
        user_id: user?.id ?? null,
        user_name: validation.data.name.trim(),
        user_email: validation.data.email.trim(),
        message: validation.data.message.trim(),
        category: validation.data.category,
        is_login_user: Boolean(user),
        app_version: appVersion,
        platform,
      };

      const { error } = await supabase.from("feedbacks").insert([payload]);
      if (error) {
        throw error;
      }

      setStatus("submitted");
      setCategoryOpen(false);
    } catch {
      setSubmissionError(t("submit.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showLogoutToast = useCallback(() => {
    const message = tCommon("logoutSuccess");
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  }, [tCommon]);

  // ユーザがサインイン状態かどうかを判定
  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setIsAuthenticated(Boolean(data.session));
      })
      .catch(() => { });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setIsAuthenticated(Boolean(session));
      if (event === "SIGNED_OUT") {
        setMoreSheetVisible(false);
      }
    });

    return () => {
      active = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  // タイピングキーボード表示非表示イベントでアイコンも連動して表示非表示されるようにイベントを追加
  useEffect(() => {
    const showEventName = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEventName = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    };
    const handleKeyboardHide = () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(showEventName, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEventName, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleMoreSelect = async (key: string) => {
    if (key === "logout") {
      Alert.alert(tCommon("confirmTitle"), tCommon("confirmBody"), [
        { text: tCommon("confirmNo"), style: "cancel" },
        {
          text: tCommon("confirmYes"),
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            showLogoutToast();
            router.replace("/");
          },
        },
      ]);
    }
    if (key === "toggleFunPlan") {
      toggleFunPlan();
    }
    if (key === "profile") {
      router.push("/profile-update");
    }
    if (key === "contact") {
      router.push("/contact");
    }
    if (key === "payment") {
      router.push("/payment-management");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Ideal Gap", headerBackTitle: tCommonNav("back") }} />
      <Pressable style={styles.formOverlay} onPress={dismissKeyboard} testID="contact-form-overlay">
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={styles.formContainer}
          testID="contact-form-kav"
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.formScroll}
            testID="contact-form-scroll"
          >
            <Pressable style={[styles.card, shadows.card]} onPress={(event) => event?.stopPropagation?.()}>
              <LinearGradient
                colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{t("pageTitle")}</Text>
                <Text style={styles.subtitle}>{t("intro")}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t("fields.nameLabel")}</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t("fields.namePlaceholder")}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  autoCapitalize="words"
                  keyboardAppearance="dark"
                  onBlur={() => setNameTouched(true)}
                />
                {!validation.success && nameTouched && fieldErrors.name && (
                  <Text style={styles.errorText}>{t("validation.name")}</Text>
                )}
              </View>

              <TextInput
                value={honeypot}
                onChangeText={setHoneypot}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                testID="contact-honeypot"
                style={styles.honeypot}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t("fields.emailLabel")}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("fields.emailPlaceholder")}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  keyboardAppearance="dark"
                  onBlur={() => setEmailTouched(true)}
                />
                {!validation.success && emailTouched && fieldErrors.email && (
                  <Text style={styles.errorText}>{t("validation.email")}</Text>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t("fields.categoryLabel")}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={category ? t(`categories.${category}`) : t("fields.categoryPlaceholder")}
                  onPress={() => {
                    setCategoryOpen((prev) => !prev);
                    setCategoryTouched(true);
                  }}
                  style={({ pressed }) => [styles.selectButton, pressed && styles.pressed]}
                >
                  <View style={styles.selectHeader}>
                    <Text style={styles.selectLabel}>
                      {category ? t(`categories.${category}`) : t("fields.categoryPlaceholder")}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                  </View>
                  <Text style={styles.selectHelper}>{t("fields.helper")}</Text>
                </Pressable>

                {categoryOpen && (
                  <View style={styles.optionList}>
                    {categoryOptions.map((option) => (
                      <Pressable
                        key={option.key}
                        accessibilityRole="button"
                        accessibilityLabel={option.label}
                        onPress={() => {
                          setCategory(option.key);
                          setCategoryOpen(false);
                          setCategoryTouched(true);
                        }}
                        style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.optionLabel}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {!validation.success && categoryTouched && fieldErrors.category && (
                  <Text style={styles.errorText}>{t("validation.category")}</Text>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t("fields.messageLabel")}</Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder={t("fields.messagePlaceholder")}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  keyboardAppearance="dark"
                  onBlur={() => setMessageTouched(true)}
                />
                {!validation.success && messageTouched && fieldErrors.message && (
                  <Text style={styles.errorText}>{t("validation.message")}</Text>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("submit.label")}
                disabled={!isValid || isSubmitting || status === "submitted"}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  (!isValid || pressed || isSubmitting || status === "submitted") && styles.pressed,
                  (!isValid || isSubmitting || status === "submitted") && styles.submitDisabled,
                ]}
              >
                <Text style={styles.submitLabel}>
                  {isSubmitting ? t("submit.sending") : status === "submitted" ? t("submit.sent") : t("submit.label")}
                </Text>
              </Pressable>

              {status === "submitted" && (
                <View style={styles.successCard}>
                  <Text style={styles.successTitle}>{t("submit.successTitle")}</Text>
                  <Text style={styles.successBody}>{t("submit.successBody")}</Text>
                </View>
              )}
              {submissionError && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorBody}>{submissionError}</Text>
                </View>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
      <Footer
        isAuthenticated={isAuthenticated}
        guestActions="home"
        onLanguagePress={() => setLanguageSheetVisible(true)}
        onMorePress={() => setMoreSheetVisible(true)}
        onHomePress={() => router.replace("/")}
      />
      <LanguageSheet visible={languageSheetVisible} onClose={() => setLanguageSheetVisible(false)} />
      {isAuthenticated && (
        <MoreSheet
          visible={moreSheetVisible}
          onClose={() => setMoreSheetVisible(false)}
          funPlanVisible={funPlanVisible}
          onToggleFunPlan={toggleFunPlan}
          onSelect={handleMoreSelect}
        />
      )}
      {keyboardVisible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dismissKeyboard", "Dismiss keyboard")}
          onPress={dismissKeyboard}
          style={[
            styles.keyboardDismissButton,
            {
              bottom: Math.max(keyboardHeight + spacing.sm, insets.bottom + spacing.xl),
            },
          ]}
          testID="contact-keyboard-dismiss"
        >
          <MaterialCommunityIcons name="keyboard-close-outline" size={20} color={colors.textPrimary} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  formOverlay: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    width: "100%",
  },
  formScroll: {
    flex: 1,
    width: "100%",
  },
  keyboardDismissButton: {
    position: "absolute",
    right: spacing.xl,
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(15,28,47,0.96)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.button,
    zIndex: 10,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    paddingBottom: spacing.xl * 2,
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  cardHeader: {
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    lineHeight: typography.xl * 1.2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  notice: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.45)",
    backgroundColor: "rgba(110,168,255,0.1)",
  },
  noticeLabel: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.textPrimary,
    fontSize: typography.md,
  },
  textArea: {
    minHeight: 140,
  },
  honeypot: {
    position: "absolute",
    height: 0,
    width: 0,
    opacity: 0,
    left: -9999,
  },
  selectButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  selectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  selectLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "600",
  },
  selectHelper: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: spacing.xs / 2,
  },
  errorText: {
    color: "#ff8a8a",
    fontSize: typography.sm,
    marginTop: spacing.xs / 2,
  },
  optionList: {
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.6)",
    backgroundColor: "rgba(110,168,255,0.08)",
    overflow: "hidden",
  },
  optionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(110,168,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
  },
  submitButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    backgroundColor: "rgba(110,168,255,0.2)",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitLabel: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  successCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(56,217,150,0.9)",
    backgroundColor: "rgba(56,217,150,0.12)",
    gap: spacing.xs,
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  successBody: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  errorCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#ff8a8a",
    backgroundColor: "rgba(255,138,138,0.08)",
  },
  errorBody: {
    color: "#ffb3b3",
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
});
