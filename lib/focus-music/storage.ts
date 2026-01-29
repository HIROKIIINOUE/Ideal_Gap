import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { InstalledTrack, InstalledTrackSchema } from "../../types/focus-music";
import { FOCUS_MUSIC_INSTALLED_KEY } from "./constants";

const InstalledTracksSchema = z.array(InstalledTrackSchema);

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
