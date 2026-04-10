import { render, screen } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ReactNative from "react-native";
import { I18nextProvider } from "react-i18next";
import Index from "../app/index";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";
import { LanguageProvider } from "../providers/LanguageProvider";

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

describe("Index screen", () => {
  const originalPlatform = ReactNative.Platform.OS;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage("ja");
    jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
      width: 430,
      height: 932,
      scale: 3,
      fontScale: 1,
    });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  afterEach(() => {
    Object.defineProperty(ReactNative.Platform, "OS", {
      configurable: true,
      value: originalPlatform,
    });
    jest.restoreAllMocks();
  });

  it("shows pricing and CTA buttons", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <Index />
        </LanguageProvider>
      </I18nextProvider>,
    );

    const planPrice = await screen.findByText("390 円/月");
    expect(planPrice).toBeOnTheScreen();
    const trialBanner = await screen.findByText("14日間無料トライアル付き");
    expect(trialBanner).toBeOnTheScreen();
    expect(trialBanner).toHaveStyle({ color: "#F25F5C" });
    const startButtonLabels = await screen.findAllByText("無料で始める");
    const startButtons = await screen.findAllByRole("button", { name: "無料で始める" });
    const signInButtons = await screen.findAllByRole("button", { name: "ログイン" });
    expect(startButtons[0]).toBeOnTheScreen();
    expect(signInButtons[0]).toBeOnTheScreen();
    expect(startButtonLabels[0].props.numberOfLines).toBe(1);
    expect(startButtonLabels[0].props.ellipsizeMode).toBe("tail");
  });

  it("shrinks landing page typography on compact screens", async () => {
    jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1.2,
    });

    render(
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <Index />
        </LanguageProvider>
      </I18nextProvider>,
    );

    const title = await screen.findByText("理想の自分への第一歩");
    const startButtonLabels = await screen.findAllByText("無料で始める");

    expect(title).toHaveStyle({ fontSize: 24 });
    expect(startButtonLabels[0]).toHaveStyle({ fontSize: 14.72 });
  });

  it("uses French-specific typography on compact screens", async () => {
    await AsyncStorage.setItem("preferred_language", "fr");
    jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1.2,
    });

    render(
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <Index />
        </LanguageProvider>
      </I18nextProvider>,
    );

    const title = await screen.findByText("Votre premier pas vers votre moi idéal");
    const membership = await screen.findByText("Forfait fixe (essai gratuit disponible)");
    const ctaLabels = await screen.findAllByText("Essai gratuit");

    expect(title).toHaveStyle({ fontSize: 22.08 });
    expect(membership).toHaveStyle({ fontSize: 16 });
    expect(ctaLabels[0]).toHaveStyle({ fontSize: 13 });
  });

  it("shrinks Japanese landing typography on Android and aligns list bullets", async () => {
    Object.defineProperty(ReactNative.Platform, "OS", {
      configurable: true,
      value: "android",
    });

    render(
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <Index />
        </LanguageProvider>
      </I18nextProvider>,
    );

    const title = await screen.findByText("理想の自分への第一歩");
    const overviewBullet = await screen.findByTestId("landing-overview-bullet-0");
    const membershipBullet = await screen.findByTestId("landing-membership-bullet-0");
    const overviewBulletMarker = await screen.findByTestId("landing-overview-bullet-marker-0");
    const membershipBulletMarker = await screen.findByTestId("landing-membership-bullet-marker-0");
    const shimmerMasks = await screen.findAllByTestId("landing-cta-shimmer-mask");

    expect(title).toHaveStyle({ fontSize: 25.76 });
    expect(overviewBullet).toHaveStyle({ backgroundColor: "#6EA8FF" });
    expect(membershipBullet).toHaveStyle({ backgroundColor: "#6EA8FF" });
    expect(overviewBulletMarker).toHaveStyle({ width: 12, alignItems: "center" });
    expect(membershipBulletMarker).toHaveStyle({ width: 12, alignItems: "center" });
    expect(shimmerMasks).toHaveLength(4);
  });
});
