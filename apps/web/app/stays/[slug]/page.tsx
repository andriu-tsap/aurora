import { getRegion, getStay, stays } from "@aurora/demo-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StayDetail from "../../../components/stays/StayDetail";

const site = "https://andriu-tsap.github.io/aurora";

export const dynamicParams = false;

export function generateStaticParams() {
  return stays.map((s) => ({ slug: s.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const stay = getStay((await params).slug);
  if (!stay) return {};
  const image = `${site}/stays/renders/${stay.look.wood}-${stay.look.metal}-hero-day-1200.webp`;
  return {
    title: `${stay.name} — AURORA (demo)`,
    description: `${stay.summary.en} Concept / demo project — fictional data.`,
    alternates: { canonical: `${site}/stays/${stay.slug}/` },
    openGraph: {
      title: `${stay.name} — AURORA`,
      description: stay.summary.en,
      url: `${site}/stays/${stay.slug}/`,
      images: [{ url: image, width: 1200, height: 750 }],
    },
  };
}

export default async function StayPage({ params }: Params) {
  const stay = getStay((await params).slug);
  if (!stay) notFound();
  const region = getRegion(stay.region);
  // Structured data, clearly marked as fictional demo content.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: `${stay.name} (fictional demo listing)`,
    description: `${stay.description.en} This is a fictional listing in a portfolio demo; it cannot be booked.`,
    url: `${site}/stays/${stay.slug}/`,
    image: `${site}/stays/renders/${stay.look.wood}-${stay.look.metal}-hero-day-1200.webp`,
    priceRange: `from €${stay.nightlyCents / 100} per night (demo)`,
    address: { "@type": "PostalAddress", addressCountry: region.country },
    geo: { "@type": "GeoCoordinates", latitude: stay.lat, longitude: stay.lon },
    amenityFeature: stay.amenities.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a,
      value: true,
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StayDetail slug={stay.slug} />
    </>
  );
}
