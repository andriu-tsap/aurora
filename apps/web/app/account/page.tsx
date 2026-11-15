import type { Metadata } from "next";

import Account from "../../components/booking/Account";

export const metadata: Metadata = {
  title: "My bookings — AURORA guest account (demo)",
  description:
    "Demo guest account: bookings are stored only in this browser. Concept / demo project — fictional data.",
  alternates: { canonical: "https://andriu-tsap.github.io/aurora/account/" },
  robots: { index: false },
};

export default function AccountPage() {
  return <Account />;
}
