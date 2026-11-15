/**
 * Shared domain types for AURORA (web, future API, Angular admin, widget).
 * Money is always an integer amount of minor units (cents) to avoid
 * floating-point rounding in prices.
 */

export type Locale = "en" | "pl" | "uk";

/** Text that exists in every UI language. */
export type Localized = Record<Locale, string>;

export type RegionId = "carpathians" | "tatras" | "adriatic" | "julian-alps";

export type CountryCode = "UA" | "PL" | "HR" | "SI";

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Region extends LatLon {
  id: RegionId;
  country: CountryCode;
  /** Origin of the illustrative arc drawn on the hero globe. */
  routeFrom: LatLon;
}

/** Every listing is an A-frame; size class drives the parametric 3D model. */
export type StayType = "pod" | "cabin" | "lodge";

export type Amenity =
  | "sauna"
  | "hot-tub"
  | "fireplace"
  | "wifi"
  | "kitchen"
  | "workspace"
  | "pet-friendly"
  | "parking"
  | "ev-charger"
  | "lake-view"
  | "sea-view"
  | "mountain-view";

export type WoodFinish = "light" | "walnut" | "charred";
export type MetalFinish = "black" | "graphite" | "bronze";

/** Look of the code-built cabin used for this listing's renders and 3D view. */
export interface CabinLook {
  wood: WoodFinish;
  metal: MetalFinish;
}

/** Inclusive month-day range ("MM-DD"); may wrap the new year. */
export interface Season {
  id: "high" | "holiday" | "low";
  from: string;
  to: string;
  /** Nightly price multiplier in basis points: 12500 = ×1.25. */
  multiplierBp: number;
}

export interface Stay extends LatLon {
  id: string;
  slug: string;
  name: string;
  region: RegionId;
  type: StayType;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  /** Base nightly price in euro cents. */
  nightlyCents: number;
  cleaningFeeCents: number;
  /** Discount for stays of 7+ nights, in basis points (1000 = 10%). */
  weeklyDiscountBp: number;
  minNights: number;
  seasons: Season[];
  amenities: Amenity[];
  look: CabinLook;
  summary: Localized;
  description: Localized;
}
