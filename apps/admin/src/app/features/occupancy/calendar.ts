import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  DEMO_FIRST_MONTH,
  DEMO_LAST_MONTH,
  addDays,
  busyNightsForSlug,
  clampMonth,
  daysInMonth,
  guestNights,
  monthGrid,
  monthOf,
  monthStats,
  nightState,
  sameDayIn,
  shiftMonth,
  weekEnd,
  weekStart,
  type IsoDate,
  type NightState,
  type YearMonth,
} from "@aurora/demo-data";

import { GuestBookings } from "../../core/guest-bookings";
import { I18n } from "../../core/i18n";
import { OwnerStore } from "../../core/owner-store";

interface DayCell {
  date: IsoDate;
  day: number;
  state: NightState;
  label: string;
}

/** Shapes repeat the state next to the pattern and the text, so colour is never the only cue. */
const GLYPH: Record<NightState, string> = { free: "", busy: "×", guest: "◆" };

@Component({
  selector: "au-occupancy-calendar",
  templateUrl: "./calendar.html",
  styleUrl: "./calendar.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OccupancyCalendar {
  protected readonly i18n = inject(I18n);
  private readonly store = inject(OwnerStore);
  private readonly guests = inject(GuestBookings);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly rows = this.store.rows;
  private readonly chosen = signal<string | null>(null);
  /** The chosen property, or the first one if it was deleted in the meantime. */
  protected readonly row = computed(
    () => this.rows().find((r) => r.slug === this.chosen()) ?? this.rows()[0],
  );

  protected readonly today: IsoDate = new Date().toISOString().slice(0, 10);
  protected readonly month = signal<YearMonth>(clampMonth(monthOf(this.today)));
  /** The one day in the tab order (roving tabindex). */
  protected readonly focus = signal<IsoDate>(
    monthOf(this.today) === this.month() ? this.today : `${this.month()}-01`,
  );

  protected readonly weekdays = [0, 1, 2, 3, 4, 5, 6];
  protected readonly canPrev = computed(() => this.month() > DEMO_FIRST_MONTH);
  protected readonly canNext = computed(() => this.month() < DEMO_LAST_MONTH);

  private readonly busy = computed(() => busyNightsForSlug(this.row().slug));
  private readonly guest = computed(() => guestNights(this.guests.list(), this.row().slug));

  protected readonly weeks = computed<(DayCell | null)[][]>(() => {
    const t = this.i18n.t();
    const text: Record<NightState, string> = {
      free: t.cellFree,
      busy: t.cellBusy,
      guest: t.cellGuest,
    };
    return monthGrid(this.month()).map((week) =>
      week.map((date) => {
        if (!date) return null;
        const state = nightState(date, this.busy(), this.guest());
        const today = date === this.today ? `, ${t.calToday}` : "";
        return {
          date,
          day: Number(date.slice(8)),
          state,
          label: `${this.i18n.longDate(date)}: ${text[state]}${today}`,
        };
      }),
    );
  });

  protected readonly stats = computed(() =>
    monthStats(this.month(), this.busy(), this.guest()),
  );

  protected readonly summary = computed(() => {
    const s = this.stats();
    return this.i18n.fmt(this.i18n.t().calSummary, {
      occupied: s.occupied,
      days: s.days,
      pct: this.i18n.pct(s.occupancyPct),
      busy: s.busy,
      guest: s.guest,
      free: s.free,
    });
  });

  protected readonly gridLabel = computed(() =>
    this.i18n.fmt(this.i18n.t().calGridLabel, {
      property: this.row().name,
      month: this.i18n.monthYear(this.month()),
    }),
  );

  protected glyph(state: NightState): string {
    return GLYPH[state];
  }

  protected choose(event: Event): void {
    this.chosen.set((event.target as HTMLSelectElement).value);
  }

  protected go(delta: number): void {
    const next = shiftMonth(this.month(), delta);
    if (next < DEMO_FIRST_MONTH || next > DEMO_LAST_MONTH) return;
    this.month.set(next);
    this.focus.set(sameDayIn(next, this.focus()));
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const current = this.focus();
    const first = `${this.month()}-01`;
    const last = `${this.month()}-${String(daysInMonth(this.month())).padStart(2, "0")}`;
    let next: IsoDate;
    switch (event.key) {
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
        next = sameDayIn(shiftMonth(this.month(), -1), current);
        break;
      case "PageDown":
        next = sameDayIn(shiftMonth(this.month(), 1), current);
        break;
      default:
        return;
    }
    event.preventDefault();
    this.moveTo(next);
  }

  private moveTo(date: IsoDate): void {
    const month = monthOf(date);
    if (month < DEMO_FIRST_MONTH || month > DEMO_LAST_MONTH) return;
    if (month !== this.month()) this.month.set(month);
    this.focus.set(date);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>(`[data-date="${date}"]`)?.focus(),
      { injector: this.injector },
    );
  }
}
