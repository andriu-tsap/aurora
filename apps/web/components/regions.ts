import { regions } from "@aurora/demo-data";
import type { CountryCode, RegionId } from "@aurora/types";

import type { MessageKey } from "./i18n";

const regionName: Record<RegionId, MessageKey> = {
  carpathians: "carpathians",
  tatras: "tatras",
  adriatic: "adriatic",
  "julian-alps": "julianAlps",
};

const regionDescription: Record<RegionId, MessageKey> = {
  carpathians: "carpathiansDesc",
  tatras: "tatrasDesc",
  adriatic: "adriaticDesc",
  "julian-alps": "julianAlpsDesc",
};

const countryName: Record<CountryCode, MessageKey> = {
  UA: "ukraine",
  PL: "poland",
  HR: "croatia",
  SI: "slovenia",
};

function dms(value: number, positive: string, negative: string): string {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = Math.round((abs - degrees) * 60);
  return `${degrees}° ${String(minutes).padStart(2, "0")}′ ${value >= 0 ? positive : negative}`;
}

/** Hero/globe view model derived from the single shared region list. */
export const heroRegions = regions.map((region) => ({
  id: region.id,
  lat: region.lat,
  lon: region.lon,
  routeFrom: region.routeFrom,
  name: regionName[region.id],
  description: regionDescription[region.id],
  country: countryName[region.country],
  coordinates: `${dms(region.lat, "N", "S")} / ${dms(region.lon, "E", "W")}`,
}));

export const regionCount = String(heroRegions.length).padStart(2, "0");
