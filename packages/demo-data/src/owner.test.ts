import { describe, expect, it } from "vitest";
import { stays } from "./index";
import {
  emptyOwnerState,
  fitWithin,
  MAX_PHOTOS,
  emptyDraft,
  ownerRows,
  parseEuro,
  rowToDraft,
  parseOwnerState,
  removeCustom,
  resetEdits,
  saveStay,
  setNightly,
  slugify,
  validateDraft,
  type StayDraft,
} from "./owner";

const draft = (over: Partial<StayDraft> = {}): StayDraft => ({
  name: "Test Hut",
  region: "tatras",
  maxGuests: 4,
  nightlyCents: 12000,
  cleaningFeeCents: 3000,
  weeklyDiscountBp: 500,
  minNights: 2,
  amenities: ["wifi"],
  ...over,
});

describe("owner state", () => {
  it("applies edits to a catalogue stay and keeps the rest", () => {
    const first = stays[0];
    const s = setNightly(emptyOwnerState(), first.slug, 19900);
    const rows = ownerRows(stays, s);
    expect(rows).toHaveLength(stays.length);
    expect(rows[0].nightlyCents).toBe(19900);
    expect(rows[1].nightlyCents).toBe(stays[1].nightlyCents);
  });

  it("adds, replaces and removes a custom stay", () => {
    let s = saveStay(emptyOwnerState(), "test-hut", draft(), true, ["data:image/jpeg;base64,AA"]);
    expect(ownerRows(stays, s).at(-1)?.custom).toBe(true);
    s = saveStay(s, "test-hut", draft({ nightlyCents: 15000 }), true);
    expect(s.custom).toHaveLength(1);
    expect(s.custom[0].nightlyCents).toBe(15000);
    expect(removeCustom(s, "test-hut").custom).toHaveLength(0);
  });

  it("caps the number of photos", () => {
    const many = Array.from({ length: 9 }, () => "data:image/jpeg;base64,AA");
    const s = saveStay(emptyOwnerState(), "x", draft(), true, many);
    expect(s.custom[0].photos).toHaveLength(MAX_PHOTOS);
  });

  it("resets edits of a catalogue stay", () => {
    const slug = stays[0].slug;
    const s = resetEdits(setNightly(emptyOwnerState(), slug, 100), slug);
    expect(ownerRows(stays, s)[0].nightlyCents).toBe(stays[0].nightlyCents);
  });

  it("ignores an invalid price", () => {
    const s = emptyOwnerState();
    expect(setNightly(s, stays[0].slug, -5)).toBe(s);
    expect(setNightly(s, stays[0].slug, 10.5)).toBe(s);
  });

  it("parses untrusted storage defensively", () => {
    expect(parseOwnerState(null)).toEqual(emptyOwnerState());
    expect(parseOwnerState({ version: 99 })).toEqual(emptyOwnerState());
    const parsed = parseOwnerState({
      version: 1,
      edits: { a: { nightlyCents: "x", name: "  " }, b: { nightlyCents: 5000 } },
      custom: [
        { slug: "bad", name: "x", region: "mars" },
        { ...draft(), slug: "ok", photos: ["javascript:alert(1)", "data:image/png;base64,AA"] },
      ],
    });
    expect(parsed.edits.b.nightlyCents).toBe(5000);
    expect(parsed.edits.a).toEqual({});
    expect(parsed.custom.map((c) => c.slug)).toEqual(["ok"]);
    expect(parsed.custom[0].photos).toEqual(["data:image/png;base64,AA"]);
  });
});

describe("validation and helpers", () => {
  it("flags every invalid field", () => {
    expect(validateDraft(draft())).toEqual({});
    const bad = validateDraft(
      draft({ name: " ", maxGuests: 0, nightlyCents: 0, cleaningFeeCents: -1, weeklyDiscountBp: 6000, minNights: 0 }),
    );
    expect(Object.keys(bad).sort()).toEqual(
      ["cleaningFeeCents", "maxGuests", "minNights", "name", "nightlyCents", "weeklyDiscountBp"],
    );
  });

  it("makes unique ASCII slugs", () => {
    expect(slugify("Café Ñandú!", new Set())).toBe("cafe-nandu");
    expect(slugify("Chata", new Set(["chata", "chata-2"]))).toBe("chata-3");
    expect(slugify("???", new Set())).toBe("stay");
  });

  it("fits photos without upscaling", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(0, 10, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe("form helpers", () => {
  it("parses euro text with comma or dot", () => {
    expect(parseEuro("140")).toBe(14000);
    expect(parseEuro(" 12,5 ")).toBe(1250);
    expect(parseEuro("0.05")).toBe(5);
    for (const bad of ["", "-1", "1e3", "12.345", "abc", "1,2,3"])
      expect(parseEuro(bad)).toBeNull();
  });

  it("round-trips a row into a valid draft", () => {
    const row = ownerRows(stays, emptyOwnerState())[0];
    const d = rowToDraft(row);
    expect(validateDraft(d)).toEqual({});
    expect(d.amenities).not.toBe(row.amenities);
  });

  it("starts the add form with sensible but not yet valid name", () => {
    expect(Object.keys(validateDraft(emptyDraft()))).toEqual(["name"]);
  });
});
