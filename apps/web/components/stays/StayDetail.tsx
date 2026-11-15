"use client";
import "../cabin/cabin.css";
import "./stays.css";
import { getStay } from "@aurora/demo-data";
import type { Stay } from "@aurora/types";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CabinStats } from "../cabin/CabinScene";
import { defaultCabinOptions } from "../cabin/config";
import {
  amenityLabel,
  formatPrice,
  photoViews,
  typeLabel,
  type PhotoView,
} from "../format";
import { useLocale, useT, type MessageKey } from "../i18n";
import { PageShell } from "../PageShell";
import { Photo } from "../Photo";
import { heroRegions } from "../regions";

const CabinScene = dynamic(() => import("../cabin/CabinScene"), { ssr: false });
const StaysMap = dynamic(() => import("./StaysMap"), { ssr: false });

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const seasonLabel: Record<Stay["seasons"][number]["id"], MessageKey> = {
  high: "seasonHigh",
  holiday: "seasonHoliday",
  low: "seasonLow",
};

/** Mounts children once the element scrolls near the viewport. */
function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!ref.current || near) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setNear(true),
      { rootMargin: "300px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near]);
  return [ref, near] as const;
}

function Gallery({ stay }: { stay: Stay }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [index, setIndex] = useState(0);
  const touch = useRef<number | null>(null);
  const count = photoViews.length;
  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );
  const open = (i: number, button: HTMLButtonElement) => {
    opener.current = button;
    setIndex(i);
    dialog.current?.showModal();
  };
  return (
    <section className="gallery" aria-label={t("galleryLabel")}>
      <div className="gallery-grid">
        {photoViews.map((p, i) => (
          <button
            key={p.view}
            type="button"
            className={`gallery-item gallery-item-${i}`}
            onClick={(e) => open(i, e.currentTarget)}
            aria-label={`${t("openPhoto")}: ${t(p.label)}`}
          >
            <Photo
              stay={stay}
              view={p.view}
              alt=""
              sizes={
                i === 0
                  ? "(max-width: 767px) 100vw, 60vw"
                  : "(max-width: 767px) 50vw, 20vw"
              }
              eager={i === 0}
            />
          </button>
        ))}
      </div>
      <p className="gallery-note">{t("photoNote")}</p>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={t("galleryLabel")}
        onClose={() => opener.current?.focus()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <figure>
          <Photo
            stay={stay}
            view={photoViews[index].view as PhotoView}
            alt={`${stay.name} — ${t(photoViews[index].label)}`}
            sizes="90vw"
            eager
          />
          <figcaption>
            {t(photoViews[index].label)} · {index + 1} / {count}
          </figcaption>
        </figure>
        <button
          type="button"
          className="lightbox-prev"
          aria-label={t("prevPhoto")}
          onClick={() => go(-1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="lightbox-next"
          aria-label={t("nextPhoto")}
          onClick={() => go(1)}
        >
          ›
        </button>
        <button
          type="button"
          className="dialog-close"
          aria-label={t("closeGallery")}
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </dialog>
    </section>
  );
}

function Cabin3D({ stay }: { stay: Stay }) {
  const t = useT();
  const [ref, near] = useNearViewport<HTMLDivElement>();
  const [show, setShow] = useState(false);
  const [stats, setStats] = useState<CabinStats | null>(null);
  const [mobile, setMobile] = useState(true);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const isMobile = !matchMedia("(min-width: 768px)").matches;
    setMobile(isMobile);
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (near && !isMobile) setShow(true);
  }, [near]);
  return (
    <section className="stay-3d" aria-label={t("cabin3dTitle")}>
      <h2>{t("cabin3dTitle")}</h2>
      <div ref={ref} className={"cabin-viewer" + (stats ? " is-ready" : "")}>
        {!stats && (
          <Photo
            stay={stay}
            view="hero-day"
            alt=""
            sizes="(max-width: 1100px) 100vw, 60vw"
            className="cabin-poster"
          />
        )}
        {show && (
          <div className="cabin-canvas">
            <CabinScene
              options={{ ...defaultCabinOptions, ...stay.look }}
              mobile={mobile}
              reduced={reduced}
              resetKey={0}
              onReady={setStats}
            />
          </div>
        )}
        {!show && (
          <button
            className="enable-globe cabin-load"
            onClick={() => setShow(true)}
          >
            {t("cabinLoad")} <span aria-hidden="true">↗</span>
          </button>
        )}
        {show && !stats && (
          <span className="scene-loading" role="status">
            {t("cabinLoading")}
          </span>
        )}
        {stats && <p className="cabin-hint">{t("cabinHint")}</p>}
      </div>
      <a
        className="text-link"
        href={`${base}/cabin/?wood=${stay.look.wood}&metal=${stay.look.metal}`}
      >
        {t("openStudio")} ↗
      </a>
    </section>
  );
}

