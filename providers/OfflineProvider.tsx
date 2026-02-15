// ネットワークの状態が変わるたびにオンラインかオフラインかを判定しアプリ全体に共有

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// isConnectedは「端末が何らかのネットワーク(Wi-Fi or Cellular)に接続しているかどうかを」判定
// isInternetReachableは「実際にそのネットワークでインターネットに到達可能かどうか」判定
// この二つでオフライン判定することで「ネットワークには繋がってる風だけど実際は通信不可」の状態を厳しく取り締まれる
type OfflineContextValue = {
  offlineBlocked: boolean;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  refresh: () => Promise<void>;
};

const defaultOfflineState: OfflineContextValue = {
  offlineBlocked: false,
  isConnected: null,
  isInternetReachable: null,
  refresh: async () => { },
};

const OfflineContext = createContext<OfflineContextValue>(defaultOfflineState);

// isConnected or isInternetReachable のどちらかがfalseならオフライン判定(offlineBlocked=true)となる
const toOfflineBlocked = (state: Pick<NetInfoState, "isConnected" | "isInternetReachable">) =>
  state.isConnected === false || state.isInternetReachable === false;

type OfflineProviderProps = {
  children: React.ReactNode;
};

export const OfflineProvider = ({ children }: OfflineProviderProps) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const isMountedRef = useRef(true);

  // 最新のNetInfo実行結果から現在のネットワーク状況を更新する
  const syncState = useCallback((state: NetInfoState) => {
    if (!isMountedRef.current) return;
    setIsConnected(state.isConnected);
    setIsInternetReachable(state.isInternetReachable);
  }, []);

  // NetInfoでネット状況を調べ、stateとしてsyncState()に投げる
  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    syncState(state);
  }, [syncState]);

  useEffect(() => {
    isMountedRef.current = true;
    refresh().catch(() => { });

    //　発火待ちの関数ではない、useEffect実行時に即時実行される。
    // ネット状況が変わるたびにsyncStateを発火するようになる
    // NetInfo.addEventListenerは戻り値として解除関数を返すためunsubscribeで保持
    const unsubscribe = NetInfo.addEventListener(syncState);

    return () => {
      isMountedRef.current = false;
      unsubscribe();  // 上で保持した解除関数をここで実行しsyncStateのリスナー解除
    };
  }, [refresh, syncState]);

  const value = useMemo(
    () => ({
      offlineBlocked: toOfflineBlocked({ isConnected, isInternetReachable }),
      isConnected,
      isInternetReachable,
      refresh,
    }),
    [isConnected, isInternetReachable, refresh],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = (): OfflineContextValue => {
  return useContext(OfflineContext);
};
