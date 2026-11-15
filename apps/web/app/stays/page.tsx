import type { Metadata } from "next";

import Catalogue from "../../components/stays/Catalogue";

export const metadata: Metadata = {
  title:
    "Stays — AURORA A-frames in the Carpathians, Tatras, Adriatic and Julian Alps",
  description:
    "Filter fictional A-frame stays by region, price, guests, type and amenities, with a synchronized map. Concept / demo project — fictional data.",
  alternates: { canonical: "https://andriu-tsap.github.io/aurora/stays/" },
};

export default function StaysPage() {
  return <Catalogue />;
}
