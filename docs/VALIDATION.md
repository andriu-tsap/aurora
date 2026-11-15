# Validation — stage 1 in progress

- `pnpm typecheck`: passed locally.
- Static Next.js export: passed locally with `NEXT_PUBLIC_BASE_PATH=/aurora` after the final source changes.
- Calculated WCAG contrast for opaque design-token pairs: coral `#ff7a59` on navy `#070b1a` 7.63:1; `#f2f6f8` on navy 18.02:1; `#b3f5e5` on navy 15.96:1; `#b3c1ce` on navy 10.67:1; `#f2f6f8` on `#0e1430` 16.63:1; `#42545b` on `#f3f5f2` 7.23:1. Other text, transparency and rendered backgrounds have not been audited.
- Browser interaction, visual 3D quality, screenshots, Lighthouse and accessibility audit have not been verified. The current globe is an initial implementation and does not yet meet the full visual brief.
- No claim is made about catalogue, payment, backend, or other later stages.
