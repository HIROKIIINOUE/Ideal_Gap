import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Href, Link, router } from "expo-router";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { LandingSections } from "../content/landingTranslations";
import { supabase } from "../lib/supabaseClient";

type GradientPair = readonly [string, string];

const CTA_PRIMARY_GRADIENT: GradientPair = ["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"];
const CTA_SECONDARY_GRADIENT: GradientPair = ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)"];
const CTA_SECONDARY_ALT_GRADIENT: GradientPair = ["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"];

const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.cardShell, style]}>
    <View style={styles.card}>
      <LinearGradient
        colors={["rgba(24, 25, 28, 0.18)", "rgba(15,28,47,0.8)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  </View>
);

type CTAButtonProps = {
  href: Href;
  label: string;
  gradient: GradientPair;
  shimmerStyle: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  onPress?: () => void | Promise<void>;
};

const CTAButton = ({ href, label, gradient, shimmerStyle, onPress }: CTAButtonProps) => {
  const content = (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.buttonPressed]}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonInner}>
        <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} pointerEvents="none">
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmerFill}
          />
        </Animated.View>
        <Text style={styles.primaryLabel}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );

  if (onPress) return content;
  return <Link href={href} asChild>{content}</Link>;
};

type CTAButtonsRowProps = {
  shimmerStyle: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  primary: { href: Href; label: string; gradient?: GradientPair };
  secondary: { href: Href; label: string; gradient?: GradientPair };
  onPrimaryPress?: () => void | Promise<void>;
};

const CTAButtonsRow = ({ shimmerStyle, primary, secondary, onPrimaryPress }: CTAButtonsRowProps) => (
  <View style={styles.actions}>
    <CTAButton
      href={primary.href}
      label={primary.label}
      gradient={primary.gradient ?? CTA_PRIMARY_GRADIENT}
      shimmerStyle={shimmerStyle}
      onPress={onPrimaryPress}
    />
    <CTAButton
      href={secondary.href}
      label={secondary.label}
      gradient={secondary.gradient ?? CTA_SECONDARY_GRADIENT}
      shimmerStyle={shimmerStyle}
    />
  </View>
);

