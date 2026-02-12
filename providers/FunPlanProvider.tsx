//　「次回の楽しい予定」カードの表示・非表示をAsyncStorageとuseContext()で管理
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type FunPlanContextValue = {
  funPlanVisible: boolean;
  toggleFunPlan: () => void;
};

const FunPlanContext = createContext<FunPlanContextValue | undefined>(undefined);

const STORAGE_KEY = "funPlanVisible";

export const FunPlanProvider = ({ children }: { children: ReactNode }) => {
  const [funPlanVisible, setFunPlanVisible] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          setFunPlanVisible(stored === "true");
        }
      } catch (error) {
        console.warn("Failed to load funPlanVisible", error);
      }
    };
    load();
  }, []);

  const toggleFunPlan = () => {
    setFunPlanVisible((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? "true" : "false").catch((error) => {
        console.warn("Failed to persist funPlanVisible", error);
      });
      return next;
    });
  };

  const value = useMemo(
    () => ({
      funPlanVisible,
      toggleFunPlan,
    }),
    [funPlanVisible],
  );

  return <FunPlanContext.Provider value={value}>{children}</FunPlanContext.Provider>;
};

export const useFunPlan = () => {
  const ctx = useContext(FunPlanContext);
  if (!ctx) {
    throw new Error("useFunPlan must be used within FunPlanProvider");
  }
  return ctx;
};
