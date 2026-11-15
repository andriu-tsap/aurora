import { Injectable, computed, effect, signal } from "@angular/core";
import type { Amenity, Locale, RegionId } from "@aurora/types";

import { en, type Messages } from "./messages/en";
import { pl } from "./messages/pl";
import { uk } from "./messages/uk";

const dictionaries: Record<Locale, Messages> = { en, pl, uk };
/** Same key as the public site, so the language carries over to the panel. */
const STORAGE_KEY = "aurora-locale";
const intl: Record<Locale, string> = { en: "en-GB", pl: "pl-PL", uk: "uk-UA" };

const regionKey: Record<RegionId, keyof Messages> = {
  carpathians: "regionCarpathians",
  tatras: "regionTatras",
  adriatic: "regionAdriatic",
  "julian-alps": "regionJulianAlps",
};

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "pl" || stored === "uk") return stored;
  } catch {
    /* storage blocked: fall through to the browser language */
  }
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("pl")) return "pl";
  if (nav.startsWith("uk")) return "uk";
  return "en";
}

@Injectable({ providedIn: "root" })
export class I18n {
  readonly locale = signal<Locale>(initialLocale());
  readonly t = computed(() => dictionaries[this.locale()]);

  constructor() {
    effect(() => {
      const locale = this.locale();
      document.documentElement.lang = locale === "uk" ? "uk" : locale;
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        /* storage blocked: the language still applies for this visit */
      }
    });
  }

  /** Intl formatters for the current language; dates are UTC so a night never shifts a day. */
  private readonly formats = computed(() => {
    const loc = intl[this.locale()];
    return {
      monthYear: new Intl.DateTimeFormat(loc, { month: "long", year: "numeric", timeZone: "UTC" }),
      monthShort: new Intl.DateTimeFormat(loc, { month: "short", timeZone: "UTC" }),
      longDate: new Intl.DateTimeFormat(loc, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      weekdayShort: new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" }),
      weekdayLong: new Intl.DateTimeFormat(loc, { weekday: "long", timeZone: "UTC" }),
      compactEur: new Intl.NumberFormat(loc, {
        style: "currency",
        currency: "EUR",
        notation: "compact",
        maximumFractionDigits: 1,
      }),
      percent: new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }),
    };
  });

  /** Replaces `{name}` placeholders; an unknown placeholder is left visible rather than hidden. */
  fmt(template: string, params: Readonly<Record<string, string | number>>): string {
    return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
      key in params ? String(params[key]) : whole,
    );
  }

  private utc(iso: string): number {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d ?? 1);
  }

  /** "2026-11" → "November 2026". */
  monthYear(ym: string): string {
    return this.formats().monthYear.format(this.utc(`${ym}-01`));
  }

  /** "2026-11" → "Nov". */
  monthShort(ym: string): string {
    return this.formats().monthShort.format(this.utc(`${ym}-01`));
  }

  /** "2026-11-16" → "Monday, 16 November 2026". */
  longDate(iso: string): string {
    return this.formats().longDate.format(this.utc(iso));
  }

  /** `index` 0 = Monday. Uses a known Monday (2026-11-16) as the anchor. */
  weekday(index: number, style: "short" | "long"): string {
    const f = style === "short" ? this.formats().weekdayShort : this.formats().weekdayLong;
    return f.format(this.utc("2026-11-16") + index * 86_400_000);
  }

  eurCompact(cents: number): string {
    return this.formats().compactEur.format(cents / 100);
  }

  pct(value: number): string {
    return this.formats().percent.format(value);
  }

  region(id: RegionId): string {
    return this.t()[regionKey[id]];
  }

  amenity(a: Amenity): string {
    return this.t()[`amenity_${a}`];
  }

  eur(cents: number): string {
    return new Intl.NumberFormat(intl[this.locale()], {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  }
}
