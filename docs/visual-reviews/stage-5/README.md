# Stage 5 — owner panel screenshots

Real browser captures of the static export served under `/aurora/admin/`; no mockups. Demo data only, "Demo data" badge visible on every page.

## Files

| File | Page | Viewport | Language | Source |
| --- | --- | --- | --- | --- |
| `admin-login-1440.png` | login | 1440 | EN | step 5.1, kept |
| `admin-properties-1440.png`, `admin-properties-390.png` | property list | 1440, 390 | EN | step 5.1/5.2, kept |
| `admin-form-1440.png`, `admin-form-390.png` | add property form | 1440, 390 | EN | step 5.2, kept |
| `admin-occupancy-1440.png`, `admin-occupancy-390.png` | occupancy and revenue | 1440, 390 (the file is 360 px wide) | EN | step 5.3, kept |
| `login-1440-en.png`, `login-1440-uk.png`, `login-390-en.png`, `login-390-uk.png` | login | 1440, 390 | EN, UA | `scripts/capture-stage5.mjs`, **not yet generated** |
| `list-<1440\|390>-<en\|uk>.png` | property list | 1440, 390 | EN, UA | same, **not yet generated** |
| `form-<1440\|390>-<en\|uk>.png` | new property form | 1440, 390 | EN, UA | same, **not yet generated** |
| `occupancy-<1440\|390>-<en\|uk>.png` | occupancy (property "Halny Ridge", November 2026) | 1440, 390 | EN, UA | same, **not yet generated** |

The seven existing files come from earlier steps and are untouched. The 16 new files are produced by `scripts/capture-stage5.mjs` (`node scripts/serve-static.mjs &`, then `PW_CHROMIUM_PATH=/path/to/chrome node scripts/capture-stage5.mjs`). The script never deletes anything. It freezes `Date` at 2026-11-16 and injects **one** fictional guest booking (`AUR-SHOT01`, 10–14 Nov 2026, Halny Ridge) into `localStorage` so that the "guest" state of the calendar is visible; this is a test fixture, not a real reservation.

## Self-assessment

Status: **not done for the new files**. The session that wrote the script had no browser run and no build, so none of the 16 new images exists and none was inspected. Nothing below is claimed about them.

To fill in after the capture, against the stage checklist:

- [ ] no horizontal scroll at 390 px on list, form and occupancy;
- [ ] "Demo data" badge visible in every image;
- [ ] UA text fits without clipping (buttons, calendar summary, table headers);
- [ ] calendar shows free, demo-busy and guest states with pattern or shape plus text, not colour alone;
- [ ] focus outlines visible where a screenshot shows a focused element.

The seven existing images were reviewed by the owner's assistant in step 5.1–5.3 and were not re-inspected in this session.
