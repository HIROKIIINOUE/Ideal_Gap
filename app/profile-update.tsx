import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import MoreSheet from "../components/MoreSheet";
import PasswordField from "../components/PasswordField";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useKeyboardDismissAccessory } from "../hooks/useKeyboardDismissAccessory";
import { deleteCurrentAccount } from "../lib/accountDeletion";
import { buildRedirectUrl } from "../lib/auth";
import type { ExternalAuthProvider } from "../lib/authProviders";
import {
  getPreferredExternalAuthProvider,
  hasAppleOrGoogleProvider,
} from "../lib/authProviders";
import { signOutCurrentSession } from "../lib/logout";
import { navigateToPaymentScreen } from "../lib/paymentNavigation";
import { supabase } from "../lib/supabaseClient";
import { getKeyboardAvoidingBehavior } from "../lib/ui/platform";
import { useFunPlan } from "../providers/FunPlanProvider";

const profileSchema = z.object({
  username: z.string().trim().min(1),
  email: z.string().trim().check(z.email()),
  password: z.string().optional().transform((val) => val ?? ""),
});

export default function ProfileUpdate() {
  const { t, i18n } = useTranslation("profileUpdate");
  const { t: tCommonNav } = useTranslation("common", { keyPrefix: "navigation" });
  const { t: tCommon } = useTranslation("common", { keyPrefix: "moreSheet" });
  const { funPlanVisible, toggleFunPlan } = useFunPlan();
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [initialEmail, setInitialEmail] = useState<string | null>(null);
  const [emailChangeRequested, setEmailChangeRequested] = useState(false);
  const [isExternalProviderProfile, setIsExternalProviderProfile] = useState(false);
  const [externalAuthProvider, setExternalAuthProvider] =
    useState<ExternalAuthProvider | null>(null);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  const isFrench = i18n.language === "fr";

  const validation = useMemo(() => profileSchema.safeParse({ username, email, password }), [email, password, username]);
  const fieldErrors = validation.success ? {} : z.flattenError(validation.error).fieldErrors;
  const isUsernameValid = !fieldErrors.username;
  const isEmailValid = !fieldErrors.email;
  const isPasswordValid =
    !fieldErrors.password &&
    (validation.success
      ? validation.data.password.length === 0 || validation.data.password.length >= 6
      : password.length === 0 || password.length >= 6);
  const isFormValid = validation.success && isPasswordValid;

  // トースト表示の雛形
  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  const showLogoutToast = () => {
    const message = tCommon("logoutSuccess");
    showToast(message);
  };

  //　input内にセットするユーザの現在の情報を取得
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !data.user) {
        router.replace("/login");
        return;
      }
      const user = data.user;
      const userId = user.id;
      // Google/Apple経由のログインかどうか判定する
      const isExternalProvider = hasAppleOrGoogleProvider(user);
      const preferredProvider = getPreferredExternalAuthProvider(user);

      const { data: profile } = await supabase
        .from("users")
        .select("name,email")
        .eq("id", userId)
        .maybeSingle();

      const authName = (user.user_metadata as { name?: string } | null)?.name ?? "";
      const resolvedName = profile?.name ?? authName;
      const authEmail = user.email ?? profile?.email ?? "";

      // Authが新メールに更新されていてDBが旧メールの場合は同期
      if (profile?.email && authEmail && authEmail !== profile.email) {
        await supabase
          .from("users")
          .update({ email: authEmail, updated_at: new Date().toISOString() })
          .eq("id", userId);
      }

      if (!mounted) return;
      setUsername(resolvedName);
      setEmail(authEmail);
      setInitialEmail(authEmail);
      setIsExternalProviderProfile(isExternalProvider);
      setExternalAuthProvider(preferredProvider);
      setLoading(false);
    };

    load().catch((err) => {
      console.warn("Failed to load profile", err);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // ユーザ情報変更ロジック
  const handleSubmit = async () => {
    setUsernameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);
    setError(null);
    setInfo(null);

    if (isExternalProviderProfile || !isFormValid || submitting) return;
    setSubmitting(true);

    try {
      const { data: userData, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !userData.user) {
        router.replace("/login");
        return;
      }

      const user = userData.user;
      const userId = user.id;
      const parsed = profileSchema.parse({ username, email, password });
      const trimmedEmail = parsed.email;
      const trimmedUsername = parsed.username;
      const parsedPassword = parsed.password;
      const emailChanged = initialEmail && trimmedEmail.toLowerCase() !== initialEmail.toLowerCase();

      //　email変更のロジック
      if (emailChanged) {
        const { count, error: existsError } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("email", trimmedEmail)
          .neq("id", userId);
        if (existsError) {
          setError(t("errorUnknown"));
          return;
        }
        if ((count ?? 0) > 0) {
          setError(t("errorEmailExists"));
          return;
        }
      }

      const redirectTo = buildRedirectUrl("/auth/callback?next=profile-update&email=1");
      const updatePayload: Parameters<typeof supabase.auth.updateUser>[0] = {
        data: { name: trimmedUsername },
      };
      // パスワード変更ロジック、バリデーションで文字数は検証しているためここでは空文字ではないことだけをチェック
      if (parsedPassword.length > 0) {
        updatePayload.password = parsedPassword;
      }
      if (emailChanged) {
        updatePayload.email = trimmedEmail;
      }

      const { error: updateError } = await supabase.auth.updateUser(
        updatePayload,
        emailChanged ? { emailRedirectTo: redirectTo } : undefined,
      );
      if (updateError) {
        console.warn("Failed to update profile", updateError.message);
        setError(t("errorUnknown"));
        return;
      }

      // ユーザ名は即時反映する
      const timestamp = new Date().toISOString();
      await supabase
        .from("users")
        .update({ name: trimmedUsername, ...(emailChanged ? {} : { email: trimmedEmail }), updated_at: timestamp })
        .eq("id", userId);

      if (emailChanged) {
        setInfo(`${t("emailPendingTitle")}\n${t("emailPendingVerificationNotice")}`);
        setEmailChangeRequested(true);
      } else {
        setInfo(`${t("successTitle")}\n${t("successBody")}`);
      }
      setInitialEmail(emailChanged ? initialEmail : trimmedEmail);
      setPassword("");
      showToast(emailChanged ? t("emailPendingTitle") : t("successTitle"));
    } finally {
      setSubmitting(false);
    }
  };

  // アカウント完全削除処理
  const runAccountDeletion = async () => {
    if (deletingAccount) return;
    setError(null);
    setInfo(null);
    setDeletingAccount(true);

    try {
      await deleteCurrentAccount();
      showToast(t("deleteSuccessTitle"));
      router.replace("/");
    } catch (deleteError) {
      console.warn("Failed to delete account", deleteError);
      setError(t("deleteError"));
    } finally {
      setDeletingAccount(false);
    }
  };

  // アカウント削除ボタン押下後の処理(２度のポップアップ警告)
  // 「サブスクは自動解除されない警告」と「undoできない警告」
  const handleDeleteAccount = () => {
    if (deletingAccount || loading || submitting) return;
    setDeleteConfirmModalVisible(true);
  };

  const handleConfirmDeleteWarning = () => {
    setDeleteConfirmModalVisible(false);
    Alert.alert(t("deleteConfirmFinalTitle"), t("deleteConfirmFinalBody"), [
      { text: t("deleteConfirmNo"), style: "cancel" },
      {
        text: t("deleteConfirmYes"),
        style: "destructive",
        onPress: () => {
          runAccountDeletion().catch((deleteError) => {
            console.warn("Unexpected account deletion failure", deleteError);
          });
        },
      },
    ]);
  };

  //  画面に表示するエラーメッセージ1件を決定するロジック
  const errorLabel = useMemo(() => {
    if (error) return error;
    if (!isUsernameValid && usernameTouched) return t("validation.username");
    if (!isEmailValid && emailTouched) return t("validation.email");
    if (!isPasswordValid && passwordTouched) return t("validation.password");
    return null;
  }, [emailTouched, error, isEmailValid, isPasswordValid, isUsernameValid, passwordTouched, t, usernameTouched]);

  // ユーザが使用しているプロバイダー(Apple or Google)に応じて表示文章を変更させる。
  const externalProviderNotice = useMemo(() => {
    if (externalAuthProvider === "apple") return t("externalProviderNoticeApple");
    if (externalAuthProvider === "google") return t("externalProviderNoticeGoogle");
    return t("externalProviderNotice");
  }, [externalAuthProvider, t]);


  // その他のメニュー機能
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
              console.warn("Failed to sign out from profile update", error);
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
    if (key === "profile") {
      router.push("/profile-update");
    }
    if (key === "contact") {
      router.push("/contact");
    }
    if (key === "payment") {
      await navigateToPaymentScreen(router);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Ideal Gap", headerBackTitle: tCommonNav("back") }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={getKeyboardAvoidingBehavior()}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, shadows.card]}>
            <LinearGradient
              colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.title}>{t("title")}</Text>
            <Text style={styles.subtitle}>{t("subtitle")}</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("usernameLabel")}</Text>
              <TextInput
                placeholder={t("usernamePlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, isExternalProviderProfile && styles.inputReadonly]}
                value={username}
                onChangeText={setUsername}
                onBlur={() => setUsernameTouched(true)}
                autoCapitalize="none"
                keyboardAppearance="dark"
                editable={!loading && !isExternalProviderProfile}
              />
            </View>

            {!isExternalProviderProfile && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t("emailLabel")}</Text>
                  <TextInput
                    placeholder={t("emailPlaceholder")}
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => setEmailTouched(true)}
                    autoCapitalize="none"
                    keyboardAppearance="dark"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t("passwordLabel")}</Text>
                  <PasswordField
                    placeholder={t("passwordPlaceholder")}
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    onBlur={() => setPasswordTouched(true)}
                    keyboardAppearance="dark"
                    editable={!loading}
                    showPasswordLabel={t("showPassword")}
                    hidePasswordLabel={t("hidePassword")}
                  />
                </View>
              </>
            )}

            {isExternalProviderProfile && (
              <View style={[styles.alertBox, styles.infoBox]}>
                <Text style={styles.alertText}>{externalProviderNotice}</Text>
              </View>
            )}

            {errorLabel && (
              <View style={[styles.alertBox, styles.errorBox]}>
                <Text style={styles.alertText}>{errorLabel}</Text>
              </View>
            )}

            {info && (
              <View style={[styles.alertBox, styles.infoBox]}>
                <Text style={styles.alertText}>{info}</Text>
              </View>
            )}

            {!isExternalProviderProfile && (
              <Pressable
                accessibilityRole="button"
                onPress={handleSubmit}
                disabled={!isFormValid || submitting || loading || emailChangeRequested}
                style={({ pressed }) => [
                  styles.ctaButton,
                  styles.primaryButton,
                  styles.buttonShadow,
                  Platform.OS === "android" && styles.buttonShadowAndroidFix,
                  (!isFormValid || submitting || loading || emailChangeRequested) && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGlass}
                />
                <Text style={styles.primaryLabel}>{submitting ? t("saving") : t("save")}</Text>
              </Pressable>
            )}

            <View style={[styles.deleteSection, styles.deleteBox]}>
              <Text style={styles.deleteTitle}>{t("deleteSectionTitle")}</Text>
              <Text style={styles.deleteBody}>{t("deleteSectionBody")}</Text>
              <Pressable
                testID="account-delete-button"
                accessibilityRole="button"
                onPress={handleDeleteAccount}
                disabled={deletingAccount || loading || submitting}
                style={({ pressed }) => [
                  styles.ctaButton,
                  styles.deleteButton,
                  isFrench && styles.deleteButtonFrench,
                  Platform.OS === "android" && styles.buttonShadowAndroidFix,
                  (deletingAccount || loading || submitting) && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.deleteButtonLabel}>
                  {deletingAccount ? t("deleting") : t("deleteButton")}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
      <Modal
        visible={deleteConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDeleteConfirmModalVisible(false)}
          testID="profile-delete-confirm-overlay"
        >
          <Pressable
            style={[styles.modalCard, shadows.card]}
            onPress={(event) => event.stopPropagation()}
            testID="profile-delete-confirm-card"
          >
            <Text style={styles.modalTitle}>{t("deleteConfirmTitle")}</Text>
            <Text style={styles.deleteConfirmBodyText}>{t("deleteConfirmBody")}</Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                style={styles.modalSecondaryButton}
                onPress={() => setDeleteConfirmModalVisible(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>{t("deleteConfirmNo")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.modalPrimaryButton}
                onPress={handleConfirmDeleteWarning}
              >
                <Text style={styles.modalPrimaryButtonText}>{t("deleteConfirmYes")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    fontSize: typography.xl,
    fontWeight: "800",
  },
  subtitle: {
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
  inputReadonly: {
    opacity: 0.72,
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
  primaryLabel: {
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
  buttonDisabled: {
    opacity: 0.5,
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
  errorBox: {
    borderColor: "#ff8a8a",
    backgroundColor: "rgba(255,138,138,0.08)",
  },
  infoBox: {
    borderColor: "rgba(56,217,150,0.9)",
    backgroundColor: "rgba(56,217,150,0.12)",
  },
  alertText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  deleteSection: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  deleteBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(242,95,92,0.4)",
    backgroundColor: "rgba(242,95,92,0.08)",
    padding: spacing.md,
  },
  deleteTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  deleteBody: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.45,
  },
  deleteButton: {
    backgroundColor: "rgba(242,95,92,0.14)",
    borderColor: "rgba(242,95,92,0.75)",
  },
  deleteButtonFrench: {
    paddingHorizontal: spacing.lg,
  },
  deleteButtonLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7,10,18,0.72)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  deleteConfirmBodyText: {
    color: colors.error,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  modalSecondaryButton: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  modalSecondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  modalPrimaryButton: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(242,95,92,0.7)",
    backgroundColor: colors.warning,
  },
  modalPrimaryButtonText: {
    color: colors.background,
    fontSize: typography.md,
    fontWeight: "800",
  },
});
