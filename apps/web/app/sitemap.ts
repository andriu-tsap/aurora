import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://andriu-tsap.github.io/aurora/",
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://andriu-tsap.github.io/aurora/cabin/",
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
