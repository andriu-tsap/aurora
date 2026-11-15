import { centsToDecimal, headerRow, type ReportHeaders, type ReportLine } from "@aurora/demo-data";
import type { Row, SheetData } from "write-excel-file/universal";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke after the browser has had time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** `csv` already starts with a UTF-8 byte order mark (see `reportCsv`). */
export function downloadCsv(csv: string, filename: string): void {
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export interface XlsxLabels {
  headers: ReportHeaders;
  source: string;
  sheetRevenue: string;
  sheetAbout: string;
  aboutLines: readonly string[];
}

const bold = (value: string) => ({ value, fontWeight: "bold" as const });

/** Revenue sheet rows with real numeric cells, so Excel can sum and sort them. */
export function revenueSheet(lines: readonly ReportLine[], labels: XlsxLabels): SheetData {
  const money = (cents: number) => ({
    value: Number(centsToDecimal(cents)),
    type: Number,
    format: "#,##0.00",
  });
  const header: Row = headerRow(labels.headers).map(bold);
  const body: Row[] = lines.map((l) => [
    { value: l.property },
    { value: l.month },
    { value: l.nights, type: Number },
    { value: l.availableNights, type: Number },
    { value: l.occupancyPct, type: Number, format: "0.0" },
    { value: l.checkIns, type: Number },
    money(l.accommodationCents),
    money(l.cleaningCents),
    money(l.revenueCents),
    { value: labels.source },
  ]);
  return [header, ...body];
}

/**
 * Builds the .xlsx entirely in the browser. The library is fetched only here, so it is not
 * part of the panel's first load. Nothing is uploaded.
 */
export async function downloadXlsx(
  lines: readonly ReportLine[],
  labels: XlsxLabels,
  filename: string,
): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");
  const about: SheetData = labels.aboutLines.map((text, i) => [i === 0 ? bold(text) : { value: text }]);
  const blob = await writeXlsxFile([
    {
      sheet: labels.sheetRevenue,
      data: revenueSheet(lines, labels),
      stickyRowsCount: 1,
      columns: [
        { width: 30 },
        { width: 10 },
        { width: 16 },
        { width: 18 },
        { width: 14 },
        { width: 11 },
        { width: 20 },
        { width: 18 },
        { width: 16 },
        { width: 24 },
      ],
    },
    { sheet: labels.sheetAbout, data: about, columns: [{ width: 110 }] },
  ]).toBlob();
  downloadBlob(blob, filename);
}

