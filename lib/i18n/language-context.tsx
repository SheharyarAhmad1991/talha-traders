"use client";

import * as React from "react";
import en from "@/lib/i18n/en.json";
import ur from "@/lib/i18n/ur.json";

export type Language = "en" | "ur";
export type TranslationKey = keyof typeof en;

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en,
  ur,
};

const STORAGE_KEY = "umer-traders-lang";

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

function applyDocumentLang(lang: Language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang === "ur" ? "ur" : "en";
  document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>("en");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next: Language = stored === "ur" ? "ur" : "en";
    setLanguageState(next);
    applyDocumentLang(next);
  }, []);

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);
    window.localStorage.setItem(STORAGE_KEY, lang);
    applyDocumentLang(lang);
  }, []);

  const toggleLanguage = React.useCallback(() => {
    setLanguage(language === "en" ? "ur" : "en");
  }, [language, setLanguage]);

  const t = React.useCallback(
    (key: TranslationKey) => {
      return dictionaries[language][key] ?? dictionaries.en[key] ?? key;
    },
    [language]
  );

  const value = React.useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
