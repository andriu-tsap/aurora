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

## Stage 2 — catalogue, map, property page, Lighthouse (2026-11-15)

**Verified locally (sandbox):** lint, typecheck; Vitest 14/14; Playwright e2e 17/17 (hero 5, cabin 5, catalogue 6 + screenshots) on the static export under `/aurora/`; every globe region opens a non-empty catalogue; filters sync to URL; mobile 360 no horizontal overflow; lightbox keyboard nav and focus restore; JSON-LD present. Lighthouse mobile, home: 93, 95, 95, 93, 93, 93 (6 runs, all >= 90) after font self-hosting; /stays/, /stays/halny-ridge/, /cabin/: 94–96 (single runs, report-only).

**Not verified:** real OpenFreeMap tiles (tests stub the style; screenshots show background + markers only); CI run of the new tests; real phones/GPUs/browsers other than local Chromium with software WebGL; deployed site after this push; Lighthouse variance on CI hardware.

## Stage 3 — booking, demo payment, PDF voucher, guest account, favourites (2026-11-15)

Status: implemented, waiting for the owner's "OK". Fresh screenshots are in `docs/visual-reviews/stage-3/` (with a self-assessment), Lighthouse results are below.

### Verified

- Locally in the sandbox (earlier session, at `cf2d32a`): lint, typecheck, Playwright booking test: dates picked in the calendar, quote shown, invalid card -> "Use a test card number", `4000 0000 0000 0002` -> declined message, `4242 4242 4242 4242` -> confirmed with reference, `localStorage` holds the reference and no card digits, PDF downloads (starts with `%PDF-`, > 10 kB), account lists and cancels the booking (persists after reload). Phone 390: no horizontal overflow, dialog inside the viewport, Escape returns focus to "Reserve". The English voucher QR decoded with OpenCV to `/account/?ref=<reference>`.
- Voucher PL and UA (this session, at `692f905`): the real `buildVoucher` was run in Node for EN, PL and UA with long names containing Ł ż ś ń ó ź Ї Ґ Є, rasterised with poppler and inspected by eye. Polish diacritics and Ukrainian Cyrillic render correctly with the embedded DejaVu Sans. This found a real layout bug: long values wrapped onto a second line and overlapped the next label. Fixed in `fix(voucher): wrap long values without overlapping the next label`; UA re-rendered after the fix and the overlap is gone.
- This session, after the voucher fix: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` (21/21) and `NEXT_PUBLIC_BASE_PATH=/aurora pnpm build` passed.
- Full Playwright suite at head `963eab0` (voucher fix + docs): **27/27 passed** in ~4 min on a local Chrome with software WebGL (includes booking, confirmation, favourites, catalogue, cabin and hero tests).
- Lighthouse mobile, local static server with gzip, three runs on the home page: performance 97 / 98 / 96, accessibility 100, best practices 100, SEO 100 (`docs/lighthouse/stage-3-scores.json`). Other pages, one run: `/stays/` 96, `/stays/halny-ridge/` 97, `/account/` 99, `/cabin/` 97 performance; accessibility and best practices 100 everywhere. `/account/` SEO is 63 **by design**: the page is `noindex` because it is a private demo account. These are lab numbers, not real-device or CI numbers.
- Screenshots of catalogue covers, favourites, confirmation (confetti and email preview, EN and PL), account and vouchers EN/PL/UA: `docs/visual-reviews/stage-3/`, inspected by eye. The map basemap is stubbed there (see its README).
- OpenFreeMap tiles: verified by owner on live site.

### Not verified

- CI: the separate Visual QA workflow failed once on the desktop booking test (60 s test timeout while taking a screenshot on a software-WebGL runner); the Pages deployment itself succeeded. The test now has a 180 s timeout; the next CI run has not been observed yet.
- Lighthouse in the project's CI (the numbers above are local); UA confirmation screenshot; a 1440 confirmation dialog capture (the desktop stay page loads software-WebGL 3D and is too slow to capture reliably here).
- Vouchers in real desktop/mobile PDF viewers (only poppler), screen-reader behaviour of the calendar, real phones, the deployed site for this commit.

### By design (demo)

- No payment is processed and no email is sent. The UI says so ("demo: in production this email is sent to the guest"). Only test cards are accepted, no payment-provider branding, card data is never stored or sent; only the booking result goes to `localStorage` key `aurora-bookings`. Favourites live in `aurora-favorites`.
- Busy dates are fictional and identical for every visitor.
- Stages 4, 6 and 7 are not implemented in this version (owner decision); see the checklist in `CLAUDE.md`.

## Stage 5 — owner panel (Angular, demo mode), step 5.4 (2026-11-16)

Status: 5.1–5.3 accepted; 5.4 (e2e, screenshots, docs) implemented and run in a real browser at `fd90cb1` + 3 commits. Waiting for the owner's "OK". Stage 8 has not started.

### Verified (actually run, 2026-11-16, local Chrome, static export served at `:4173/aurora/`)

- `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` (67 tests) and `NEXT_PUBLIC_BASE_PATH=/aurora pnpm build`: pass.
- Playwright: the 8 new admin tests pass; the full suite passes **35/35** (27 existing + 8 new, ~4 min). Two fixes were needed after the first run: an ambiguous `getByRole("group")` in the delete test and a lint error (`localStorage` global) in `scripts/capture-stage5.mjs`.
- `scripts/capture-stage5.mjs` produced 16 new screenshots (login, list, form, occupancy; 1440 and 390; EN and UA) in `docs/visual-reviews/stage-5/`.
- Lighthouse (local, report only) for `/admin/`: performance 99, accessibility 100, best practices 100, SEO 60.
- By hand in a real browser (steps 5.1–5.3): demo login, price edit + reload + reset, create property with compressed photos + delete, guest booking shown in the calendar, CSV and .xlsx download (the xlsx chunk loads only on click), EN/PL/UA, no console errors. The exported files were opened with Python parsers (csv, openpyxl).

### Not verified

- Opening the .xlsx / CSV in Excel itself (Polish regional settings), screen readers, real phones, Safari/Firefox, the deployed site for this commit (the sandbox cannot reach github.io).
- Drag & drop with a mouse (only file-picker input was tested); the message for a non-image file was not read.
- At 390 px the revenue chart scrolls inside its own block (by design); its clipped Y-axis labels in UA were fixed in stage 8.
- Admin SEO 60 is expected for a demo panel (no meta description / not meant to be indexed).

### Scope of the new admin tests (`tests/admin.spec.ts`)

1. Demo login; the "Demo data" badge is visible on the login page and after sign-in.
2. Price change → reload → persisted → "Reset" returns the original price.
3. Create a property with a photo (`setInputFiles` on `photo-input`) → reload → persisted → delete with confirmation → still gone after reload.
4. Invalid form: errors, `role="alert"`, `aria-invalid`, focus on the first invalid field.
5. Occupancy calendar: arrows and PageDown / PageUp; a `Booking` injected into `aurora-bookings` is counted as "guest".
6. CSV export: a download whose name contains `aurora-demo-revenue`; the file contains "Demo data (fictional)".
7. EN / PL / UA switch in the header, persisted in `aurora-locale`.
8. 390 px: no horizontal page scroll on `#/properties`, `#/properties/new`, `#/occupancy`.

