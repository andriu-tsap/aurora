"use client";
import "./cabin.css";
import type { MetalFinish, WoodFinish } from "@aurora/types";
import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { I18nProvider, useLocaleState, useT, type MessageKey } from "../i18n";
import type { Locale } from "../messages";
import { SiteHeader } from "../SiteHeader";
import {
  defaultCabinOptions,
  type CabinOptions,
  type TimeOfDay,
} from "./config";
import type { CabinStats, CameraView } from "./CabinScene";

// Three.js, R3F and post-processing live in their own lazy chunk.
const CabinScene = dynamic(() => import("./CabinScene"), { ssr: false });

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

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

type Choice<T extends string> = { value: T; label: MessageKey };

const woods: Choice<WoodFinish>[] = [
  { value: "light", label: "woodLight" },
  { value: "walnut", label: "woodWalnut" },
  { value: "charred", label: "woodCharred" },
];
const metals: Choice<MetalFinish>[] = [
  { value: "black", label: "metalBlack" },
  { value: "graphite", label: "metalGraphite" },
  { value: "bronze", label: "metalBronze" },
];
const times: Choice<TimeOfDay>[] = [
  { value: "day", label: "timeDay" },
  { value: "night", label: "timeNight" },
];
const curtains: Choice<CabinOptions["curtains"]>[] = [
  { value: "open", label: "curtainsOpen" },
  { value: "closed", label: "curtainsClosed" },
];

