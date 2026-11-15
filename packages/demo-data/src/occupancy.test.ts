import type { Booking } from "@aurora/types";
import { describe, expect, it } from "vitest";

import { addDays, busyNightsForSlug, nightPriceCents, type IsoDate } from "./booking";
import { stays } from "./index";
import {
  axisScale,
  clampMonth,
  DEMO_FIRST_MONTH,
  DEMO_LAST_MONTH,
  guestNights,
  isIsoDate,
  monthDays,
  monthGrid,
  monthStats,
  navigateDate,
  nightState,
  parseBookings,
  rateCards,
  revenueByMonth,
  shiftMonth,
  sameDayIn,
  sumMonths,
  weekEnd,
  weekStart,
  weekdayIndex,
} from "./occupancy";
import { ownerRows, emptyOwnerState } from "./owner";

const stay = stays[0];
const card = rateCards(ownerRows(stays, emptyOwnerState()), stays)[0];

function booking(over: Partial<Booking> = {}): Booking {
  return {
    reference: "AUR-TEST01",
    slug: stay.slug,
    stayName: stay.name,
    guestName: "Test Guest",
    checkIn: "2026-11-02",
    checkOut: "2026-11-05",
    guests: 2,
    nights: 3,
    totalCents: 50_000,
    status: "confirmed",
    createdAt: "2026-11-01T10:00:00.000Z",
    ...over,
  };
}

describe("parseBookings", () => {
  it("keeps valid bookings and drops malformed ones", () => {
    const good = booking();
    const parsed = parseBookings([
      good,
      { ...good, checkIn: "2026-02-30" },
      { ...good, checkOut: "2026-11-02" },
      { ...good, checkOut: "2028-11-02" },
      { ...good, status: "paid" },
      { ...good, guests: "2" },
      "nope",
      null,
    ]);
    expect(parsed).toEqual([good]);
  });

  it("returns nothing for non-arrays", () => {
    expect(parseBookings(null)).toEqual([]);
    expect(parseBookings({})).toEqual([]);
    expect(parseBookings("[]")).toEqual([]);
  });

  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-2-1")).toBe(false);
    expect(isIsoDate(20260201)).toBe(false);
  });
});

describe("guest nights and night state", () => {
  it("counts check-in night but not check-out night", () => {
    const nights = guestNights([booking()], stay.slug);
    expect([...nights].sort()).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
  });

  it("ignores cancelled bookings and other stays", () => {
    expect(guestNights([booking({ status: "cancelled" })], stay.slug).size).toBe(0);
    expect(guestNights([booking({ slug: "other" })], stay.slug).size).toBe(0);
  });

  it("lets a guest booking win over a busy night", () => {
    const busy = new Set<IsoDate>(["2026-11-02", "2026-11-09"]);
    const guest = new Set<IsoDate>(["2026-11-02"]);
    expect(nightState("2026-11-02", busy, guest)).toBe("guest");
    expect(nightState("2026-11-09", busy, guest)).toBe("busy");
    expect(nightState("2026-11-10", busy, guest)).toBe("free");
  });
});

describe("month calendar", () => {
  it("builds Monday-first weeks padded with nulls", () => {
    // 1 Nov 2026 is a Sunday, so the first week has six leading blanks.
    const grid = monthGrid("2026-11");
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[0].slice(0, 6).every((c) => c === null)).toBe(true);
    expect(grid[0][6]).toBe("2026-11-01");
    expect(grid.flat().filter((c) => c !== null)).toEqual(monthDays("2026-11"));
    expect(monthDays("2026-11")).toHaveLength(30);
  });

  it("handles leap February and month shifts across years", () => {
    expect(monthDays("2028-02")).toHaveLength(29);
    expect(monthDays("2027-02")).toHaveLength(28);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-05", 0)).toBe("2026-05");
  });

  it("clamps to the range the demo data covers", () => {
    expect(clampMonth("2025-06")).toBe(DEMO_FIRST_MONTH);
    expect(clampMonth("2030-01")).toBe(DEMO_LAST_MONTH);
    expect(clampMonth("2026-11")).toBe("2026-11");
  });

  it("finds week bounds and keeps the day when changing month", () => {
    expect(weekdayIndex("2026-11-16")).toBe(0); // Monday
    expect(weekStart("2026-11-19")).toBe("2026-11-16");
    expect(weekEnd("2026-11-19")).toBe("2026-11-22");
    expect(sameDayIn("2027-02", "2026-12-31")).toBe("2027-02-28");
    expect(sameDayIn("2027-03", "2026-12-15")).toBe("2027-03-15");
  });

  it("counts every day exactly once", () => {
    const busy = busyNightsForSlug(stay.slug);
    const guest = guestNights([booking()], stay.slug);
    const s = monthStats("2026-11", busy, guest);
    expect(s.busy + s.guest + s.free).toBe(30);
    expect(s.occupied).toBe(s.busy + s.guest);
    expect(s.guest).toBeGreaterThanOrEqual(1);
    expect(s.occupancyPct).toBeGreaterThanOrEqual(0);
    expect(s.occupancyPct).toBeLessThanOrEqual(100);
  });
});

