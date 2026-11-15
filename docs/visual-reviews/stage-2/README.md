# Stage 2 visual review — code-built A-frame cabin

Real Playwright captures of `/cabin/` (static production export, headless Chromium with **software WebGL / SwiftShader**). Produced by `tests/cabin.spec.ts`. The orbit-hint overlay is hidden for the capture; nothing else is edited.

| File                   | Viewport    | Device pixel ratio       | Light       |
| ---------------------- | ----------- | ------------------------ | ----------- |
| `cabin-1440-day.png`   | 1440 × 1000 | 1                        | golden hour |
| `cabin-1440-night.png` | 1440 × 1000 | 1                        | night       |
| `cabin-390-day.png`    | 390 × 844   | 3 (canvas capped at 1.5) | golden hour |
| `cabin-390-night.png`  | 390 × 844   | 3 (canvas capped at 1.5) | night       |

Scene size: **78,746 triangles** (scene geometry incl. instances, counted by traversing the scene graph; shadow and post-processing passes not included). Budget: < 100,000.

## Self-review checklist

| Criterion                               | Verdict        | Evidence / notes                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real proportions                        | ✅             | 6 m base × 8 m body, ridge 5.45 m above a 0.6 m floor (≈ 6 m overall), door 2.1 m, deck boards 140 × 30 mm with 6 mm gaps, railing 1.0 m, stair rise 0.2 m. All values in `components/cabin/config.ts`. Door, railing and steps read at human scale.                                                                                                                                                                                |
| Shadows                                 | ✅             | Sun (PCSS soft shadows on desktop) casts railing shadows on the deck, rock and tree shadows on the meadow; the slope facing away from the sun is in shade. At night a spot from the glazing throws mullion shadows onto the deck; the main interior lamp casts shadows so the roof does not leak light. Contact shadows ground the piers. The cabin's own large shadow falls behind it in the default view (visible when orbiting). |
| Bevels                                  | ✅             | Rounded boxes / extrude bevels 6–15 mm on boards, rails, fascia, mullions, seams; roof slab and skin extruded with real bevels. Subtle at the default distance, clear when zooming in.                                                                                                                                                                                                                                              |
| Materials not plastic                   | ✅ with note   | Matte standing-seam metal with seams and ridge cap; procedural wood grain (fibres, knots, per-board tone and per-board UV offset); tinted glass with transmission; textured concrete. Note: at the default distance the deck grain is soft; it is visible when zooming in.                                                                                                                                                          |
| Premium architectural render, not a toy | ✅ with note   | Clean archviz look; warm horizon sky, light fog, ACES tone mapping, bloom only on lamps, vignette, SSAO (desktop). Notes: firs are deliberately low-poly per the brief; meadow grass tufts look slightly "game-like" in the phone foreground.                                                                                                                                                                                       |
| No z-fighting / flicker / seams         | ✅ in captures | Curtains on separate planes, skins offset from timber, sky dome without depth test. A still image cannot prove the absence of every artifact during motion.                                                                                                                                                                                                                                                                         |

## Problems found and fixed during review (iterations)

1. First frame: shadows invisible — the sun lit the side facing away from the camera and image-based fill was nearly as bright as the sun. Moved the sun to the front-left at ~28°, key:fill ≈ 4:1, ACES tone mapping.
2. Bright cartoon cones for trees → slim 8-tier spruces with branch-like jagged skirts, muted needles.
3. Milky glass (IBL lights the interior as brightly as the outdoors) → tinted glazing, reduced environment light on interior-only materials.
4. Wood was stretched (parts scaled from 1 m stock) and every board showed the same knots → real-size geometry, per-instance UV offset.
5. Deck "dot" pattern at night → diagnosed as aliasing of 6 mm board gaps (not shadow acne); fixed with MSAA ×4 on desktop and a larger board-edge bevel.
6. Flat grey sky (gradient mixed to grey; sky dome clipped at the far plane) → narrow warm horizon band, slate zenith, sphere rendered without depth test.
7. Chimney too tall and colliding with sofa; deck too wide (eaves cut through it) → chimney near the ridge, stove moved, deck kept inside the roof span.

## Not verified

- Real GPUs and phones (only software WebGL), Safari/Firefox, frame rate under interaction.
- Visual quality while orbiting (only still frames were inspected).
- Drei `Environment` presets were **not** used (they download HDR files from a CDN); lighting is built from `Lightformer` cards instead.

## Round 2 — owner review fixes

1. Deck dot pattern (night, 390): root cause was aliasing of 6 mm board gaps, not shadow acne. Fix: MSAA x4 on mobile too, shaded gap-fill slab under boards, boards no longer self-cast shadows, softer roughness noise. Checked on 1440 and 390.
2. Grass: fewer (700), lower, thinner tufts, muted palette, softer moss ground texture.
3. Rocks: smooth lobed noise, flattened base, darker `#4e4b46`.
4. Daylight: golden-hour sun (low, warm, front-left), gradient sky dome, matched fog, tighter soft shadows.
5. Lanterns: moved from glass to deck railing posts.
6. Spruces: 10 trees with random height, girth, tilt and needle tint (seeded).
