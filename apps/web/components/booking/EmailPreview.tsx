"use client";
import type { Booking } from "@aurora/types";

import { formatDay, formatPrice } from "../format";
import { useLocale, useT } from "../i18n";

const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

/** On-page preview of the confirmation email. Nothing is sent. */
export function EmailPreview({ booking }: { booking: Booking }) {
  const t = useT();
  const locale = useLocale();
  const values = {
    name: booking.guestName,
    stay: booking.stayName,
    ref: booking.reference,
    from: formatDay(booking.checkIn, locale, true),
    to: formatDay(booking.checkOut, locale, true),
    total: formatPrice(booking.totalCents, locale),
  };
  return (
    <figure className="email-preview" data-testid="email-preview">
      <figcaption>{t("emailTitle")}</figcaption>
      <div className="email-card">
        <dl className="email-head">
          <dt>{t("emailFrom")}</dt>
          <dd>AURORA (demo) &lt;bookings@aurora.example&gt;</dd>
          <dt>{t("emailTo")}</dt>
          <dd>{booking.guestName}</dd>
          <dt>{t("emailSubjectLabel")}</dt>
          <dd>{fill(t("emailSubject"), values)}</dd>
        </dl>
        <div className="email-body">
          <p>{fill(t("emailGreeting"), values)}</p>
          <p>{fill(t("emailBody"), values)}</p>
          <p>{t("emailAttach")}</p>
          <p>{t("emailSign")}</p>
        </div>
      </div>
      <p className="email-caption" data-testid="email-caption">
        {t("emailCaption")}
      </p>
    </figure>
  );
}
