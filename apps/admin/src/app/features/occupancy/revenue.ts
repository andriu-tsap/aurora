import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import {
  DEMO_YEARS,
  axisScale,
  occupancyPct,
  rateCards,
  reportCsv,
  reportFilename,
  reportLines,
  revenueByMonth,
  stays,
  sumMonths,
  type MonthRevenue,
  type ReportHeaders,
} from "@aurora/demo-data";

import { downloadCsv, downloadXlsx, type XlsxLabels } from "../../core/files";
import { GuestBookings } from "../../core/guest-bookings";
import { I18n } from "../../core/i18n";
import { OwnerStore } from "../../core/owner-store";

/** Chart geometry in SVG user units; the picture scales with its container. */
const W = 640;
const H = 320;
const M = { left: 64, right: 12, top: 28, bottom: 40 };

interface Bar {
  month: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  value: string;
  tooltip: string;
}

interface Status {
  kind: "busy" | "done" | "error";
  text: string;
}

@Component({
  selector: "au-revenue",
  templateUrl: "./revenue.html",
  styleUrl: "./revenue.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Revenue {
  protected readonly i18n = inject(I18n);
  private readonly store = inject(OwnerStore);
  private readonly guests = inject(GuestBookings);

  protected readonly years = DEMO_YEARS;
  protected readonly rows = this.store.rows;
  protected readonly year = signal<number>(
    DEMO_YEARS.includes(new Date().getUTCFullYear()) ? new Date().getUTCFullYear() : DEMO_YEARS[0],
  );
  /** "all" or the slug of one property. */
  private readonly scopeChoice = signal<string>("all");
  protected readonly status = signal<Status | null>(null);

  protected readonly view = { width: W, height: H, left: M.left, right: W - M.right, bottom: H - M.bottom };

  /** A deleted property falls back to "all" instead of showing an empty chart. */
  protected readonly scope = computed(() =>
    this.rows().some((r) => r.slug === this.scopeChoice()) ? this.scopeChoice() : "all",
  );

  private readonly cards = computed(() => rateCards(this.rows(), stays));
  private readonly selected = computed(() =>
    this.scope() === "all" ? this.cards() : this.cards().filter((c) => c.slug === this.scope()),
  );
  protected readonly scopeName = computed(() =>
    this.scope() === "all"
      ? this.i18n.t().revAll
      : (this.rows().find((r) => r.slug === this.scope())?.name ?? this.i18n.t().revAll),
  );

  protected readonly monthly = computed<MonthRevenue[]>(() =>
    sumMonths(
      this.selected().map((c) => revenueByMonth(c, this.guests.list(), this.year())),
      this.year(),
    ),
  );

  protected readonly totals = computed(() => {
    const list = this.monthly();
    const sum = (pick: (m: MonthRevenue) => number) => list.reduce((a, m) => a + pick(m), 0);
    const nights = sum((m) => m.nights);
    const available = sum((m) => m.availableNights);
    return {
      nights,
      checkIns: sum((m) => m.checkIns),
      revenueCents: sum((m) => m.revenueCents),
      occupancy: occupancyPct({ nights, availableNights: available }),
    };
  });

  protected readonly axis = computed(() =>
    axisScale(Math.max(0, ...this.monthly().map((m) => m.revenueCents))),
  );

  private y(cents: number): number {
    const plotH = H - M.top - M.bottom;
    return M.top + plotH * (1 - cents / this.axis().maxCents);
  }

  protected readonly ticks = computed(() =>
    this.axis().ticks.map((t) => ({ y: this.y(t), label: this.i18n.eurCompact(t) })),
  );

  protected readonly bars = computed<Bar[]>(() => {
    const band = (W - M.left - M.right) / 12;
    const width = band * 0.62;
    const base = this.y(0);
    return this.monthly().map((m, i) => {
      const top = this.y(m.revenueCents);
      const cx = M.left + band * i + band / 2;
      return {
        month: this.i18n.monthShort(m.month),
        x: cx - width / 2,
        y: top,
        width,
        height: Math.max(0, base - top),
        cx,
        value: this.i18n.eurCompact(m.revenueCents),
        tooltip: `${this.i18n.monthYear(m.month)}: ${this.i18n.eur(m.revenueCents)}`,
      };
    });
  });

  protected readonly chartTitle = computed(() =>
    this.i18n.fmt(this.i18n.t().revChartTitle, { year: this.year(), scope: this.scopeName() }),
  );

  protected readonly chartDesc = computed(() => {
    const list = this.monthly();
    const high = list.reduce((a, m) => (m.revenueCents > a.revenueCents ? m : a), list[0]);
    const low = list.reduce((a, m) => (m.revenueCents < a.revenueCents ? m : a), list[0]);
    return this.i18n.fmt(this.i18n.t().revChartDesc, {
      maxMonth: this.i18n.monthYear(high.month),
      maxValue: this.i18n.eur(high.revenueCents),
      minMonth: this.i18n.monthYear(low.month),
      minValue: this.i18n.eur(low.revenueCents),
    });
  });

  protected readonly tableCaption = computed(() =>
    this.i18n.fmt(this.i18n.t().tblCaption, { year: this.year(), scope: this.scopeName() }),
  );

  protected pct(m: Pick<MonthRevenue, "nights" | "availableNights">): string {
    return `${this.i18n.pct(occupancyPct(m))}%`;
  }

  protected chooseScope(event: Event): void {
    this.scopeChoice.set((event.target as HTMLSelectElement).value);
    this.status.set(null);
  }

  protected chooseYear(event: Event): void {
    this.year.set(Number((event.target as HTMLSelectElement).value));
    this.status.set(null);
  }

  private headers(): ReportHeaders {
    const t = this.i18n.t();
    return {
      property: t.expColProperty,
      month: t.expColMonth,
      nights: t.expColNights,
      available: t.expColAvailable,
      occupancy: t.expColOccupancy,
      checkIns: t.expColCheckIns,
      accommodation: t.expColAccommodation,
      cleaning: t.expColCleaning,
      revenue: t.expColRevenue,
      source: t.expColSource,
    };
  }

  private lines() {
    return reportLines(this.selected(), this.guests.list(), this.year());
  }

  protected exportCsv(): void {
    const file = reportFilename(this.year(), this.scope(), "csv");
    try {
      downloadCsv(reportCsv(this.lines(), this.headers(), this.i18n.t().expSource), file);
      this.status.set({ kind: "done", text: this.i18n.fmt(this.i18n.t().exportCsvDone, { file }) });
    } catch {
      this.status.set({ kind: "error", text: this.i18n.t().exportFail });
    }
  }

  protected async exportXlsx(): Promise<void> {
    const t = this.i18n.t();
    const file = reportFilename(this.year(), this.scope(), "xlsx");
    const labels: XlsxLabels = {
      headers: this.headers(),
      source: t.expSource,
      sheetRevenue: t.expSheetRevenue,
      sheetAbout: t.expSheetAbout,
      aboutLines: [
        t.expAboutTitle,
        t.expAboutNote,
        this.i18n.fmt(t.expAboutScope, { year: this.year(), scope: this.scopeName() }),
        t.revBasis,
      ],
    };
    this.status.set({ kind: "busy", text: t.exportXlsxBusy });
    try {
      await downloadXlsx(this.lines(), labels, file);
      this.status.set({ kind: "done", text: this.i18n.fmt(t.exportXlsxDone, { file }) });
    } catch {
      this.status.set({ kind: "error", text: t.exportFail });
    }
  }
}
