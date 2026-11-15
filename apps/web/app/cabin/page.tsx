import type { Metadata } from "next";

import CabinStudio from "../../components/cabin/CabinStudio";

export const metadata: Metadata = {
  title: "The AURORA A-frame — code-built 3D cabin",
  description:
    "An interactive A-frame cabin generated entirely in React Three Fiber: real dimensions, PBR materials, day and night. Concept / demo project — fictional data.",
  alternates: { canonical: "https://andriu-tsap.github.io/aurora/cabin/" },
};

export default function CabinPage() {
  return <CabinStudio />;
}
