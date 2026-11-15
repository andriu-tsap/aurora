# CLAUDE.md — AURORA session memo

Read this first in every session. Update it at the end of every stage (and before a session runs out of context): what is done, what is next.

## Project

AURORA — fictional booking platform for unique stays (glamping, mountain cabins, seaside apartments) + AI trip planner. Portfolio flagship for Andrii Tsap (`andriu-tsap`). Must show a client the full range: landing, catalogue, map, booking, payments (test), dashboards, API, realtime, bots, Python automation, WordPress, 3D.

- Repo: https://github.com/andriu-tsap/aurora (`main`)
- Live: https://andriu-tsap.github.io/aurora/ (GitHub Pages, artifact `apps/web/out`)
- Site always says: "Concept / demo project — fictional data". No real brands, logos, people photos or fake "real" reviews.

## Current state

- Stage 0 ✅, Stage 1 ✅ (accepted; 5 follow-up fixes in `6643b44`), Stage 2 ✅ (owner wrote "OK" 2026-11-15).
- **Stage 3 ✅ accepted by the owner.** Fully demo booking: availability = deterministic fictional busy nights (`packages/demo-data/src/booking.ts`); payment = honest demo form, only test cards 4242… (ok) and 4000 0000 0000 0002 (declined), no payment-provider branding, card never stored/sent, only the booking result goes to `localStorage` key `aurora-bookings`. Done: calendar + quote + checkout dialog on `/stays/<slug>/` (`components/booking/`), PDF voucher with vector QR (pdf-lib + DejaVu Sans, lazy; long values now wrap without overlap, PL/UA glyphs checked), guest account `/account/`, favourites (`aurora-favorites`), confetti and demo confirmation-email preview. Verified at `963eab0`: full e2e 27/27, Lighthouse home 96–98 (local), fresh screenshots and vouchers EN/PL/UA in `docs/visual-reviews/stage-3/`. Capture script: `scripts/capture-stage3.mjs`.
- Plan (owner decision): 3 → 5 → 8 (shortened). Stages 4, 6, 7 are not implemented in this version. Do not touch them.
- **Stage 5 — Angular 22 owner panel, demo mode, `/aurora/admin/` (`apps/admin`, no backend, `localStorage`).**
  - 5.1 ✅ shell, demo login (flag in `sessionStorage`), i18n EN/PL/UA, properties list, price editing.
  - 5.2 ✅ add/edit property form, photos with drag & drop + compression, restore demo, delete custom.
  - 5.3 ⏳ **implemented, waiting for the owner's acceptance** (route `/occupancy`, nav link "Occupancy"): month calendar per property, SVG revenue chart + table, CSV and Excel export. Do not start 5.4 until 5.3 is accepted.
  - 5.4 ⏳ e2e for the admin, screenshots, docs. Then shortened stage 8; wait for the owner's "OK" after 5.4.
  - 5.3 design notes: pure logic lives in `packages/demo-data/src/occupancy.ts` (grid, night state, month stats, `navigateDate` keyboard rules, revenue by month, axis scale, `parseBookings`) and `export.ts` (CSV escaping with formula-injection guard, BOM + CRLF, report lines); both unit-tested. UI in `apps/admin/src/app/features/occupancy/` (`calendar`, `revenue`, `occupancy`); `core/guest-bookings.ts` only reads `aurora-bookings` (same origin as the public site); `core/files.ts` builds downloads. Occupied night = fictional busy night (`busyNightsForSlug`) or confirmed guest booking; the guest booking wins. Revenue model (stated in the UI): occupied nights × the owner's *current* nightly price with season multipliers, plus one cleaning fee per check-in; weekly discounts, taxes and fees are not modelled; every export row carries "Demo data (fictional)". Data covers 2026-01 … 2027-12 (`DEMO_FIRST_MONTH`/`DEMO_LAST_MONTH`).
  - xlsx: `write-excel-file@4` via the `write-excel-file/universal` entry (no Web Workers), imported with a dynamic `import()` only on click, so it is a separate lazy chunk. Do not use the npm `xlsx` package (0.18.5 is unmaintained on npm and has known advisories).
  - Angular 22 build emits `var(--%NS%…)` placeholders in component CSS; this is how every component (incl. accepted 5.1/5.2) is built, not a bug.
  - Calendar a11y: `table role="grid"` with roving tabindex, arrows / Home / End / PageUp / PageDown, prev/next use `aria-disabled` (not `disabled`) so focus is never lost at the range edge; busy = hatching + "×", guest = solid fill + "◆", plus text labels in the legend and `aria-label` on every day.
