import type { Page } from "@playwright/test";

/**
 * The test sandbox cannot reach OpenFreeMap. Serve a minimal dark style so
 * MapLibre, clustering and interactions are exercised offline. Screenshots
 * taken with this stub show no basemap and are labelled as such.
 */
export async function stubMapTiles(page: Page) {
  await page.route("https://tiles.openfreemap.org/**", (route) => {
    const url = route.request().url();
    if (url.includes("/styles/"))
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          version: 8,
          glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
          sources: {},
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#0b1020" },
            },
          ],
        }),
      });
    return route.fulfill({ status: 404, body: "" });
  });
}
