import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import MoreSheet from "../components/MoreSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { supabase } from "../lib/supabaseClient";
import { useFunPlan } from "../providers/FunPlanProvider";

const categoryKeys = ["bug", "feature", "feedback", "other"] as const;
type CategoryKey = (typeof categoryKeys)[number];

const contactSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().check(z.email()),
  category: z.enum(categoryKeys),
  message: z.string().trim().min(6),
});

export default function Contact() {
  const { t } = useTranslation("contact");
  const { t: tCommon } = useTranslation("common", { keyPrefix: "moreSheet" });
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [message, setMessage] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitted">("idle");
  const { funPlanVisible, toggleFunPlan } = useFunPlan();

  const categoryOptions = useMemo(
    () =>
      categoryKeys.map((key) => ({
        key,
        label: t(`categories.${key}`),
      })),
    [t],
  );

  const validation = useMemo(
    () => contactSchema.safeParse({ name, email, category, message }),
    [name, email, category, message],
  );
  const isValid = validation.success;

  const handleSubmit = () => {
    if (!validation.success) return;
    setStatus("submitted");
    setCategoryOpen(false);
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
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadows.card]}>
          <LinearGradient
            colors={["rgba(77,125,255,0.14)", "rgba(12,18,32,0.94)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{t("pageTitle")}</Text>
            <Text style={styles.subtitle}>{t("intro")}</Text>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeLabel}>{t("demoNotice")}</Text>
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
            />
          </View>

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
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t("fields.categoryLabel")}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={category ? t(`categories.${category}`) : t("fields.categoryPlaceholder")}
              onPress={() => setCategoryOpen((prev) => !prev)}
              style={({ pressed }) => [styles.selectButton, pressed && styles.pressed]}
            >
              <Text style={styles.selectLabel}>
                {category ? t(`categories.${category}`) : t("fields.categoryPlaceholder")}
              </Text>
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
                    }}
                    style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.optionLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
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
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("submit.label")}
            disabled={!isValid}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              (!isValid || pressed) && styles.pressed,
              !isValid && styles.submitDisabled,
            ]}
          >
            <Text style={styles.submitLabel}>{t("submit.label")}</Text>
          </Pressable>

          {status === "submitted" && (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>{t("submit.successTitle")}</Text>
              <Text style={styles.successBody}>{t("submit.successBody")}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: spacing.xl * 2,
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
  selectButton: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
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
  optionList: {
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  optionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
    borderColor: colors.divider,
    backgroundColor: "rgba(60, 195, 140, 0.12)",
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
});
