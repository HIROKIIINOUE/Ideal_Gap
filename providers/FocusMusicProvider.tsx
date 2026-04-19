//　タスク集中音楽プロバイダー(曲をグローバルで管理)

import NetInfo from "@react-native-community/netinfo";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getUserId } from "../lib/api/supabase/common";
import { fetchFocusMusicCatalog } from "../lib/focus-music/catalog";
import {
  FOCUS_MUSIC_MAX_INSTALLED,
  FOCUS_MUSIC_MONTHLY_DOWNLOAD_LIMIT,
} from "../lib/focus-music/constants";
import { deleteTrackFile, downloadTrackFile } from "../lib/focus-music/file";
import { createFocusMusicSignedUrl } from "../lib/focus-music/signedUrl";
import {
  incrementMonthlyDownloadQuota,
  loadInstalledTracks,
  loadMonthlyDownloadQuota,
  saveInstalledTracks,
} from "../lib/focus-music/storage";
import {
  captureExpoAudioError,
  captureMusicDownloadError,
} from "../lib/sentry";
import {
  FocusMusicTrack,
  InstalledFocusTrack,
  InstalledTrack,
  InstallProgress,
  InstallResult,
  RemoveResult,
} from "../types/focus-music";

type FocusMusicContextValue = {
  catalog: FocusMusicTrack[];
  installedTracks: InstalledFocusTrack[];
  installedIds: string[];
  selectedTrackId: string | null;
  selectedTrack: InstalledFocusTrack | null;
  maxInstalled: number;
  monthlyDownloadLimit: number;
  monthlyDownloadRemaining: number | null;
  downloadResetAt: string | null;
  canInstall: boolean;
  isInstalling: (id: string) => boolean;
  isDownloadInProgress: boolean;
  isLoadingCatalog: boolean;
  getInstallProgress: (id: string) => InstallProgress | null;
  installTrack: (
    id: string,
    options?: { allowCellular?: boolean },
  ) => Promise<InstallResult>;
  removeTrack: (id: string) => Promise<RemoveResult>;
  selectTrack: (id: string) => void;
  isInstalled: (id: string) => boolean;
  playSelected: () => Promise<boolean>;
  pause: () => void;
  stop: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
};

const FocusMusicContext = createContext<FocusMusicContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
};

