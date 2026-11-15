import { Injectable, signal } from "@angular/core";
import { parseBookings } from "@aurora/demo-data";
import type { Booking } from "@aurora/types";

/** Written by the public site's demo checkout; the owner panel only reads it. */
const KEY = "aurora-bookings";

function read(): Booking[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseBookings(JSON.parse(raw) as unknown) : [];
  } catch {
    return [];
  }
}

/** Demo reservations made on the public site in this browser (same origin, same storage). */
@Injectable({ providedIn: "root" })
export class GuestBookings {
  readonly list = signal<Booking[]>(read());

  constructor() {
    // A booking made in another tab shows up without reloading the panel.
    window.addEventListener("storage", (event) => {
      if (event.key === KEY || event.key === null) this.list.set(read());
    });
  }
}
