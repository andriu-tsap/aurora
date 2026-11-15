"use client";
import "./booking.css";
import "../favorites/favorites.css";
import { getStay } from "@aurora/demo-data";
import type { Booking } from "@aurora/types";
import { useEffect, useState } from "react";

import { FavoriteButton } from "../favorites/FavoriteButton";
import { useFavorites } from "../favorites/store";
import { formatDay, formatPrice, nightsKey } from "../format";
import { Photo } from "../Photo";
import { useLocale, useT } from "../i18n";
import { PageShell } from "../PageShell";
import { cancelBooking, loadBookings } from "./store";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

function Favourites() {
  const t = useT();
  const { slugs, persisted } = useFavorites();
  const saved = slugs.flatMap((slug) => {
    const stay = getStay(slug);
    return stay ? [stay] : [];
  });
  return (
    <section aria-labelledby="fav-title" data-testid="favourites">
      <h2 id="fav-title">{t("favTitle")}</h2>
      {!persisted && <p className="fav-note">{t("favNotSaved")}</p>}
      {saved.length === 0 ? (
        <p>{t("favEmpty")}</p>
      ) : (
        <ul className="fav-list">
          {saved.map((s) => (
            <li key={s.slug} className="fav-card">
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
                    alt=""
                    sizes="(max-width: 767px) 100vw, 25vw"
                  />
                </div>
                <h3>{s.name}</h3>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function List() {
  const t = useT();
  const locale = useLocale();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    setBookings(loadBookings());
    setHighlight(new URLSearchParams(window.location.search).get("ref"));
  }, []);

  async function voucher(b: Booking) {
    const { downloadVoucher } = await import("./voucher");
    await downloadVoucher(b, locale);
  }

  return (
    <main id="content" className="account-page">
      <p className="stay-region">{t("accountEyebrow")}</p>
      <h1>{t("accountTitle")}</h1>
      <p className="demo-pill">{t("accountDemo")}</p>
      <Favourites />
      {bookings && bookings.length === 0 && (
        <>
          <p>{t("accountEmpty")}</p>
          <a className="btn-cta" href={`${base}/stays/`}>
            {t("accountBrowse")}
          </a>
        </>
      )}
      <ul className="account-list">
        {bookings?.map((b) => (
          <li
            key={b.reference}
            className={
              "account-card" +
              (b.status === "cancelled" ? " is-cancelled" : "") +
              (b.reference === highlight ? " is-highlight" : "")
            }
          >
            <h2>
              <a href={`${base}/stays/${b.slug}/`}>{b.stayName}</a>
              <span className="status-chip">
                {t(b.status === "confirmed" ? "acConfirmed" : "acCancelled")}
              </span>
            </h2>
            <p>
              {formatDay(b.checkIn, locale)} → {formatDay(b.checkOut, locale)} ·{" "}
              {b.nights} {t(nightsKey(b.nights, locale))} · {b.guests}{" "}
              {t("bkGuests").toLowerCase()} ·{" "}
              {formatPrice(b.totalCents, locale)}
            </p>
            <p className="muted">
              {t("doneRef")}: {b.reference} · {t("acGuest")}: {b.guestName}
            </p>
            <div className="booking-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => voucher(b)}
              >
                {t("acVoucher")}
              </button>
              {b.status === "confirmed" && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setBookings(cancelBooking(b.reference))}
                >
                  {t("acCancel")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default function Account() {
  return (
    <PageShell source="https://github.com/andriu-tsap/aurora/tree/main/apps/web/components/booking">
      <List />
    </PageShell>
  );
}
