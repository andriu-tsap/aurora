# Validation — stage 1: Night Atlas

Validated application revision: `b85df4eba5a31095732f498ef70e15f810b95f61`.
Date: 2026-11-15. Stage 1 is deployed and ready for the user's visual acceptance. Stages 2–8 have not started.

## Verified

- GitHub identity `andriu-tsap`, push/admin permissions for the existing `aurora` repository, and GitHub Pages configuration were read through GitHub API. Creation permissions for an unrelated new repository were not tested.
- Local ESLint and strict TypeScript checks passed. Static production export with `NEXT_PUBLIC_BASE_PATH=/aurora` passed. CI rebuilt the final revision successfully.
- [Pages deployment](https://github.com/andriu-tsap/aurora/actions/runs/43700396639) succeeded. The public homepage and referenced JS/CSS/poster resources returned HTTP 200.
- [Browser QA](https://github.com/andriu-tsap/aurora/actions/runs/43700396692): **5 tests passed** in headless Chromium. These are hero tests, not the five future full-product booking/admin/offline scenarios.
  1. Desktop globe renders; pause works; HTML region selection updates the scene label; preview dialog opens/closes; EN→UA→PL and persisted locale work.
  2. At 390 px, no canvas exists before interaction; the geographic poster is visible; activation loads a working 3D canvas.
  3. At 360 px, EN/PL/UA have no horizontal document overflow.
  4. Reduced motion starts with the poster; Enter opens the region dialog; Escape restores focus.
  5. Simulated WebGL failure preserves the geographic poster and presents an error message.
- Actual Chromium screenshots saved in `docs/visual-reviews/stage-1/`: 1440 px desktop, 390 px mobile poster, 390 px mobile WebGL, 360 px Ukrainian, 1440 px Polish. No generated mockups are presented as screenshots.
- The final desktop, mobile poster and mobile WebGL screenshots were visually inspected. See the visual checklist in that directory.

## Lighthouse mobile

Measured by Lighthouse 13.6.0 in GitHub Actions against the final static export, served at `/aurora/` with HTTP compression. Default simulated mobile throttling, fresh profile, WebGL not activated. This is a lab test of the production build, not a physical-phone measurement or a claim about every public-network visit.

| Category       | Score |
| -------------- | ----: |
| Performance    |    91 |
| Accessibility  |   100 |
| Best practices |   100 |
| SEO            |   100 |

FCP 0.8 s; LCP 2.7 s; total blocking time 250 ms; CLS 0. Raw JSON and HTML are in `docs/lighthouse/`. Earlier iterations scored 78 and 71 for performance; those results prompted real changes: lazy animation runtimes, a rasterized mobile poster and deferred scroll effects. The final Lighthouse workflow remains separate from Pages and cannot block deployment.

## Explicitly not verified / limits

- No physical iOS/Android device, Safari, Firefox, screen reader or sustained GPU stress test has been performed.
- Direct raycast clicks on individual globe dots were implemented but not separately exercised by the automated suite; equivalent HTML destination controls were tested.
- Triangle count is not instrumented or measured. Geometry is deliberately small; a claim of measured GPU-budget compliance is not made.
- Screenshot evidence establishes appearance at captured moments, not the absence of every possible animation artifact.
- The globe is a stylized atlas, not an architectural render. Cabin realism, bevels, ground shadows, day/night and configurable materials belong to stage 2.
- Fresnel atmosphere is a WebGL shader; the faint aurora backdrop is currently CSS gradients. No bloom/SSAO is used in the hero.
- Locales switch client-side; separate `/en/`, `/pl/`, `/ua/` SEO routes and a full light theme are not implemented yet.
- OpenFreeMap provider and OSM attribution requirements are recorded in `licenses/`; the map is not implemented yet.
- No catalogue, cabin, booking/payment, account, API/WebSocket, Angular dashboard, Python/bot, CMS/widget/planner/PWA or final monorepo ZIP is claimed complete. Those are stages 2–8.

## Final handoff contract

After all stages are implemented and accepted, deliver one ZIP with complete source (no dependencies, secrets or caches), prebuilt `/aurora/` and `/aurora/admin/` exports, README, this validation record, licenses, `.env.example`, screenshots and Lighthouse evidence. Before packaging, mark every original requested feature ✅ working / ⚠️ partial / ❌ missing. Stage-1 evidence is not a substitute for that final checklist.

## Accepted stage-one follow-up — 2026-11-15

User accepted the overall stage-one design, then requested five layout adjustments. Application revision `6643b44` implements them. [QA run](https://github.com/andriu-tsap/aurora/actions/runs/43701133745) passed all five browser tests, including new assertions for caption/button separation at 390 px and a stacked search button at 360 px. Updated 1440/390/360 screenshots were inspected. Pages deployment succeeded. The latest mobile Lighthouse run scored **86 / 100 / 100 / 100**; the earlier 91 is not represented as the current score. Further startup optimization is planned during stage 2.

## Stage 2 — interim (cabin review checkpoint), 2026-11-15

Order agreed with the owner: Lighthouse → demo data → 3D cabin → owner review of 4 cabin screenshots → catalogue, map and property page. Catalogue, map and property page are **not started**.

### Verified locally (this session)

- `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` (8 Vitest data tests) and the static export with `/aurora` pass.
- Playwright: **11 tests pass** (5 existing hero tests + 6 new cabin tests) in headless Chromium with software WebGL. A locally installed Chromium was used via `PW_CHROMIUM_PATH` because the session network blocked Playwright's browser download.
- Mobile Lighthouse (home page, local static server, Lighthouse 13.6, default simulated throttling): performance **94 / 90 / 97** in three consecutive runs before the 4th region was added; accessibility, best practices and SEO 100. Changes: responsive AVIF/WebP poster, unicode-range-aware font imports, next-intl replaced by a typed lookup, CSS blur filters replaced by gradients. CI numbers will be read from the Visual QA workflow; they are not claimed here.
- Every globe marker (4) maps to a non-empty set of stays (unit test). The Julian Alps region was added to the globe, poster and hero.
- Cabin scene: 78,746 triangles (scene graph count, see `docs/visual-reviews/stage-2/README.md`), four real screenshots inspected against the 3D checklist.

### Not verified

- Lighthouse after adding the 4th region and the cabin page; Lighthouse for `/cabin/`.
- Real phones/GPUs, Safari/Firefox, frame rate while orbiting.
- CI run of the new cabin tests (expected to be slow on software WebGL; they run only in the non-blocking Visual QA workflow).
