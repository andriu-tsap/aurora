# Stage 1 visual review

Source: b85df4e. [Successful capture run](https://github.com/andriu-tsap/aurora/actions/runs/43700396692).

- `hero-1440.png`: 1440 × 1000, active desktop WebGL.
- `hero-390.png`: 390 × 1050, initial mobile poster, no WebGL.
- `hero-390-3d.png`: 390 × 1050, after explicit 3D activation.
- `hero-360-uk.png`: narrow Ukrainian layout.
- `hero-1440-pl.png`: Polish layout.

The first three screenshots were inspected by the implementation agent. Self-review, pending the user's acceptance:

| Criterion | Assessment |
|---|---|
| Proportions and geography | Pass for a spherical stylized atlas. Land is derived from Natural Earth. No invented blob continents. |
| Lighting / depth | Pass: directional hemisphere lighting and Fresnel rim separate the globe from the background. A floating globe has no receiving ground plane; ground-contact shadows are not applicable. |
| Bevels | Not applicable to a sphere. Must be reviewed on the stage-2 cabin. |
| Material appearance | Pass for a matte dark cartographic sphere; no flat default plastic colors. |
| Visual clarity | Pass: headline, CTA and geographic scene remain separated at both widths. Mobile has a lower-density WebGL scene after activation. |
| Seams / z-fighting | None visible in the inspected captures. A still screenshot cannot prove their absence throughout animation. |
| Architectural realism | Not applicable to a globe. No claim that the cabin requirement has already passed. |

The original heavy curved background band was removed after screenshot review. The final captures show the softer aurora gradient. The mobile initial poster is the same geographic asset rasterized into WebP, not a generative replacement screenshot.
