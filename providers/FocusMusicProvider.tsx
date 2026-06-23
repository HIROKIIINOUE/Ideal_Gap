//　タスク集中音楽プロバイダー(曲をグローバルで管理)

import NetInfo from "@react-native-community/netinfo";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { getUserId } from "../lib/api/supabase/common";
import { fetchFocusMusicCatalog } from "../lib/focus-music/catalog";
import { FOCUS_MUSIC_MAX_INSTALLED } from "../lib/focus-music/constants";
import {
  deleteTrackFile,
  downloadTrackFile,
  getFocusMusicFileInfo,
  getFocusMusicFileName,
  getFocusMusicLocalUri,
} from "../lib/focus-music/file";
import {
  type FocusMusicDownloadQuota,
  type FocusMusicDownloadQuotaAccessMode,
  consumeFocusMusicDownloadQuota,
  loadFocusMusicDownloadQuota,
} from "../lib/focus-music/quota";
import { createFocusMusicSignedUrl } from "../lib/focus-music/signedUrl";
import { loadInstalledTracks, saveInstalledTracks } from "../lib/focus-music/storage";
import {
  addSentryBreadcrumb,
  captureExpoAudioError,
  captureMusicDownloadError,
} from "../lib/sentry";
import { ensureUserProfileForAuthUser } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";
import { getUsageLimit } from "../lib/usageLimits";
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
  monthlyDownloadAccessMode: FocusMusicDownloadQuotaAccessMode;
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
  refreshDownloadQuota: () => Promise<void>;
};

const FocusMusicContext = createContext<FocusMusicContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
};

const areInstalledEntriesEqual = (
  current: InstalledTrack[],
  next: InstalledTrack[],
) => JSON.stringify(current) === JSON.stringify(next);

//  2_147_483_647 は setTimeout()に渡せる32bit 符号付き整数の最大値で、ミリ秒だと約 24.8 日に当たる
//  30日を直接渡せないので24.8日を渡し、それ以降にアプリが起動された場合は再計算することでDL制限日がズレない
const MAX_TIMEOUT_MS = 2_147_483_647;

const reconcileInstalledEntries = async (
  tracks: FocusMusicTrack[],
  installed: InstalledTrack[],
) => {
  const catalogByTrackId = new Map(tracks.map((track) => [track.id, track]));
  const reconciled: InstalledTrack[] = [];
  const seenTrackIds = new Set<string>();

  for (const entry of installed) {
    if (seenTrackIds.has(entry.trackId)) continue;
    const track = catalogByTrackId.get(entry.trackId);
    if (!track) continue;

    const fileName = getFocusMusicFileName(track);
    const fileInfo = await getFocusMusicFileInfo(fileName);
    if (!fileInfo.exists) continue;

    reconciled.push({
      trackId: entry.trackId,
      fileName,
      downloadedAt: entry.downloadedAt,
    });
    seenTrackIds.add(entry.trackId);
  }

  return reconciled;
};

