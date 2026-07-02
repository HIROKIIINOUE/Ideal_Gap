// 作業用音楽のAsync Storage(端末のローカルデータ)処理をまとめたファイル
// 現在は「タスク集中音楽のローカル保存先メタデータ」をAsync Storageに格納している(月間DL数とそのリセット日はDB管理に変更)

import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { InstalledTrack, InstalledTrackSchema } from "../../types/focus-music";
import { FOCUS_MUSIC_INSTALLED_KEY } from "./constants";

const InstalledTracksSchema = z.array(InstalledTrackSchema);
const InstalledTrackMigrationSchema = z.object({
  trackId: z.string().min(1),
  fileName: z.string().min(1).optional(),
  localPath: z.string().min(1).optional(),
  uri: z.string().min(1).optional(),
  downloadedAt: z.string().min(1).optional(),
});
const normalizeFileName = (value: string | undefined) => {
  if (!value) return null;
  if (value.includes("/") || value.includes("\\")) return null;
  return value;
};

// 旧形式の絶対URIから、端末コンテナに依存しないファイル名だけを取り出す
const extractFileNameFromLocalPath = (value: string | undefined) => {
  if (!value) return null;
  if (!value.startsWith("file://") && !value.startsWith("/")) return null;
  const withoutQuery = value.split("?")[0].split("#")[0];
  const fileName = withoutQuery.split("/").filter(Boolean).pop();
  return normalizeFileName(fileName);
};

const getFallbackFileName = (trackId: string) => {
  if (!trackId.includes("/") && !trackId.includes("\\")) {
    return `${trackId}.mp3`;
  }
  return null;
};

// DL済み音楽のデータが壊れていた時、ここで正しい形に整形する。
const normalizeInstalledTracks = (rawValue: unknown): InstalledTrack[] => {
  if (!Array.isArray(rawValue)) return [];
  const normalized: InstalledTrack[] = [];
  const seenTrackIds = new Set<string>();
  for (const item of rawValue) {
    const parsed = InstalledTrackMigrationSchema.safeParse(item);
    if (!parsed.success) continue;
    if (seenTrackIds.has(parsed.data.trackId)) continue;
    const explicitFileName = normalizeFileName(parsed.data.fileName);
    const legacyFileName = extractFileNameFromLocalPath(
      parsed.data.localPath ?? parsed.data.uri,
    );
    const fileName =
      explicitFileName ??
      legacyFileName ??
      (parsed.data.localPath || parsed.data.uri
        ? null
        : getFallbackFileName(parsed.data.trackId));
    if (!fileName) continue;
    normalized.push({
      trackId: parsed.data.trackId,
      fileName,
      downloadedAt: parsed.data.downloadedAt ?? new Date(0).toISOString(),
    });
    seenTrackIds.add(parsed.data.trackId);
  }
  return normalized;
};

// ローカルのAsyncStorageに保存されたDL済み音楽をzodの検証実行の上で返却
export const loadInstalledTracks = async (): Promise<InstalledTrack[]> => {
  const raw = await AsyncStorage.getItem(FOCUS_MUSIC_INSTALLED_KEY);
  if (!raw) return [];
  try {
    const parsedJson = JSON.parse(raw);
    const parsed = InstalledTracksSchema.safeParse(parsedJson);
    if (parsed.success) return parsed.data;

    // 作業用音楽配列のパースに失敗した場合(ファイルデータが壊れている場合など)、正しい形に修正して新しくAsyncStorageに設定し直す。
    const migrated = normalizeInstalledTracks(parsedJson);
    await AsyncStorage.setItem(
      FOCUS_MUSIC_INSTALLED_KEY,
      JSON.stringify(migrated),
    );
    return migrated;
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
