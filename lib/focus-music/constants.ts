// タスク集中音楽周りの共通設定

export const FOCUS_MUSIC_MAX_INSTALLED = 5;
export const FOCUS_MUSIC_MONTHLY_DOWNLOAD_LIMIT = 20; //【ここチェック】変更
export const FOCUS_MUSIC_INSTALLED_KEY = "focusMusic.installed";
export const FOCUS_MUSIC_DOWNLOAD_QUOTA_KEY_PREFIX = "focusMusic.downloadQuota";
export const FOCUS_MUSIC_DIR_NAME = "focus-music"; // 音楽一覧を格納したSupabase Storage内のディレクトリ名
export const FOCUS_MUSIC_CATALOG_TABLE = "focus_music_tracks";
export const FOCUS_MUSIC_SIGNED_URL_FUNCTION = "focus-music-signed-url"; // 「supabase/functions/focus-music-signed-url/index.ts 」の supabase edge 関数を指す