export function FocusMusicProvider({ children }: ProviderProps) {
  // playerは音楽再生プレイヤーの本体。player.play(),player.pause()などで音楽をコントロールする
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
  // 各ユーザの1ヶ月のDL数を制御
  const [monthlyDownloadLimit, setMonthlyDownloadLimit] = useState(
    getUsageLimit("focusMusicDownloads", "free") ?? 0,
  );
  const [monthlyDownloadRemaining, setMonthlyDownloadRemaining] = useState<number | null>(null);
  const [downloadResetAt, setDownloadResetAt] = useState<string | null>(null);
  const [monthlyDownloadAccessMode, setMonthlyDownloadAccessMode] =
    useState<FocusMusicDownloadQuotaAccessMode>("free");
  // 選択中の音楽(タスクタイマーで再生される)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const isDownloadingRef = useRef(false);
  const catalogRef = useRef<FocusMusicTrack[]>([]);
  const quotaResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (quotaResetTimeoutRef.current) {
        clearTimeout(quotaResetTimeoutRef.current);
      }
    };
  }, []);


  // 音楽が再生されている時のみbackground: true設定をONにする(充電消費節約対策)
  const setFocusPlaybackAudioMode = useCallback(
    async (shouldPlayInBackground: boolean) => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground,
        interruptionMode: "doNotMix",
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
    },
    [],
  );

  // DLの上限、残りDL可能数、リセット日が更新される
  const applyQuotaState = useCallback((quota: FocusMusicDownloadQuota) => {
    if (!isMountedRef.current) return;
    setMonthlyDownloadAccessMode(quota.accessMode);
    setMonthlyDownloadLimit(quota.limit);
    setMonthlyDownloadRemaining(quota.remaining);
    setDownloadResetAt(quota.resetAt);
  }, []);


  // 月間ダウンロード枠の状態を読み直して、次のリセット時刻に合わせて自動更新を予約する
  const refreshDownloadQuota = useCallback(
    async (providedUserId?: string | null) => {
      const userId = providedUserId ?? (await getUserId());

      if (quotaResetTimeoutRef.current) {
        clearTimeout(quotaResetTimeoutRef.current);
        quotaResetTimeoutRef.current = null;
      }

      if (!userId) {
        if (isMountedRef.current) {
          setMonthlyDownloadAccessMode("free");
          setMonthlyDownloadLimit(
            getUsageLimit("focusMusicDownloads", "free") ?? 0,
          );
          setMonthlyDownloadRemaining(null);
          setDownloadResetAt(null);
        }
        return;
      }

      // userIDと現在時刻を投げ、そのユーザに紐付くfocus_music_download_quotasが存在するかどうかを確かめ、存在する場合はそのデータを用いて表示・事前判定用の現在状態をquotaに格納。focus_music_download_quotasが存在しない場合は「DLをまだしていないもの」として初期値をquotaに格納
      const quota = await loadFocusMusicDownloadQuota(userId);
      if (!isMountedRef.current) return;

      applyQuotaState(quota);

      const resetAtTime = quota.resetAt ? Date.parse(quota.resetAt) : Number.NaN;
      if (Number.isNaN(resetAtTime)) return;

      const scheduleDelay = Math.max(resetAtTime - Date.now(), 0);
      quotaResetTimeoutRef.current = setTimeout(() => {
        void refreshDownloadQuota(userId);
      }, Math.min(scheduleDelay, MAX_TIMEOUT_MS));
    },
    [applyQuotaState],
  );

  // download quota (今月の曲のDL数と制限リセット日)を取得し、状態関数を更新
  useEffect(() => {
    void refreshDownloadQuota();
  }, [refreshDownloadQuota]);


  // アプリ復帰時(foregroundに戻ってきた時)にdownload quota を最新化する
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        const previousAppState =
          typeof appStateRef.current === "string" ? appStateRef.current : "";
        if (
          previousAppState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          void refreshDownloadQuota();
        }
        appStateRef.current = nextAppState;
      },
    );

    return () => {
      subscription?.remove?.();
    };
  }, [refreshDownloadQuota]);

  // カタログを最新のものに更新
  const refreshCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const [tracks, installed] = await Promise.all([
        fetchFocusMusicCatalog(),
        loadInstalledTracks(),
      ]);
      const reconciledInstalled = await reconcileInstalledEntries(
        tracks,
        installed,
      );
      catalogRef.current = tracks;
      setCatalog(tracks);
      setInstalledEntries(reconciledInstalled);
      if (!areInstalledEntriesEqual(installed, reconciledInstalled)) {
        await saveInstalledTracks(reconciledInstalled);
      }
    } catch (error) {
      console.warn("Failed to fetch focus music catalog", error);
      const currentTracks = catalogRef.current;
      if (currentTracks.length > 0) {
        const installed = await loadInstalledTracks();
        const reconciledInstalled = await reconcileInstalledEntries(
          currentTracks,
          installed,
        );
        setInstalledEntries(reconciledInstalled);
        if (!areInstalledEntriesEqual(installed, reconciledInstalled)) {
          await saveInstalledTracks(reconciledInstalled);
        }
      }
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
        const reconciledInstalled = await reconcileInstalledEntries(
          tracks,
          installed,
        );
        if (!active) return;
        catalogRef.current = tracks;
        setCatalog(tracks);
        setInstalledEntries(reconciledInstalled);
        if (!areInstalledEntriesEqual(installed, reconciledInstalled)) {
          await saveInstalledTracks(reconciledInstalled);
        }
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


  // ダウンロードされた音楽ファイルをローカルから削除する処理
  const rollbackInstalledTrackFile = useCallback(
    async (track: Pick<InstalledTrack, "fileName" | "trackId">) => {
      try {
        await deleteTrackFile(track.fileName);
      } catch (error) {
        console.warn("Failed to rollback focus music file", error);
        captureMusicDownloadError(error, track.trackId, "download");
      }
    },
    [],
  );

  // OAuthで認証したユーザが確実にDBにもユーザデータを持つための処理
  const ensureAuthenticatedUserProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || data.user.id !== userId) {
        throw new Error(error?.message ?? "Authenticated user was not found");
      }
      // Google/Apple認証完了後にDBに該当ユーザが存在するか確認、しなければ作成する
      await ensureUserProfileForAuthUser(data.user);
    },
    [],
  );

  // ユーザがダウンロード可能な状態か(上限に達してないか等)を確認。その処理中にエラーが起きればOAuthでDBにユーザ情報がない可能性をensureAuthenticatedUserProfile()で潰してから再確認。
  const consumeQuotaWithProfileRecovery = useCallback(
    async (userId: string) => {
      try {
        // DB側(rpc)でfocus_music_download_quotasと連携し「ユーザの月間DLの上限に達していないか」「達成していたらNG,DL可能ならOKを返す」「ダウンロード可能なら最新のfocus_music_download_quotas(月間DL数を+1する)を返す
        return await consumeFocusMusicDownloadQuota(userId);
      } catch (error) {
        addSentryBreadcrumb("focus_music", "focus_music_quota_profile_recovery_started", {
          userId,
        });
        await ensureAuthenticatedUserProfile(userId);
        return await consumeFocusMusicDownloadQuota(userId);
      }
    },
    [ensureAuthenticatedUserProfile],
  );

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

      // ダウンロード開始前に再度最新のユーザ月間DL数、DL上限、リセット日などのデータを取得し、フロント側も最新のデータに更新する
      const quota = await loadFocusMusicDownloadQuota(userId);
      applyQuotaState(quota);
      if (quota.remaining <= 0) {
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
      let localPath: string;
      try {
        addSentryBreadcrumb("focus_music", "focus_music_signed_url_requested", {
          trackId: id,
        });
        // signedUrl発行
        const signedUrl = await createFocusMusicSignedUrl(id);
        addSentryBreadcrumb("focus_music", "focus_music_download_started", {
          trackId: id,
        });

        // ローカルファイルへダウンロード。resultとしてローカルの格納先を返却してる。
        localPath = await downloadTrackFile(
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
      } catch (error) {
        captureMusicDownloadError(error, id, "download");
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

      // ===以降はダウンロード(DL)後の処理、DL完了音楽データをリストに格納。また、ユーザの音楽DL数が上限に達しているかどうか確認し達していれば今回DLした音楽はrollbackInstalledTrackFileで削除される。上限に達していなければDBのDL数カウントを+1させる===
      // 今回ダウンロードしたタスク集中音楽の保存情報データ
      const nextEntry: InstalledTrack = {
        trackId: id,
        fileName: getFocusMusicFileName(track),
        downloadedAt: new Date().toISOString(),
      };

      let quotaConsumeResult: Awaited<
        ReturnType<typeof consumeFocusMusicDownloadQuota>
      >;
      try {
        addSentryBreadcrumb("focus_music", "focus_music_quota_consumption_started", {
          trackId: id,
          userId,
        });
        // ユーザがダウンロード可能な状態か(上限に達してないか等)を確認。「ユーザの月間DLの上限に達していないか」「達成していたらNG,DL可能ならOKを返す」「ダウンロード可能なら最新のfocus_music_download_quotas(月間DL数を+1する)を返す
        quotaConsumeResult = await consumeQuotaWithProfileRecovery(userId);
      } catch (error) {
        // エラーが出たら今回DLした音楽を削除する
        await rollbackInstalledTrackFile(nextEntry);
        captureMusicDownloadError(error, id, "quota_consume");
        return { ok: false, reason: "download_failed" };
      }

      // ユーザが音楽DLを許されていない状況(月間DL上限突破など)の時は今回DLした音楽を削除する
      if (!quotaConsumeResult.ok) {
        await rollbackInstalledTrackFile(nextEntry);
        await refreshDownloadQuota(userId);
        return { ok: false, reason: "monthly_limit" };
      }

      // DB上でもユーザのDL権限に問題がないときは今回DLした音楽を含めた新しい音楽情報リストをアプリで保持する
      const nextEntries = [...installedEntries, nextEntry];
      setInstalledEntries(nextEntries);
      try {
        await saveInstalledTracks(nextEntries);
      } catch (error) {
        console.warn("Failed to persist installed focus music metadata", error);
        captureMusicDownloadError(error, id, "metadata_persist");
      }

      applyQuotaState(quotaConsumeResult.quota);
      if (!selectedTrackId) {
        setSelectedTrackId(id);
      }
      return { ok: true, track: { ...track, ...nextEntry, localPath } };
    },
    [
      applyQuotaState,
      catalog,
      consumeQuotaWithProfileRecovery,
      installedEntries,
      refreshDownloadQuota,
      rollbackInstalledTrackFile,
      selectedTrackId,
    ],
  );

  // タスク集中音楽の削除、引数としてタスク集中音楽のid１つを受け取る
  const removeTrack = useCallback(
    async (id: string): Promise<RemoveResult> => {
      // 削除したい「既にインストールされた音楽」の保存情報を取得
      const target = installedEntries.find((entry) => entry.trackId === id);
      if (!target) return { ok: false, reason: "not_installed" };
      try {
        await deleteTrackFile(target.fileName);
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
        return {
          ...base,
          ...entry,
          localPath: getFocusMusicLocalUri(entry.fileName),
        };
      })
      .filter(Boolean) as InstalledFocusTrack[];  // nullやundefinedはここで削ぎ落とす
    return tracks;
  }, [catalogById, installedEntries]);

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
    return {
      ...selectedTrack,
      ...entry,
      localPath: getFocusMusicLocalUri(entry.fileName),
    };
  }, [installedEntries, selectedTrack]);

  // Androidのバックグラウンド音楽再生が安定するようにOSに「今このプレイヤーがバックグラウンド再生の主体です」と伝えている
  const setLockScreenActive = useCallback(
    async (active: boolean) => {
      if (!selectedInstalledTrack) return;

      if (active && Platform.OS === "android") {
        await Notifications.requestPermissionsAsync().catch(() => null);
      }

      player.setActiveForLockScreen(
        active,
        active
          ? {
            title: selectedInstalledTrack.title,
            artist: "Ideal Gap",
          }
          : undefined,
      );
    },
    [player, selectedInstalledTrack],
  );

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
      const fileInfo = await getFocusMusicFileInfo(
        selectedInstalledTrack.fileName,
      );
      if (!fileInfo.exists) {
        const nextEntries = installedEntries.filter(
          (entry) => entry.trackId !== selectedInstalledTrack.id,
        );
        await persistInstalledEntries(nextEntries);
        return false;
      }
      await setFocusPlaybackAudioMode(true);
      player.pause();
      await player.seekTo(0);
      player.loop = true;
      player.volume = 1;
      player.replace(fileInfo.localPath);
      // 音楽再生時にandroidでもバックグラウンド再生を安定させる処理
      await setLockScreenActive(true);
      player.play();
      addSentryBreadcrumb("focus_music", "focus_music_play_started", {
        trackId: selectedInstalledTrack.id,
        trackTitle: selectedInstalledTrack.title,
      });
      return true;
    } catch (error) {
      // エラー時にandroidバックグラウンド安定化処理をストップ
      await setLockScreenActive(false).catch(() => { });
      await setFocusPlaybackAudioMode(false).catch(() => { });
      captureExpoAudioError(error, "focus_music_play_selected");
      return false;
    }
  }, [
    installedEntries,
    persistInstalledEntries,
    player,
    setLockScreenActive,
    selectedInstalledTrack,
    setFocusPlaybackAudioMode,
  ]);

  const pause = useCallback(() => {
    try {
      player.pause();
      // 音楽停止時にandroidバックグラウンド安定化処理をストップ
      void setLockScreenActive(false).catch(() => { });
      addSentryBreadcrumb("focus_music", "focus_music_paused", {
        trackId: selectedInstalledTrack?.id ?? null,
      });
    } catch (error) {
      captureExpoAudioError(error, "focus_music_pause");
    }
    void setFocusPlaybackAudioMode(false).catch((error) => {
      captureExpoAudioError(error, "focus_music_pause_audio_mode");
    });
  }, [player, selectedInstalledTrack?.id, setFocusPlaybackAudioMode, setLockScreenActive]);

  const stop = useCallback(async () => {
    try {
      player.pause();
      // 音楽停止時にandroidバックグラウンド安定化処理をストップ
      await setLockScreenActive(false);
      await player.seekTo(0);
      await setFocusPlaybackAudioMode(false);
      addSentryBreadcrumb("focus_music", "focus_music_stopped", {
        trackId: selectedInstalledTrack?.id ?? null,
      });
    } catch (error) {
      captureExpoAudioError(error, "focus_music_stop");
    }
  }, [player, selectedInstalledTrack?.id, setFocusPlaybackAudioMode, setLockScreenActive]);

  // useFocusMusicフックスとして返す値(グローバルに使用できる)
  const value = useMemo<FocusMusicContextValue>(
    () => ({
      catalog,
      installedTracks,
      installedIds: installedEntries.map((entry) => entry.trackId),
      selectedTrackId,
      selectedTrack: selectedInstalledTrack,
      maxInstalled: FOCUS_MUSIC_MAX_INSTALLED,
      monthlyDownloadLimit,
      monthlyDownloadRemaining,
      downloadResetAt,
      monthlyDownloadAccessMode,
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
      refreshDownloadQuota,
    }),
    [
      catalog,
      installedEntries,
      installedTracks,
      isInstalling,
      isDownloadInProgress,
      isLoadingCatalog,
      getInstallProgress,
      monthlyDownloadLimit,
      monthlyDownloadRemaining,
      downloadResetAt,
      monthlyDownloadAccessMode,
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
      refreshDownloadQuota,
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
