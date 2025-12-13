// Expo Go / 開発ビルド / 本番ビルドすべての元になる設定(ネイティブアプリ全体の設定)
// expo start の時も、eas build の時も 毎回読み込まれる
// 中の設定のうち、ネイティブに関わる部分を変えたときだけ 再ビルドが必要
import { ConfigContext, ExpoConfig } from "@expo/config";

const APP_ENV = process.env.APP_ENV ?? "dev";
const isProd = APP_ENV === "prod";

// 本番用: idealgap, 開発用: ideal-gap-dev
const scheme = isProd ? "idealgap" : "ideal-gap-dev";
const name = isProd ? "Ideal_Gap" : "Ideal_Gap (Dev)"; // アプリ名
const bundleIdentifier = isProd
  ? "com.hirokiiinoue.appIdealGap"
  : "com.hirokiiinoue.appIdealGap.dev";
const androidPackage = bundleIdentifier;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name,
  slug: "Ideal_Gap",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier,
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: androidPackage,
    intentFilters: [
      {
        action: "VIEW",
        category: ["BROWSABLE", "DEFAULT"],
        data: [
          { scheme, host: "auth", pathPrefix: "/callback" },
          { scheme, host: "reset-password" },
          { scheme, host: "purchases" },
        ],
      },
    ],
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-localization",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    appEnv: APP_ENV,
    eas: {
      projectId: "78f7c6f5-d71f-41aa-a777-ff3b7dd7abe7",
    },
  },
  owner: "hirokiiinoue",
  updates: {
    url: "https://u.expo.dev/78f7c6f5-d71f-41aa-a777-ff3b7dd7abe7",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
});
