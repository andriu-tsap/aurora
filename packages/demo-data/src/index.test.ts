import { describe, expect, it } from "vitest";

import { regions, stays, staysInRegion } from "./index";

describe("demo catalogue", () => {
  it("has 8–12 stays across exactly four regions", () => {
    expect(stays.length).toBeGreaterThanOrEqual(8);
    expect(stays.length).toBeLessThanOrEqual(12);
    expect(regions).toHaveLength(4);
  });

  it("gives every globe marker a non-empty catalogue", () => {
    for (const region of regions)
      expect(staysInRegion(region.id).length).toBeGreaterThan(0);
  });

  it("uses only regions that exist as globe markers", () => {
    const ids = new Set(regions.map((r) => r.id));
    for (const stay of stays) expect(ids.has(stay.region)).toBe(true);
  });

  it("has unique ids and URL-safe slugs", () => {
    expect(new Set(stays.map((s) => s.id)).size).toBe(stays.length);
    expect(new Set(stays.map((s) => s.slug)).size).toBe(stays.length);
    for (const stay of stays) expect(stay.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("places each stay within ~1.5° of its region marker", () => {
    for (const stay of stays) {
      const region = regions.find((r) => r.id === stay.region)!;
      expect(Math.abs(stay.lat - region.lat)).toBeLessThan(1.5);
      expect(Math.abs(stay.lon - region.lon)).toBeLessThan(1.5);
    }
  });

  it("stores money as positive integer cents", () => {
    for (const stay of stays) {
      expect(Number.isInteger(stay.nightlyCents)).toBe(true);
      expect(Number.isInteger(stay.cleaningFeeCents)).toBe(true);
      expect(stay.nightlyCents).toBeGreaterThan(0);
    }
  });

  it("has copy in every language", () => {
    for (const stay of stays)
      for (const field of [stay.summary, stay.description])
        for (const locale of ["en", "pl", "uk"] as const)
          expect(field[locale].trim().length).toBeGreaterThan(20);
  });

  it("uses valid MM-DD season bounds", () => {
    for (const stay of stays)
      for (const season of stay.seasons) {
        expect(season.from).toMatch(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
        expect(season.to).toMatch(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
      }
  });
});