The tests need no WebGL and no network. `Date` is frozen to 2026-11-16 (timers keep running).


## Final checklist — stage 8 (2026-11-16)

Legend: ✅ verified by a real run in this project; ⚠️ partly verified or limited; ❌ not implemented in this version.

| Feature | Status | Evidence / limit |
| --- | --- | --- |
| Landing with 3D globe, fallback poster, EN/PL/UA | ✅ | e2e hero tests; Lighthouse home 98/100/100/100 |
| Catalogue, filters, map | ✅ | e2e catalogue tests; map style stubbed offline in tests, live tiles not checked in CI |
| Property page, 3D cabin | ✅ | e2e; ~78.7k triangles measured; software WebGL only, real GPUs not tested |
| Booking, quote, test-card payment (demo) | ✅ | e2e; only test cards, no real payment |
| PDF voucher with QR, EN/PL/UA | ⚠️ | generated and inspected in the sandbox; not opened in every PDF reader |
| Guest account, favourites | ✅ | e2e |
| Owner panel: login, price edit, property CRUD, photos | ✅ | e2e (8 tests) and manual browser checks; drag & drop with a mouse not tested |
| Occupancy calendar, revenue chart, CSV / Excel export | ⚠️ | e2e for calendar and CSV; xlsx opened with openpyxl only, not in Excel |
| Accessibility | ⚠️ | Lighthouse a11y 100 on all pages, keyboard e2e for calendar and form; no screen-reader test |
| Mobile 360 / 390 | ✅ | e2e checks for no horizontal page scroll |
| Safari, Firefox, real phones | ❌ | not tested (Chromium only) |
| Node API, PostgreSQL, real Stripe, WebSocket (stage 4) | ❌ | not implemented in this version |
| Python service, Telegram bot (stage 6) | ❌ | not implemented in this version |
| WordPress plugin, availability widget, AI planner, PWA (stage 7) | ❌ | not implemented in this version |

### Final run (2026-11-16, local Chrome)

- Unit 67/67, lint and typecheck clean, `NEXT_PUBLIC_BASE_PATH=/aurora` build passes, full Playwright suite 35/35.
- Lighthouse mobile (performance / accessibility / best practices / SEO): home 98/100/100/100, `stays/` 95/100/100/100, `stays/halny-ridge/` 99/100/100/100, `cabin/` 97/100/100/100, `account/` 99/100/100/63, `admin/` 99/100/100/60. Low SEO on `account/` and `admin/` is by design (noindex demo pages). Scores are local and may differ on the live site.
- Fixed in this step: the revenue chart's left margin was too small, so Y-axis labels were clipped in UA (checked: labels now start inside the chart in UA, PL and EN).
- Not verified: the live GitHub Pages site for the final commit from this sandbox (github.io is not reachable here); check it by hand.
