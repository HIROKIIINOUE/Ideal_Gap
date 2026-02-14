//　タスク集中音楽プロバイダー(曲をグローバルで管理)

import NetInfo from "@react-native-community/netinfo";
import { useAudioPlayer } from "expo-audio";
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
  FocusMusicTrack,
  InstalledFocusTrack,
  InstalledTrack,
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


// ここの値で音楽ループの繋ぎ目を調整
const CROSSFADE_DURATION_MS = 600;
const CROSSFADE_START_BEFORE_END_SEC = 0.9;
const FADE_INTERVAL_MS = 50;
const MONITOR_INTERVAL_MS = 50;


// ループの繋ぎ目問題を解消するために同じ作業用音楽を同時に2つ再生
// 二つ目の曲を一つ目の曲の終了直前に流しループをスムーズに。
// (詳しくはNotionの生成音楽アイデアページに記載済み)
export function FocusMusicProvider({ children }: ProviderProps) {
  const playerA = useAudioPlayer(null, {
    keepAudioSessionActive: true,
    downloadFirst: true,
    updateInterval: 100,
  });
  const playerB = useAudioPlayer(null, {
    keepAudioSessionActive: true,
    downloadFirst: true,
    updateInterval: 100,
  });
  const [catalog, setCatalog] = useState<FocusMusicTrack[]>([]);
  // インストールした曲のローカル保存情報の配列データ。これをもとに後に生成するinstalledTracksがユーザの手持ち曲のデータ配列になる
  const [installedEntries, setInstalledEntries] = useState<InstalledTrack[]>([]);
  const [installingIds, setInstallingIds] = useState<string[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  // 書くユーザの1ヶ月のDL数を制御
  const [monthlyDownloadRemaining, setMonthlyDownloadRemaining] = useState<number | null>(null);
  const [downloadResetAt, setDownloadResetAt] = useState<string | null>(null);
  // 選択中の音楽(タスクタイマーで再生される)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // ループの繋ぎ目をスムーズにするために必要な状態変数群
  const activeSlotRef = useRef<"A" | "B">("A");
  const monitorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossfadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCrossfadingRef = useRef(false);
  const currentTrackIdRef = useRef<string | null>(null);
  const currentTrackPathRef = useRef<string | null>(null);
  const isDownloadingRef = useRef(false);
  useEffect(() => {
    return () => {
      if (monitorTimerRef.current) {
        clearInterval(monitorTimerRef.current);
        monitorTimerRef.current = null;
      }
      if (crossfadeTimerRef.current) {
        clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;
      }
    };
  }, []);


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

  // 【ここチェック】現段階では使用していない。ユーザがUIからカタログを手動更新する関数。今後必要の可否を検討
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
      try {
        const signedUrl = await createFocusMusicSignedUrl(id); // signedUrl発行
        const localPath = await downloadTrackFile(signedUrl, track);  //ローカルファイルへダウンロード。ローカルの格納先を返却してる。
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
        return { ok: false, reason: "download_failed" };
      } finally {
        // ダウンロードが成功しても失敗してもダウンロード完了待ちリストから実行終了データを削除する
        setInstallingIds((prev) => prev.filter((trackId) => trackId !== id));
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
    if (monitorTimerRef.current) {
      clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
    if (crossfadeTimerRef.current) {
      clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    isCrossfadingRef.current = false;
    activeSlotRef.current = "A";
    currentTrackIdRef.current = selectedInstalledTrack.id;
    currentTrackPathRef.current = selectedInstalledTrack.localPath;

    playerA.pause();
    playerB.pause();
    await Promise.all([playerA.seekTo(0), playerB.seekTo(0)]);

    playerA.loop = false;
    playerB.loop = false;

    playerA.replace(selectedInstalledTrack.localPath);
    playerA.volume = 1;
    playerA.play();

    playerB.replace(selectedInstalledTrack.localPath);
    playerB.volume = 0;
    await playerB.seekTo(0);
    playerB.pause();

    if (!monitorTimerRef.current) {
      monitorTimerRef.current = setInterval(() => {
        if (isCrossfadingRef.current) return;
        const activePlayer =
          activeSlotRef.current === "A" ? playerA : playerB;
        if (activePlayer.paused) return;
        if (!activePlayer.isLoaded || activePlayer.isBuffering) return;
        const duration = activePlayer.duration ?? 0;
        if (!Number.isFinite(duration) || duration <= 0) return;
        const currentTime = activePlayer.currentTime ?? 0;
        const remaining = duration - currentTime;
        if (remaining > CROSSFADE_START_BEFORE_END_SEC) return;

        const nextPath = currentTrackPathRef.current;
        if (!nextPath || !currentTrackIdRef.current) return;
        const standbyPlayer = activeSlotRef.current === "A" ? playerB : playerA;

        isCrossfadingRef.current = true;
        standbyPlayer.loop = false;
        standbyPlayer.volume = 0;
        void standbyPlayer.seekTo(0);
        standbyPlayer.play();

        const steps = Math.max(
          1,
          Math.ceil(CROSSFADE_DURATION_MS / FADE_INTERVAL_MS),
        );
        let step = 0;
        if (crossfadeTimerRef.current) {
          clearInterval(crossfadeTimerRef.current);
        }
        crossfadeTimerRef.current = setInterval(() => {
          step += 1;
          const progress = Math.min(1, step / steps);
          activePlayer.volume = Math.max(0, 1 - progress);
          standbyPlayer.volume = Math.min(1, progress);
          if (progress < 1) return;
          if (crossfadeTimerRef.current) {
            clearInterval(crossfadeTimerRef.current);
            crossfadeTimerRef.current = null;
          }
          activePlayer.pause();
          void activePlayer.seekTo(0);
          activePlayer.volume = 0;
          standbyPlayer.volume = 1;
          activeSlotRef.current =
            activeSlotRef.current === "A" ? "B" : "A";
          isCrossfadingRef.current = false;
        }, FADE_INTERVAL_MS);
      }, MONITOR_INTERVAL_MS);
    }
    return true;
  }, [playerA, playerB, selectedInstalledTrack]);

  const pause = useCallback(() => {
    if (monitorTimerRef.current) {
      clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
    if (crossfadeTimerRef.current) {
      clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    isCrossfadingRef.current = false;
    playerA.pause();
    playerB.pause();
  }, [playerA, playerB]);

  const stop = useCallback(async () => {
    if (monitorTimerRef.current) {
      clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
    if (crossfadeTimerRef.current) {
      clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    isCrossfadingRef.current = false;
    playerA.pause();
    playerB.pause();
    await Promise.all([playerA.seekTo(0), playerB.seekTo(0)]);
  }, [playerA, playerB]);

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
