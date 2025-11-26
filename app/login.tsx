import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { loginTranslations } from "../content/loginTranslations";
import { LanguageKey } from "../types/i18n";

export default function Login() {
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>("ja");
  const translations = loginTranslations[selectedLanguage] ?? loginTranslations.ja;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>{translations.pageLabel}</Text>
          <Link href="/" style={styles.link}>
            {translations.backToHome}
          </Link>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>{translations.welcomeTitle}</Text>
          <Text style={styles.body}>{translations.welcomeBody}</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{translations.emailLabel}</Text>
            <TextInput
              placeholder={translations.emailPlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              keyboardAppearance="dark"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{translations.passwordLabel}</Text>
            <TextInput
              placeholder={translations.passwordPlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              secureTextEntry
              keyboardAppearance="dark"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaButton,
              styles.primaryButton,
              styles.buttonShadow,
              pressed && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGlass}
            />
            <Text style={styles.primaryLabel}>{translations.loginCta}</Text>
          </Pressable>

          <Pressable accessibilityRole="button" style={styles.subtleButton}>
            <Text style={styles.subtleLabel}>{translations.forgotPassword}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardHeading}>{translations.firstTimeHeading}</Text>
          <Text style={styles.body}>{translations.firstTimeBody}</Text>
          <Link href="/signup" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.ctaButton,
                styles.secondaryButton,
                styles.buttonShadow,
                pressed && styles.buttonPressed,
              ]}
            >
              <LinearGradient
              colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGlass}
            />
              <Text style={styles.secondaryLabel}>{translations.signupCta}</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
      <Footer isAuthenticated={false} onLanguagePress={() => setLanguageSheetVisible(true)} />
      <LanguageSheet
        visible={languageSheetVisible}
        selectedLanguage={selectedLanguage}
        onClose={() => setLanguageSheetVisible(false)}
        onSelect={(lang) => {
          setSelectedLanguage(lang);
        }}
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
  ctaButton: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl * 1.35,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    gap: spacing.sm,
    position: "relative",
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
  subtleButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  subtleLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
});
