import { describe, expect, it } from "vitest";

import {
  CSV_BOM,
  centsToDecimal,
  csvEscape,
  headerRow,
  reportCsv,
  reportFilename,
  reportLines,
  toCsv,
  type ReportHeaders,
} from "./export";
import { stays } from "./index";
import { rateCards } from "./occupancy";
import { emptyOwnerState, ownerRows } from "./owner";

const headers: ReportHeaders = {
  property: "Property",
  month: "Month",
  nights: "Occupied nights",
  available: "Available nights",
  occupancy: "Occupancy %",
  checkIns: "Check-ins",
  accommodation: "Accommodation EUR",
  cleaning: "Cleaning EUR",
  revenue: "Revenue EUR",
  source: "Source",
};

describe("csvEscape", () => {
  it("leaves plain text and numbers alone", () => {
    expect(csvEscape("Halny Ridge")).toBe("Halny Ridge");
    expect(csvEscape(42)).toBe("42");
    expect(csvEscape(54.8)).toBe("54.8");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("two\nlines")).toBe('"two\nlines"');
    expect(csvEscape("cr\rhere")).toBe('"cr\rhere"');
  });

  it("neutralises text a spreadsheet would run as a formula", () => {
    expect(csvEscape("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvEscape("+48 123")).toBe("'+48 123");
    expect(csvEscape("-cmd")).toBe("'-cmd");
    expect(csvEscape("@home")).toBe("'@home");
    expect(csvEscape("\tTabbed")).toBe("'\tTabbed");
    expect(csvEscape('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`);
  });

  it("writes non-finite numbers as empty", () => {
    expect(csvEscape(Number.NaN)).toBe("");
    expect(csvEscape(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("keeps Polish and Ukrainian letters", () => {
    expect(csvEscape("Łąka, Їжак")).toBe('"Łąka, Їжак"');
  });
});

describe("toCsv", () => {
  it("joins with CRLF and ends with a line break", () => {
    expect(toCsv([["a", 1], ["b,c", 2]])).toBe('a,1\r\n"b,c",2\r\n');
  });
});

describe("centsToDecimal", () => {
  it("formats integer cents without float drift", () => {
    expect(centsToDecimal(0)).toBe("0.00");
    expect(centsToDecimal(5)).toBe("0.05");
    expect(centsToDecimal(123456)).toBe("1234.56");
    expect(centsToDecimal(10_000_000)).toBe("100000.00");
    expect(centsToDecimal(-250)).toBe("-2.50");
    expect(centsToDecimal(1999.6)).toBe("20.00");
  });
});

describe("report", () => {
  const cards = rateCards(ownerRows(stays, emptyOwnerState()), stays);
  const lines = reportLines(cards, [], 2026);

  it("has one line per property and month", () => {
    expect(lines).toHaveLength(cards.length * 12);
    expect(lines[0].month).toBe("2026-01");
    expect(lines[11].month).toBe("2026-12");
    expect(lines[12].property).toBe(cards[1].name);
  });

  it("writes a BOM, a header, one row per line and the demo label", () => {
    const csv = reportCsv(lines, headers, "Demo data (fictional)");
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const rows = csv.slice(CSV_BOM.length).trimEnd().split("\r\n");
    expect(rows).toHaveLength(lines.length + 1);
    expect(rows[0]).toBe(headerRow(headers).join(","));
    expect(rows[1].split(",").slice(-1)[0]).toBe("Demo data (fictional)");
    expect(rows[1]).toMatch(/,\d+\.\d{2},\d+\.\d{2},\d+\.\d{2},/);
  });

  it("escapes a hostile owner-added property name", () => {
    const evil = [{ ...lines[0], property: '=cmd|"/c calc"!A1' }];
    const row = reportCsv(evil, headers, "Demo").split("\r\n")[1];
    expect(row.startsWith(`"'=cmd|""/c calc""!A1"`)).toBe(true);
  });
});

describe("reportFilename", () => {
  it("builds a safe name", () => {
    expect(reportFilename(2026, "all", "csv")).toBe("aurora-demo-revenue-2026-all.csv");
    expect(reportFilename(2027, "Halny Ridge", "xlsx")).toBe(
      "aurora-demo-revenue-2027-halny-ridge.xlsx",
    );
    expect(reportFilename(2026, "../../etc", "csv")).toBe(
      "aurora-demo-revenue-2026-etc.csv",
    );
    expect(reportFilename(2026, "", "csv")).toBe("aurora-demo-revenue-2026-all.csv");
  });
});
