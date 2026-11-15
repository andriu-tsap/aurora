"use client";
import {
  addDays,
  busyNights,
  nightsBetween,
  type IsoDate,
} from "@aurora/demo-data";
import type { Stay } from "@aurora/types";
import { useMemo, useState } from "react";

import { formatDay, intlLocale } from "../format";
import { useLocale, useT } from "../i18n";

interface Props {
  stay: Stay;
  today: IsoDate;
  checkIn: IsoDate | null;
  checkOut: IsoDate | null;
  onPick: (day: IsoDate) => void;
}

function monthStart(iso: IsoDate) {
  return `${iso.slice(0, 7)}-01`;
}

function shiftMonth(first: IsoDate, delta: number): IsoDate {
  const [y, m] = first.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}

/** Two-click range calendar. Busy nights cannot start or be crossed by a stay. */
export function Calendar({ stay, today, checkIn, checkOut, onPick }: Props) {
  const t = useT();
  const locale = useLocale();
  const busy = useMemo(() => busyNights(stay), [stay]);
  const [first, setFirst] = useState(() => monthStart(today));
  const choosingOut = checkIn !== null && checkOut === null;

  const [y, m] = first.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // Monday-first offset.
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const monthName = new Intl.DateTimeFormat(intlLocale[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale[locale], {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2026, 0, 5 + i))),
  );

  function crossesBusy(from: IsoDate, to: IsoDate) {
    const n = nightsBetween(from, to);
    for (let i = 0; i < n; i++) if (busy.has(addDays(from, i))) return true;
    return false;
  }

  function disabled(day: IsoDate) {
    if (day < today) return true;
    if (choosingOut && checkIn) {
      if (day <= checkIn) return busy.has(day);
      return crossesBusy(checkIn, day);
    }
    return busy.has(day);
  }

  const canGoBack = first > monthStart(today);
  const cells: (IsoDate | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      addDays(first, i),
    ),
  ];

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button
          type="button"
          onClick={() => setFirst(shiftMonth(first, -1))}
          disabled={!canGoBack}
          aria-label={t("bkPrevMonth")}
        >
          ‹
        </button>
        <strong aria-live="polite">{monthName}</strong>
        <button
          type="button"
          onClick={() => setFirst(shiftMonth(first, 1))}
          aria-label={t("bkNextMonth")}
        >
          ›
        </button>
      </div>
      <div className="calendar-grid" role="group" aria-label={monthName}>
        {weekdays.map((w) => (
          <span key={w} className="calendar-dow" aria-hidden="true">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} />;
          const isBusy = busy.has(day);
          const off = disabled(day);
          const start = day === checkIn;
          const end = day === checkOut;
          const inside =
            checkIn !== null &&
            checkOut !== null &&
            day > checkIn &&
            day < checkOut;
          const label = `${formatDay(day, locale, true)}${isBusy ? `, ${t("bkBusy")}` : ""}`;
          return (
            <button
              key={day}
              type="button"
              className={
                "calendar-day" +
                (isBusy ? " is-busy" : "") +
                (start || end ? " is-edge" : "") +
                (inside ? " is-inside" : "")
              }
              disabled={off}
              aria-pressed={start || end || inside}
              aria-label={label}
              onClick={() => onPick(day)}
            >
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
