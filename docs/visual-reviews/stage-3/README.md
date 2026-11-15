# Stage 3 — visual review (booking, favourites, confirmation, vouchers)

Real captures from the static export (`scripts/capture-stage3.mjs`, Chrome with software WebGL). Vouchers were rendered with the real `buildVoucher` (PDF → PNG via poppler). **The map basemap is stubbed in the sandbox (OpenFreeMap is unreachable there), so map areas show only dark background and clusters; the real basemap was verified by the owner on the live site.**

| File | What it shows |
|---|---|
| `catalogue-1440.png` | Catalogue with distinct per-stay covers (night, aerial, side views) |
| `catalogue-1440-favourites.png` | Same page with three hearts set (coral = favourite) |
| `catalogue-390.png` | Phone catalogue |
| `account-favourites-1440.png` | Guest account with the favourites list |
| `account-390.png` | Phone account with a confirmed booking |
| `confirmation-390-en-confetti.png`, `confirmation-390-pl-confetti.png` | Confirmation dialog with confetti mid-flight |
| `confirmation-390-en-email.png`, `confirmation-390-pl-email.png` | Confirmation-email preview with the "demo: in production this email is sent to the guest" caption |
| `voucher-en.png`, `voucher-pl.png`, `voucher-uk.png` | PDF vouchers with long names: no overlap, Polish diacritics and Ukrainian Cyrillic render correctly |
| `booking-1440-payment.png`, `booking-390-payment.png`, `booking-390.png`, `account-1440.png`, `voucher-1.png` | Earlier captures kept as evidence: demo payment dialog with the "no real card is charged" note, phone booking panel, account with a booking, first English voucher |
| `front-camera-fix-low-quality.png` | Evidence for the front-camera framing fix (low quality, software WebGL) |

## Self-assessment

| Check | Result |
|---|---|
| Covers differ between stays | ✅ visibly different finishes, frames and light |
| Hearts and favourites list | ✅ state shown on cards and in the account |
| Confetti | ✅ visible mid-flight; disabled under reduced motion (covered by e2e, not shown here) |
| Email preview honest | ✅ caption in EN/PL, fictional sender `bookings@aurora.example` |
| Voucher PL/UA | ✅ after the wrapping fix |
| Phone 390 layout | ✅ dialog fits, no horizontal overflow in captures |
| Not checked | UA confirmation screenshot, a 1440 confirmation dialog (software WebGL makes the desktop stay page too slow to capture reliably), real devices |