- Owner decisions: property photos = renders of our own cabin (no stock photos); separate `/en/ /pl/ /ua/` SEO routes postponed to stage 8.
- Testing notes: cabin e2e uses software WebGL (~30–50 s per frame). `?autoload=1&time=night&wood=charred&metal=bronze&curtains=closed&quality=low` URL params drive the studio. `window.__auroraCabin.triangles` exposes the measured count.
- 3D lessons learned: drei `Environment` presets download HDRs from a CDN → use `Lightformer`s. IBL ignores walls → reduce `envMapIntensity` on interior-only materials. Sub-pixel deck gaps alias → MSAA ×4 on desktop. Build wood at real size (no scaling) so grain/bevels are not stretched.

## Stages

- 0 ✅ architecture
- 1 ✅ hero
- 2 ✅ catalogue, map, property page, 3D cabin
- 3 ✅ accepted: booking, demo payment (test cards), PDF voucher + QR, guest account, favourites
- 4 ❌ not implemented in this version: Node API, PostgreSQL, real Stripe, WebSocket
- 5 ⏳ in progress: Angular owner panel in demo mode at `/aurora/admin/` (no backend, data from `packages/demo-data` + `localStorage`); 5.1 ✅, 5.2 ✅, 5.3 awaiting acceptance, 5.4 not started
- 6 ❌ not implemented in this version: Python service, Telegram bot
- 7 ❌ not implemented in this version: WordPress plugin, `<aurora-availability>` widget, AI planner, PWA
- 8 ⏳ shortened: README tech table + Mermaid architecture, VALIDATION checklist, Lighthouse, full test run, final ZIP

Do not start the next stage (or step) until the current one works, is deployed, and the owner wrote "OK". No TODOs in deployed code.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm dev
NEXT_PUBLIC_BASE_PATH=/aurora pnpm build   # static export -> apps/web/out
pnpm lint && pnpm typecheck
pnpm test:unit                              # Vitest: packages/** and apps/web/**
pnpm test:e2e                               # serves out/ at :4173/aurora/
# If Playwright's browser download is blocked, point to any local Chromium:
PW_CHROMIUM_PATH=/path/to/chrome pnpm test:e2e
# Lighthouse (after build, with server running: node scripts/serve-static.mjs &)
CHROME_PATH=/path/to/chrome node scripts/lighthouse.mjs
```

## Hard rules

- Never break `basePath` (`NEXT_PUBLIC_BASE_PATH=/aurora`), `trailingSlash`, or `deploy.yml`. Every new asset path (models, data, manifest, SW) goes through the base path.
- Demo mode without backend, with a visible "Demo data" badge. Never pretend a payment/email/Telegram message really happened — say "demo: in production this sends…".
- Lighthouse is a report, never a deploy blocker. Existing 5 hero tests must stay green.
- TypeScript strict, no `any`. a11y: semantics, focus, ARIA, keyboard, `prefers-reduced-motion`.
- UI in EN / PL / UA (`messages.ts`, locale key `uk` shown as "UA"). Code and comments in English.
- Design: keep "Night Atlas" — tokens in `packages/ui/tokens.css`; bg `#070B1A`, surface `#0E1430`, mint `#2EF2C7`, violet `#8B5CFF`, coral `#FF7A59` for CTAs; Space Grotesk headings, Inter body, local fonts.
- Licenses for every image/font/tile/data source in `licenses/`.
- Conventional Commits, small logical commits, push to `main` after each finished step.
- Do not delete branches with history or `docs/` files without owner confirmation.

## 3D quality standard (critical)

A previous project's car built from "inflated" primitives looked like a plasticine toy. Never again.

- Forbidden: blobby spheres/capsules for details, flat plastic look, no shadows, flat light, black void background, wrong proportions, default acid Three.js colors, z-fighting, flicker, seams.
- Required: real metres (cabin ≈ 6 × 8 m, ≈ 6 m high, deck board 0.14 × 0.03 m, door 2.1 m); bevels 1–3 cm (RoundedBox/bevel); PBR (procedural wood grain via shader noise or CanvasTexture, glass with transmission, matte black metal); drei `Environment` presets (no external HDR files) + soft-shadow sun + Contact/Accumulative shadows; ACESFilmic or AgX, sRGB; light post (SMAA, Bloom only on lights, Vignette; SSAO desktop only); board gaps, window mullions, chimney smoke, warm window light at night, light fog.
- Performance: < 100k triangles (measure and record), instanced boards/trees, `frameloop="demand"` when idle, adaptive DPR, lazy chunk, static fallback frame.
- All dimensions in one config object.
- Acceptance: real Playwright screenshots (1440 & 390, day & night, ≥ 4) in `docs/visual-reviews/stage-2/`, self-review against the checklist, show the owner before moving on. Any "no" → rework.

## Honesty

Never write that something was verified unless it actually was. Always separate "verified" from "not verified" in reports and in `docs/VALIDATION.md`.