function Segmented<T extends string>({
  legend,
  choices,
  value,
  onChange,
}: {
  legend: MessageKey;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const t = useT();
  return (
    <fieldset className="segmented">
      <legend>{t(legend)}</legend>
      <div>
        {choices.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={value === c.value}
            onClick={() => onChange(c.value)}
          >
            {t(c.label)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Reads optional ?wood=&metal=&time=&curtains=&autoload=1&quality=low (shareable views, QA). */
function optionsFromUrl(): {
  options: CabinOptions;
  autoload: boolean;
  low: boolean;
  view: CameraView;
} {
  const params = new URLSearchParams(window.location.search);
  const pick = <T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
  ) => {
    const v = params.get(key);
    return v && (allowed as readonly string[]).includes(v)
      ? (v as T)
      : fallback;
  };
  return {
    autoload: params.get("autoload") === "1",
    low: params.get("quality") === "low",
    view: pick("view", ["hero", "side", "aerial", "front"] as const, "hero"),
    options: {
      wood: pick(
        "wood",
        ["light", "walnut", "charred"] as const,
        defaultCabinOptions.wood,
      ),
      metal: pick(
        "metal",
        ["black", "graphite", "bronze"] as const,
        defaultCabinOptions.metal,
      ),
      time: pick("time", ["day", "night"] as const, defaultCabinOptions.time),
      curtains: pick(
        "curtains",
        ["open", "closed"] as const,
        defaultCabinOptions.curtains,
      ),
    },
  };
}

function Studio({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  const t = useT();
  const [options, setOptions] = useState<CabinOptions>(defaultCabinOptions);
  const [mobile, setMobile] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [show, setShow] = useState(false);
  const [stats, setStats] = useState<CabinStats | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [view, setView] = useState<CameraView>("hero");

  useEffect(() => {
    const {
      options: initial,
      autoload,
      low,
      view: initialView,
    } = optionsFromUrl();
    setView(initialView);
    setOptions(initial);
    const isMobile = !matchMedia("(min-width: 768px)").matches;
    const isReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    setMobile(isMobile || low);
    setReduced(isReduced);
    // Desktop loads the scene after first paint; phones and data-saver opt in.
    if (autoload || (!isMobile && !saveData)) {
      const id = window.setTimeout(() => setShow(true), autoload ? 0 : 300);
      return () => clearTimeout(id);
    }
  }, []);

  const set = useCallback(
    <K extends keyof CabinOptions>(key: K) =>
      (value: CabinOptions[K]) =>
        setOptions((o) => ({ ...o, [key]: value })),
    [],
  );

  const poster = (
    <picture>
      <source
        type="image/avif"
        srcSet={`${base}/cabin/cabin-poster-800.avif 800w, ${base}/cabin/cabin-poster-1600.avif 1600w`}
        sizes="(max-width: 1100px) 100vw, 70vw"
      />
      <img
        className="cabin-poster"
        src={`${base}/cabin/cabin-poster-1600.webp`}
        srcSet={`${base}/cabin/cabin-poster-800.webp 800w, ${base}/cabin/cabin-poster-1600.webp 1600w`}
        sizes="(max-width: 1100px) 100vw, 70vw"
        width="1600"
        height="1000"
        alt={t("cabinPoster")}
      />
    </picture>
  );

  return (
    <>
      <SiteHeader locale={locale} setLocale={setLocale} />
      <main id="content" className="cabin-page">
        <div className="cabin-copy">
          <span className="eyebrow">
            <span className="eyebrow-line" />
            {t("cabinEyebrow")}
          </span>
          <h1>{t("cabinTitle")}</h1>
          <p className="intro">{t("cabinIntro")}</p>
          <p className="cabin-specs">{t("cabinSpecs")}</p>
        </div>
        <div className="cabin-stage">
          <div
            className={"cabin-viewer" + (stats ? " is-ready" : "")}
            role="group"
            aria-label={t("cabinCanvas")}
          >
            {!stats && poster}
            {show && (
              <SceneBoundary
                fallback={
                  <span className="scene-error" role="status">
                    {t("cabinUnavailable")}
                  </span>
                }
              >
                <div className="cabin-canvas">
                  <CabinScene
                    options={options}
                    mobile={mobile}
                    reduced={reduced}
                    resetKey={resetKey}
                    view={view}
                    onReady={setStats}
                  />
                </div>
              </SceneBoundary>
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
          <aside className="cabin-controls" aria-label={t("cabinTitle")}>
            <Segmented
              legend="woodLabel"
              choices={woods}
              value={options.wood}
              onChange={set("wood")}
            />
            <Segmented
              legend="metalLabel"
              choices={metals}
              value={options.metal}
              onChange={set("metal")}
            />
            <Segmented
              legend="timeLabel"
              choices={times}
              value={options.time}
              onChange={set("time")}
            />
            <Segmented
              legend="curtainsLabel"
              choices={curtains}
              value={options.curtains}
              onChange={set("curtains")}
            />
            <button
              type="button"
              className="cabin-reset"
              onClick={() => setResetKey((k) => k + 1)}
              disabled={!stats}
            >
              ↺ {t("resetView")}
            </button>
            <p className="cabin-stats" data-testid="cabin-stats">
              {stats
                ? `${stats.triangles.toLocaleString("en-US")} ${t("triangles")}`
                : " "}
            </p>
            <p className="cabin-note">{t("cabinNote")}</p>
          </aside>
        </div>
      </main>
      <footer>
        <span className="brand">
          ✳ &nbsp; AURORA<span className="brand-dot">.</span>
        </span>
        <div>
          <p>{t("note")}</p>
          <p>{t("footer")}</p>
        </div>
        <a href="https://github.com/andriu-tsap/aurora/tree/main/apps/web/components/cabin">
          {t("source")} ↗
        </a>
      </footer>
    </>
  );
}

export default function CabinStudio() {
  const [locale, setLocale] = useLocaleState();
  return (
    <I18nProvider locale={locale}>
      <a href="#content" className="skip-link">
        {/* Rendered inside the provider so it is translated. */}
        <SkipLabel />
      </a>
      <Studio locale={locale} setLocale={setLocale} />
    </I18nProvider>
  );
}

function SkipLabel() {
  const t = useT();
  return <>{t("skip")}</>;
}
