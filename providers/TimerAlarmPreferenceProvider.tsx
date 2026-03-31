import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type TimerAlarmPreferenceContextValue = {
  timerAlarmEnabled: boolean;
  setTimerAlarmEnabled: (enabled: boolean) => void;
};

const TimerAlarmPreferenceContext = createContext<
  TimerAlarmPreferenceContextValue | undefined
>(undefined);

export const TIMER_ALARM_ENABLED_STORAGE_KEY = "timer_alarm_enabled";

export const TimerAlarmPreferenceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [timerAlarmEnabled, setTimerAlarmEnabledState] = useState(true);


  // アプリ起動時にlocalStorageからアラーム機能のON or OFF情報を取得
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(TIMER_ALARM_ENABLED_STORAGE_KEY);
        if (stored !== null) {
          setTimerAlarmEnabledState(stored === "true");
        }
      } catch (error) {
        console.warn("Failed to load timer alarm preference", error);
      }
    };
    load();
  }, []);

  // 状態を更新しAsyncStorageも同値に更新する
  const setTimerAlarmEnabled = (enabled: boolean) => {
    setTimerAlarmEnabledState(enabled);
    AsyncStorage.setItem(
      TIMER_ALARM_ENABLED_STORAGE_KEY,
      enabled ? "true" : "false",
    ).catch((error) => {
      console.warn("Failed to persist timer alarm preference", error);
    });
  };

  const value = useMemo(
    () => ({
      timerAlarmEnabled,
      setTimerAlarmEnabled,
    }),
    [timerAlarmEnabled],
  );

  return (
    <TimerAlarmPreferenceContext.Provider value={value}>
      {children}
    </TimerAlarmPreferenceContext.Provider>
  );
};

export const useTimerAlarmPreference = () => {
  const ctx = useContext(TimerAlarmPreferenceContext);
  if (!ctx) {
    throw new Error(
      "useTimerAlarmPreference must be used within TimerAlarmPreferenceProvider",
    );
  }
  return ctx;
};
