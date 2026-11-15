# CLAUDE.md — AURORA session memo

Read this first in every session. Update it at the end of every stage (and before a session runs out of context): what is done, what is next.

## Project

AURORA — fictional booking platform for unique stays (glamping, mountain cabins, seaside apartments) + AI trip planner. Portfolio flagship for Andrii Tsap (`andriu-tsap`). Must show a client the full range: landing, catalogue, map, booking, payments (test), dashboards, API, realtime, bots, Python automation, WordPress, 3D.

- Repo: https://github.com/andriu-tsap/aurora (`main`)
- Live: https://andriu-tsap.github.io/aurora/ (GitHub Pages, artifact `apps/web/out`)
- Site always says: "Concept / demo project — fictional data". No real brands, logos, people photos or fake "real" reviews.

## Current state

- Stage 0 ✅, Stage 1 ✅ (accepted; 5 follow-up fixes in `6643b44`), Stage 2 ✅ (owner wrote "OK" 2026-11-15).
- **Stage 3 — starting** (booking flow, Stripe test mode in demo, PDF voucher + QR, guest account). Stage 2 shipped: catalogue `/stays/`, MapLibre map, property pages, own-cabin renders. Known gap: real OpenFreeMap tiles were never visually verified (sandbox has no access) — check on the live site.
- Owner decisions: property photos = renders of our own cabin (no stock photos); separate `/en/ /pl/ /ua/` SEO routes postponed to stage 8.
- Testing notes: cabin e2e uses software WebGL (~30–50 s per frame). `?autoload=1&time=night&wood=charred&metal=bronze&curtains=closed&quality=low` URL params drive the studio. `window.__auroraCabin.triangles` exposes the measured count.
- 3D lessons learned: drei `Environment` presets download HDRs from a CDN → use `Lightformer`s. IBL ignores walls → reduce `envMapIntensity` on interior-only materials. Sub-pixel deck gaps alias → MSAA ×4 on desktop. Build wood at real size (no scaling) so grain/bevels are not stretched.

## Stages

0 ✅ architecture · 1 ✅ hero · 2 ✅ catalogue/map/property/3D cabin · 3 ← booking, Stripe test, PDF voucher+QR, guest account · 4 Node API + PostgreSQL/Prisma + Socket.IO + JWT · 5 Angular owner panel at `/aurora/admin/` · 6 FastAPI + aiogram bot · 7 WP headless plugin, `<aurora-availability>` widget, AI planner, PWA · 8 tests, CI, README, final ZIP.

Do not start the next stage until the current one works, is deployed, and the owner wrote "OK". No TODOs in deployed code.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm dev
NEXT_PUBLIC_BASE_PATH=/aurora pnpm build   # static export -> apps/web/out
pnpm lint && pnpm typecheck
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
