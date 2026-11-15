"use client";
import "./booking.css";
import {
  bookingReference,
  checkTestCard,
  nightsBetween,
  quoteStay,
  type IsoDate,
  type QuoteError,
} from "@aurora/demo-data";
import type { Booking, Stay } from "@aurora/types";
import { useEffect, useRef, useState } from "react";

import { formatDay, formatPrice, nightsKey } from "../format";
import { useLocale, useT, type MessageKey } from "../i18n";
import { Calendar } from "./Calendar";
import { Confetti } from "./Confetti";
import { EmailPreview } from "./EmailPreview";
import { addBooking } from "./store";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const errorKey: Record<QuoteError, MessageKey> = {
  dates: "errDates",
  past: "errPast",
  minNights: "errMinNights",
  guests: "errGuests",
  unavailable: "errUnavailable",
};

function localToday(): IsoDate {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type Stage = "form" | "done";

export function BookingPanel({ stay }: { stay: Stay }) {
  const t = useT();
  const locale = useLocale();
  const [today, setToday] = useState<IsoDate | null>(null);
  const [checkIn, setCheckIn] = useState<IsoDate | null>(null);
  const [checkOut, setCheckOut] = useState<IsoDate | null>(null);
  const [guests, setGuests] = useState(Math.min(2, stay.maxGuests));
  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState("");
  const [card, setCard] = useState("");
  const [problem, setProblem] = useState<MessageKey | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => setToday(localToday()), []);

  function pick(day: IsoDate) {
    if (!checkIn || checkOut || day <= checkIn) {
      setCheckIn(day);
      setCheckOut(null);
    } else {
      setCheckOut(day);
    }
  }

  const result =
    today && checkIn && checkOut
      ? quoteStay(stay, checkIn, checkOut, guests, today)
      : null;
  const quote = result?.ok ? result.quote : null;

  function openCheckout() {
    setStage("form");
    setProblem(null);
    setCard("");
    dialog.current?.showModal();
  }

  function closeCheckout() {
    dialog.current?.close();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote || !checkIn || !checkOut) return;
    if (!name.trim()) return setProblem("payNameRequired");
    const check = checkTestCard(card);
    if (check === "invalid") return setProblem("payInvalid");
    if (check === "declined") return setProblem("payDeclined");
    const createdAt = new Date().toISOString();
    const b: Booking = {
      reference: bookingReference(stay.slug, checkIn, checkOut, createdAt),
      slug: stay.slug,
      stayName: stay.name,
      guestName: name.trim().slice(0, 80),
      checkIn,
      checkOut,
      guests,
      nights: nightsBetween(checkIn, checkOut),
      totalCents: quote.totalCents,
      status: "confirmed",
      createdAt,
    };
    // Only the booking result is stored; the card field is discarded.
    addBooking(b);
    setCard("");
    setBooking(b);
    setProblem(null);
    setStage("done");
  }

  async function voucher() {
    if (!booking) return;
    const { downloadVoucher } = await import("./voucher");
    await downloadVoucher(booking, locale);
  }

  const hint = !checkIn ? t("bkPickDates") : !checkOut ? t("bkPickOut") : null;

  return (
    <section className="booking" aria-label={t("bookTitle")}>
      <h2>{t("bookTitle")}</h2>
      <p className="demo-pill">{t("bkDemoBadge")}</p>
      {today && (
        <Calendar
          stay={stay}
          today={today}
          checkIn={checkIn}
          checkOut={checkOut}
          onPick={pick}
        />
      )}
      <dl className="booking-dates">
        <div>
          <dt>{t("bkCheckIn")}</dt>
          <dd>{checkIn ? formatDay(checkIn, locale) : "—"}</dd>
        </div>
        <div>
          <dt>{t("bkCheckOut")}</dt>
          <dd>{checkOut ? formatDay(checkOut, locale) : "—"}</dd>
        </div>
      </dl>
      <label className="booking-guests">
        {t("bkGuests")}
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
        >
          {Array.from({ length: stay.maxGuests }, (_, i) => i + 1).map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <div className="booking-status" role="status" aria-live="polite">
        {hint && <p className="muted">{hint}</p>}
        {result && !result.ok && (
          <p className="booking-error">{t(errorKey[result.error])}</p>
        )}
      </div>
      {quote && (
        <dl className="quote">
          <div>
            <dt>
              {t("bkSubtotal")} · {quote.nights}{" "}
              {t(nightsKey(quote.nights, locale))}
            </dt>
            <dd>{formatPrice(quote.subtotalCents, locale)}</dd>
          </div>
          {quote.weeklyDiscountCents > 0 && (
            <div>
              <dt>{t("bkWeekly")}</dt>
              <dd>−{formatPrice(quote.weeklyDiscountCents, locale)}</dd>
            </div>
          )}
          <div>
            <dt>{t("bkCleaning")}</dt>
            <dd>{formatPrice(quote.cleaningCents, locale)}</dd>
          </div>
          <div className="quote-total">
            <dt>{t("bkTotal")}</dt>
            <dd>{formatPrice(quote.totalCents, locale)}</dd>
          </div>
        </dl>
      )}
      <div className="booking-actions">
        <button
          ref={opener}
          type="button"
          className="btn-cta"
          disabled={!quote}
          onClick={openCheckout}
        >
          {t("bkReserve")}
        </button>
        {(checkIn || checkOut) && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setCheckIn(null);
              setCheckOut(null);
            }}
          >
            {t("bkClear")}
          </button>
        )}
      </div>

      <dialog
        ref={dialog}
        className="checkout"
        aria-label={t("payTitle")}
        onClose={() => opener.current?.focus()}
      >
        {stage === "form" && quote && checkIn && checkOut && (
          <form onSubmit={submit} noValidate>
            <h3>{t("payTitle")}</h3>
            <p className="pay-banner" role="note">
              {t("payBanner")}
            </p>
            <p className="muted">{t("payNote")}</p>
            <p className="checkout-summary">
              <strong>{stay.name}</strong>
              <br />
              {formatDay(checkIn, locale)} → {formatDay(checkOut, locale)} ·{" "}
              {quote.nights} {t(nightsKey(quote.nights, locale))} ·{" "}
              {formatPrice(quote.totalCents, locale)}
            </p>
            <label>
              {t("payName")}
              <input
                type="text"
                value={name}
                maxLength={80}
                autoComplete="off"
                onChange={(e) => {
                  setName(e.target.value);
                  setProblem(null);
                }}
                aria-invalid={problem === "payNameRequired"}
              />
            </label>
            <label>
              {t("payCard")}
              <input
                type="text"
                inputMode="numeric"
                value={card}
                maxLength={23}
                autoComplete="off"
                placeholder="4242 4242 4242 4242"
                onChange={(e) => {
                  setCard(e.target.value);
                  setProblem(null);
                }}
                aria-invalid={
                  problem === "payInvalid" || problem === "payDeclined"
                }
                aria-describedby="pay-problem"
              />
            </label>
            <p id="pay-problem" className="booking-error" role="alert">
              {problem ? t(problem) : ""}
            </p>
            <div className="booking-actions">
              <button type="submit" className="btn-cta">
                {t("payConfirm")}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={closeCheckout}
              >
                {t("payCancel")}
              </button>
            </div>
          </form>
        )}
        {stage === "done" && booking && (
          <div className="checkout-done">
            <Confetti />
            <h3>{t("doneTitle")}</h3>
            <p>
              {t("doneRef")}:{" "}
              <strong data-testid="booking-ref">{booking.reference}</strong>
            </p>
            <p className="muted">{t("doneDemo")}</p>
            <EmailPreview booking={booking} />
            <div className="booking-actions">
              <button type="button" className="btn-cta" onClick={voucher}>
                {t("doneVoucher")}
              </button>
              <a className="btn-ghost" href={`${base}/account/`}>
                {t("doneAccount")}
              </a>
              <button
                type="button"
                className="btn-ghost"
                onClick={closeCheckout}
              >
                {t("doneClose")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
