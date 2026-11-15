import type { Booking, Season, Stay } from "@aurora/types";

import {
  addDays,
  busyNightsForSlug,
  nightPriceCents,
  nightsBetween,
  parseIso,
  toIso,
  type IsoDate,
} from "./booking";
import type { OwnerStayRow } from "./owner";

/**
 * Occupancy calendar and revenue aggregation for the owner panel, without any UI.
 * Everything here is derived from the fictional busy nights in `booking.ts` plus the
 * demo bookings a visitor made in this browser. No figure is real.
 */

/** Calendar month as "YYYY-MM". */
export type YearMonth = string;

/** The fictional busy nights cover 2026-01 … mid 2028; the panel shows two whole years. */
export const DEMO_FIRST_MONTH: YearMonth = "2026-01";
export const DEMO_LAST_MONTH: YearMonth = "2027-12";
export const DEMO_YEARS: readonly number[] = [2026, 2027];

const MAX_BOOKING_NIGHTS = 366;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function isIsoDate(v: unknown): v is IsoDate {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false;
  return toIso(parseIso(v)) === v;
}

/**
 * Reads untrusted JSON from the `aurora-bookings` key written by the public site.
 * Malformed entries, impossible dates and absurdly long stays are dropped.
 */
export function parseBookings(raw: unknown): Booking[] {
  if (!Array.isArray(raw)) return [];
  const out: Booking[] = [];
  for (const v of raw) {
    if (!isObj(v)) continue;
    if (
      typeof v.reference !== "string" ||
      typeof v.slug !== "string" ||
      typeof v.stayName !== "string" ||
      typeof v.guestName !== "string" ||
      typeof v.guests !== "number" ||
      typeof v.nights !== "number" ||
      typeof v.totalCents !== "number" ||
      typeof v.createdAt !== "string" ||
      (v.status !== "confirmed" && v.status !== "cancelled") ||
      !isIsoDate(v.checkIn) ||
      !isIsoDate(v.checkOut)
    )
      continue;
    const nights = nightsBetween(v.checkIn, v.checkOut);
    if (nights < 1 || nights > MAX_BOOKING_NIGHTS) continue;
    out.push({
      reference: v.reference,
      slug: v.slug,
      stayName: v.stayName,
      guestName: v.guestName,
      checkIn: v.checkIn,
      checkOut: v.checkOut,
      guests: v.guests,
      nights: v.nights,
      totalCents: v.totalCents,
      status: v.status,
      createdAt: v.createdAt,
    });
  }
  return out;
}

/** Nights (check-in inclusive, check-out exclusive) held by confirmed guest bookings of one stay. */
export function guestNights(
  bookings: readonly Booking[],
  slug: string,
): Set<IsoDate> {
  const out = new Set<IsoDate>();
  for (const b of bookings) {
    if (b.slug !== slug || b.status !== "confirmed") continue;
    const nights = Math.min(nightsBetween(b.checkIn, b.checkOut), MAX_BOOKING_NIGHTS);
    for (let i = 0; i < nights; i++) out.add(addDays(b.checkIn, i));
  }
  return out;
}

/** One night is exactly one of these; a guest booking wins over a fictional busy night. */
export type NightState = "free" | "busy" | "guest";

export function nightState(
  date: IsoDate,
  busy: ReadonlySet<IsoDate>,
  guest: ReadonlySet<IsoDate>,
): NightState {
  if (guest.has(date)) return "guest";
  if (busy.has(date)) return "busy";
  return "free";
}

/* ---------- month calendar ---------- */

