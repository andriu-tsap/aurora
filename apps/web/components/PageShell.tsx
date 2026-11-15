"use client";
import type { ReactNode } from "react";

import { I18nProvider, useLocaleState, useT } from "./i18n";
import { SiteHeader } from "./SiteHeader";

function Skip() {
  const t = useT();
  return (
    <a href="#content" className="skip-link">
      {t("skip")}
    </a>
  );
}

function Footer({ source }: { source: string }) {
  const t = useT();
  return (
    <footer>
      <span className="brand">
        ✳ &nbsp; AURORA<span className="brand-dot">.</span>
      </span>
      <div>
        <p>{t("note")}</p>
        <p>{t("footer")}</p>
      </div>
      <a href={source}>{t("source")} ↗</a>
    </footer>
  );
}

/** Inner-page frame: translations, skip link, header and footer. */
export function PageShell({
  children,
  source = "https://github.com/andriu-tsap/aurora",
}: {
  children: ReactNode;
  source?: string;
}) {
  const [locale, setLocale] = useLocaleState();
  return (
    <I18nProvider locale={locale}>
      <Skip />
      <SiteHeader locale={locale} setLocale={setLocale} />
      {children}
      <Footer source={source} />
    </I18nProvider>
  );
}
