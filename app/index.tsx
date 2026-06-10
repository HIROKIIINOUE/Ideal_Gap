// ランディングページ

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Href, Link, Stack, router } from "expo-router";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { LandingSections } from "../content/landingTranslations";
import { useRedirectAuthenticated } from "../hooks/useRedirectAuthenticated";
import { signOutCurrentSession } from "../lib/logout";
import { getStoreName } from "../lib/subscriptionLegal";
import {
  LANDING_SECTION_REVEAL_OFFSET,
  shouldRevealLandingSection,
} from "../lib/ui/landingReveal";
import { shouldUseAndroidJapaneseTypography } from "../lib/ui/platform";
import { isCompactScreen } from "../lib/ui/responsive";

type GradientPair = readonly [string, string];
type LandingSectionKey = "overview" | "membership" | "getStarted";

const LANDING_SECTIONS: LandingSectionKey[] = ["overview", "membership", "getStarted"];
// フェードインにかかる長さ
const SECTION_REVEAL_DURATION = 2400;
// フェードインの開始地点(数値が上がれば、より下から競り上がる)
const SECTION_REVEAL_TRANSLATE_Y = 80;
// 光沢が通過する秒数の長さ
const CTA_SHIMMER_DURATION = Platform.OS === "android" ? 1650 : 1200;

const getRevealStyle = (animation: Animated.Value) => ({
  opacity: animation,
  transform: [
    // inputRangeで「animationが0→1(開始から完了)に変化する時」を指定し、
    // outputRangeで「Y軸をSECTION_REVEAL_TRANSLATE_Yから0に変化させる」を指定する
    {
      translateY: animation.interpolate({
        inputRange: [0, 1],
        outputRange: [SECTION_REVEAL_TRANSLATE_Y, 0],
      }),
    },
  ],
});

// 光沢が左から右に流れる始点(-220)と終点(220)を設定
const CTA_SHIMMER_TRANSLATE_X_RANGE = [-220, 220] as const;
const getShimmerStyle = (animation: Animated.Value): Animated.WithAnimatedValue<StyleProp<ViewStyle>> => ({
  opacity:
    Platform.OS === "android"
      ? animation.interpolate({
        inputRange: [0, 0.15, 0.85, 1],
        outputRange: [0, 0.85, 0.85, 0],
      })
      : 0.85,
  transform: [
    {
      // inputRangeで「animationが0→1(開始から完了)に変化する時」を指定し、
      // outputRangeで「Y軸をSECTION_REVEAL_TRANSLATE_Yから0に変化させる」を指定する
      translateX: animation.interpolate({
        inputRange: [0, 1],
        outputRange: [...CTA_SHIMMER_TRANSLATE_X_RANGE],
      }),
    },
  ],
});

const CTA_PRIMARY_GRADIENT: GradientPair = ["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"];
const CTA_SECONDARY_GRADIENT: GradientPair = ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)"];
const CTA_SECONDARY_ALT_GRADIENT: GradientPair = ["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"];

const Card = ({
  children,
  shellStyle,
  contentStyle,
}: {
  children: ReactNode;
  shellStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.cardShell, shellStyle]}>
    <View style={[styles.card, contentStyle]}>
      <LinearGradient
        colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
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
  compact?: boolean;
  isFrench?: boolean;
  isAndroidJapanese?: boolean;
  onPress?: () => void | Promise<void>;
};