function splitMonth(ym: YearMonth): [number, number] {
  const [y, m] = ym.split("-").map(Number);
  return [y, m];
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

export const monthOf = (date: IsoDate): YearMonth => date.slice(0, 7);

export function daysInMonth(ym: YearMonth): number {
  const [y, m] = splitMonth(ym);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthDays(ym: YearMonth): IsoDate[] {
  return Array.from({ length: daysInMonth(ym) }, (_, i) => `${ym}-${pad2(i + 1)}`);
}

/** Monday = 0 … Sunday = 6. */
export function weekdayIndex(date: IsoDate): number {
  return (new Date(parseIso(date)).getUTCDay() + 6) % 7;
}

/** Weeks of the month, Monday first; days outside the month are `null`. */
export function monthGrid(ym: YearMonth): (IsoDate | null)[][] {
  const days = monthDays(ym);
  const cells: (IsoDate | null)[] = [
    ...Array.from({ length: weekdayIndex(days[0]) }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (IsoDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const [y, m] = splitMonth(ym);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

export function clampMonth(ym: YearMonth): YearMonth {
  if (ym < DEMO_FIRST_MONTH) return DEMO_FIRST_MONTH;
  if (ym > DEMO_LAST_MONTH) return DEMO_LAST_MONTH;
  return ym;
}

/** Day of the same index in another month, limited to that month's length. */
export function sameDayIn(ym: YearMonth, date: IsoDate): IsoDate {
  const day = Number(date.slice(8));
  return `${ym}-${pad2(Math.min(day, daysInMonth(ym)))}`;
}

export function weekStart(date: IsoDate): IsoDate {
  return addDays(date, -weekdayIndex(date));
}

export function weekEnd(date: IsoDate): IsoDate {
  return addDays(date, 6 - weekdayIndex(date));
}

/**
 * Where a key moves the focused day in the calendar grid, or `null` for a key the grid does
 * not handle or a move outside the months the demo data covers.
 * Home / End stay inside the displayed month; Page Up / Page Down change the month.
 */
export function navigateDate(
  key: string,
  current: IsoDate,
  shown: YearMonth,
): IsoDate | null {
  const first = `${shown}-01`;
  const last = `${shown}-${pad2(daysInMonth(shown))}`;
  let next: IsoDate;
  switch (key) {
    case "ArrowLeft":
      next = addDays(current, -1);
      break;
    case "ArrowRight":
      next = addDays(current, 1);
      break;
    case "ArrowUp":
      next = addDays(current, -7);
      break;
    case "ArrowDown":
      next = addDays(current, 7);
      break;
    case "Home":
      next = weekStart(current) < first ? first : weekStart(current);
      break;
    case "End":
      next = weekEnd(current) > last ? last : weekEnd(current);
      break;
    case "PageUp":
      next = sameDayIn(shiftMonth(shown, -1), current);
      break;
    case "PageDown":
      next = sameDayIn(shiftMonth(shown, 1), current);
      break;
    default:
      return null;
  }
  const month = monthOf(next);
  return month < DEMO_FIRST_MONTH || month > DEMO_LAST_MONTH ? null : next;
}

export interface MonthStats {
  days: number;
  /** Fictional busy nights that no guest booking covers. */
  busy: number;
  guest: number;
  free: number;
  occupied: number;
  /** Occupied share of the month, one decimal. */
  occupancyPct: number;
}

export function monthStats(
  ym: YearMonth,
  busy: ReadonlySet<IsoDate>,
  guest: ReadonlySet<IsoDate>,
): MonthStats {
  const days = monthDays(ym);
  let busyCount = 0;
  let guestCount = 0;
  for (const d of days) {
    const s = nightState(d, busy, guest);
    if (s === "busy") busyCount++;
    else if (s === "guest") guestCount++;
  }
  const occupied = busyCount + guestCount;
  return {
    days: days.length,
    busy: busyCount,
    guest: guestCount,
    free: days.length - occupied,
    occupied,
    occupancyPct: Math.round((occupied * 1000) / days.length) / 10,
  };
}

/* ---------- revenue ---------- */

/** What the owner currently charges for one stay (edits applied), plus its season table. */
export interface RateCard {
  slug: string;
  name: string;
  nightlyCents: number;
  cleaningFeeCents: number;
  seasons: readonly Season[];
}

/** Owner-added stays have no seasons, so they are priced flat. */
export function rateCards(
  rows: readonly OwnerStayRow[],
  base: readonly Stay[],
): RateCard[] {
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    nightlyCents: r.nightlyCents,
    cleaningFeeCents: r.cleaningFeeCents,
    seasons: base.find((s) => s.slug === r.slug)?.seasons ?? [],
  }));
}

export interface MonthRevenue {
  month: YearMonth;
  /** Occupied nights (fictional busy + guest bookings, each night once). */
  nights: number;
  availableNights: number;
  /** Stays that begin in this month. */
  checkIns: number;
  /** Occupied nights × the nightly price on that date (season multiplier included). */
  accommodationCents: number;
  /** One cleaning fee per check-in. */
  cleaningCents: number;
  revenueCents: number;
}

export function emptyMonth(month: YearMonth): MonthRevenue {
  return {
    month,
    nights: 0,
    availableNights: daysInMonth(month),
    checkIns: 0,
    accommodationCents: 0,
    cleaningCents: 0,
    revenueCents: 0,
  };
}

/**
 * Twelve months of fictional revenue for one stay. A simplified model: today's nightly
 * price is applied to every occupied night; weekly discounts, taxes and platform fees
 * are not modelled, and nothing was actually paid.
 */
export function revenueByMonth(
  card: RateCard,
  bookings: readonly Booking[],
  year: number,
): MonthRevenue[] {
  const busy = busyNightsForSlug(card.slug);
  const guest = guestNights(bookings, card.slug);
  const guestStarts = new Map<IsoDate, number>();
  for (const b of bookings)
    if (b.slug === card.slug && b.status === "confirmed")
      guestStarts.set(b.checkIn, (guestStarts.get(b.checkIn) ?? 0) + 1);

  return Array.from({ length: 12 }, (_, i) => {
    const row = emptyMonth(`${year}-${pad2(i + 1)}`);
    for (const day of monthDays(row.month)) {
      if (busy.has(day) || guest.has(day)) {
        row.nights++;
        row.accommodationCents += nightPriceCents(card, day);
      }
      if (busy.has(day) && !busy.has(addDays(day, -1))) row.checkIns++;
      row.checkIns += guestStarts.get(day) ?? 0;
    }
    row.cleaningCents = row.checkIns * card.cleaningFeeCents;
    row.revenueCents = row.accommodationCents + row.cleaningCents;
    return row;
  });
}

/** Month-by-month sum of several stays' years. */
export function sumMonths(
  lists: readonly (readonly MonthRevenue[])[],
  year: number,
): MonthRevenue[] {
  return Array.from({ length: 12 }, (_, i) => {
    const total = emptyMonth(`${year}-${pad2(i + 1)}`);
    total.availableNights = 0;
    for (const list of lists) {
      const m = list[i];
      total.nights += m.nights;
      total.availableNights += m.availableNights;
      total.checkIns += m.checkIns;
      total.accommodationCents += m.accommodationCents;
      total.cleaningCents += m.cleaningCents;
      total.revenueCents += m.revenueCents;
    }
    if (lists.length === 0) total.availableNights = daysInMonth(total.month);
    return total;
  });
}

export function occupancyPct(m: Pick<MonthRevenue, "nights" | "availableNights">): number {
  return m.availableNights === 0
    ? 0
    : Math.round((m.nights * 1000) / m.availableNights) / 10;
}

/* ---------- chart axis ---------- */

export interface AxisScale {
  maxCents: number;
  stepCents: number;
  ticks: number[];
}

/** A 1/2/5 × 10ⁿ step so the y axis shows round euro values. Never returns an empty axis. */
export function axisScale(valueMaxCents: number, target = 4): AxisScale {
  const max = Math.max(0, valueMaxCents);
  const raw = max / target;
  let step = 10_000;
  if (raw > 0) {
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const n = raw / magnitude;
    const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    step = Math.max(100, nice * magnitude);
  }
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { maxCents: top, stepCents: step, ticks };
}
