"use client";
import { createContext, useCallback, useContext, type ReactNode } from "react";

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
