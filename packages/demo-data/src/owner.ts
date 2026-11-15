import type {
  Amenity,
  CabinLook,
  PhotoView,
  RegionId,
  Stay,
} from "@aurora/types";

/**
 * Owner-panel logic without any UI: demo state, validation and photo sizing.
 * The Angular panel keeps `OwnerState` in localStorage; nothing leaves the browser.
 */

export const OWNER_STATE_VERSION = 1;
/** Photos kept per custom stay and their size cap, so localStorage (≈5 MB) is not exhausted. */
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_CHARS = 180_000;

/** Edits the owner made to one of the fictional catalogue stays. */
export type StayEdit = Partial<
  Pick<
    Stay,
    | "name"
    | "nightlyCents"
    | "cleaningFeeCents"
    | "weeklyDiscountBp"
    | "minNights"
    | "maxGuests"
    | "amenities"
  >
>;

/** A stay the owner added in the panel; photos are compressed data URLs. */
export interface CustomStay {
  slug: string;
  name: string;
  region: RegionId;
  maxGuests: number;
  nightlyCents: number;
  cleaningFeeCents: number;
  weeklyDiscountBp: number;
  minNights: number;
  amenities: Amenity[];
  photos: string[];
}

export interface OwnerState {
  version: number;
  edits: Record<string, StayEdit>;
  custom: CustomStay[];
}

/** One row of the owner's list: catalogue stay with edits applied, or a custom stay. */
export interface OwnerStayRow {
  slug: string;
  name: string;
  region: RegionId;
  custom: boolean;
  maxGuests: number;
  nightlyCents: number;
  cleaningFeeCents: number;
  weeklyDiscountBp: number;
  minNights: number;
  amenities: Amenity[];
  photos: string[];
  /** Rendered cover of a catalogue stay (custom stays use `photos`). */
  look: CabinLook;
  cover: PhotoView;
}

export const emptyOwnerState = (): OwnerState => ({
  version: OWNER_STATE_VERSION,
  edits: {},
  custom: [],
});

const REGIONS: readonly RegionId[] = [
  "carpathians",
  "tatras",
  "adriatic",
  "julian-alps",
];

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

function parseCustom(v: unknown): CustomStay | null {
  if (!isObj(v)) return null;
  if (typeof v.slug !== "string" || typeof v.name !== "string") return null;
  if (!REGIONS.includes(v.region as RegionId)) return null;
  if (
    !isInt(v.maxGuests, 1, 16) ||
    !isInt(v.nightlyCents, 1, 10_000_000) ||
    !isInt(v.cleaningFeeCents, 0, 10_000_000) ||
    !isInt(v.weeklyDiscountBp, 0, 5000) ||
    !isInt(v.minNights, 1, 60)
  )
    return null;
  const photos = Array.isArray(v.photos)
    ? v.photos.filter(
        (p): p is string =>
          typeof p === "string" &&
          p.startsWith("data:image/") &&
          p.length <= MAX_PHOTO_CHARS,
      )
    : [];
  const amenities = Array.isArray(v.amenities)
    ? v.amenities.filter((a): a is Amenity => typeof a === "string")
    : [];
  return {
    slug: v.slug,
    name: v.name,
    region: v.region as RegionId,
    maxGuests: v.maxGuests,
    nightlyCents: v.nightlyCents,
    cleaningFeeCents: v.cleaningFeeCents,
    weeklyDiscountBp: v.weeklyDiscountBp,
    minNights: v.minNights,
    amenities,
    photos: photos.slice(0, MAX_PHOTOS),
  };
}

function parseEdit(v: unknown): StayEdit | null {
  if (!isObj(v)) return null;
  const e: StayEdit = {};
  if (typeof v.name === "string" && v.name.trim()) e.name = v.name;
  if (isInt(v.nightlyCents, 1, 10_000_000)) e.nightlyCents = v.nightlyCents;
  if (isInt(v.cleaningFeeCents, 0, 10_000_000))
    e.cleaningFeeCents = v.cleaningFeeCents;
  if (isInt(v.weeklyDiscountBp, 0, 5000)) e.weeklyDiscountBp = v.weeklyDiscountBp;
  if (isInt(v.minNights, 1, 60)) e.minNights = v.minNights;
  if (isInt(v.maxGuests, 1, 16)) e.maxGuests = v.maxGuests;
  if (Array.isArray(v.amenities))
    e.amenities = v.amenities.filter((a): a is Amenity => typeof a === "string");
  return e;
}

/** Reads untrusted JSON from localStorage; anything malformed is dropped. */
export function parseOwnerState(raw: unknown): OwnerState {
  const state = emptyOwnerState();
  if (!isObj(raw) || raw.version !== OWNER_STATE_VERSION) return state;
  if (isObj(raw.edits)) {
    for (const [slug, v] of Object.entries(raw.edits)) {
      const e = parseEdit(v);
      if (e) state.edits[slug] = e;
    }
  }
  if (Array.isArray(raw.custom)) {
    for (const v of raw.custom) {
      const c = parseCustom(v);
      if (c && !state.custom.some((x) => x.slug === c.slug)) state.custom.push(c);
    }
  }
  return state;
}

