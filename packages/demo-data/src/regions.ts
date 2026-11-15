import type { Region } from "@aurora/types";

import regionList from "./regions.json";

/** The four regions; the same list drives globe markers and the catalogue. */
export const regions = regionList as Region[];

export const regionIds = regions.map((r) => r.id);