describe("revenue by month", () => {
  it("returns twelve months with consistent totals", () => {
    const year = revenueByMonth(card, [], 2026);
    expect(year).toHaveLength(12);
    expect(year[0].month).toBe("2026-01");
    expect(year[11].month).toBe("2026-12");
    for (const m of year) {
      expect(m.revenueCents).toBe(m.accommodationCents + m.cleaningCents);
      expect(m.cleaningCents).toBe(m.checkIns * card.cleaningFeeCents);
      expect(m.nights).toBeLessThanOrEqual(m.availableNights);
      expect(Number.isInteger(m.revenueCents)).toBe(true);
    }
    expect(year.reduce((a, m) => a + m.nights, 0)).toBeGreaterThan(60);
  });

  it("is deterministic", () => {
    expect(revenueByMonth(card, [], 2026)).toEqual(revenueByMonth(card, [], 2026));
  });

  it("adds a confirmed guest booking and ignores a cancelled one", () => {
    const free = (() => {
      const busy = busyNightsForSlug(stay.slug);
      for (let d = 0; d < 600; d++) {
        const start = addDays("2027-03-01", d);
        if (![0, 1, 2].some((i) => busy.has(addDays(start, i)))) return start;
      }
      throw new Error("no free range");
    })();
    const month = free.slice(0, 7);
    const index = Number(month.slice(5)) - 1;
    const year = Number(month.slice(0, 4));
    const base = revenueByMonth(card, [], year)[index];
    const b = booking({ checkIn: free, checkOut: addDays(free, 1), nights: 1 });
    const withGuest = revenueByMonth(card, [b], year)[index];
    expect(withGuest.nights).toBe(base.nights + 1);
    expect(withGuest.checkIns).toBe(base.checkIns + 1);
    expect(withGuest.revenueCents).toBe(
      base.revenueCents + nightPriceCents(card, free) + card.cleaningFeeCents,
    );
    const cancelled = revenueByMonth(card, [{ ...b, status: "cancelled" }], year)[index];
    expect(cancelled).toEqual(base);
  });

  it("uses the owner's edited price and a flat rate for owner-added stays", () => {
    const edited = { ...card, nightlyCents: card.nightlyCents * 2 };
    const a = revenueByMonth(card, [], 2026).reduce((s, m) => s + m.accommodationCents, 0);
    const b = revenueByMonth(edited, [], 2026).reduce((s, m) => s + m.accommodationCents, 0);
    expect(b).toBe(a * 2);
    const flat = { ...card, slug: "my-own-cabin", seasons: [] };
    expect(revenueByMonth(flat, [], 2026).some((m) => m.nights > 0)).toBe(true);
  });

  it("sums several stays month by month", () => {
    const cards = rateCards(ownerRows(stays, emptyOwnerState()), stays);
    const lists = cards.map((c) => revenueByMonth(c, [], 2026));
    const total = sumMonths(lists, 2026);
    expect(total).toHaveLength(12);
    expect(total[3].revenueCents).toBe(lists.reduce((s, l) => s + l[3].revenueCents, 0));
    expect(total[3].availableNights).toBe(cards.length * 30);
    expect(sumMonths([], 2026)[1].availableNights).toBe(28);
  });
});

describe("axisScale", () => {
  it("picks round steps that cover the maximum", () => {
    const s = axisScale(437_000);
    expect(s.ticks[0]).toBe(0);
    expect(s.ticks[s.ticks.length - 1]).toBe(s.maxCents);
    expect(s.maxCents).toBeGreaterThanOrEqual(437_000);
    expect([1, 2, 5]).toContain(s.stepCents / 10 ** Math.floor(Math.log10(s.stepCents)));
    expect(s.ticks.length).toBeLessThanOrEqual(7);
  });

  it("never returns an empty axis", () => {
    expect(axisScale(0).ticks.length).toBeGreaterThanOrEqual(2);
    expect(axisScale(-5).maxCents).toBeGreaterThan(0);
  });
});

describe("navigateDate", () => {
  it("moves by day and by week, across month edges", () => {
    expect(navigateDate("ArrowRight", "2026-11-30", "2026-11")).toBe("2026-12-01");
    expect(navigateDate("ArrowLeft", "2026-11-01", "2026-11")).toBe("2026-10-31");
    expect(navigateDate("ArrowDown", "2026-11-26", "2026-11")).toBe("2026-12-03");
    expect(navigateDate("ArrowUp", "2026-11-03", "2026-11")).toBe("2026-10-27");
  });

  it("keeps Home and End inside the shown month", () => {
    // 2026-11-01 is a Sunday: its week starts in October, but Home stays on the 1st.
    expect(navigateDate("Home", "2026-11-01", "2026-11")).toBe("2026-11-01");
    expect(navigateDate("Home", "2026-11-18", "2026-11")).toBe("2026-11-16");
    expect(navigateDate("End", "2026-11-18", "2026-11")).toBe("2026-11-22");
    expect(navigateDate("End", "2026-11-30", "2026-11")).toBe("2026-11-30");
  });

  it("changes month with Page Up and Page Down, keeping the day when possible", () => {
    expect(navigateDate("PageDown", "2026-01-31", "2026-01")).toBe("2026-02-28");
    expect(navigateDate("PageUp", "2026-03-15", "2026-03")).toBe("2026-02-15");
  });

  it("stops at the first and last month of the demo data", () => {
    expect(navigateDate("ArrowLeft", "2026-01-01", "2026-01")).toBeNull();
    expect(navigateDate("PageUp", "2026-01-10", "2026-01")).toBeNull();
    expect(navigateDate("ArrowRight", "2027-12-31", "2027-12")).toBeNull();
    expect(navigateDate("PageDown", "2027-12-10", "2027-12")).toBeNull();
  });

  it("ignores keys the grid does not handle", () => {
    expect(navigateDate("Tab", "2026-11-18", "2026-11")).toBeNull();
    expect(navigateDate("a", "2026-11-18", "2026-11")).toBeNull();
  });
});
