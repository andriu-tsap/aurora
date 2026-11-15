"use client";
import "maplibre-gl/dist/maplibre-gl.css";

import type { Stay } from "@aurora/types";
import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapGeoJSONFeature,
} from "maplibre-gl";
import { useEffect, useRef } from "react";

/** OpenFreeMap "dark" (Dark Matter fork): no API key, OSM data. */
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

export type MapBounds = [
  west: number,
  south: number,
  east: number,
  north: number,
];

type Props = {
  stays: Stay[];
  /** Price label for each pin, already localized. */
  labels: Record<string, string>;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Called after every move while "search in map area" is on. */
  onBounds?: (bounds: MapBounds) => void;
  followBounds: boolean;
  onError: () => void;
  onReady: () => void;
  ariaLabel: string;
};

function collection(stays: Stay[], labels: Record<string, string>) {
  return {
    type: "FeatureCollection" as const,
    features: stays.map((s, i) => ({
      type: "Feature" as const,
      id: i + 1,
      properties: { slug: s.slug, label: labels[s.slug] ?? "" },
      geometry: { type: "Point" as const, coordinates: [s.lon, s.lat] },
    })),
  };
}

function boundsOf(stays: Stay[]): LngLatBoundsLike | null {
  if (!stays.length) return null;
  const lons = stays.map((s) => s.lon);
  const lats = stays.map((s) => s.lat);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

export default function StaysMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const loaded = useRef(false);
  const ids = useRef(new Map<string, number>());
  const latest = useRef(props);
  latest.current = props;

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE,
      center: [18.5, 46.8],
      zoom: 4.3,
      attributionControl: { compact: true },
      cooperativeGestures: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.current = m;
    // Exposed for automated tests (project coordinates → pixels).
    (window as Window & { __auroraMap?: maplibregl.Map }).__auroraMap = m;
    m.touchZoomRotate.disableRotation();
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    m.getCanvas().setAttribute("aria-label", latest.current.ariaLabel);
    // Re-measure when the container is shown again (mobile List/Map toggle).
    const resize = new ResizeObserver(() => m.resize());
    resize.observe(container.current);

    let failed = false;
    m.on("error", () => {
      if (!loaded.current && !failed) {
        failed = true;
        latest.current.onError();
      }
    });

    m.on("load", () => {
      loaded.current = true;
      // Reuse the style's own font stack so labels never request missing glyphs.
      const font = m
        .getStyle()
        .layers.map((l) =>
          l.type === "symbol" ? l.layout?.["text-font"] : undefined,
        )
        .find((f): f is string[] => Array.isArray(f)) ?? ["Noto Sans Regular"];
      m.addSource("stays", {
        type: "geojson",
        data: collection(latest.current.stays, latest.current.labels),
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 9,
      });
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "stays",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#2ef2c7",
          "circle-opacity": 0.9,
          "circle-radius": ["step", ["get", "point_count"], 17, 3, 21, 6, 25],
          "circle-stroke-width": 6,
          "circle-stroke-color": "rgba(46,242,199,0.22)",
        },
      });
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stays",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": font,
          "text-size": 13,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#070b1a" },
      });
      m.addLayer({
        id: "stay",
        type: "circle",
        source: "stays",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "active"], false],
            "#ff7a59",
            "#2ef2c7",
          ],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "active"], false],
            9,
            6.5,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#070b1a",
        },
      });
      m.addLayer({
        id: "stay-label",
        type: "symbol",
        source: "stays",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "label"],
          "text-font": font,
          "text-size": 12,
          "text-offset": [0, -1.6],
          "text-anchor": "bottom",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#f2f6f8",
          "text-halo-color": "#070b1a",
          "text-halo-width": 1.6,
        },
      });

      const slugOf = (f?: MapGeoJSONFeature) =>
        typeof f?.properties?.slug === "string" ? f.properties.slug : null;
      m.on("mouseenter", "stay", (e) => {
        m.getCanvas().style.cursor = "pointer";
        latest.current.onHover(slugOf(e.features?.[0]));
      });
      m.on("mouseleave", "stay", () => {
        m.getCanvas().style.cursor = "";
        latest.current.onHover(null);
      });
      m.on("click", "stay", (e) => {
        const slug = slugOf(e.features?.[0]);
        if (slug) latest.current.onSelect(slug);
      });
      m.on(
        "mouseenter",
        "clusters",
        () => (m.getCanvas().style.cursor = "pointer"),
      );
      m.on("mouseleave", "clusters", () => (m.getCanvas().style.cursor = ""));
      m.on("click", "clusters", async (e) => {
        const feature = e.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        if (typeof clusterId !== "number" || feature?.geometry.type !== "Point")
          return;
        const source = m.getSource("stays") as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        m.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom: zoom + 0.3,
        });
      });
      m.on("moveend", () => {
        if (!latest.current.followBounds || !latest.current.onBounds) return;
        const b = m.getBounds();
        latest.current.onBounds([
          b.getWest(),
          b.getSouth(),
          b.getEast(),
          b.getNorth(),
        ]);
      });
      fit(false);
      latest.current.onReady();
    });

    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
      loaded.current = false;
    };
  }, []);

  function fit(animate: boolean) {
    const m = map.current;
    const b = boundsOf(latest.current.stays);
    if (!m || !b) return;
    m.fitBounds(b, {
      padding: { top: 70, bottom: 50, left: 50, right: 50 },
      maxZoom: 9,
      duration: animate ? 600 : 0,
    });
  }

  // Data updates (filters). Keep the view when the list follows the map.
  useEffect(() => {
    const m = map.current;
    ids.current = new Map(props.stays.map((s, i) => [s.slug, i + 1]));
    if (!m || !loaded.current) return;
    (m.getSource("stays") as GeoJSONSource | undefined)?.setData(
      collection(props.stays, props.labels),
    );
    if (!props.followBounds) fit(true);
  }, [props.stays, props.labels]);

  // List → map highlight.
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded.current) return;
    m.removeFeatureState({ source: "stays" });
    for (const slug of [props.hoveredId, props.selectedId]) {
      const id = slug ? ids.current.get(slug) : undefined;
      if (id) m.setFeatureState({ source: "stays", id }, { active: true });
    }
  }, [props.hoveredId, props.selectedId, props.stays]);

  return <div ref={container} className="stays-map-canvas" />;
}
