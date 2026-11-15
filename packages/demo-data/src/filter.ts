import type { Amenity, RegionId, Stay, StayType } from "@aurora/types";

export type SortOrder = "recommended" | "price-asc" | "price-desc";

export interface StayFilters {
  region: RegionId | null;
  /** Maximum base nightly price in whole euros; null = no limit. */
  maxPrice: number | null;
  guests: number;
  types: StayType[];
  /** Every listed amenity must be present. */
  amenities: Amenity[];
  sort: SortOrder;
}

export const defaultFilters: StayFilters = {
  region: null,
  maxPrice: null,
  guests: 1,
  types: [],
  amenities: [],
  sort: "recommended",
};

export function filterStays(stays: Stay[], f: StayFilters): Stay[] {
  const result = stays.filter(
    (s) =>
      (!f.region || s.region === f.region) &&
      (f.maxPrice === null || s.nightlyCents <= f.maxPrice * 100) &&
      s.maxGuests >= f.guests &&
      (f.types.length === 0 || f.types.includes(s.type)) &&
      f.amenities.every((a) => s.amenities.includes(a)),
  );
  if (f.sort === "price-asc")
    result.sort((a, b) => a.nightlyCents - b.nightlyCents);
  if (f.sort === "price-desc")
    result.sort((a, b) => b.nightlyCents - a.nightlyCents);
  return result;
}

/** Highest base nightly price in whole euros (slider upper bound). */
export function priceCeiling(stays: Stay[]) {
  return Math.ceil(Math.max(...stays.map((s) => s.nightlyCents)) / 1000) * 10;
}

const regionIds: RegionId[] = [
  "carpathians",
  "tatras",
  "adriatic",
  "julian-alps",
];
const typeIds: StayType[] = ["pod", "cabin", "lodge"];
const amenityIds: Amenity[] = [
  "sauna",
  "hot-tub",
  "fireplace",
  "wifi",
  "kitchen",
  "workspace",
  "pet-friendly",
  "parking",
  "ev-charger",
  "lake-view",
  "sea-view",
  "mountain-view",
];

/** Parse shareable filter state from a query string, ignoring bad values. */
export function filtersFromQuery(query: string): StayFilters {
  const p = new URLSearchParams(query);
  const list = <T extends string>(key: string, allowed: T[]) =>
    (p.get(key) ?? "")
      .split(",")
      .filter((v): v is T => (allowed as string[]).includes(v));
  const region = p.get("region");
  const max = Number(p.get("max"));
  const guests = Number(p.get("guests"));
  const sort = p.get("sort");
  return {
    region: regionIds.includes(region as RegionId)
      ? (region as RegionId)
      : null,
    maxPrice: Number.isFinite(max) && max > 0 ? Math.round(max) : null,
    guests:
      Number.isInteger(guests) && guests >= 1 && guests <= 12 ? guests : 1,
    types: list("type", typeIds),
    amenities: list("amenities", amenityIds),
    sort: sort === "price-asc" || sort === "price-desc" ? sort : "recommended",
  };
}

export function filtersToQuery(f: StayFilters): string {
  const p = new URLSearchParams();
  if (f.region) p.set("region", f.region);
  if (f.maxPrice !== null) p.set("max", String(f.maxPrice));
  if (f.guests > 1) p.set("guests", String(f.guests));
  if (f.types.length) p.set("type", f.types.join(","));
  if (f.amenities.length) p.set("amenities", f.amenities.join(","));
  if (f.sort !== "recommended") p.set("sort", f.sort);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export { amenityIds, typeIds };
