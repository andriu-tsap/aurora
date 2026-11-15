import { describe, expect, it } from "vitest";

import {
  defaultFilters,
  filterStays,
  filtersFromQuery,
  filtersToQuery,
  priceCeiling,
} from "./filter";
import { stays } from "./index";

describe("stay filters", () => {
  it("returns everything with default filters", () => {
    expect(filterStays(stays, defaultFilters)).toHaveLength(stays.length);
  });

  it("filters by region, guests, type, price and amenities together", () => {
    const result = filterStays(stays, {
      ...defaultFilters,
      region: "tatras",
      guests: 4,
      types: ["cabin"],
      maxPrice: 170,
      amenities: ["fireplace"],
    });
    expect(result.map((s) => s.slug).sort()).toEqual([
      "gorce-meadow",
      "halny-ridge",
    ]);
  });

  it("requires every selected amenity", () => {
    const result = filterStays(stays, {
      ...defaultFilters,
      amenities: ["sauna", "lake-view"],
    });
    expect(result.map((s) => s.slug)).toEqual(["larch-lake-lodge"]);
  });

  it("sorts by price both ways", () => {
    const asc = filterStays(stays, { ...defaultFilters, sort: "price-asc" });
    const desc = filterStays(stays, { ...defaultFilters, sort: "price-desc" });
    expect(asc[0].nightlyCents).toBeLessThanOrEqual(asc[1].nightlyCents);
    expect(desc[0].nightlyCents).toBe(
      Math.max(...stays.map((s) => s.nightlyCents)),
    );
  });

  it("round-trips through the URL and ignores bad values", () => {
    const f = {
      ...defaultFilters,
      region: "adriatic" as const,
      maxPrice: 120,
      guests: 3,
      types: ["pod" as const],
      amenities: ["wifi" as const],
      sort: "price-desc" as const,
    };
    expect(filtersFromQuery(filtersToQuery(f))).toEqual(f);
    expect(
      filtersFromQuery("?region=mars&guests=-2&type=castle&amenities=moat"),
    ).toEqual(defaultFilters);
  });

  it("rounds the price ceiling up to €10", () => {
    expect(priceCeiling(stays)).toBe(190);
  });
});
