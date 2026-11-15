# Validation — stage 1, Night Atlas

This file is updated only from observed results. Stage 1 has not yet passed visual acceptance.

## Current verification
- GitHub CLI authentication: `andriu-tsap`; repository `andriu-tsap/aurora` exists. GitHub reports push and admin permissions. Pages uses GitHub Actions.
- Local `pnpm lint`: passed.
- Local `pnpm typecheck`: passed.
- Local `NEXT_PUBLIC_BASE_PATH=/aurora pnpm build`: passed (Next.js 15.5.29 static export).
- Browser tests, screenshots and Lighthouse: pending GitHub Actions execution.
- Earlier results in the repository apply only to earlier commits, not this revision.

## Scope
Implemented for validation: landing page, geographic static poster, opt-in mobile WebGL globe, three regions and destination previews, EN/PL/UA, animation pause, reduced-motion default, local fonts, basePath-aware static export.

Not implemented in stage 1: catalogue/map, cabin, booking/payments, account, backend/WebSocket, Angular admin, Python/bot, CMS/widget/planner/PWA. These belong to stages 2–8. Browser tabs do not yet synchronize bookings.

## Known limits
- Locale switches client-side; separate `/en/`, `/pl/`, `/ua/` SEO routes are deferred.
- No light theme yet. Day/night cabin screenshots belong to stage 2.
- Mobile uses an SVG geographic poster until explicit interaction; no post-processing in either globe quality tier.
- WebGL software-rendered screenshots are visual evidence, not a real-device GPU performance benchmark.
- Lighthouse is a lab result and cannot guarantee a score on every device.
- The `<aurora-availability>` widget and Angular `/admin/` export are not part of stage 1.
