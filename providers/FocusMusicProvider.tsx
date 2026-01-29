//　タスク集中音楽プロバイダー(曲をグローバルで管理)

import NetInfo from "@react-native-community/netinfo";
import { useAudioPlayer } from "expo-audio";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchFocusMusicCatalog } from "../lib/focus-music/catalog";
import { FOCUS_MUSIC_MAX_INSTALLED } from "../lib/focus-music/constants";
import { deleteTrackFile, downloadTrackFile } from "../lib/focus-music/file";
import { createFocusMusicSignedUrl } from "../lib/focus-music/signedUrl";
import {
  loadInstalledTracks,
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
  canInstall: boolean;
  isInstalling: (id: string) => boolean;
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

export function FocusMusicProvider({ children }: ProviderProps) {
  const player = useAudioPlayer(null, { keepAudioSessionActive: true });
  const [catalog, setCatalog] = useState<FocusMusicTrack[]>([]);
  // インストールした曲のローカル保存情報の配列データ。これをもとに後に生成するinstalledTracksがユーザの手持ち曲のデータ配列になる
  const [installedEntries, setInstalledEntries] = useState<InstalledTrack[]>([]);
  const [installingIds, setInstallingIds] = useState<string[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  // 選択中の音楽(タスクタイマーで再生される)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);


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

  const persistInstalledEntries = useCallback(async (next: InstalledTrack[]) => {
    setInstalledEntries(next);
    await saveInstalledTracks(next);
  }, []);

  // タスク集中音楽ダウンロード、引数としてタスク集中音楽のid１つを受け取る
  const installTrack = useCallback(
    async (
      id: string,
      options: { allowCellular?: boolean } = {},
    ): Promise<InstallResult> => {
      if (installedEntries.some((entry) => entry.trackId === id)) {
        return { ok: false, reason: "already_installed" };
      }
      if (installedEntries.length >= FOCUS_MUSIC_MAX_INSTALLED) {
        return { ok: false, reason: "limit" };
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

        // 最新の手持ちの音楽リスト保存情報(メタ情報)をプロジェクト内と端末内(Async Storage)の両方で更新する
        await persistInstalledEntries(nextEntries);
        if (!selectedTrackId) {
          setSelectedTrackId(id);
        }
        return { ok: true, track: { ...track, ...nextEntry } };
      } catch (error) {
        return { ok: false, reason: "download_failed" };
      } finally {
        // ダウンロードが成功しても失敗してもダウンロード完了待ちリストから実行終了データを削除する
        setInstallingIds((prev) => prev.filter((trackId) => trackId !== id));
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
        return { ok: false, reason: "remove_failed" };
      }
      const nextEntries = installedEntries.filter(
        (entry) => entry.trackId !== id,
      );

      // 最新の手持ちの音楽リスト保存情報(メタ情報)をプロジェクト内と端末内(Async Storage)の両方で更新する
      await persistInstalledEntries(nextEntries);
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
    player.loop = true;
    player.replace(selectedInstalledTrack.localPath);
    player.play();
    return true;
  }, [player, selectedInstalledTrack]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const stop = useCallback(async () => {
    player.pause();
    await player.seekTo(0);
  }, [player]);

  // useFocusMusicフックストして返す値(グローバルに使用できる)
  const value = useMemo<FocusMusicContextValue>(
    () => ({
      catalog,
      installedTracks,
      installedIds: installedEntries.map((entry) => entry.trackId),
      selectedTrackId,
      selectedTrack: selectedInstalledTrack,
      maxInstalled: FOCUS_MUSIC_MAX_INSTALLED,
      canInstall: installedEntries.length < FOCUS_MUSIC_MAX_INSTALLED,
      isInstalling,
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
      isLoadingCatalog,
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
