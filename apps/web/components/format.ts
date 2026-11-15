import type { Locale, Stay } from "@aurora/types";

import type { MessageKey } from "./i18n";

const intlLocale: Record<Locale, string> = {
  en: "en-GB",
  pl: "pl-PL",
  uk: "uk-UA",
};

/** Integer euro cents → localized whole-euro price. */
export function formatPrice(cents: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Message key for "stay/stays" in the locale's plural category. */
export function resultsKey(count: number, locale: Locale): MessageKey {
  const category = new Intl.PluralRules(intlLocale[locale]).select(count);
  if (category === "one") return "resultsOne";
  if (category === "few") return "resultsFew";
  return "resultsMany";
}

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export type PhotoView = "hero-day" | "side-day" | "aerial-day" | "hero-night";

export const photoViews: { view: PhotoView; label: MessageKey }[] = [
  { view: "hero-day", label: "photoHero" },
  { view: "side-day", label: "photoSide" },
  { view: "aerial-day", label: "photoAerial" },
  { view: "hero-night", label: "photoNight" },
];

/** Render of the code-built cabin in this stay's wood/metal finish. */
export function photo(stay: Stay, view: PhotoView) {
  const name = `${base}/stays/renders/${stay.look.wood}-${stay.look.metal}-${view}`;
  return {
    avif: `${name}-600.avif 600w, ${name}-1200.avif 1200w`,
    webp: `${name}-600.webp 600w, ${name}-1200.webp 1200w`,
    src: `${name}-1200.webp`,
  };
}

export const typeLabel: Record<Stay["type"], MessageKey> = {
  pod: "typePod",
  cabin: "typeCabin",
  lodge: "typeLodge",
};

export function amenityLabel(amenity: Stay["amenities"][number]) {
  return `amen_${amenity}` as MessageKey;
}

/** Message key for "night/nights" in the locale's plural category. */
export function nightsKey(count: number, locale: Locale): MessageKey {
  const category = new Intl.PluralRules(intlLocale[locale]).select(count);
  if (category === "one") return "nightOne";
  if (category === "few") return "nightFew";
  return "nightMany";
}

/** "2026-12-01" → localized date, always in UTC so it never shifts a day. */
export function formatDay(iso: string, locale: Locale, long = false) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: long ? "long" : "medium",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export { intlLocale };
