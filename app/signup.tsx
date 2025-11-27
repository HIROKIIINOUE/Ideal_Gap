import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

export default function Signup() {
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const { t } = useTranslation("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [paymentSet, setPaymentSet] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const isUsernameValid = username.trim().length > 0;
  const isEmailValid = useMemo(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), [email]);
  const isPasswordValid = password.length >= 6;
  const isFormValid = isUsernameValid && isEmailValid && isPasswordValid && paymentSet;

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
          <Text style={styles.body}>{t("heroBody")}</Text>

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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t("paymentLabel")}</Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.placeholderButton,
                paymentSet && styles.placeholderActive,
                pressed && styles.placeholderPressed,
              ]}
              onPress={() => setPaymentSet((prev) => !prev)}
            >
              <Text style={styles.placeholderText}>
                {paymentSet ? t("paymentStatusSet") : t("paymentStatusUnset")}
              </Text>
              <Text style={styles.placeholderSub}>
                {paymentSet ? t("paymentToggleUnset") : t("paymentToggleSet")}
              </Text>
            </Pressable>
            <Text style={styles.helperText}>{t("paymentHelper")}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaButton,
              styles.primaryButton,
              styles.buttonShadow,
              !isFormValid && styles.buttonDisabled,
              pressed && isFormValid && styles.buttonPressed,
            ]}
            disabled={!isFormValid}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGlass}
            />
            <Text style={styles.primaryLabel}>{t("primaryCta")}</Text>
          </Pressable>

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
      <Footer isAuthenticated={false} onLanguagePress={() => setLanguageSheetVisible(true)} />
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
  errorText: {
    color: "#ff8a8a",
    fontSize: typography.sm,
    marginTop: spacing.xs / 2,
  },
  placeholderButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  placeholderSub: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: spacing.xs / 2,
  },
  placeholderActive: {
    borderColor: colors.accentPrimary,
  },
  placeholderPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
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
