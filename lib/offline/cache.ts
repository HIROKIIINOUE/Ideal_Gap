// 各ページでデータフェッチ成功後にデータをローカルキャッシュに保存し、オフラインの時に使用する
// ローカルキャッシュでは各ページ直近の１データのみをオフライン用に保存している

import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const OfflineCacheEnvelopeSchema = z.object({
  updatedAt: z.string().min(1),
  data: z.unknown(),
});

export const buildOfflineCacheKey = (scope: string, userId: string) =>
  `offline:${scope}:${userId}`;

export const readOfflineCache = async <T>(
  key: string,
  schema: z.ZodType<T>,
): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsedEnvelope = OfflineCacheEnvelopeSchema.safeParse(
      JSON.parse(raw),
    );
    if (!parsedEnvelope.success) return null;

    const parsedData = schema.safeParse(parsedEnvelope.data.data);
    if (!parsedData.success) return null;
    return parsedData.data;
  } catch {
    return null;
  }
};

export const writeOfflineCache = async <T>(
  key: string,
  schema: z.ZodType<T>,
  payload: T,
): Promise<boolean> => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return false;
  if (Array.isArray(parsed.data) && parsed.data.length === 0) return false;

  const envelope = {
    updatedAt: new Date().toISOString(),
    data: parsed.data,
  };
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
  return true;
};
