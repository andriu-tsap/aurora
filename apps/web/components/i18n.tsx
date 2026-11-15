"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Locale } from "./messages";
import { en, type MessageKey } from "./messages/en";

export type { MessageKey };

type Dictionary = Record<MessageKey, string>;

// English ships with the page; Polish and Ukrainian load on demand so the
// first paint only parses one language.
const cache: Partial<Record<Locale, Dictionary>> = { en };
const loaders: Record<Exclude<Locale, "en">, () => Promise<Dictionary>> = {
  pl: () => import("./messages/pl").then((m) => m.pl),
  uk: () => import("./messages/uk").then((m) => m.uk),
};

async function loadDictionary(locale: Locale): Promise<Dictionary> {
  const cached = cache[locale];
  if (cached) return cached;
  const dict = await loaders[locale as Exclude<Locale, "en">]();
  cache[locale] = dict;
  return dict;
}

const LocaleContext = createContext<{ locale: Locale; dict: Dictionary }>({
  locale: "en",
  dict: en,
});

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
  const dict = cache[locale] ?? en;
  return (
    <LocaleContext.Provider value={{ locale, dict }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useT() {
  const { dict } = useContext(LocaleContext);
  return useCallback((key: MessageKey) => dict[key] ?? en[key], [dict]);
}

const STORAGE_KEY = "aurora-locale";

/**
 * Persisted locale shared by every page (client-side switching). The locale
 * only changes once its dictionary has loaded, so text never flashes keys.
 */
export function useLocaleState() {
  const [locale, setLocale] = useState<Locale>("en");
  const apply = useCallback(async (value: Locale) => {
    try {
      await loadDictionary(value);
      setLocale(value);
    } catch {
      /* Keep the current language if a chunk fails to load. */
    }
  }, []);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "pl" || stored === "uk") void apply(stored);
    } catch {
      /* Storage may be blocked. */
    }
  }, [apply]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const change = useCallback(
    (value: Locale) => {
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        /* The session remains usable. */
      }
      void apply(value);
    },
    [apply],
  );
  return [locale, change] as const;
}