export default function Index() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const { t } = useTranslation("landing");

  const translations: LandingSections = useMemo(
    () => ({
      hero: t("hero", { returnObjects: true }) as LandingSections["hero"],
      overview: t("overview", { returnObjects: true }) as LandingSections["overview"],
      membership: t("membership", { returnObjects: true }) as LandingSections["membership"],
      getStarted: t("getStarted", { returnObjects: true }) as LandingSections["getStarted"],
    }),
    [t],
  );

  // ヒーロー画面CTAボタンの光沢アニメーション
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const shimmerRan = useRef(false);
  const shimmerStyle = useMemo(
    () => ({
      transform: [
        {
          translateX: shimmerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-220, 220],
          }),
        },
      ],
    }),
    [shimmerAnim],
  );

  // 最下部CTA向けの光沢アニメーション
  const bottomShimmerAnim = useRef(new Animated.Value(0)).current;
  const bottomShimmerRan = useRef(false);
  const bottomShimmerStyle = useMemo(
    () => ({
      transform: [
        {
          translateX: bottomShimmerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-220, 220],
          }),
        },
      ],
    }),
    [bottomShimmerAnim],
  );

  const handleStartSignup = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("failed to sign out before signup", error);
    }
    router.push("/signup");
  }, []);

  // スクロールで指定地点到達時1秒後にCTAボタンの光沢を1度だけ発火
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (bottomShimmerRan.current) {
        return;
      }
      const y = event.nativeEvent.contentOffset.y;
      const reachedFadeZone = y >= 1080;  //ここで下部CTAアニメーション発火地点をコントロール
      if (reachedFadeZone) {
        bottomShimmerRan.current = true;
        bottomShimmerAnim.setValue(0);
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(bottomShimmerAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
    [bottomShimmerAnim],
  );

  // ヒーロー直下のスクロールインジケーター
  const scrollHintAnim = useRef(new Animated.Value(0)).current;
  const scrollHintStyle = useMemo(
    () => ({
      transform: [
        {
          translateY: scrollHintAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 8],
          }),
        },
      ],
      opacity: scrollHintAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.7, 1],
      }),
    }),
    [scrollHintAnim],
  );
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scrollHintAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scrollHintAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [scrollHintAnim]);

  // ヒーロー画面のフェードイン
  const heroAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 800,  //ヒーロー画面とそのCTAボタン設定
      delay: 320,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !shimmerRan.current) {
        shimmerRan.current = true;
        shimmerAnim.setValue(0);
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [heroAnim, shimmerAnim]);

  // スクロール時のカードフェードイン
  const fadeUp = (inputStart: number, inputEnd: number) => ({
    opacity: scrollY.interpolate({
      inputRange: [inputStart, inputEnd],
      outputRange: [0, 1],
      extrapolate: "clamp",
    }),
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [inputStart, inputEnd],
          outputRange: [28, 0],
          extrapolate: "clamp",
        }),
      },
    ],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: handleScroll,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.heroShell,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroCard}>
            <LinearGradient
              colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.logo}>{translations.hero.logo}</Text>
            <Text style={styles.title}>{translations.hero.title}</Text>
            <Text style={styles.subtitle}>{translations.hero.subtitle}</Text>
            <CTAButtonsRow
              shimmerStyle={shimmerStyle}
              primary={{
                href: "/signup",
                label: translations.hero.ctaPrimary,
                gradient: CTA_PRIMARY_GRADIENT,
              }}
              onPrimaryPress={handleStartSignup}
              secondary={{ href: "/login", label: translations.hero.ctaSecondary, gradient: CTA_SECONDARY_GRADIENT }}
            />
          </View>
          <View style={styles.scrollHint} pointerEvents="none">
            <Animated.View style={[styles.scrollHintIcon, scrollHintStyle]}>
              <MaterialCommunityIcons name="chevron-down" size={22} color="rgba(255,255,255,0.8)" />
            </Animated.View>
            <Text style={styles.scrollHintText}>{translations.hero.scrollHint}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.section, fadeUp(60, 220)]}>
          <Text style={styles.sectionLabel}>{translations.overview.label}</Text>
          <Text style={styles.sectionTitle}>{translations.overview.title}</Text>
          <Card>
            <Text style={styles.cardHeading}>{translations.overview.overviewCardTitle}</Text>
            <Text style={styles.cardBody}>{translations.overview.description}</Text>
            <View style={styles.bulletList}>
              {translations.overview.highlights.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View style={[styles.section, fadeUp(440, 600)]}>
          <Text style={styles.sectionLabel}>{translations.membership.label}</Text>
          <Text style={styles.sectionTitle}>{translations.membership.title}</Text>
          <View style={styles.cardRow}>
            <Card style={styles.planCard}>
              <Text style={styles.planPrice}>{translations.membership.price}</Text>
              <Text style={styles.planPeriod}>{translations.membership.period}</Text>
              <Text style={styles.cardBody}>{translations.membership.description}</Text>
              <View style={styles.bulletList}>
                {translations.membership.bulletPoints.map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <View style={styles.bulletDotAccent} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        </Animated.View>

        <Animated.View style={[styles.section, fadeUp(820, 980)]}>
          <Text style={styles.sectionLabel}>{translations.getStarted.label}</Text>
          <Text style={styles.sectionTitle}>{translations.getStarted.title}</Text>
          <Card>
            <Text style={styles.cardBody}>{translations.getStarted.description}</Text>
            <CTAButtonsRow
              shimmerStyle={bottomShimmerStyle}
              primary={{
                href: "/signup",
                label: translations.getStarted.ctaPrimary,
                gradient: CTA_PRIMARY_GRADIENT,
              }}
              onPrimaryPress={handleStartSignup}
              secondary={{
                href: "/login",
                label: translations.getStarted.ctaSecondary,
                gradient: CTA_SECONDARY_ALT_GRADIENT,
              }}
            />
          </Card>
        </Animated.View>
      </Animated.ScrollView>
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
  heroShell: {
    borderRadius: radius.xl,
    ...shadows.card,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    overflow: "hidden",
  },
  logo: {
    fontSize: typography.sm,
    color: colors.accentSubtle,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: typography.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: typography.xl * 1.2,
  },
  subtitle: {
    fontSize: typography.md,
    color: colors.textSecondary,
    lineHeight: typography.md * 1.5,
    marginVertical: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "nowrap",
    alignItems: "stretch",
    width: "100%",
    justifyContent: "space-between",
  },
  buttonShell: {
    borderRadius: radius.lg,
    overflow: "hidden",
    flex: 1,
    minWidth: 0,
  },

  buttonInner: {
    width: "100%",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)", // primary の場合
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
  buttonPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    left: -80,
    right: -80,
    opacity: 0.85,
  },
  shimmerFill: {
    flex: 1,
    borderRadius: radius.lg,
  },
  cardGradient: {
    borderRadius: radius.lg,
    opacity: 0.6,
  },
  heroGradient: {
    borderRadius: radius.xl,
    opacity: 0.75,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.18)",
    gap: spacing.md,
    overflow: "hidden",
  },
  cardShell: {
    borderRadius: radius.lg,
    ...shadows.card,
  },
  cardRow: {
    flexDirection: "column",
    gap: spacing.md,
  },
  cardHeading: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.divider,
    marginTop: spacing.xs / 2,
  },
  bulletDotAccent: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentPrimary,
    marginTop: spacing.xs / 2,
  },
  bulletText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    flex: 1,
    lineHeight: typography.md * 1.4,
  },
  planCard: {
    flex: 1,
  },
  planPrice: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
  },
  planPeriod: {
    color: colors.textSecondary,
    fontSize: typography.md,
    marginBottom: spacing.sm,
  },
  scrollHint: {
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  scrollHintIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollHintText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    letterSpacing: 0.4,
    marginTop: spacing.md,
  },
});
