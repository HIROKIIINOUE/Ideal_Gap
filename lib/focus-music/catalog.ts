import {
  FocusMusicTrack,
  FocusMusicTrackSchema,
} from "../../types/focus-music";
import { supabase } from "../supabaseClient";
import { FOCUS_MUSIC_CATALOG_TABLE } from "./constants";

// Supabaseから取得したカタログデータの配列をzodで検証し正常な要素のみで配列を生成
const mapRowToTrack = (row: {
  id: string;
  title: string | null;
  bucket: string | null;
  storage_path: string | null;
  duration: number | null;
  music_category: string[] | null;
}): FocusMusicTrack | null => {
  if (!row.title || !row.bucket || !row.storage_path) return null;
  const parsed = FocusMusicTrackSchema.safeParse({
    id: row.id,
    title: row.title,
    bucket: row.bucket,
    storagePath: row.storage_path,
    durationSeconds: row.duration,
    musicCategories: row.music_category ?? [],
  });
  if (!parsed.success) return null;
  return parsed.data;
};

// Supabaseデータベースからカタログリストの情報を取得
// mapRoxToTrack()を通すことで、zodの検証を受けた要素のみの配列が返される
export const fetchFocusMusicCatalog = async (): Promise<FocusMusicTrack[]> => {
  const { data, error } = await supabase
    .from(FOCUS_MUSIC_CATALOG_TABLE)
    .select("id,title,bucket,storage_path,duration,music_category")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map(mapRowToTrack)
    .filter((track): track is FocusMusicTrack => track !== null);
};
