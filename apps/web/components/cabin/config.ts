import type { MetalFinish, WoodFinish } from "@aurora/types";

/**
 * Every dimension of the code-built A-frame, in metres.
 * Change values here; the model is generated from them.
 */
export const cabinConfig = {
  /** Width of the A at floor level (inner roof faces). */
  width: 6,
  /** Length of the cabin body from rear gable to glass facade. */
  depth: 8,
  /** Ridge height above the interior floor (≈ 6 m above ground overall). */
  ridge: 5.45,
  /** Interior floor level above ground (cabin stands on piers). */
  floorLevel: 0.6,
  roof: {
    /** Timber structure + insulation thickness. */
    thickness: 0.26,
    /** Standing-seam metal skin on top of the timber. */
    skin: 0.025,
    /** How far the roof continues past the floor line along the slope. */
    eave: 0.42,
    overhangFront: 0.75,
    overhangBack: 0.45,
    seamSpacing: 0.45,
    bevel: 0.015,
  },
  facade: {
    /** Glass sits this far behind the front edge of the cabin body. */
    frame: 0.09,
    mullionWidth: 0.06,
    mullionDepth: 0.12,
    /** Vertical mullion offsets from the centre line. */
    mullionsX: [0.95, 2.05],
    /** Transom heights above the floor. */
    transoms: [2.1, 3.55],
    doorWidth: 1.9,
    doorHeight: 2.1,
  },
  loft: { height: 2.65, depthFromRear: 3.6, thickness: 0.22 },
  deck: {
    depth: 3.1,
    /** Kept inside the roof span so the eaves never cut through the deck. */
    width: 5.8,
    board: { width: 0.14, thickness: 0.03, gap: 0.006, bevel: 0.008 },
    joistSpacing: 0.5,
    rimDepth: 0.22,
  },
  stairs: { width: 1.6, rise: 0.2, run: 0.3 },
  railing: { height: 1.0, postSize: 0.06, postSpacing: 1.45, bars: 5 },
  chimney: { x: 0.55, z: -0.05, radius: 0.11, aboveRidge: 0.65 },
  /** Post-cap lanterns on the two railing posts that flank the stairs. */
  lantern: { size: 0.16, height: 0.3 },
  pier: { size: 0.32 },
} as const;

export interface WoodLook {
  base: string;
  grain: string;
  roughness: number;
  /** Burnt-timber crackle for shou sugi ban. */
  charred: boolean;
}

export const woodLooks: Record<WoodFinish, WoodLook> = {
  light: { base: "#c9a47c", grain: "#a07a52", roughness: 0.62, charred: false },
  walnut: {
    base: "#70503a",
    grain: "#46301f",
    roughness: 0.58,
    charred: false,
  },
  charred: { base: "#2b2724", grain: "#141210", roughness: 0.8, charred: true },
};

export interface MetalLook {
  color: string;
  metalness: number;
  roughness: number;
}

export const metalLooks: Record<MetalFinish, MetalLook> = {
  black: { color: "#1c1d1f", metalness: 0.55, roughness: 0.52 },
  graphite: { color: "#454a50", metalness: 0.65, roughness: 0.45 },
  bronze: { color: "#6e5136", metalness: 0.85, roughness: 0.38 },
};

export type TimeOfDay = "day" | "night";

export interface CabinOptions {
  wood: WoodFinish;
  metal: MetalFinish;
  time: TimeOfDay;
  curtains: "open" | "closed";
}

export const defaultCabinOptions: CabinOptions = {
  wood: "walnut",
  metal: "black",
  time: "day",
  curtains: "open",
};
