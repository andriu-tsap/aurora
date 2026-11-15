import { describe, expect, it } from "vitest";
import {
  addDays,
  bookingReference,
  busyNights,
  checkTestCard,
  nightsBetween,
  quoteStay,
  type IsoDate,
} from "./booking";
import { stays } from "./index";

const stay = stays[0];
const today: IsoDate = "2026-11-15";

function freeRange(nights: number): IsoDate {
  const busy = busyNights(stay);
  for (let d = 0; d < 800; d++) {
    const start = addDays(today, d);
    let ok = true;
    for (let i = 0; i < nights; i++) if (busy.has(addDays(start, i))) ok = false;
    if (ok) return start;
  }
  throw new Error("no free range");
}

describe("booking", () => {
  it("generates the same busy nights every time", () => {
    const a = [...busyNights(stay)].sort();
    const b = [...busyNights(stays[0])].sort();
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(50);
  });

  it("leaves free nights for every stay", () => {
    for (const s of stays) {
      const busy = busyNights(s);
      let free = 0;
      for (let d = 0; d < 120; d++) if (!busy.has(addDays(today, d))) free++;
      expect(free).toBeGreaterThan(40);
    }
  });

  it("quotes nights, cleaning fee and a weekly discount", () => {
    const nights = Math.max(7, stay.minNights);
    const start = freeRange(nights);
    const end = addDays(start, nights);
    const r = quoteStay(stay, start, end, 1, today);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.quote.nights).toBe(nights);
    expect(r.quote.weeklyDiscountCents).toBeGreaterThan(0);
    expect(r.quote.totalCents).toBe(
      r.quote.subtotalCents -
        r.quote.weeklyDiscountCents +
        stay.cleaningFeeCents,
    );
    expect(Number.isInteger(r.quote.totalCents)).toBe(true);
  });

  it("rejects bad input with a specific error", () => {
    const start = freeRange(stay.minNights);
    const end = addDays(start, stay.minNights);
    expect(quoteStay(stay, end, start, 1, today)).toEqual({ ok: false, error: "dates" });
    expect(quoteStay(stay, "2026-01-05", "2026-01-09", 1, today)).toEqual({ ok: false, error: "past" });
    expect(quoteStay(stay, start, end, stay.maxGuests + 1, today)).toEqual({ ok: false, error: "guests" });
    const busyDay = [...busyNights(stay)].find((d) => d > today) as IsoDate;
    const r = quoteStay(stay, busyDay, addDays(busyDay, stay.minNights), 1, today);
    expect(r).toEqual({ ok: false, error: "unavailable" });
    if (stay.minNights > 1) {
      expect(quoteStay(stay, start, addDays(start, 1), 1, today)).toEqual({ ok: false, error: "minNights" });
    }
  });

  it("accepts only the two documented test cards", () => {
    expect(checkTestCard("4242 4242 4242 4242")).toBe("approved");
    expect(checkTestCard("4000-0000-0000-0002")).toBe("declined");
    expect(checkTestCard("4111 1111 1111 1111")).toBe("invalid");
    expect(checkTestCard("")).toBe("invalid");
  });

  it("builds stable references and counts nights", () => {
    const a = bookingReference("x", "2026-12-01", "2026-12-03", "t");
    expect(a).toBe(bookingReference("x", "2026-12-01", "2026-12-03", "t"));
    expect(a).toMatch(/^AUR-[0-9A-Z]{6}$/);
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
  });
});
