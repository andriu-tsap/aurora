# AURORA · Night Atlas

A fictional travel-platform concept by Andrii Tsap. **Concept / demo project — fictional data.**

[Live demo](https://andriu-tsap.github.io/aurora/) · [Validation](docs/VALIDATION.md) · [Licenses](licenses/README.md)

Stage 1: responsive Next.js landing page with a geographic globe, destination previews and EN/PL/UA. The catalogue, booking, owner dashboard and backend are scheduled for subsequent stages; this repository does not represent them as completed.

## Local development

Node 22+ and pnpm 11.25:

```sh
pnpm install
pnpm dev
```

```sh
NEXT_PUBLIC_BASE_PATH=/aurora pnpm build
pnpm lint
pnpm typecheck
pnpm exec playwright install chromium
pnpm test:e2e
```

`apps/web/out/` is the complete static Pages artifact. Paths include `/aurora`. The repository's Pages workflow uploads that folder. Browser tests serve it under the same prefix. The separate Visual QA workflow captures screenshots and a Lighthouse report; it never blocks the Pages deployment.

## Structure

- `apps/web`: Next.js 15, React, strict TypeScript, Tailwind utilities and custom CSS, Motion, GSAP, next-intl, React Three Fiber/drei.
- `packages/ui`: shared design tokens for the future Angular UI.
- `scripts/generate-globe.py`: reproducible Natural Earth point cloud and lightweight SVG globe.
- `tests/hero.spec.ts`: desktop/mobile, language, keyboard, motion preference and WebGL failure coverage.
- `licenses`: data/font license records.

## Globe behavior

Mobile, reduced-motion and data-saver visitors receive the geographic poster first. Mobile loads WebGL only after activation. Desktop loads it after the first paint. The poster remains visible during loading and on WebGL failure. Land points and hemisphere lighting create depth; a Fresnel shader adds atmosphere. Arcs show three illustrative routes. Click a marker to view a destination or use the equivalent native HTML controls. Pause is available, and the render loop stops when the scene is offscreen.

## Delivery plan

0 architecture → 1 hero → 2 catalogue/map/cabin → 3 booking/vouchers → 4 API → 5 Angular → 6 Python/bot → 7 CMS/widget/planner/PWA → 8 final verification.

Final handoff after all accepted stages: one source ZIP excluding dependencies/secrets/caches, prebuilt public and admin exports, a per-feature honest status checklist, screenshots and measured Lighthouse reports. A stage-1 artifact is not the final project ZIP.