const CTAButton = ({
  href,
  label,
  gradient,
  shimmerStyle,
  compact = false,
  isFrench = false,
  isAndroidJapanese = false,
  onPress,
}: CTAButtonProps) => {
  const shimmerNode =
    Platform.OS === "android" ? (
      <View style={styles.shimmerMaskAndroid} pointerEvents="none" testID="landing-cta-shimmer-mask">
        <Animated.View style={[styles.shimmerOverlayAndroid, shimmerStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmerFill}
          />
        </Animated.View>
      </View>
    ) : (
      <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} pointerEvents="none">
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerFill}
        />
      </Animated.View>
    );

  const content = (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.buttonShell, pressed && styles.buttonPressed]}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonInner}>
        {shimmerNode}
        <Text
          style={[
            styles.primaryLabel,
            isFrench ? styles.primaryLabelFr : styles.primaryLabelJaEn,
            compact && (isFrench ? styles.primaryLabelCompactFr : styles.primaryLabelCompactJaEn),
            isAndroidJapanese && styles.primaryLabelAndroidJa,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
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
  compact?: boolean;
  isFrench?: boolean;
  isAndroidJapanese?: boolean;
  onPrimaryPress?: () => void | Promise<void>;
};

const CTAButtonsRow = ({
  shimmerStyle,
  primary,
  secondary,
  compact = false,
  isFrench = false,
  isAndroidJapanese = false,
  onPrimaryPress,
}: CTAButtonsRowProps) => (
  <View style={styles.actions}>
    <View style={styles.ctaSlot}>
      <CTAButton
        href={primary.href}
        label={primary.label}
        gradient={primary.gradient ?? CTA_PRIMARY_GRADIENT}
        shimmerStyle={shimmerStyle}
        compact={compact}
        isFrench={isFrench}
        isAndroidJapanese={isAndroidJapanese}
        onPress={onPrimaryPress}
      />
    </View>
    <View style={styles.ctaSlot}>
      <CTAButton
        href={secondary.href}
        label={secondary.label}
        gradient={secondary.gradient ?? CTA_SECONDARY_GRADIENT}
        shimmerStyle={shimmerStyle}
        compact={compact}
        isFrench={isFrench}
        isAndroidJapanese={isAndroidJapanese}
      />
    </View>
  </View>
);

export default function Index() {
  useRedirectAuthenticated(); // ログインユーザをダッシュボードへ強制遷移
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const { t, i18n } = useTranslation("landing");
  // ユーザ端末からアプリの表示領域(width)、OSの文字サイズ設定(fontScale)を取得する
  const { width, height, fontScale } = useWindowDimensions();
  const compact = isCompactScreen(width, fontScale);
  const storeName = useMemo(() => getStoreName(Platform.OS), []);
  // i18n より現在の設定言語を取得
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isFrench = currentLanguage.startsWith("fr");
  const isAndroidJapanese = shouldUseAndroidJapaneseTypography(currentLanguage);
  // iPad用UI構築のための定数群
  const isIpad = Platform.OS === "ios" && Platform.isPad === true;
  const sectionRevealOffset = isIpad
    ? LANDING_SECTION_REVEAL_OFFSET + spacing.lg
    : LANDING_SECTION_REVEAL_OFFSET;

  const translations: LandingSections = useMemo(
    () => ({
      hero: t("hero", { returnObjects: true }) as LandingSections["hero"],
      overview: t("overview", { returnObjects: true }) as LandingSections["overview"],
      membership: t("membership", {
        returnObjects: true,
        storeName,
      }) as LandingSections["membership"],
      getStarted: t("getStarted", { returnObjects: true }) as LandingSections["getStarted"],
    }),
    [storeName, t],
  );

  // ヒーロー画面CTAボタンの光沢アニメーション【Animated from ReactNative】
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const shimmerRan = useRef(false);
  const shimmerStyle = useMemo(() => getShimmerStyle(shimmerAnim), [shimmerAnim]);

  const bottomShimmerAnim = useRef(new Animated.Value(0)).current;
  const bottomShimmerRan = useRef(false);
  const overviewAnim = useRef(new Animated.Value(0)).current;
  const membershipAnim = useRef(new Animated.Value(0)).current;
  const getStartedAnim = useRef(new Animated.Value(0)).current;
  const sectionAnimations = useMemo(
    () => ({
      overview: overviewAnim,
      membership: membershipAnim,
      getStarted: getStartedAnim,
    }),
    [getStartedAnim, membershipAnim, overviewAnim],
  );
  const sectionPositionsRef = useRef<Record<LandingSectionKey, number | null>>({
    overview: null,
    membership: null,
    getStarted: null,
  });
  const revealedSectionsRef = useRef<Record<LandingSectionKey, boolean>>({
    overview: false,
    membership: false,
    getStarted: false,
  });
  const scrollMetricsRef = useRef({
    scrollOffsetY: 0,
    viewportHeight: height,
    contentHeight: 0,
  });
  const bottomShimmerStyle = useMemo(() => getShimmerStyle(bottomShimmerAnim), [bottomShimmerAnim]);

  // サインアップボタン押下時の処理
  const handleStartSignup = useCallback(async () => {
    try {
      await signOutCurrentSession();
    } catch (error) {
      console.warn("failed to sign out before signup", error);
    }
    router.push("/signup");
  }, []);

  // 最下部CTA向けの光沢アニメーション
  // フェードイン視点にたどり着いたら光沢発生
  const startBottomShimmer = useCallback(() => {
    if (bottomShimmerRan.current) {
      return;
    }
    bottomShimmerRan.current = true;
    bottomShimmerAnim.setValue(0);
    Animated.sequence([
      Animated.delay(1000),  // フェードイン後光沢までの時間差
      Animated.timing(bottomShimmerAnim, {
        toValue: 1,
        duration: CTA_SHIMMER_DURATION,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [bottomShimmerAnim]);

  // フェードイン開始地点で発火
  const revealSection = useCallback(
    (section: LandingSectionKey) => {
      // 一度発火したらそれ以上は発火させない制御をuseRefで実現
      if (revealedSectionsRef.current[section]) {
        return;
      }
      revealedSectionsRef.current[section] = true;

      // 指定のAnimateValueをsectionAnimationsオブジェクトから選択し、
      // 「toValueの値を0から1に変換」が実行されそれに応じてgetRevealStyleがデザイン(アニメーション)を作る
      Animated.timing(sectionAnimations[section], {
        toValue: 1,  // 値を0(アニメーション開始)から1(アニメーション完了)へ変更
        duration: SECTION_REVEAL_DURATION, // アニメーションのduration
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      // もし最下部のログインカードが対象ならCTAボタンを光沢させる
      if (section === "getStarted") {
        startBottomShimmer();
      }
    },
    [sectionAnimations, startBottomShimmer],
  );


  // tryRevealVisibleSectionsからmap展開された各３つのカードそれぞれの上端(sectionTop)と各スクロール値を
  // shouldRevealLandingSection()に投げて、フェードインしていいかどうかを判断、よければrevealSection発火
  const tryRevealSection = useCallback(
    (section: LandingSectionKey) => {
      const sectionTop = sectionPositionsRef.current[section];
      if (
        shouldRevealLandingSection({
          sectionTop,
          scrollOffsetY: scrollMetricsRef.current.scrollOffsetY,
          viewportHeight: scrollMetricsRef.current.viewportHeight,
          preloadOffset: sectionRevealOffset,
        })
      ) {
        revealSection(section);
      }
    },
    [revealSection, sectionRevealOffset],
  );

  // ３つのカードをそれぞれフェードインアニメーション発火条件としてmap展開
  const tryRevealVisibleSections = useCallback(() => {
    LANDING_SECTIONS.forEach((section) => {
      tryRevealSection(section);
    });
  }, [tryRevealSection]);

  // ここでスクロール距離を測定(スクロールするたびに発火)
  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        layoutMeasurement: { height: number };
        contentSize: { height: number };
      };
    }) => {
      // 現在どれだけスクロールしたか
      const { y } = event.nativeEvent.contentOffset;
      // 今見えている画面の高さ(分割代入のリネーム)
      const { height: viewportHeight } = event.nativeEvent.layoutMeasurement;
      // スクロール全体の高さ(分割代入のリネーム)
      const { height: contentHeight } = event.nativeEvent.contentSize;
      scrollMetricsRef.current = {
        scrollOffsetY: y,
        viewportHeight,
        contentHeight,
      };
      tryRevealVisibleSections();

      // スクリーンの最下部まで辿り着いたらログインカードフェードインを無条件で発火させる(保険)
      const reachedBottom = y + viewportHeight >= contentHeight - 24;
      if (reachedBottom) {
        revealSection("getStarted");
      }
    },
    [revealSection, tryRevealVisibleSections],
  );

  // 各カードセクションが ScrollView の中で縦にどの位置にあるかを
  // ReactNativeイベントのevent.nativeEvent.layout.yで計測しuseRefで保存
  // 各フェードインの判定に使用する。
  // レンダー時や画面の高さ変更時(縦画面から横画面への切り替え等)で発火する
  const handleSectionLayout = useCallback(
    (section: LandingSectionKey) => (event: LayoutChangeEvent) => {
      sectionPositionsRef.current[section] = event.nativeEvent.layout.y;
      tryRevealSection(section);
    },
    [tryRevealSection],
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
      ...(Platform.OS === "android"
        ? null
        : {
            opacity: scrollHintAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.7, 1],
            }),
          }),
    }),
    [scrollHintAnim],
  );
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scrollHintAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scrollHintAnim, {
          toValue: 0,
          duration: 400,
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
      duration: 800,
      delay: 320,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !shimmerRan.current) {
        shimmerRan.current = true;
        shimmerAnim.setValue(0);
        //　ヒーロー画面のCTAボタン光沢アニメーション発火
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: CTA_SHIMMER_DURATION,  // 光沢(光が左から右へ)が流れるduration
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [heroAnim, shimmerAnim]);


  // ユーザ端末のスクリーンの高さを初期化、
  useEffect(() => {
    scrollMetricsRef.current.viewportHeight = height;
    tryRevealVisibleSections();  // 画面スクリーン(縦から横へ)等の時に必要。
  }, [height, tryRevealVisibleSections]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Ideal Gap",
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.heroShell,
            Platform.OS === "android" && styles.heroShellAndroid,
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
          <View style={[styles.heroCard, compact && styles.heroCardCompact]}>
            <LinearGradient
              colors={["rgba(30,94,255,0.25)", "rgba(15,28,47,0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.logo, compact && styles.logoCompact]}>{translations.hero.logo}</Text>
            <Text
              style={[
                styles.title,
                isFrench ? styles.titleFr : styles.titleJaEn,
                compact && (isFrench ? styles.titleCompactFr : styles.titleCompactJaEn),
                isAndroidJapanese && styles.titleAndroidJa,
              ]}
            >
              {translations.hero.title}
            </Text>
            <Text
              style={[
                styles.subtitle,
                isFrench ? styles.subtitleFr : styles.subtitleJaEn,
                compact && (isFrench ? styles.subtitleCompactFr : styles.subtitleCompactJaEn),
              ]}
            >
              {translations.hero.subtitle}
            </Text>
            <CTAButtonsRow
              shimmerStyle={shimmerStyle}
              compact={compact}
              isFrench={isFrench}
              isAndroidJapanese={isAndroidJapanese}
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
            <Animated.View
              style={[
                styles.scrollHintIcon,
                Platform.OS === "android" && styles.scrollHintIconAndroid,
                scrollHintStyle,
              ]}
            >
              <MaterialCommunityIcons name="chevron-down" size={22} color="rgba(255,255,255,0.8)" />
            </Animated.View>
            <Text
              style={[
                styles.scrollHintText,
                compact && styles.scrollHintTextCompact,
                isFrench && styles.scrollHintTextFr,
              ]}
            >
              {translations.hero.scrollHint}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.section, getRevealStyle(overviewAnim)]}
          onLayout={handleSectionLayout("overview")}
        >
          <Text
            style={[
              styles.sectionLabel,
              compact && styles.sectionLabelCompact,
              isFrench && styles.sectionLabelFr,
            ]}
          >
            {translations.overview.label}
          </Text>
          <Text
            style={[
              styles.sectionTitle,
              isFrench ? styles.sectionTitleFr : styles.sectionTitleJaEn,
              compact && (isFrench ? styles.sectionTitleCompactFr : styles.sectionTitleCompactJaEn),
              isAndroidJapanese && styles.sectionTitleAndroidJa,
            ]}
          >
            {translations.overview.title}
          </Text>
          <Card contentStyle={compact ? styles.cardCompact : undefined}>
            <Text
              style={[
                styles.cardHeading,
                isFrench ? styles.cardHeadingFr : styles.cardHeadingJaEn,
                compact && (isFrench ? styles.cardHeadingCompactFr : styles.cardHeadingCompactJaEn),
                isAndroidJapanese && styles.cardHeadingAndroidJa,
              ]}
            >
              {translations.overview.overviewCardTitle}
            </Text>
            <Text
              style={[
                styles.cardBody,
                isFrench ? styles.cardBodyFr : styles.cardBodyJaEn,
                compact && (isFrench ? styles.cardBodyCompactFr : styles.cardBodyCompactJaEn),
                isAndroidJapanese && styles.cardBodyAndroidJa,
              ]}
            >
              {translations.overview.description}
            </Text>
            <View style={styles.bulletList}>
              {translations.overview.highlights.map((item, index) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={styles.bulletMarker} testID={`landing-overview-bullet-marker-${index}`}>
                    <View style={styles.bulletDot} testID={`landing-overview-bullet-${index}`} />
                  </View>
                  <Text
                    style={[
                      styles.bulletText,
                      isFrench ? styles.bulletTextFr : styles.bulletTextJaEn,
                      compact && (isFrench ? styles.bulletTextCompactFr : styles.bulletTextCompactJaEn),
                      isAndroidJapanese && styles.bulletTextAndroidJa,
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View
          style={[styles.section, getRevealStyle(membershipAnim)]}
          onLayout={handleSectionLayout("membership")}
        >
          <Text
            style={[
              styles.sectionLabel,
              compact && styles.sectionLabelCompact,
              isFrench && styles.sectionLabelFr,
            ]}
          >
            {translations.membership.label}
          </Text>
          <Text
            style={[
              styles.sectionTitle,
              isFrench ? styles.sectionTitleFr : styles.sectionTitleJaEn,
              compact && (isFrench ? styles.sectionTitleCompactFr : styles.sectionTitleCompactJaEn),
              isAndroidJapanese && styles.sectionTitleAndroidJa,
            ]}
          >
            {translations.membership.title}
          </Text>
          <View style={styles.cardRow}>
            <Card shellStyle={styles.planCard} contentStyle={compact ? styles.cardCompact : undefined}>
              <View style={styles.planPriceRow}>
                <Text
                  style={[
                    styles.planPrice,
                    isFrench ? styles.planPriceFr : styles.planPriceJaEn,
                    compact && (isFrench ? styles.planPriceCompactFr : styles.planPriceCompactJaEn),
                    isAndroidJapanese && styles.planPriceAndroidJa,
                  ]}
                >
                  {translations.membership.price}
                  {translations.membership.period}
                </Text>
              </View>
              <Text
                style={[
                  styles.planTrialBadge,
                  isFrench ? styles.planTrialBadgeFr : styles.planTrialBadgeJaEn,
                  compact && (isFrench ? styles.planTrialBadgeCompactFr : styles.planTrialBadgeCompactJaEn),
                  isAndroidJapanese && styles.planTrialBadgeAndroidJa,
                ]}
              >
                {translations.membership.trialBadge}
              </Text>
              <Text
                style={[
                  styles.cardBody,
                  isFrench ? styles.cardBodyFr : styles.cardBodyJaEn,
                  compact && (isFrench ? styles.cardBodyCompactFr : styles.cardBodyCompactJaEn),
                  isAndroidJapanese && styles.cardBodyAndroidJa,
                ]}
              >
                {translations.membership.description}
              </Text>
              <View style={styles.bulletList}>
                {translations.membership.bulletPoints.map((item, index) => (
                  <View key={item} style={styles.bulletRow}>
                    <View style={styles.bulletMarker} testID={`landing-membership-bullet-marker-${index}`}>
                      <View style={styles.bulletDot} testID={`landing-membership-bullet-${index}`} />
                    </View>
                    <Text
                      style={[
                        styles.bulletText,
                        isFrench ? styles.bulletTextFr : styles.bulletTextJaEn,
                        compact && (isFrench ? styles.bulletTextCompactFr : styles.bulletTextCompactJaEn),
                        isAndroidJapanese && styles.bulletTextAndroidJa,
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.section, getRevealStyle(getStartedAnim)]}
          onLayout={handleSectionLayout("getStarted")}
        >
          <Text
            style={[
              styles.sectionLabel,
              compact && styles.sectionLabelCompact,
              isFrench && styles.sectionLabelFr,
            ]}
          >
            {translations.getStarted.label}
          </Text>
          <Text
            style={[
              styles.sectionTitle,
              isFrench ? styles.sectionTitleFr : styles.sectionTitleJaEn,
              compact && (isFrench ? styles.sectionTitleCompactFr : styles.sectionTitleCompactJaEn),
              isAndroidJapanese && styles.sectionTitleAndroidJa,
            ]}
          >
            {translations.getStarted.title}
          </Text>
          <Card contentStyle={compact ? styles.cardCompact : undefined}>
            <Text
              style={[
                styles.cardBody,
                isFrench ? styles.cardBodyFr : styles.cardBodyJaEn,
                compact && (isFrench ? styles.cardBodyCompactFr : styles.cardBodyCompactJaEn),
                isAndroidJapanese && styles.cardBodyAndroidJa,
              ]}
            >
              {translations.getStarted.description}
            </Text>
            <CTAButtonsRow
              shimmerStyle={bottomShimmerStyle}
              compact={compact}
              isFrench={isFrench}
              isAndroidJapanese={isAndroidJapanese}
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
    backgroundColor: colors.surface,
  },
  heroShell: {
    borderRadius: radius.xl,
    ...shadows.card,
  },
  heroShellAndroid: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 3,
    gap: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  contentCompact: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
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
  heroCardCompact: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  logo: {
    fontSize: typography.sm,
    color: colors.accentSubtle,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  logoCompact: {
    fontSize: typography.sm * 0.92,
  },
  title: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  titleJaEn: {
    fontSize: typography.xl,
    lineHeight: typography.xl * 1.2,
  },
  titleAndroidJa: {
    fontSize: typography.xl * 0.92,
    lineHeight: typography.xl * 1.12,
  },
  titleFr: {
    fontSize: typography.lg * 1.16,
    lineHeight: typography.lg * 1.38,
  },
  titleCompactJaEn: {
    fontSize: typography.lg * 1.2,
    lineHeight: typography.lg * 1.4,
  },
  titleCompactFr: {
    fontSize: typography.md * 1.38,
    lineHeight: typography.md * 1.52,
  },
  subtitle: {
    color: colors.textSecondary,
    marginVertical: spacing.md,
  },
  subtitleJaEn: {
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  subtitleFr: {
    fontSize: typography.sm * 1.08,
    lineHeight: typography.sm * 1.62,
  },
  subtitleCompactJaEn: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.55,
    marginVertical: spacing.sm,
  },
  subtitleCompactFr: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
    marginVertical: spacing.sm,
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
    width: "100%",
  },
  ctaSlot: {
    width: "48%",
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
    textAlign: "center",
    maxWidth: "100%",
    flexShrink: 1,
  },
  primaryLabelJaEn: {
    fontSize: typography.md,
  },
  primaryLabelAndroidJa: {
    fontSize: typography.md * 0.92,
  },
  primaryLabelFr: {
    fontSize: typography.sm * 1.08,
    lineHeight: typography.sm * 1.35,
  },
  primaryLabelCompactJaEn: {
    fontSize: typography.md * 0.92,
  },
  primaryLabelCompactFr: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.25,
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
  shimmerMaskAndroid: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  shimmerOverlayAndroid: {
    position: "absolute",
    top: -12,
    bottom: -12,
    width: 120,
    opacity: 0.78,
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
  sectionLabelCompact: {
    fontSize: typography.sm * 0.92,
  },
  sectionLabelFr: {
    letterSpacing: 0.2,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  sectionTitleJaEn: {
    fontSize: typography.lg,
  },
  sectionTitleAndroidJa: {
    fontSize: typography.lg * 0.92,
    lineHeight: typography.lg * 1.18,
  },
  sectionTitleFr: {
    fontSize: typography.md * 1.15,
    lineHeight: typography.md * 1.4,
  },
  sectionTitleCompactJaEn: {
    fontSize: typography.md * 1.15,
  },
  sectionTitleCompactFr: {
    fontSize: typography.md,
    lineHeight: typography.md * 1.3,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    gap: spacing.md,
    overflow: "hidden",
  },
  cardCompact: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardShell: {
    borderRadius: radius.xl,
    ...shadows.card,
  },
  cardRow: {
    flexDirection: "column",
    gap: spacing.md,
  },
  cardHeading: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  cardHeadingJaEn: {
    fontSize: typography.md,
  },
  cardHeadingAndroidJa: {
    fontSize: typography.md * 0.92,
    lineHeight: typography.md * 1.35,
  },
  cardHeadingFr: {
    fontSize: typography.sm * 1.08,
    lineHeight: typography.sm * 1.4,
  },
  cardHeadingCompactJaEn: {
    fontSize: typography.md * 0.92,
  },
  cardHeadingCompactFr: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.34,
  },
  cardBody: {
    color: colors.textSecondary,
  },
  cardBodyJaEn: {
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  cardBodyAndroidJa: {
    fontSize: typography.md * 0.94,
    lineHeight: typography.md * 1.42,
  },
  cardBodyFr: {
    fontSize: typography.sm * 1.04,
    lineHeight: typography.sm * 1.62,
  },
  cardBodyCompactJaEn: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.55,
  },
  cardBodyCompactFr: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
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
    alignItems: "center",
    gap: spacing.sm,
  },
  bulletMarker: {
    width: 12,
    alignItems: "center",
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentSubtle,
  },
  bulletText: {
    color: colors.textPrimary,
    flex: 1,
  },
  bulletTextJaEn: {
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  bulletTextAndroidJa: {
    fontSize: typography.md * 0.94,
    lineHeight: typography.md * 1.34,
  },
  bulletTextFr: {
    fontSize: typography.sm * 1.02,
    lineHeight: typography.sm * 1.52,
  },
  bulletTextCompactJaEn: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
  },
  bulletTextCompactFr: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.42,
  },
  planCard: {
    flex: 1,
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  planPrice: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  planPriceJaEn: {
    fontSize: typography.xl,
  },
  planPriceAndroidJa: {
    fontSize: typography.xl * 0.92,
  },
  planPriceFr: {
    fontSize: typography.lg * 1.08,
    lineHeight: typography.lg * 1.28,
  },
  planPriceCompactJaEn: {
    fontSize: typography.lg,
  },
  planPriceCompactFr: {
    fontSize: typography.md * 1.2,
    lineHeight: typography.md * 1.35,
  },
  planTrialBadge: {
    color: colors.error,
    marginBottom: spacing.sm,
    fontWeight: "700",
  },
  planTrialBadgeJaEn: {
    fontSize: typography.lg,
  },
  planTrialBadgeAndroidJa: {
    fontSize: typography.lg * 0.92,
  },
  planTrialBadgeFr: {
    fontSize: typography.md * 1.05,
    lineHeight: typography.md * 1.35,
  },
  planTrialBadgeCompactJaEn: {
    fontSize: typography.md * 1.05,
  },
  planTrialBadgeCompactFr: {
    fontSize: typography.sm * 1.08,
    lineHeight: typography.sm * 1.4,
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
  scrollHintIconAndroid: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  scrollHintText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    letterSpacing: 0.4,
    marginTop: spacing.md,
  },
  scrollHintTextCompact: {
    fontSize: typography.sm * 0.92,
    marginTop: spacing.sm,
  },
  scrollHintTextFr: {
    letterSpacing: 0.15,
  },
});
