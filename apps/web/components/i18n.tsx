"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { messages, type Locale } from "./messages";

export type MessageKey = keyof (typeof messages)["en"];

// Fails to compile if any locale misses a key that English defines.
const dictionaries: Record<Locale, Record<MessageKey, string>> = messages;

const LocaleContext = createContext<Locale>("en");

/**
 * Minimal client-side translation provider. The copy has no ICU
 * placeholders, so a typed lookup replaces a full i18n runtime and keeps
 * the hydration bundle small.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useContext(LocaleContext);
  return useCallback(
    (key: MessageKey) => dictionaries[locale][key] ?? dictionaries.en[key],
    [locale],
  );
}

const STORAGE_KEY = "aurora-locale";

/** Persisted locale shared by every page (client-side switching). */
export function useLocaleState() {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "pl" || stored === "uk")
        setLocale(stored);
    } catch {
      /* Storage may be blocked. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const change = useCallback((value: Locale) => {
    setLocale(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* The session remains usable. */
    }
  }, []);
  return [locale, change] as const;
}