function Location({ stay }: { stay: Stay }) {
  const t = useT();
  const locale = useLocale();
  const [ref, near] = useNearViewport<HTMLDivElement>();
  const [failed, setFailed] = useState(false);
  return (
    <section className="stay-location" aria-label={t("locationLabel")}>
      <h2>{t("locationLabel")}</h2>
      <p className="muted">
        {t("approxLocation")} · {stay.lat.toFixed(2)}°, {stay.lon.toFixed(2)}°
      </p>
      <div ref={ref} className="stay-location-map">
        {near && !failed && (
          <StaysMap
            stays={[stay]}
            labels={{ [stay.slug]: formatPrice(stay.nightlyCents, locale) }}
            hoveredId={stay.slug}
            selectedId={null}
            onHover={() => undefined}
            onSelect={() => undefined}
            followBounds={false}
            onError={() => setFailed(true)}
            onReady={() => undefined}
            ariaLabel={t("locationLabel")}
          />
        )}
        {failed && <p className="map-status">{t("mapUnavailable")}</p>}
      </div>
    </section>
  );
}

function Detail({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const stay = getStay(slug);
  if (!stay) return null;
  const region = heroRegions.find((r) => r.id === stay.region);
  return (
    <main id="content" className="stay-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href={`${base}/stays/`}>{t("breadcrumbStays")}</a>
        <span aria-hidden="true">/</span>
        {region && (
          <a href={`${base}/stays/?region=${region.id}`}>{t(region.name)}</a>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{stay.name}</span>
      </nav>
      <header className="stay-header">
        <p className="stay-region">
          {region ? `${t(region.name)} · ${t(region.country)}` : ""} ·{" "}
          {t(typeLabel[stay.type])}
        </p>
        <h1>{stay.name}</h1>
        <p className="intro">{stay.summary[locale]}</p>
      </header>
      <Gallery stay={stay} />
      <div className="stay-columns">
        <div>
          <section aria-label={t("factsLabel")}>
            <ul className="facts">
              <li>
                {t("guestsLabel")} <strong>{stay.maxGuests}</strong>
              </li>
              <li>
                {t("bedrooms")} <strong>{stay.bedrooms}</strong>
              </li>
              <li>
                {t("beds")} <strong>{stay.beds}</strong>
              </li>
              <li>
                {t("baths")} <strong>{stay.baths}</strong>
              </li>
              <li>
                {t("minNights")} <strong>{stay.minNights}</strong>
              </li>
            </ul>
          </section>
          <section>
            <h2>{t("aboutStay")}</h2>
            <p className="stay-description">{stay.description[locale]}</p>
          </section>
          <section>
            <h2>{t("amenitiesLabel")}</h2>
            <ul className="amenity-list">
              {stay.amenities.map((a) => (
                <li key={a}>{t(amenityLabel(a))}</li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="price-card" aria-label={t("pricingLabel")}>
          <p className="stay-price">
            <span>{t("fromPrice")}</span>{" "}
            <strong>{formatPrice(stay.nightlyCents, locale)}</strong>{" "}
            <span>{t("perNight")}</span>
          </p>
          <dl>
            <div>
              <dt>{t("cleaningFee")}</dt>
              <dd>{formatPrice(stay.cleaningFeeCents, locale)}</dd>
            </div>
            <div>
              <dt>{t("weeklyDiscount")}</dt>
              <dd>−{stay.weeklyDiscountBp / 100}%</dd>
            </div>
            {stay.seasons.map((s) => (
              <div key={s.id}>
                <dt>
                  {t(seasonLabel[s.id])} (
                  {s.from.split("-").reverse().join(".")}–
                  {s.to.split("-").reverse().join(".")})
                </dt>
                <dd>
                  {formatPrice(
                    (stay.nightlyCents * s.multiplierBp) / 10000,
                    locale,
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="muted">{t("bookingSoon")}</p>
        </aside>
      </div>
      <Cabin3D stay={stay} />
      <Location stay={stay} />
    </main>
  );
}

export default function StayDetail({ slug }: { slug: string }) {
  return (
    <PageShell source="https://github.com/andriu-tsap/aurora/tree/main/apps/web/components/stays">
      <Detail slug={slug} />
    </PageShell>
  );
}
