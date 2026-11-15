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
