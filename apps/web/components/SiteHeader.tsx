"use client";
import type { Locale } from "./messages";
import { useT } from "./i18n";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Compact header for inner pages; shares the hero's visual language. */
export function SiteHeader({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  const t = useT();
  return (
    <header className="header">
      <a className="brand" href={`${base}/`} aria-label="AURORA">
        <span className="brandmark" aria-hidden="true">
          ✳
        </span>{" "}
        AURORA<span className="brand-dot">.</span>
      </a>
      <nav className="nav" aria-label={t("nav")}>
        <a href={`${base}/`}>{t("backHome")}</a>
        <a href={`${base}/stays/`}>{t("navStays")}</a>
        <a href={`${base}/cabin/`}>{t("navCabin")}</a>
        <a href={`${base}/account/`}>{t("navAccount")}</a>
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
  );
}
