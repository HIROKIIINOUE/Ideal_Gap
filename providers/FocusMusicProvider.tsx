//　タスク集中音楽プロバイダー(曲をグローバルで管理)

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type FocusTrack = {
  id: string;
  title: string;
};

// インストールできる最大曲数
const MAX_INSTALLED = 5;

//　【ここチェック】【後で削除】タスク集中音楽のダミーデータ配列
const CATALOG_TRACKS: FocusTrack[] = Array.from({ length: 20 }, (_, index) => {
  const trackNumber = index + 1;

  return {
    id: `example${trackNumber}`,
    title: `example${trackNumber}`,
  };
});

type FocusMusicContextValue = {
  catalog: FocusTrack[];
  installedTracks: FocusTrack[];
  installedIds: string[];
  selectedTrackId: string | null;
  selectedTrack: FocusTrack | null;
  maxInstalled: number;
  canInstall: boolean;
  installTrack: (id: string) => void;
  removeTrack: (id: string) => void;
  selectTrack: (id: string) => void;
  isInstalled: (id: string) => boolean;
};

const FocusMusicContext = createContext<FocusMusicContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
};

export function FocusMusicProvider({ children }: ProviderProps) {
  const [installedIds, setInstalledIds] = useState<string[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>("");

  // 選択されていた曲が削除された時のフォールバック
  useEffect(() => {
    if (selectedTrackId && installedIds.includes(selectedTrackId)) return;
    setSelectedTrackId(installedIds[0] ?? null);
  }, [installedIds, selectedTrackId]);

  // すでにインストール済みかどうかの判定
  const isInstalled = useCallback(
    (id: string) => installedIds.includes(id),
    [installedIds],
  );

  // 曲インストールロジック
  const installTrack = useCallback((id: string) => {
    setInstalledIds((prev) => {
      if (prev.includes(id)) return prev;
      if (prev.length >= MAX_INSTALLED) return prev;
      const next = [...prev, id];
      if (next.length === 1) {
        setSelectedTrackId(id);
      }
      return next;
    });
  }, []);

  // 曲削除ロジック
  const removeTrack = useCallback((id: string) => {
    setInstalledIds((prev) => prev.filter((trackId) => trackId !== id));
  }, []);

  // デフォルト曲選択ロジック
  const selectTrack = useCallback(
    (id: string) => {
      if (!installedIds.includes(id)) return;
      setSelectedTrackId(id);
    },
    [installedIds],
  );

  // ======
  // catalogByIdではタスク集中音楽データの配列を
  //  {
  //  曲のid  : { id: 曲のid,  title: 曲のタイトル},
  //  曲のid2 : { id: 曲のid2, title: 曲のタイトル2},
  //  }
  //  というオブジェクト形式のようなデータ形式(Map形式)でタスク集中音楽を整理
  //  ======
  const catalogById = useMemo(() => {
    const map = new Map<string, FocusTrack>();
    CATALOG_TRACKS.forEach((track) => map.set(track.id, track));
    return map;
  }, []);

  // catalogByIdからインストール済みのものを抽出し手持ちのインストール済み音楽として配列化
  const installedTracks = useMemo(
    () =>
      installedIds
        .map((id) => catalogById.get(id))
        .filter(Boolean) as FocusTrack[], // undefinedを排除
    [catalogById, installedIds],
  );

  //　catalogByIdから洗濯中の曲(selectedTrackIdを抽出する)
  const selectedTrack = useMemo(
    () => (selectedTrackId ? (catalogById.get(selectedTrackId) ?? null) : null),
    [catalogById, selectedTrackId],
  );

  // useFocusMusicフックストして返す値(グローバルに使用できる)
  const value = useMemo<FocusMusicContextValue>(
    () => ({
      catalog: CATALOG_TRACKS,
      installedTracks,
      installedIds,
      selectedTrackId,
      selectedTrack,
      maxInstalled: MAX_INSTALLED,
      canInstall: installedIds.length < MAX_INSTALLED,
      installTrack,
      removeTrack,
      selectTrack,
      isInstalled,
    }),
    [
      installedIds,
      installedTracks,
      installTrack,
      isInstalled,
      removeTrack,
      selectTrack,
      selectedTrack,
      selectedTrackId,
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
