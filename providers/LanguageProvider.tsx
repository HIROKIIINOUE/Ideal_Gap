// 言語選択表示機能を実現するi18nextのプロバイダー設定

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import i18n, { isSupportedLanguage } from "../i18n";
import { LanguageKey, SUPPORTED_LANGUAGES } from "../types/i18n";

type LanguageContextValue = {
  language: LanguageKey;
  setLanguage: (lang: LanguageKey) => Promise<void>;
  ready: boolean;
};

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "preferred_language";

// スマホの端末設定で指定した言語を取得
const detectDeviceLanguage = (): LanguageKey => {
  const locales = Localization.getLocales();
  const primary = locales?.[0];
  const code = primary?.languageCode?.toLowerCase();
  if (isSupportedLanguage(code)) {
    return code;
  }
  return "en";
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageKey>("en");
  const [ready, setReady] = useState(false);

  // 初期化、AsyncStorageのpreferred_languageを取得。保存データが無ければdetectDeviceLanguage()
  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      const initial = isSupportedLanguage(stored) ? stored : detectDeviceLanguage();
      await i18n.changeLanguage(initial);
      if (mounted) {
        setLanguageState(initial);
        setReady(true);
      }
    };
    initialize().catch(async () => {
      const fallback = detectDeviceLanguage();
      await i18n.changeLanguage(fallback);
      if (mounted) {
        setLanguageState(fallback);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 言語変更の一元処理（バリデーション→i18n 切替→state 反映→永続化）
  const persistLanguage = useCallback(async (lang: LanguageKey) => {
    const nextLanguage = SUPPORTED_LANGUAGES.includes(lang) ? lang : "en";
    await i18n.changeLanguage(nextLanguage);
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage: persistLanguage,
      ready,
    }),
    [language, persistLanguage, ready],
  );

  if (!ready) {
    return null;
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// Providerの外で呼ぶとエラーを投げ、言語選択を必ずProvider配下で使うことを保証。
export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

export default LanguageProvider;
