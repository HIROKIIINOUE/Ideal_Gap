// Async Storage(端末のローカルデータ)処理をまとめたファイル
// 現在は「タスク集中音楽のローカル保存先メタデータ」「月間DL数とDL制限リセット日」をAsync Storageに格納している

import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { InstalledTrack, InstalledTrackSchema } from "../../types/focus-music";
import {
  FOCUS_MUSIC_DOWNLOAD_QUOTA_KEY_PREFIX,
  FOCUS_MUSIC_INSTALLED_KEY,
} from "./constants";

const InstalledTracksSchema = z.array(InstalledTrackSchema);
const DownloadQuotaSchema = z.object({
  resetAt: z.string().min(1),
  count: z.number().int().nonnegative(),
});

const getDownloadQuotaKey = (userId: string) =>
  `${FOCUS_MUSIC_DOWNLOAD_QUOTA_KEY_PREFIX}.${userId}`;

// ローカルのAsyncStorageに保存されたユーザ手持ちの音楽をzodの検証実行の上で返却
export const loadInstalledTracks = async (): Promise<InstalledTrack[]> => {
  const raw = await AsyncStorage.getItem(FOCUS_MUSIC_INSTALLED_KEY);
  if (!raw) return [];
  try {
    const parsed = InstalledTracksSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data;
  } catch {
    return [];
  }
};

// 最新の音楽リストの保存情報をAsyncStorageでローカルAsyncStorageに保存
//   → これらを参照することで端末ローカルファイル内のダウンロード済み音楽を再生できる(オフラインでも実現)
export const saveInstalledTracks = async (
  tracks: InstalledTrack[],
): Promise<void> => {
  await AsyncStorage.setItem(FOCUS_MUSIC_INSTALLED_KEY, JSON.stringify(tracks));
};

// 何らかのエラーが走った場合は今月のDL数は0回、更新日は30日後を返す
const getDefaultQuota = () => {
  const resetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return { resetAt, count: 0 };
};

// Async StorageからdownloadQuotaを取得。
// (ここには今月の曲のDL数と制限リセット日がオブジェクトで格納されている)
export const loadMonthlyDownloadQuota = async (userId: string) => {
  const raw = await AsyncStorage.getItem(getDownloadQuotaKey(userId));
  if (!raw) return getDefaultQuota();
  try {
    const parsed = DownloadQuotaSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return getDefaultQuota();
    const resetAtTime = Date.parse(parsed.data.resetAt);
    if (Number.isNaN(resetAtTime) || Date.now() >= resetAtTime) {
      return getDefaultQuota();
    }
    return parsed.data;
  } catch {
    return getDefaultQuota();
  }
};

// Async Storageから現在のdownloadQuotaを取得し、カウントを１プラス。
// その後に再度Async Storageを更新。
export const incrementMonthlyDownloadQuota = async (userId: string) => {
  const current = await loadMonthlyDownloadQuota(userId);
  const next = { resetAt: current.resetAt, count: current.count + 1 };
  await AsyncStorage.setItem(getDownloadQuotaKey(userId), JSON.stringify(next));
  return next;
};
