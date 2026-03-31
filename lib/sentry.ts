import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { getAppEnv } from "./appEnv";

const APP_ENV = getAppEnv();
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";
const IS_PRODUCTION = APP_ENV === "prod";

const MINOR_ERROR_PATTERNS = [
  "aborterror",
  "the operation was aborted",
  "canceled",
  "cancelled",
  "user cancelled",
  "user canceled",
  "purchase was cancelled",
  "e_picker_cancelled",
  "err_canceled",
] as const;

const SENSITIVE_HEADER_KEYS = [
  "authorization",
  "cookie",
  "x-api-key",
  "x-supabase-auth",
] as const;

// 「軽微ノイズ除外」のために、散らばったSentryのイベントメッセージをeventMessageとして一箇所(一文)にまとめる
const getEventMessage = (event: any, hint?: any) => {
  const eventMessages = [
    event.message,
    // ↓ 各例外から本文(exception.value)を取得
    ...(event.exception?.values
      ?.map((value: any) => value.value ?? value.type)
      .filter(Boolean) ?? []),
  ];

  const originalException = hint?.originalException;
  if (originalException instanceof Error) {
    eventMessages.push(originalException.message);
  } else if (typeof originalException === "string") {
    eventMessages.push(originalException);
  }

  return eventMessages.join(" ");
};

// 特定のノイズ(MINOR_ERROR_PATTERNSで指定)を無視する
export const shouldIgnoreSentryError = (message?: string | null): boolean => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return MINOR_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
};

// ノイズignore判定が通った後に(ノイズじゃないと判断された後)、
// Sentryに送る直前のイベントから、個人情報(メアド等)や機密情報を削る/マスクする関数
export const stripSensitiveDataFromEvent = (event: any) => {
  // 元イベントをコピーしてnextEventを作成、ユーザ情報は上書きしてユーザIDのみを残す
  const nextEvent: any = {
    ...event,
    user: event.user?.id ? { id: event.user.id } : undefined,
  };

  if (event.request?.headers) {
    const sanitizedHeaders: Record<string, string> = {};
    // headerオブジェクトの各キー名から個人情報(SENSITIVE_HEADER_KEYSで指定)を探す
    // もしキー名から個人情報だと読み取れた場合は該当キーの値を[Filtered]とする
    Object.entries(event.request.headers as Record<string, string>).forEach(
      ([key, value]) => {
        const isSensitive = SENSITIVE_HEADER_KEYS.includes(
          key.toLowerCase() as (typeof SENSITIVE_HEADER_KEYS)[number],
        );
        sanitizedHeaders[key] = isSensitive ? "[Filtered]" : value;
      },
    );
    nextEvent.request = {
      ...event.request,
      headers: sanitizedHeaders,
    };
  }

  // もしユーザのemail情報がsentryイベントメッセージ情報に含まれている場合はそれらを除外する
  if (nextEvent.extra && "email" in nextEvent.extra) {
    const { email: _email, ...rest } = nextEvent.extra as Record<
      string,
      unknown
    >;
    nextEvent.extra = rest;
  }

  return nextEvent;
};

// アプリを識別する名前 + バージョン を生成
const getReleaseName = () => {
  const slug = Constants.expoConfig?.slug ?? "ideal-gap";
  const version = Constants.expoConfig?.version ?? "0.0.0";
  return `${slug}@${version}`;
};

// Sentry初期化
export const initSentry = () => {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: IS_PRODUCTION && Boolean(SENTRY_DSN),
    environment: APP_ENV,
    release: getReleaseName(),
    sendDefaultPii: false,
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 0,
    profilesSampleRate: IS_PRODUCTION ? 0.1 : 0,
    // beforeSend()で「error + 付加情報」が反映されたevent を最終フィルタする
    beforeSend(event, hint) {
      const message = getEventMessage(event, hint);
      if (shouldIgnoreSentryError(message)) {
        return null;
      }
      return stripSensitiveDataFromEvent(event) as any;
    },
  });
};

// RevenueCat 購入処理でのエラーをキャッチ
export const captureRevenueCatPurchaseError = (error: unknown) => {
  Sentry.captureException(error, {
    tags: {
      area: "revenuecat",
      flow: "purchase",
    },
    level: "error",
  });
};

// サインアップ、ログイン、パスワードリセットのエラーをキャッチ
export const captureSupabaseAuthUnexpectedError = (
  error: unknown,
  operation:
    | "sign_up"
    | "sign_in"
    | "request_password_reset"
    | "complete_password_reset",
) => {
  Sentry.captureException(error, {
    tags: {
      area: "auth",
      operation,
    },
    level: "fatal",
  });
};

// タスク集中音楽のダウンロード失敗エラーをキャッチ
export const captureMusicDownloadError = (error: unknown, trackId?: string) => {
  Sentry.captureException(error, {
    tags: {
      area: "focus_music",
      flow: "download",
    },
    extra: {
      trackId,
    },
    level: "error",
  });
};

// タスク集中音楽の再生、カタログ内での試聴再生、アプリ起動時のアプリ内オーディオ設定でのエラーをキャッチ
export const captureExpoAudioError = (error: unknown, context: string) => {
  Sentry.captureException(error, {
    tags: {
      area: "expo_audio",
      context,
    },
    level: "fatal",
  });
};

export const SentryErrorBoundary = Sentry.ErrorBoundary;
