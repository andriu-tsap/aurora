# Third-party resources

## Geographic data

- Globe: Natural Earth 1:110m land, public domain. Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson . Terms: https://www.naturalearthdata.com/about/terms-of-use/ . `scripts/generate-globe.py` derives the checked-in point cloud and SVG poster. No remote geographic request is made by the deployed homepage.
- Map tile provider selected for stage 2: **OpenFreeMap**, https://openfreemap.org/ . No API key. Style endpoint: https://tiles.openfreemap.org/styles/liberty . Required visible attribution will include **© OpenStreetMap contributors**, **OpenFreeMap**, and any additional attribution supplied by the style/source. OpenStreetMap data is under ODbL 1.0: https://www.openstreetmap.org/copyright and https://opendatacommons.org/licenses/odbl/1-0/ . OpenFreeMap usage documentation: https://openfreemap.org/quick_start/ . The map is not yet implemented; no claim of offline tile availability is made.

## Fonts

- Inter, Rasmus Andersson: SIL Open Font License 1.1; bundled locally through Fontsource. See `Inter-OFL.txt`.
- Space Grotesk, Florian Karsten: SIL Open Font License 1.1; bundled locally through Fontsource. See `Space-Grotesk-OFL.txt`. Inter is the Ukrainian fallback because Space Grotesk does not include Cyrillic.

## Artwork and software

- Globe poster, shader, layout and decorative marks: original project code. No downloaded human photographs, brand logos or third-party 3D models.
- A-frame cabin (`apps/web/components/cabin/`): geometry, procedural wood/ground/concrete textures, sky and smoke are generated in code at runtime. No GLB/GLTF, HDR or image textures are downloaded. Lighting uses drei `Environment` built from `Lightformer` cards; drei's named presets are deliberately not used because they fetch HDR files from a third-party CDN.
- Property photos (catalogue, gallery): **renders of this project's own code-built cabin** (`scripts/capture-cabin-poster.mjs` and later gallery captures). Original work, no third-party image licence involved. No Unsplash or other stock photos are used.
- React, Next.js, Three.js, React Three Fiber, drei, postprocessing (Zlib), @react-three/postprocessing (MIT), n8ao (ISC), Motion, Tailwind CSS and development dependencies retain their upstream licenses in their packages.
- GSAP: Standard License, https://gsap.com/community/standard-license/ . Free commercial use under its terms; not represented as an OSI open-source license.
