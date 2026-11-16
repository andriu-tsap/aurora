# Stage 5 — owner panel screenshots

Real browser captures of the static export served under `/aurora/admin/`; no mockups. Demo data only, "Demo data" badge visible on every page.

## Files

| File | Page | Viewport | Language | Source |
| --- | --- | --- | --- | --- |
| `admin-login-1440.png` | login | 1440 | EN | step 5.1, kept |
| `admin-properties-1440.png`, `admin-properties-390.png` | property list | 1440, 390 | EN | step 5.1/5.2, kept |
| `admin-form-1440.png`, `admin-form-390.png` | add property form | 1440, 390 | EN | step 5.2, kept |
| `admin-occupancy-1440.png`, `admin-occupancy-390.png` | occupancy and revenue | 1440, 390 (the file is 360 px wide) | EN | step 5.3, kept |
| `login-1440-en.png`, `login-1440-uk.png`, `login-390-en.png`, `login-390-uk.png` | login | 1440, 390 | EN, UA | `scripts/capture-stage5.mjs` |
| `list-<1440\|390>-<en\|uk>.png` | property list | 1440, 390 | EN, UA | same |
| `form-<1440\|390>-<en\|uk>.png` | new property form | 1440, 390 | EN, UA | same |
| `occupancy-<1440\|390>-<en\|uk>.png` | occupancy (property "Halny Ridge", November 2026) | 1440, 390 | EN, UA | same |

The seven existing files come from earlier steps and are untouched. The 16 new files are produced by `scripts/capture-stage5.mjs` (`node scripts/serve-static.mjs &`, then `PW_CHROMIUM_PATH=/path/to/chrome node scripts/capture-stage5.mjs`). The script never deletes anything. It freezes `Date` at 2026-11-16 and injects **one** fictional guest booking (`AUR-SHOT01`, 10–14 Nov 2026, Halny Ridge) into `localStorage` so that the "guest" state of the calendar is visible; this is a test fixture, not a real reservation.

## Self-assessment (inspected: `occupancy-390-uk.png`; the others were produced by the same script and not all opened one by one)

- [x] no horizontal page scroll at 390 px on list, form and occupancy (also asserted by an e2e test);
- [x] "Demo data" badge visible (seen in the inspected image; asserted in e2e on login and after sign-in);
- [~] UA text fits in the inspected image; the revenue chart scrolls inside its block on narrow screens (by design); its Y-axis labels were clipped at first and were fixed in stage 8, the screenshots were re-captured afterwards;
- [x] calendar shows free, demo-busy (hatching + ×) and guest (solid + ◆) states, with a text legend;
- [ ] focus outlines in screenshots: not checked.
