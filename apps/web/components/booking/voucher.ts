import type { Booking, Locale } from "@aurora/types";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const labels: Record<
  Locale,
  Record<
    | "title"
    | "demo"
    | "ref"
    | "stay"
    | "guest"
    | "guests"
    | "checkIn"
    | "checkOut"
    | "nights"
    | "total"
    | "qr"
    | "footer",
    string
  >
> = {
  en: {
    title: "Booking voucher",
    demo: "DEMO — fictional stay, no payment was taken, not valid for travel",
    ref: "Reference",
    stay: "Stay",
    guest: "Guest",
    guests: "Guests",
    checkIn: "Check-in",
    checkOut: "Check-out",
    nights: "Nights",
    total: "Total (demo)",
    qr: "Scan to open your bookings (demo)",
    footer: "AURORA — concept / demo project, fictional data",
  },
  pl: {
    title: "Voucher rezerwacji",
    demo: "DEMO — fikcyjny nocleg, brak płatności, nieważny w podróży",
    ref: "Numer",
    stay: "Nocleg",
    guest: "Gość",
    guests: "Goście",
    checkIn: "Przyjazd",
    checkOut: "Wyjazd",
    nights: "Noce",
    total: "Razem (demo)",
    qr: "Zeskanuj, aby otworzyć rezerwacje (demo)",
    footer: "AURORA — projekt koncepcyjny / demo, fikcyjne dane",
  },
  uk: {
    title: "Ваучер бронювання",
    demo: "ДЕМО — вигадане помешкання, оплати не було, для подорожі не дійсний",
    ref: "Номер",
    stay: "Помешкання",
    guest: "Гість",
    guests: "Гості",
    checkIn: "Заїзд",
    checkOut: "Виїзд",
    nights: "Ночі",
    total: "Разом (демо)",
    qr: "Скануйте, щоб відкрити бронювання (демо)",
    footer: "AURORA — концептуальний / демо-проєкт, вигадані дані",
  },
};

const intl: Record<Locale, string> = { en: "en-GB", pl: "pl-PL", uk: "uk-UA" };

/** Builds the voucher PDF (lazy: pdf-lib, fontkit, qrcode load on demand). */
export async function buildVoucher(
  b: Booking,
  locale: Locale,
): Promise<Uint8Array> {
  const [{ PDFDocument, rgb }, fontkit, QRCode] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit").then((m) => m.default),
    import("qrcode"),
  ]);
  const [regular, bold] = await Promise.all(
    ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf"].map(async (f) => {
      const res = await fetch(`${base}/fonts/voucher/${f}`);
      if (!res.ok) throw new Error(`Font ${f} failed to load`);
      return res.arrayBuffer();
    }),
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`AURORA voucher ${b.reference} (demo)`);
  doc.setCreator("AURORA demo");
  const fR = await doc.embedFont(regular, { subset: true });
  const fB = await doc.embedFont(bold, { subset: true });
  const page = doc.addPage([595, 842]);
  const L = labels[locale];
  const dateFmt = new Intl.DateTimeFormat(intl[locale], {
    dateStyle: "long",
    timeZone: "UTC",
  });
  const day = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));
  const money = new Intl.NumberFormat(intl[locale], {
    style: "currency",
    currency: "EUR",
  }).format(b.totalCents / 100);

  const ink = rgb(0.05, 0.07, 0.15);
  const mint = rgb(0.1, 0.6, 0.5);
  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: ink });
  page.drawText("AURORA", { x: 48, y: 788, size: 28, font: fB, color: rgb(0.18, 0.95, 0.78) });
  page.drawText(L.title, { x: 48, y: 760, size: 13, font: fR, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 48, y: 690, width: 499, height: 32, color: rgb(1, 0.93, 0.88) });
  page.drawText(L.demo, { x: 56, y: 702, size: 9, font: fB, color: rgb(0.7, 0.25, 0.1), maxWidth: 483 });

  const rows: [string, string][] = [
    [L.ref, b.reference],
    [L.stay, b.stayName],
    [L.guest, b.guestName],
    [L.guests, String(b.guests)],
    [L.checkIn, day(b.checkIn)],
    [L.checkOut, day(b.checkOut)],
    [L.nights, String(b.nights)],
    [L.total, money],
  ];
  // Long names wrap inside the left column; each row grows with its line count
  // so a wrapped value never runs into the next label.
  const colW = 330;
  const wrap = (text: string): string[] => {
    const out: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && fB.widthOfTextAtSize(next, 14) > colW) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
    return out;
  };
  let y = 640;
  for (const [k, v] of rows) {
    page.drawText(k.toUpperCase(), { x: 48, y, size: 8, font: fR, color: rgb(0.4, 0.43, 0.5) });
    const lines = wrap(v);
    lines.forEach((ln, i) => {
      page.drawText(ln, { x: 48, y: y - 17 - i * 17, size: 14, font: fB, color: ink });
    });
    y -= 48 + (lines.length - 1) * 17;
  }

  const url = `${window.location.origin}${base}/account/?ref=${encodeURIComponent(b.reference)}`;
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = 5;
  const qx = 547 - n * cell;
  const qy = 330;
  page.drawRectangle({ x: qx - 10, y: qy - 10, width: n * cell + 20, height: n * cell + 20, color: rgb(1, 1, 1), borderColor: ink, borderWidth: 1 });
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) {
        page.drawRectangle({ x: qx + c * cell, y: qy + (n - 1 - r) * cell, width: cell, height: cell, color: ink });
      }
    }
  }
  page.drawText(L.qr, { x: qx - 10, y: qy - 26, size: 8, font: fR, color: mint, maxWidth: n * cell + 20, lineHeight: 10 });
  page.drawText(L.footer, { x: 48, y: 40, size: 8, font: fR, color: rgb(0.4, 0.43, 0.5) });
  return doc.save();
}

export async function downloadVoucher(b: Booking, locale: Locale) {
  const bytes = await buildVoucher(b, locale);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `aurora-voucher-${b.reference}.pdf`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
