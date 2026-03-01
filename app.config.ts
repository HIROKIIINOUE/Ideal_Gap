// Expo Go / 開発ビルド / 本番ビルドすべての元になる設定(ネイティブアプリ全体の設定)
// 中の設定のうち、ネイティブに関わる部分を変えたときだけ 再ビルドが必要

// EAS本番ビルド時の流れは・・・「まずeas.jsonが読まれる」→「環境を決める判断する」→
// →「その判断に応じてEAS側の環境変数がビルド環境に注入される」→「注入されたEAS側の環境変数を元にapp.configが読まれる」
import { ExpoConfig } from "@expo/config";

// 「process.env」 は開発環境ビルドでは.envを、本番環境ビルドではEAS側の環境変数を参照する
const APP_ENV = process.env.APP_ENV ?? "dev";
const isProd = APP_ENV === "prod";

// sentryの設定、今回は本番環境でのみ実行
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryUrl = process.env.SENTRY_URL ?? "https://sentry.io/";
const sentryPlugin =
  sentryOrg && sentryProject
    ? ([
        "@sentry/react-native/expo",
        {
          organization: sentryOrg,
          project: sentryProject,
          url: sentryUrl,
          uploads: {
            enabled: isProd,
          },
        },
      ] as [string, any])
    : null;

// 認証ディープリンクは環境差異で詰まりやすいため、常に本番スキームを優先しつつ開発スキームも許可する
const primaryScheme = "idealgap";
const devScheme = "ideal-gap-dev";
const schemes = isProd
  ? [primaryScheme, devScheme]
  : [primaryScheme, devScheme];
const name = isProd ? "Ideal Gap" : "Ideal_Gap (Dev)"; // アプリ名
const iosBundleIdentifier = isProd
  ? "com.idealgap.app"
  : "com.hirokiiinoue.appIdealGap.dev";
const androidPackage = isProd
  ? "com.idealgap.app"
  : "com.hirokiiinoue.appIdealGap.dev";

export default (): ExpoConfig => ({
  name,
  slug: "Ideal_Gap",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: schemes,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: iosBundleIdentifier,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["audio"],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    blockedPermissions: ["android.permission.RECORD_AUDIO"],
    package: androidPackage,
    intentFilters: [
      {
        action: "VIEW",
        category: ["BROWSABLE", "DEFAULT"],
        data: schemes.flatMap((registeredScheme) => [
          { scheme: registeredScheme, host: "auth", pathPrefix: "/callback" },
          { scheme: registeredScheme, host: "reset-password" },
          { scheme: registeredScheme, host: "purchases" },
        ]),
      },
    ],
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    ...(sentryPlugin ? [sentryPlugin] : []),
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
    [
      "expo-audio",
      {
        recordAudioAndroid: false,
        microphonePermission: false,
      },
    ],
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
