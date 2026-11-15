# AURORA

A concept travel platform with fictional data. Stage 1 is under construction; this repository does not yet implement a catalogue, booking, payments, or owner dashboard.

## Run

Requires Node 22+ and pnpm 11. `pnpm install && pnpm dev` starts the Next.js app. `NEXT_PUBLIC_BASE_PATH=/aurora pnpm build` creates the static GitHub Pages export in `apps/web/out`.

The globe is loaded after the first render on desktop; mobile users can opt into it. Hover or focus a region to select its route. Map coordinates are derived from Natural Earth. See `licenses/` and `docs/VALIDATION.md`.
