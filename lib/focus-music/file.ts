// タスク集中音楽を携帯端末のファイルシステムからダウンロードor削除する関数をまとめたユーティリティファイル

import * as FileSystem from "expo-file-system/legacy";
import { FocusMusicTrack } from "../../types/focus-music";
import { FOCUS_MUSIC_DIR_NAME } from "./constants";

export type TrackDownloadProgress = {
  writtenBytes: number;
  totalBytes: number | null;
};

// 拡張子の確認。拡張子が無いファイルはmp３に倒す。
const sanitizeExtension = (storagePath: string) => {
  const parts = storagePath.split(".");
  if (parts.length < 2) return ".mp3";
  const ext = parts[parts.length - 1];
  return ext ? `.${ext}` : ".mp3";
};

// ユーザ端末のファイルシステムにおけるパスをFileSystem.documentDirectoryで取得
export const getFocusMusicDirectory = () =>
  `${FileSystem.documentDirectory ?? ""}${FOCUS_MUSIC_DIR_NAME}/`;

//　ユーザ端末のローカル(ローカルファイルシステム)の保存先ディレクトリを作成
export const ensureFocusMusicDirectory = async (): Promise<string> => {
  const dir = getFocusMusicDirectory();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
};

// FileSystem.downloadAsync()における第一引数のsignedUrl(チケット)でSupabase Storageから音楽をダウンロードし、第二引数で指定した端末のローカルファイル先へ格納する。
export const downloadTrackFile = async (
  signedUrl: string,
  track: FocusMusicTrack, // ダウンロードしたい１つの音楽情報
  onProgress?: (progress: TrackDownloadProgress) => void,
): Promise<string> => {
  const dir = await ensureFocusMusicDirectory();
  const extension = sanitizeExtension(track.storagePath);
  const filePath = `${dir}${track.id}${extension}`;

  // 進捗付きでダウンロードを制御するためのAPIを叩き、ダウンロートオブジェクトを作成
  // (進捗無しの場合はシンプルにFileSystem.downloadAsync(signedUrl, filePath) だけで良い)
  const downloadResumable = FileSystem.createDownloadResumable(
    signedUrl,
    filePath,
    {},
    (progressEvent) => {
      if (!onProgress) return;
      // 書き込み済みのデータ量
      const writtenBytes = Math.max(0, progressEvent.totalBytesWritten ?? 0);
      // 想定されるデータ総量
      const rawExpected = progressEvent.totalBytesExpectedToWrite;
      // データ総量の最終形
      const totalBytes =
        Number.isFinite(rawExpected) && rawExpected > 0 ? rawExpected : null;
      onProgress({
        writtenBytes,
        totalBytes,
      });
    },
  );
  // ダウンロードオブジェクト内のdownloadAsync()を実行し、オブジェクト内の進捗コールバックが何度も呼ばれる。ダウンロードが完了したらその結果をresultで受け取る。(保存先のファイルパスなど)
  const result = await downloadResumable.downloadAsync();
  if (!result) {
    throw new Error("Track download was cancelled");
  }
  return result.uri;
};

// ユーザ端末ローカルのFileSystemから指定のパスのファイルを削除する
export const deleteTrackFile = async (localPath: string): Promise<void> => {
  await FileSystem.deleteAsync(localPath, { idempotent: true });
};
