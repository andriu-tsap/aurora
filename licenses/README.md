# Third-party resources

## Geographic data

- Globe: Natural Earth 1:110m land, public domain. Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson . Terms: https://www.naturalearthdata.com/about/terms-of-use/ . `scripts/generate-globe.py` derives the checked-in point cloud and SVG poster. No remote geographic request is made by the deployed homepage.
- Map tile provider selected for stage 2: **OpenFreeMap**, https://openfreemap.org/ . No API key. Style endpoint: https://tiles.openfreemap.org/styles/liberty . Required visible attribution will include **© OpenStreetMap contributors**, **OpenFreeMap**, and any additional attribution supplied by the style/source. OpenStreetMap data is under ODbL 1.0: https://www.openstreetmap.org/copyright and https://opendatacommons.org/licenses/odbl/1-0/ . OpenFreeMap usage documentation: https://openfreemap.org/quick_start/ . Implemented in stage 2 with the **dark** style (`https://tiles.openfreemap.org/styles/dark`, a fork of OpenMapTiles Dark Matter, BSD-3-Clause style code; map data © OpenStreetMap contributors, ODbL; © OpenMapTiles). MapLibre's attribution control shows the attribution supplied by the style. Tiles are loaded live from OpenFreeMap; nothing is cached offline. Automated tests replace the style with an offline stub and label those screenshots accordingly.

## Fonts

- Inter, Rasmus Andersson: SIL Open Font License 1.1; Fontsource files copied to `apps/web/public/fonts/` by `scripts/copy-fonts.mjs` (self-hosted, preloaded). See `Inter-OFL.txt`.
- Space Grotesk, Florian Karsten: SIL Open Font License 1.1; bundled locally through Fontsource. See `Space-Grotesk-OFL.txt`. Inter is the Ukrainian fallback because Space Grotesk does not include Cyrillic.

## Artwork and software

- Globe poster, shader, layout and decorative marks: original project code. No downloaded human photographs, brand logos or third-party 3D models.
- A-frame cabin (`apps/web/components/cabin/`): geometry, procedural wood/ground/concrete textures, sky and smoke are generated in code at runtime. No GLB/GLTF, HDR or image textures are downloaded. Lighting uses drei `Environment` built from `Lightformer` cards; drei's named presets are deliberately not used because they fetch HDR files from a third-party CDN.
- Property photos (catalogue, gallery): **renders of this project's own code-built cabin** (`scripts/capture-cabin-poster.mjs` and later gallery captures). Original work, no third-party image licence involved. No Unsplash or other stock photos are used.
- MapLibre GL JS (BSD-3-Clause).
- React, Next.js, Three.js, React Three Fiber, drei, postprocessing (Zlib), @react-three/postprocessing (MIT), n8ao (ISC), Motion, Tailwind CSS and development dependencies retain their upstream licenses in their packages.
- GSAP: Standard License, https://gsap.com/community/standard-license/ . Free commercial use under its terms; not represented as an OSI open-source license.
- DejaVu Sans (regular, bold): Bitstream Vera / DejaVu free license, see `DejaVu-LICENSE.txt`. Copied to `apps/web/public/fonts/voucher/` by `scripts/copy-fonts.mjs` and embedded only in the downloadable PDF voucher (Latin, Latin Extended, Cyrillic).
- pdf-lib and @pdf-lib/fontkit (MIT), qrcode (MIT): PDF voucher and vector QR code, loaded lazily on download.
