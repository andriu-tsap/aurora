"use client";
import dynamic from "next/dynamic";
import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { I18nProvider, useT, type MessageKey } from "./i18n";

import { type Locale } from "./messages";
import { heroRegions, regionCount } from "./regions";
const Globe = dynamic(() => import("./Globe"), { ssr: false });
function TitleFallback() {
  const t = useT();
  return (
    <>
      <span>{t("title")}</span>
      <br />
      <em>{t("accent")}</em>
    </>
  );
}
const AnimatedTitle = dynamic(() => import("./AnimatedTitle"), {
  ssr: false,
  loading: TitleFallback,
});
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const posterSizes = "(max-width: 767px) 100vw, 57vw";
const posterSet = (format: "avif" | "webp") =>
  [480, 720, 960]
    .map((w) => `${base}/globe-poster-${w}.${format} ${w}w`)
    .join(", ");
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("aurora-locale");
      if (stored === "en" || stored === "pl" || stored === "uk")
        setLocale(stored);
    } catch {
      /* Storage may be blocked. */
    }
  }, []);
  const changeLocale = (value: Locale) => {
    setLocale(value);
    try {
      localStorage.setItem("aurora-locale", value);
    } catch {
      /* The session remains usable. */
    }
  };
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <I18nProvider locale={locale}>
      <Landing locale={locale} setLocale={changeLocale} />
    </I18nProvider>
  );
}
function Landing({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  const t = useT();
  const [active, setActive] = useState(0);
  const [showGlobe, setShowGlobe] = useState(false);
  const [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(true);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    change();
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const visual = useRef<HTMLDivElement>(null);
  const story = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const onReady = useCallback(() => setReady(true), []);
  const selectRegion = useCallback((index: number) => {
    setActive(index);
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const media = matchMedia("(min-width: 768px)");
    setMobile(!media.matches);
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (
      media.matches &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !connection?.saveData
    ) {
      const id = window.setTimeout(() => setShowGlobe(true), 1400);
      return () => clearTimeout(id);
    }
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    if (visual.current) observer.observe(visual.current);
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      document.body.style.cursor = "";
    };
  }, []);
  useEffect(() => {
    if (reduced || !story.current) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
        ([{ gsap }, { ScrollTrigger }]) => {
          if (cancelled) return;
          gsap.registerPlugin(ScrollTrigger);
          const context = gsap.context(() => {
            gsap.fromTo(
              ".story-grid > div",
              { y: 25 },
              {
                y: 0,
                duration: 0.8,
                stagger: 0.12,
                scrollTrigger: {
                  trigger: story.current,
                  start: "top 85%",
                  once: true,
                },
              },
            );
          }, story);
          cleanup = () => context.revert();
        },
      );
    });
    observer.observe(story.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      cleanup?.();
    };
  }, [reduced]);
  return (
    <>
      <a href="#content" className="skip-link">
        {t("skip")}
      </a>
      <header className="header">
        <a className="brand" href="#top" aria-label="AURORA">
          <span className="brandmark" aria-hidden="true">
            ✳
          </span>{" "}
          AURORA<span className="brand-dot">.</span>
        </a>
        <nav className="nav" aria-label={t("nav")}>
          <a href="#discover">{t("discover")}</a>
          <a href="#idea">{t("idea")}</a>
          <a href="#how">{t("how")}</a>
        </nav>
        <div className="header-right">
          <span className="demo">
            <i />
            {t("demo")}
          </span>
          <label className="language">
            <span className="sr-only">{t("language")}</span>
            <select
              aria-label={t("language")}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="en">EN</option>
              <option value="pl">PL</option>
              <option value="uk">UA</option>
            </select>
          </label>
        </div>
      </header>
      <main id="content">
        <section className="hero isolate" id="top">
          <div className="aurora-ribbon" aria-hidden="true" />
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              {t("label")}
            </div>
            <h1>
              {!mobile && !reduced ? (
                <AnimatedTitle
                  key={locale}
                  title={t("title")}
                  accent={t("accent")}
                />
              ) : (
                <>
                  <span>{t("title")}</span>
                  <br />
                  <em>{t("accent")}</em>
                </>
              )}
            </h1>
            <p className="intro">{t("intro")}</p>
            <div className="search" id="discover">
              <span className="search-icon" aria-hidden="true">
                ⌖
              </span>
              <label>
                <span>{t("where")}</span>
                <select
                  aria-label={t("discover")}
                  value={active}
                  onChange={(e) => setActive(Number(e.target.value))}
                >
                  {heroRegions.map((region, i) => (
                    <option key={region.id} value={i}>
                      {t(region.name)}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => selectRegion(active)}>
                {t("action")}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div className="popular-label">
              <span>{t("inspiration")}</span>
              <span>01 — {regionCount}</span>
            </div>
            <div className="regions touch-manipulation">
              {heroRegions.map((region, i) => (
                <button
                  key={region.id}
                  className={"region " + (active === i ? "selected" : "")}
                  aria-pressed={active === i}
                  onClick={() => setActive(i)}
                >
                  <span className="region-index">
                    0{i + 1}
                    <span aria-hidden="true">↗</span>
                  </span>
                  <strong>{t(region.name)}</strong>
                  <small>{t(region.country)}</small>
                </button>
              ))}
            </div>
          </div>
          <div
            ref={visual}
            className="visual"
            role="group"
            aria-label={t("globeLabel")}
          >
            <div className="visual-glow" />
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <picture>
              <source
                type="image/avif"
                srcSet={posterSet("avif")}
                sizes={posterSizes}
              />
              <img
                className={"globe-poster " + (ready ? "poster-hidden" : "")}
                src={`${base}/globe-poster-720.webp`}
                srcSet={posterSet("webp")}
                sizes={posterSizes}
                width="640"
                height="640"
                alt=""
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            {showGlobe && (
              <SceneBoundary
                fallback={
                  <span className="scene-error" role="status">
                    {t("unavailable")}
                  </span>
                }
              >
                <Globe
                  active={active}
                  onSelect={selectRegion}
                  onReady={onReady}
                  reduced={!!reduced}
                  paused={paused || !visible}
                  mobile={mobile}
                />
              </SceneBoundary>
            )}
            <div className="atlas-index">{t(ready ? "mode" : "static")}</div>
            <div className="globe-label">
              <i />
              {t(heroRegions[active].name)}
              <span>{heroRegions[active].coordinates}</span>
            </div>
            <div className="visual-caption">
              <span>✳ &nbsp; {t("world")}</span>
              <span>
                {String(active + 1).padStart(2, "0")} / {regionCount}
              </span>
            </div>
            {!showGlobe && (
              <button
                className="enable-globe"
                onClick={() => setShowGlobe(true)}
              >
                {t("globe")} <span aria-hidden="true">↗</span>
              </button>
            )}
            {showGlobe && !ready && (
              <span className="scene-loading" role="status">
                {t("loading")}
              </span>
            )}
            {ready && !reduced && (
              <button
                className="pause-globe"
                aria-label={t(paused ? "resume" : "pause")}
                onClick={() => setPaused(!paused)}
              >
                {paused ? "▷" : "Ⅱ"}
              </button>
            )}
          </div>
          <div className="hero-bottom">
            <a href="#idea">↓ &nbsp; {t("scroll")}</a>
            <span>{t("curated")} &nbsp; ✳</span>
          </div>
        </section>
        <section ref={story} className="story" id="idea">
          <span className="eyebrow">✳ &nbsp; {t("idea")}</span>
          <div className="story-intro">
            <h2>{t("story")}</h2>
            <p>{t("body")}</p>
          </div>
          <div className="story-grid" id="how">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <span>{t(`step${i}` as MessageKey)}</span>
                <h3>{t(`heading${i}` as MessageKey)}</h3>
                <p>{t(`description${i}` as MessageKey)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <span className="brand">
          ✳ &nbsp; AURORA<span className="brand-dot">.</span>
        </span>
        <div>
          <p>{t("note")}</p>
          <p>{t("footer")}</p>
        </div>
        <a href="https://github.com/andriu-tsap/aurora">{t("source")} ↗</a>
      </footer>
      <dialog
        ref={dialog}
        className="region-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="dialog-close"
          aria-label={t("close")}
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <span className="eyebrow">
          {t("regionTitle")} / 0{active + 1}
        </span>
        <p className="dialog-coordinates">{heroRegions[active].coordinates}</p>
        <h2>{t(heroRegions[active].name)}</h2>
        <p>{t(heroRegions[active].description)}</p>
        <small>{t("regionNote")}</small>
      </dialog>
    </>
  );
}
