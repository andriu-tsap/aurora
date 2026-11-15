import type { Booking } from "@aurora/types";

const KEY = "aurora-bookings";

function isBooking(v: unknown): v is Booking {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Record<string, unknown>;
  return (
    typeof b.reference === "string" &&
    typeof b.slug === "string" &&
    typeof b.stayName === "string" &&
    typeof b.guestName === "string" &&
    typeof b.checkIn === "string" &&
    typeof b.checkOut === "string" &&
    typeof b.guests === "number" &&
    typeof b.nights === "number" &&
    typeof b.totalCents === "number" &&
    (b.status === "confirmed" || b.status === "cancelled") &&
    typeof b.createdAt === "string"
  );
}

/** Reads demo bookings; anything malformed is ignored. */
export function loadBookings(): Booking[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(isBooking) : [];
  } catch {
    return [];
  }
}

function save(bookings: Booking[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(bookings));
    return true;
  } catch {
    return false;
  }
}

export function addBooking(b: Booking): boolean {
  return save([b, ...loadBookings()]);
}

export function cancelBooking(reference: string): Booking[] {
  const next = loadBookings().map((b) =>
    b.reference === reference ? { ...b, status: "cancelled" as const } : b,
  );
  save(next);
  return next;
}