export function FocusMusicProvider({ children }: ProviderProps) {
  const player = useAudioPlayer(null, {
    keepAudioSessionActive: true,
    downloadFirst: true,
  });
  const [catalog, setCatalog] = useState<FocusMusicTrack[]>([]);
  // インストールした曲のローカル保存情報の配列データ。これをもとに後に生成するinstalledTracksがユーザの手持ち曲のデータ配列になる
  const [installedEntries, setInstalledEntries] = useState<InstalledTrack[]>([]);
  const [installingIds, setInstallingIds] = useState<string[]>([]);
  // 「どの曲が今どこまでDLされたか」をIDごとに保持
  const [installProgressById, setInstallProgressById] = useState<
    Record<string, InstallProgress>
  >({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  // 書くユーザの1ヶ月のDL数を制御
  const [monthlyDownloadRemaining, setMonthlyDownloadRemaining] = useState<number | null>(null);
  const [downloadResetAt, setDownloadResetAt] = useState<string | null>(null);
  // 選択中の音楽(タスクタイマーで再生される)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const isDownloadingRef = useRef(false);


  // 音楽が再生されている時のみbackground: true設定をONにする(充電消費節約対策)
  const setFocusPlaybackAudioMode = useCallback(
    async (shouldPlayInBackground: boolean) => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground,
        interruptionMode: "mixWithOthers",
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
    },
    [],
  );


  // download quota (今月の曲のDL数と制限リセット日)を取得し、状態関数を更新
  useEffect(() => {
    let active = true;
    const loadQuota = async () => {
      const userId = await getUserId();
      if (!userId) {
        if (active) setMonthlyDownloadRemaining(null);
        return;
      }
      const quota = await loadMonthlyDownloadQuota(userId);
      if (!active) return;
      setMonthlyDownloadRemaining(
        Math.max(FOCUS_MUSIC_MONTHLY_DOWNLOAD_LIMIT - quota.count, 0),
      );
      setDownloadResetAt(quota.resetAt);
    };
    loadQuota();
    return () => {
      active = false;
    };
  }, []);

  // カタログを最新のものに更新
  const refreshCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const tracks = await fetchFocusMusicCatalog();
      setCatalog(tracks);
    } catch (error) {
      console.warn("Failed to fetch focus music catalog", error);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  // カタログリストとユーザの手持ちの音楽リストを取得し状態変数に格納する
  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoadingCatalog(true);
      try {
        const [tracks, installed] = await Promise.all([
          fetchFocusMusicCatalog(),
          loadInstalledTracks(),
        ]);
        if (!active) return;
        setCatalog(tracks);
        setInstalledEntries(installed);
      } catch (error) {
        console.warn("Failed to load focus music data", error);
      } finally {
        if (active) {
          setIsLoadingCatalog(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // すでにインストール済みかどうかの判定
  const isInstalled = useCallback(
    (id: string) => installedEntries.some((entry) => entry.trackId === id),
    [installedEntries],
  );


  // ダウンロードリストを使用して現在ダウンロード中の曲のボタンをUI上で制御するための判定
  const isInstalling = useCallback(
    (id: string) => installingIds.includes(id),
    [installingIds],
  );

  // 曲のダウンロード中は他の曲のダウンロードを制御するための関数
  const isDownloadInProgress = installingIds.length > 0;

  // 引数で指定されたidの音楽がDL進捗情報を保持していればそれを返却
  const getInstallProgress = useCallback(
    (id: string) => installProgressById[id] ?? null,
    [installProgressById],
  );

  const persistInstalledEntries = useCallback(async (next: InstalledTrack[]) => {
    setInstalledEntries(next);
    await saveInstalledTracks(next);
  }, []);

  // タスク集中音楽ダウンロード処理、引数としてタスク集中音楽のid１つを受け取る
  const installTrack = useCallback(
    async (
      id: string,
      options: { allowCellular?: boolean } = {},
    ): Promise<InstallResult> => {
      if (isDownloadingRef.current) {
        return { ok: false, reason: "busy" };
      }
      if (installedEntries.some((entry) => entry.trackId === id)) {
        return { ok: false, reason: "already_installed" };
      }
      if (installedEntries.length >= FOCUS_MUSIC_MAX_INSTALLED) {
        return { ok: false, reason: "limit" };
      }

      const userId = await getUserId();
      if (!userId) {
        return { ok: false, reason: "download_failed" };
      }

      // 月間最大DL数を上回っていたらダウンロードを却下
      const quota = await loadMonthlyDownloadQuota(userId);
      setMonthlyDownloadRemaining(
        Math.max(FOCUS_MUSIC_MONTHLY_DOWNLOAD_LIMIT - quota.count, 0),
      );
      setDownloadResetAt(quota.resetAt);
      if (quota.count >= FOCUS_MUSIC_MONTHLY_DOWNLOAD_LIMIT) {
        return { ok: false, reason: "monthly_limit" };
      }

      // カタログにない音楽は却下
      const track = catalog.find((item) => item.id === id);
      if (!track) return { ok: false, reason: "not_found" };

      // ユーザ端末のインターネット接続の有無、接続タイプ(wifiやcellular)を取得
      const network = await NetInfo.fetch();
      if (!network.isConnected || network.isInternetReachable === false) {
        return { ok: false, reason: "offline" };
      }
      // セルラー環境でユーザがセルラーを許可していないときはリターン。
      if (network.type === "cellular" && !options.allowCellular) {
        return { ok: false, reason: "cellular" };
      }

      // 該当の音楽をインストール中リストに追加
      isDownloadingRef.current = true;
      setInstallingIds((prev) => [...prev, id]);
      // 該当音楽のダウンロード進捗情報を初期化
      setInstallProgressById((prev) => ({
        ...prev,
        [id]: {
          progress: null,
          writtenBytes: 0,
          totalBytes: null,
          remainingBytes: null,
          isIndeterminate: true,
        },
      }));

      // ダウンロード開始
      try {
        // signedUrl発行
        const signedUrl = await createFocusMusicSignedUrl(id);
        // ローカルファイルへダウンロード。resultとしてローカルの格納先を返却してる。
        const localPath = await downloadTrackFile(
          signedUrl,
          track,
          // 進捗情報を繰り返し更新するコールバック
          (downloadProgress) => {
            setInstallProgressById((prev) => {
              const totalBytes = downloadProgress.totalBytes;
              const writtenBytes =
                totalBytes !== null
                  ? Math.min(downloadProgress.writtenBytes, totalBytes)
                  : downloadProgress.writtenBytes;
              const progress =
                totalBytes !== null
                  ? Math.min(Math.max(writtenBytes / totalBytes, 0), 1)
                  : null;
              return {
                ...prev,
                [id]: {
                  progress,
                  writtenBytes,
                  totalBytes,
                  remainingBytes:
                    totalBytes !== null
                      ? Math.max(totalBytes - writtenBytes, 0)
                      : null,
                  isIndeterminate: totalBytes === null,
                },
              };
            });
          },
        );
        // 今回ダウンロードしたタスク集中音楽の保存情報データ
        const nextEntry: InstalledTrack = {
          trackId: id,
          localPath,
          downloadedAt: new Date().toISOString(),
        };
        const nextEntries = [...installedEntries, nextEntry];

        // 最新の手持ちの音楽リスト保存情報(メタ情報)をプロジェクト内(状態変数)と端末内(Async Storage)の両方で更新する
        await persistInstalledEntries(nextEntries);
        // 今月のダウンロード数の値(download quota)を更新
        const updatedQuota = await incrementMonthlyDownloadQuota(userId);
        setMonthlyDownloadRemaining(
          Math.max(FOCUS_MUSIC_MONTHLY_DOWNLOAD_LIMIT - updatedQuota.count, 0),
        );
        setDownloadResetAt(updatedQuota.resetAt);
        if (!selectedTrackId) {
          setSelectedTrackId(id);
        }
        return { ok: true, track: { ...track, ...nextEntry } };
      } catch (error) {
        captureMusicDownloadError(error, id);
        return { ok: false, reason: "download_failed" };
      } finally {
        // ダウンロードが成功しても失敗してもダウンロード完了待ちリストから実行終了データを削除する
        setInstallingIds((prev) => prev.filter((trackId) => trackId !== id));
        // 進捗情報を削除。進捗情報はダウンロード中のみ存在する。
        setInstallProgressById((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        isDownloadingRef.current = false;
      }
    },
    [catalog, installedEntries, persistInstalledEntries, selectedTrackId],
  );

  // タスク集中音楽の削除、引数としてタスク集中音楽のid１つを受け取る
  const removeTrack = useCallback(
    async (id: string): Promise<RemoveResult> => {
      // 削除したい「既にインストールされた音楽」の保存情報を取得
      const target = installedEntries.find((entry) => entry.trackId === id);
      if (!target) return { ok: false, reason: "not_installed" };
      try {
        await deleteTrackFile(target.localPath);
      } catch (error) {
        // ローカルの音楽削除処理が失敗した場合でもreturnせずに続行。
        // 以下に続く「端末の音楽メタ情報を更新する」ことで手持ちの音楽を削除する
        // ※ここで音楽ファイルのみがユーザ端末に残る恐れはあるが、アプリをアンインストールすればファイルは一掃される
        console.warn("Failed to delete focus music file", error);
      }
      const nextEntries = installedEntries.filter(
        (entry) => entry.trackId !== id,
      );

      // 最新の手持ちの音楽リスト保存情報(メタ情報)をプロジェクト内と端末内(Async Storage)の両方で更新する
      try {
        await persistInstalledEntries(nextEntries);
      } catch (error) {
        return { ok: false, reason: "remove_failed" };
      }
      return { ok: true };
    },
    [installedEntries, persistInstalledEntries],
  );

  // 選択中のタスク集中音楽を変更する。
  const selectTrack = useCallback(
    (id: string) => {
      if (!installedEntries.some((entry) => entry.trackId === id)) return;
      setSelectedTrackId(id);
    },
    [installedEntries],
  );

  // ======
  // catalogByIdではDBにある全てのカタログ音楽データ配列を
  //  {
  //  曲のid  : { id: 曲のid,  title: 曲のタイトル},
  //  曲のid2 : { id: 曲のid2, title: 曲のタイトル2},
  //  }
  //  というオブジェクト形式のようなデータ形式(Map形式)でタスク集中音楽を整理
  //  Map形式で辞書のようにまとめることで索引しやすくなる
  //  ======
  const catalogById = useMemo(() => {
    const map = new Map<string, FocusMusicTrack>();
    catalog.forEach((track) => map.set(track.id, track));
    return map;
  }, [catalog]);

  // catalogByIdからインストール済みのものを抽出し手持ちのインストール済み音楽として配列化。
  // installedEntriesは「id」「端末の保存先」など最小限のメタ情報しかないため、ここでinstalledTracksとしてDBに保存されたタスク音楽情報を取得する。
  // （カタログから消えた曲はローカルで参照できなくなる。つまりローカルデータは残るが再生はできなくなるので注意）
  const installedTracks = useMemo(() => {
    const tracks = installedEntries
      .map((entry) => {
        const base = catalogById.get(entry.trackId);
        if (!base) return null;
        return { ...base, ...entry };
      })
      .filter(Boolean) as InstalledFocusTrack[];  // nullやundefinedはここで削ぎ落とす
    return tracks;
  }, [catalogById, installedEntries]);

  // ユーザ手持ちの曲(installedEntries)全てが最新のcatalogリストに入っているか検証
  useEffect(() => {
    if (catalog.length === 0) return;
    const validIds = new Set(catalog.map((item) => item.id));
    const filtered = installedEntries.filter((entry) =>
      validIds.has(entry.trackId),
    );
    if (filtered.length !== installedEntries.length) {
      persistInstalledEntries(filtered).catch(() => { });
    }
  }, [catalog, installedEntries, persistInstalledEntries]);

  //　catalogByIdから選択中の曲のDB情報を取得
  const selectedTrack = useMemo(
    () => (selectedTrackId ? (catalogById.get(selectedTrackId) ?? null) : null),
    [catalogById, selectedTrackId],
  );

  // selectedInstalledTrackに選択中の音楽の「端末保存情報」＋「DB音楽情報」を格納
  const selectedInstalledTrack = useMemo(() => {
    if (!selectedTrack) return null;
    const entry = installedEntries.find(
      (item) => item.trackId === selectedTrack.id,
    );
    if (!entry) return null;
    return { ...selectedTrack, ...entry };
  }, [installedEntries, selectedTrack]);

  // 選択中の音楽が無効になった場合に手持ち音楽リストの１番目の音楽を選択中にするフォールバック
  useEffect(() => {
    const installedIds = installedEntries.map((entry) => entry.trackId);
    if (selectedTrackId && installedIds.includes(selectedTrackId)) return;
    setSelectedTrackId(installedIds[0] ?? null);
  }, [installedEntries, selectedTrackId]);

  // 選択中の音楽を無限ループ再生。(タスクタイマーページでも音楽を選択できる)
  const playSelected = useCallback(async () => {
    if (!selectedInstalledTrack) return false;
    try {
      await setFocusPlaybackAudioMode(true);
      player.pause();
      await player.seekTo(0);
      player.loop = true;
      player.volume = 1;
      player.replace(selectedInstalledTrack.localPath);
      player.play();
      return true;
    } catch (error) {
      await setFocusPlaybackAudioMode(false).catch(() => { });
      captureExpoAudioError(error, "focus_music_play_selected");
      return false;
    }
  }, [player, selectedInstalledTrack, setFocusPlaybackAudioMode]);

  const pause = useCallback(() => {
    player.pause();
    void setFocusPlaybackAudioMode(false).catch(() => { });
  }, [player, setFocusPlaybackAudioMode]);

  const stop = useCallback(async () => {
    player.pause();
    await player.seekTo(0);
    await setFocusPlaybackAudioMode(false);
  }, [player, setFocusPlaybackAudioMode]);

  // useFocusMusicフックスとして返す値(グローバルに使用できる)
  const value = useMemo<FocusMusicContextValue>(
    () => ({
      catalog,
      installedTracks,
      installedIds: installedEntries.map((entry) => entry.trackId),
      selectedTrackId,
      selectedTrack: selectedInstalledTrack,
      maxInstalled: FOCUS_MUSIC_MAX_INSTALLED,
      monthlyDownloadLimit: FOCUS_MUSIC_MONTHLY_DOWNLOAD_LIMIT,
      monthlyDownloadRemaining,
      downloadResetAt,
      canInstall: installedEntries.length < FOCUS_MUSIC_MAX_INSTALLED,
      isInstalling,
      isDownloadInProgress,
      isLoadingCatalog,
      getInstallProgress,
      installTrack,
      removeTrack,
      selectTrack,
      isInstalled,
      playSelected,
      pause,
      stop,
      refreshCatalog,
    }),
    [
      catalog,
      installedEntries,
      installedTracks,
      isInstalling,
      isDownloadInProgress,
      isLoadingCatalog,
      getInstallProgress,
      monthlyDownloadRemaining,
      downloadResetAt,
      installTrack,
      isInstalled,
      removeTrack,
      selectTrack,
      selectedInstalledTrack,
      selectedTrackId,
      playSelected,
      pause,
      stop,
      refreshCatalog,
    ],
  );

  return (
    <FocusMusicContext.Provider value={value}>
      {children}
    </FocusMusicContext.Provider>
  );
}

export const useFocusMusic = () => {
  const ctx = useContext(FocusMusicContext);
  if (!ctx) {
    throw new Error("useFocusMusic must be used within FocusMusicProvider");
  }
  return ctx;
};
