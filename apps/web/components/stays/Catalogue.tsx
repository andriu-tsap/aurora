"use client";
import "./stays.css";
import {
  amenityIds,
  defaultFilters,
  filterStays,
  filtersFromQuery,
  filtersToQuery,
  priceCeiling,
  regions,
  stays,
  type StayFilters,
} from "@aurora/demo-data";
import type { Amenity, StayType } from "@aurora/types";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FavoriteButton } from "../favorites/FavoriteButton";
import {
  amenityLabel,
  formatPrice,
  photoViews,
  resultsKey,
  typeLabel,
} from "../format";
import { useLocale, useT } from "../i18n";
import { PageShell } from "../PageShell";
import { Photo } from "../Photo";
import { heroRegions } from "../regions";
import type { MapBounds } from "./StaysMap";

// MapLibre (~250 kB) lives in its own chunk, loaded only when the map shows.
const StaysMap = dynamic(() => import("./StaysMap"), { ssr: false });

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const ceiling = priceCeiling(stays);
const typeIds: StayType[] = ["pod", "cabin", "lodge"];

function inBounds(lon: number, lat: number, b: MapBounds | null) {
  return !b || (lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3]);
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function CatalogueView() {
  const t = useT();
  const locale = useLocale();
  const [filters, setFilters] = useState<StayFilters>(defaultFilters);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [desktop, setDesktop] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [followMap, setFollowMap] = useState(false);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [mapState, setMapState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const cards = useRef(new Map<string, HTMLElement>());
  const [filtersOpen, setFiltersOpen] = useState(false);

  // URL ⇄ state, so a filtered catalogue can be shared or bookmarked.
  useEffect(() => {
    setFilters(filtersFromQuery(window.location.search));
    if (new URLSearchParams(window.location.search).get("view") === "map")
      setView("map");
    const media = matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    setReady(true);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const q = filtersToQuery(filters);
    const v = !desktop && view === "map" ? (q ? "&" : "?") + "view=map" : "";
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${q}${v}`,
    );
  }, [filters, view, desktop, ready]);

  const matching = useMemo(() => filterStays(stays, filters), [filters]);
  const visible = useMemo(
    () =>
      followMap
        ? matching.filter((s) => inBounds(s.lon, s.lat, bounds))
        : matching,
    [matching, followMap, bounds],
  );
  const labels = useMemo(
    () =>
      Object.fromEntries(
        stays.map((s) => [s.slug, formatPrice(s.nightlyCents, locale)]),
      ),
    [locale],
  );

  const showMap = desktop || view === "map";
  useEffect(() => {
    if (showMap && mapState === "idle") setMapState("loading");
  }, [showMap, mapState]);

  const set = useCallback(
    <K extends keyof StayFilters>(key: K, value: StayFilters[K]) =>
      setFilters((f) => ({ ...f, [key]: value })),
    [],
  );

  const selectFromMap = useCallback(
    (slug: string) => {
      setSelected(slug);
      if (!desktop) setView("list");
      requestAnimationFrame(() =>
        cards.current
          .get(slug)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    },
    [desktop],
  );

  const count = visible.length;
  const activeFilters =
    (filters.region ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.guests > 1 ? 1 : 0) +
    filters.types.length +
    filters.amenities.length;

  return (
    <main id="content" className="stays-page">
      <div className="stays-head">
        <span className="eyebrow">
          <span className="eyebrow-line" />
          {t("staysEyebrow")}
        </span>
        <h1>{t("staysTitle")}</h1>
      </div>

      <div className="filters-bar">
        <button
          type="button"
          className="filters-toggle"
          aria-expanded={filtersOpen}
          aria-controls="stay-filters"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          ⚙ {t("filters")}
          {activeFilters > 0 && <span className="badge">{activeFilters}</span>}
        </button>
        <p aria-hidden="true">
          <strong>{count}</strong> {t(resultsKey(count, locale))}
        </p>
      </div>

      <section
        id="stay-filters"
        className={"filters" + (filtersOpen ? " is-open" : "")}
        aria-label={t("filters")}
      >
        <div
          className="filter-regions"
          role="group"
          aria-label={t("regionLabel")}
        >
          <button
            type="button"
            aria-pressed={filters.region === null}
            onClick={() => set("region", null)}
          >
            {t("allRegions")}
          </button>
          {heroRegions.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={filters.region === r.id}
              onClick={() => set("region", r.id)}
            >
              {t(r.name)}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <label className="filter-price">
            <span>
              {t("maxPrice")}:{" "}
              <strong>
                {formatPrice((filters.maxPrice ?? ceiling) * 100, locale)}
              </strong>
            </span>
            <input
              type="range"
              min={80}
              max={ceiling}
              step={10}
              value={filters.maxPrice ?? ceiling}
              onChange={(e) => {
                const v = Number(e.target.value);
                set("maxPrice", v >= ceiling ? null : v);
              }}
            />
          </label>
          <div
            className="filter-guests"
            role="group"
            aria-label={t("guestsLabel")}
          >
            <span>{t("guestsLabel")}</span>
            <button
              type="button"
              aria-label="−"
              onClick={() => set("guests", Math.max(1, filters.guests - 1))}
              disabled={filters.guests <= 1}
            >
              −
            </button>
            <output aria-live="polite">{filters.guests}</output>
            <button
              type="button"
              aria-label="+"
              onClick={() => set("guests", Math.min(6, filters.guests + 1))}
              disabled={filters.guests >= 6}
            >
              +
            </button>
          </div>
          <fieldset className="filter-types">
            <legend>{t("typeLabel")}</legend>
            {typeIds.map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={filters.types.includes(type)}
                  onChange={() => set("types", toggle(filters.types, type))}
                />
                {t(typeLabel[type])}
              </label>
            ))}
          </fieldset>
          <label className="filter-sort">
            <span>{t("sortLabel")}</span>
            <select
              value={filters.sort}
              onChange={(e) =>
                set("sort", e.target.value as StayFilters["sort"])
              }
            >
              <option value="recommended">{t("sortRecommended")}</option>
              <option value="price-asc">{t("sortPriceAsc")}</option>
              <option value="price-desc">{t("sortPriceDesc")}</option>
            </select>
          </label>
        </div>
        <fieldset className="filter-amenities">
          <legend>{t("amenitiesLabel")}</legend>
          <div>
            {amenityIds.map((a: Amenity) => (
              <button
                key={a}
                type="button"
                aria-pressed={filters.amenities.includes(a)}
                onClick={() => set("amenities", toggle(filters.amenities, a))}
              >
                {t(amenityLabel(a))}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="filter-summary">
          <p aria-live="polite" data-testid="results-count">
            <strong>{count}</strong> {t(resultsKey(count, locale))}
          </p>
          <button
            type="button"
            className="link-button"
            onClick={() => setFilters(defaultFilters)}
          >
            {t("resetFilters")}
          </button>
        </div>
      </section>

      <div className="view-toggle" role="group" aria-label={t("mapLabel")}>
        <button
          type="button"
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          ☰ {t("viewList")}
        </button>
        <button
          type="button"
          aria-pressed={view === "map"}
          onClick={() => setView("map")}
        >
          ⌖ {t("viewMap")}
        </button>
      </div>

      <div className={`stays-layout view-${view}`}>
        <section className="stays-list" aria-label={t("navStays")}>
          {count === 0 && <p className="no-results">{t("noResults")}</p>}
          <ul>
            {visible.map((s, i) => {
              const region = regions.find((r) => r.id === s.region);
              const regionMeta = heroRegions.find((r) => r.id === s.region);
              return (
                <li
                  key={s.slug}
                  ref={(el) => {
                    if (el) cards.current.set(s.slug, el);
                    else cards.current.delete(s.slug);
                  }}
                  className={
                    "stay-card" +
                    (hovered === s.slug || selected === s.slug
                      ? " is-active"
                      : "")
                  }
                  onMouseEnter={() => setHovered(s.slug)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(s.slug)}
                  onBlur={() => setHovered(null)}
                >
                  <FavoriteButton
                    slug={s.slug}
                    name={s.name}
                    className="fav-on-card"
                  />
                  <a href={`${base}/stays/${s.slug}/`}>
                    <div className="stay-photo">
                      <Photo
                        stay={s}
                        view={s.cover}
                        alt={`${s.name} — ${t(photoViews.find((p) => p.view === s.cover)?.label ?? "photoHero")}`}
                        sizes="(max-width: 1023px) 100vw, 30vw"
                        eager={i < 2}
                      />
                      <span className="stay-type">{t(typeLabel[s.type])}</span>
                    </div>
                    <div className="stay-body">
                      <p className="stay-region">
                        {regionMeta ? t(regionMeta.name) : s.region}
                        {region
                          ? ` · ${regionMeta ? t(regionMeta.country) : ""}`
                          : ""}
                      </p>
                      <h2>{s.name}</h2>
                      <p className="stay-summary">{s.summary[locale]}</p>
                      <p className="stay-meta">
                        {t("upToGuests")} {s.maxGuests} {t("guestsShort")} ·{" "}
                        {s.amenities
                          .slice(0, 3)
                          .map((a) => t(amenityLabel(a)))
                          .join(" · ")}
                      </p>
                      <p className="stay-price">
                        <span>{t("fromPrice")}</span>{" "}
                        <strong>{formatPrice(s.nightlyCents, locale)}</strong>{" "}
                        <span>{t("perNight")}</span>
                      </p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
        <section
          className="stays-map"
          aria-label={t("mapLabel")}
          hidden={!showMap}
        >
          {mapState !== "idle" && mapState !== "error" && (
            <StaysMap
              stays={matching}
              labels={labels}
              hoveredId={hovered}
              selectedId={selected}
              onHover={setHovered}
              onSelect={selectFromMap}
              onBounds={setBounds}
              followBounds={followMap}
              onError={() => setMapState("error")}
              onReady={() => setMapState("ready")}
              ariaLabel={t("mapLabel")}
            />
          )}
          {mapState === "loading" && (
            <p className="map-status" role="status">
              {t("mapLoading")}
            </p>
          )}
          {mapState === "error" && (
            <p className="map-status map-error" role="status">
              {t("mapUnavailable")}
            </p>
          )}
          <label className="map-follow">
            <input
              type="checkbox"
              checked={followMap}
              onChange={(e) => {
                setFollowMap(e.target.checked);
                if (!e.target.checked) setBounds(null);
              }}
              disabled={mapState !== "ready"}
            />
            {t("searchArea")}
          </label>
        </section>
      </div>
    </main>
  );
}

export default function Catalogue() {
  return (
    <PageShell>
      <CatalogueView />
    </PageShell>
  );
}
