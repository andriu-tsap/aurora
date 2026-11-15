import { stays } from "@aurora/demo-data";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const site = "https://andriu-tsap.github.io/aurora";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site}/stays/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site}/cabin/`, changeFrequency: "monthly", priority: 0.7 },
    ...stays.map((s) => ({
      url: `${site}/stays/${s.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
