import type { Booking } from "@aurora/types";

import {
  occupancyPct,
  revenueByMonth,
  type RateCard,
  type YearMonth,
} from "./occupancy";

/** Pure helpers for the owner panel's CSV / Excel export. Files are built in the browser. */

/** Lets Excel open the CSV as UTF-8, so Polish and Ukrainian letters survive. */
export const CSV_BOM = "\uFEFF";

/** Cells starting with these are read as formulas by spreadsheet apps. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One CSV field (RFC 4180). Text that could run as a spreadsheet formula gets a
 * leading apostrophe; numbers are written as they are.
 */
export function csvEscape(value: string | number): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows joined with CRLF, a trailing line break included. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

/** Integer cents as a plain decimal, without floating-point maths: 123456 -> "1234.56". */
export function centsToDecimal(cents: number): string {
  const whole = Math.round(cents);
  const abs = Math.abs(whole);
  const sign = whole < 0 ? "-" : "";
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** One property in one month, the row of both exported files. */
export interface ReportLine {
  slug: string;
  property: string;
  month: YearMonth;
  nights: number;
  availableNights: number;
  occupancyPct: number;
  checkIns: number;
  accommodationCents: number;
  cleaningCents: number;
  revenueCents: number;
}

export function reportLines(
  cards: readonly RateCard[],
  bookings: readonly Booking[],
  year: number,
): ReportLine[] {
  return cards.flatMap((card) =>
    revenueByMonth(card, bookings, year).map((m) => ({
      slug: card.slug,
      property: card.name,
      month: m.month,
      nights: m.nights,
      availableNights: m.availableNights,
      occupancyPct: occupancyPct(m),
      checkIns: m.checkIns,
      accommodationCents: m.accommodationCents,
      cleaningCents: m.cleaningCents,
      revenueCents: m.revenueCents,
    })),
  );
}

/** Column titles in the language of the panel. */
export interface ReportHeaders {
  property: string;
  month: string;
  nights: string;
  available: string;
  occupancy: string;
  checkIns: string;
  accommodation: string;
  cleaning: string;
  revenue: string;
  source: string;
}

export function headerRow(h: ReportHeaders): string[] {
  return [
    h.property,
    h.month,
    h.nights,
    h.available,
    h.occupancy,
    h.checkIns,
    h.accommodation,
    h.cleaning,
    h.revenue,
    h.source,
  ];
}

/** The whole CSV text. `source` labels every row, e.g. "Demo data (fictional)". */
export function reportCsv(
  lines: readonly ReportLine[],
  headers: ReportHeaders,
  source: string,
): string {
  const rows: (string | number)[][] = [headerRow(headers)];
  for (const l of lines)
    rows.push([
      l.property,
      l.month,
      l.nights,
      l.availableNights,
      l.occupancyPct.toFixed(1),
      l.checkIns,
      centsToDecimal(l.accommodationCents),
      centsToDecimal(l.cleaningCents),
      centsToDecimal(l.revenueCents),
      source,
    ]);
  return CSV_BOM + toCsv(rows);
}

/** `aurora-demo-revenue-2026-all.csv`; the scope is cut down to safe characters. */
export function reportFilename(
  year: number,
  scope: string,
  ext: "csv" | "xlsx",
): string {
  const safe = scope.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return `aurora-demo-revenue-${year}-${safe || "all"}.${ext}`;
}
