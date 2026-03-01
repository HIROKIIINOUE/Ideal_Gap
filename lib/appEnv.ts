// sentry.ts で環境変数を読み取る際、process.env.APP_ENVで直接参照すると実機ランタイムでエラーになる

// Constantsで「既にeas.jsonとapp.configで解決された環境情報」を参照し、
// その安定した環境情報をsentry側に渡す

import Constants from "expo-constants";

export type RuntimeAppEnv = "dev" | "preview" | "prod";

export const getAppEnv = (): RuntimeAppEnv => {
  const extraEnv = (
    Constants.expoConfig?.extra as { appEnv?: string } | undefined
  )?.appEnv;
  const raw = (
    extraEnv ??
    process.env.EXPO_PUBLIC_APP_ENV ??
    process.env.APP_ENV ??
    "dev"
  )
    .toString()
    .toLowerCase();

  if (raw === "prod" || raw === "preview" || raw === "dev") {
    return raw;
  }

  return "dev";
};
