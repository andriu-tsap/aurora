import { regions, staysInRegion } from "@aurora/demo-data";

import Home from "../components/Home";

// Counted at build time so the catalogue data stays out of the home bundle.
const stayCounts = Object.fromEntries(
  regions.map((r) => [r.id, staysInRegion(r.id).length]),
);

export default function Page() {
  return <Home stayCounts={stayCounts} />;
}