/** Catalogue stays with the owner's edits applied, followed by custom stays. */
export function ownerRows(base: Stay[], state: OwnerState): OwnerStayRow[] {
  const rows: OwnerStayRow[] = base.map((s) => {
    const e = state.edits[s.slug] ?? {};
    return {
      slug: s.slug,
      name: e.name ?? s.name,
      region: s.region,
      custom: false,
      maxGuests: e.maxGuests ?? s.maxGuests,
      nightlyCents: e.nightlyCents ?? s.nightlyCents,
      cleaningFeeCents: e.cleaningFeeCents ?? s.cleaningFeeCents,
      weeklyDiscountBp: e.weeklyDiscountBp ?? s.weeklyDiscountBp,
      minNights: e.minNights ?? s.minNights,
      amenities: e.amenities ?? s.amenities,
      photos: [],
      look: s.look,
      cover: s.cover,
    };
  });
  for (const c of state.custom)
    rows.push({
      ...c,
      custom: true,
      look: { wood: "walnut", metal: "black" },
      cover: "hero-day",
    });
  return rows;
}

export type DraftField =
  | "name"
  | "maxGuests"
  | "nightlyCents"
  | "cleaningFeeCents"
  | "weeklyDiscountBp"
  | "minNights";

export interface StayDraft {
  name: string;
  region: RegionId;
  maxGuests: number;
  nightlyCents: number;
  cleaningFeeCents: number;
  weeklyDiscountBp: number;
  minNights: number;
  amenities: Amenity[];
}

/** Returns the invalid fields of a form draft (empty object = valid). */
export function validateDraft(d: StayDraft): Partial<Record<DraftField, true>> {
  const bad: Partial<Record<DraftField, true>> = {};
  if (d.name.trim().length < 2 || d.name.trim().length > 80) bad.name = true;
  if (!isInt(d.maxGuests, 1, 16)) bad.maxGuests = true;
  if (!isInt(d.nightlyCents, 1, 10_000_000)) bad.nightlyCents = true;
  if (!isInt(d.cleaningFeeCents, 0, 10_000_000)) bad.cleaningFeeCents = true;
  if (!isInt(d.weeklyDiscountBp, 0, 5000)) bad.weeklyDiscountBp = true;
  if (!isInt(d.minNights, 1, 60)) bad.minNights = true;
  return bad;
}

/** URL-safe unique slug: "Café Ñandú" -> "cafe-nandu", "-2", "-3" on clashes. */
export function slugify(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "stay";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Saves edits of a catalogue stay or replaces a custom stay with the same slug. */
export function saveStay(
  state: OwnerState,
  slug: string,
  draft: StayDraft,
  custom: boolean,
  photos: string[] = [],
): OwnerState {
  if (custom) {
    const next: CustomStay = {
      slug,
      name: draft.name.trim(),
      region: draft.region,
      maxGuests: draft.maxGuests,
      nightlyCents: draft.nightlyCents,
      cleaningFeeCents: draft.cleaningFeeCents,
      weeklyDiscountBp: draft.weeklyDiscountBp,
      minNights: draft.minNights,
      amenities: draft.amenities,
      photos: photos.slice(0, MAX_PHOTOS),
    };
    const others = state.custom.filter((c) => c.slug !== slug);
    return { ...state, custom: [...others, next] };
  }
  return {
    ...state,
    edits: {
      ...state.edits,
      [slug]: {
        name: draft.name.trim(),
        maxGuests: draft.maxGuests,
        nightlyCents: draft.nightlyCents,
        cleaningFeeCents: draft.cleaningFeeCents,
        weeklyDiscountBp: draft.weeklyDiscountBp,
        minNights: draft.minNights,
        amenities: draft.amenities,
      },
    },
  };
}

/** Price-only change used by the quick price editor. */
export function setNightly(
  state: OwnerState,
  slug: string,
  nightlyCents: number,
): OwnerState {
  if (!isInt(nightlyCents, 1, 10_000_000)) return state;
  const c = state.custom.find((x) => x.slug === slug);
  if (c) {
    return {
      ...state,
      custom: state.custom.map((x) =>
        x.slug === slug ? { ...x, nightlyCents } : x,
      ),
    };
  }
  return {
    ...state,
    edits: { ...state.edits, [slug]: { ...state.edits[slug], nightlyCents } },
  };
}

export function removeCustom(state: OwnerState, slug: string): OwnerState {
  return { ...state, custom: state.custom.filter((c) => c.slug !== slug) };
}

/** Drops the owner's edits of a catalogue stay (back to the demo defaults). */
export function resetEdits(state: OwnerState, slug: string): OwnerState {
  const edits = { ...state.edits };
  delete edits[slug];
  return { ...state, edits };
}

/** Target size for browser-side photo compression: fits `max` px on the long side, never upscales. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Form text like "12,50" or "12.5" -> cents; null when it is not a plain non-negative amount. */
export function parseEuro(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Starting values for the edit form. */
export function rowToDraft(row: OwnerStayRow): StayDraft {
  return {
    name: row.name,
    region: row.region,
    maxGuests: row.maxGuests,
    nightlyCents: row.nightlyCents,
    cleaningFeeCents: row.cleaningFeeCents,
    weeklyDiscountBp: row.weeklyDiscountBp,
    minNights: row.minNights,
    amenities: [...row.amenities],
  };
}

export const emptyDraft = (): StayDraft => ({
  name: "",
  region: "carpathians",
  maxGuests: 2,
  nightlyCents: 10000,
  cleaningFeeCents: 3000,
  weeklyDiscountBp: 1000,
  minNights: 2,
  amenities: [],
});

export const ALL_AMENITIES: readonly Amenity[] = [
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

export const ALL_REGIONS: readonly RegionId[] = REGIONS;
