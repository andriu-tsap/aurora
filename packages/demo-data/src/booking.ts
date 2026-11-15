import type { Season, Stay } from "@aurora/types";

/** Calendar day as "YYYY-MM-DD" (UTC, no time zones involved). */
export type IsoDate = string;

const DAY_MS = 86_400_000;
/** Fixed epoch so "busy" dates never depend on the visitor's clock. */
const EPOCH: IsoDate = "2026-01-01";
const HORIZON_DAYS = 900;

export function parseIso(d: IsoDate): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function toIso(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return toIso(parseIso(d) + n * DAY_MS);
}

export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): number {
  return Math.round((parseIso(checkOut) - parseIso(checkIn)) / DAY_MS);
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const busyCache = new Map<string, Set<IsoDate>>();

/**
 * Fictional, deterministic occupancy: the same nights are "booked" for every
 * visitor. Each stay gets blocks of 2–5 nights separated by 4–12 free nights.
 */
export function busyNights(stay: Pick<Stay, "slug">): Set<IsoDate> {
  return busyNightsForSlug(stay.slug);
}

/** Same nights as `busyNights`, for listings that are not catalogue stays (owner-added ones). */
export function busyNightsForSlug(slug: string): Set<IsoDate> {
  const cached = busyCache.get(slug);
  if (cached) return cached;
  const rnd = prng(hash(slug));
  const busy = new Set<IsoDate>();
  let day = Math.floor(rnd() * 6);
  while (day < HORIZON_DAYS) {
    const length = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < length; i++) busy.add(addDays(EPOCH, day + i));
    day += length + 4 + Math.floor(rnd() * 9);
  }
  busyCache.set(slug, busy);
  return busy;
}

export type QuoteError =
  | "dates"
  | "past"
  | "minNights"
  | "guests"
  | "unavailable";

export interface Quote {
  nights: number;
  /** Per-night prices after season multiplier, in order. */
  nightly: number[];
  subtotalCents: number;
  weeklyDiscountCents: number;
  cleaningCents: number;
  totalCents: number;
}

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; error: QuoteError };

function inSeason(monthDay: string, from: string, to: string): boolean {
  return from <= to
    ? monthDay >= from && monthDay <= to
    : monthDay >= from || monthDay <= to;
}

/** Nightly price in cents for one night, applying the first matching season. */
export function nightPriceCents(
  stay: { nightlyCents: number; seasons: readonly Season[] },
  night: IsoDate,
): number {
  const monthDay = night.slice(5);
  const season = stay.seasons.find((s) => inSeason(monthDay, s.from, s.to));
  const bp = season ? season.multiplierBp : 10000;
  return Math.round((stay.nightlyCents * bp) / 10000);
}

export function quoteStay(
  stay: Stay,
  checkIn: IsoDate,
  checkOut: IsoDate,
  guests: number,
  today: IsoDate,
): QuoteResult {
  const nights = nightsBetween(checkIn, checkOut);
  if (!Number.isFinite(nights) || nights < 1) return { ok: false, error: "dates" };
  if (checkIn < today) return { ok: false, error: "past" };
  if (nights < stay.minNights) return { ok: false, error: "minNights" };
  if (guests < 1 || guests > stay.maxGuests) return { ok: false, error: "guests" };
  const busy = busyNights(stay);
  const nightly: number[] = [];
  for (let i = 0; i < nights; i++) {
    const night = addDays(checkIn, i);
    if (busy.has(night)) return { ok: false, error: "unavailable" };
    nightly.push(nightPriceCents(stay, night));
  }
  const subtotalCents = nightly.reduce((a, b) => a + b, 0);
  const weeklyDiscountCents =
    nights >= 7 ? Math.round((subtotalCents * stay.weeklyDiscountBp) / 10000) : 0;
  const totalCents = subtotalCents - weeklyDiscountCents + stay.cleaningFeeCents;
  return {
    ok: true,
    quote: {
      nights,
      nightly,
      subtotalCents,
      weeklyDiscountCents,
      cleaningCents: stay.cleaningFeeCents,
      totalCents,
    },
  };
}

export type CardCheck = "approved" | "declined" | "invalid";

export const TEST_CARD_OK = "4242424242424242";
export const TEST_CARD_DECLINED = "4000000000000002";

/**
 * Demo-only card check. Only the two documented test numbers are accepted;
 * everything else is rejected so no real card number is ever processed.
 */
export function checkTestCard(input: string): CardCheck {
  const digits = input.replace(/[\s-]/g, "");
  if (digits === TEST_CARD_OK) return "approved";
  if (digits === TEST_CARD_DECLINED) return "declined";
  return "invalid";
}

/** Short human-readable reference, e.g. "AUR-7K2M9Q". */
export function bookingReference(
  slug: string,
  checkIn: IsoDate,
  checkOut: IsoDate,
  createdAt: string,
): string {
  const n = hash(`${slug}|${checkIn}|${checkOut}|${createdAt}`);
  return `AUR-${n.toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
}
