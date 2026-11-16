# Map inputs

| File | Source | Licence |
|---|---|---|
| `geoBoundaries-GHA-ADM1_simplified.geojson` | geoBoundaries gbOpen, Ghana ADM1 (2021), release 9469f09 — https://www.geoboundaries.org | Stated by geoBoundaries as CC BY-SA 2.0; derived from OpenStreetMap (© OpenStreetMap contributors, ODbL) |
| `ne_10m_lakes.gha.geojson`, `ne_10m_rivers.gha.geojson` | Natural Earth 10 m lakes and rivers v5.1.2, clipped to features touching Ghana | Public domain |

`pnpm --filter @gpip/ingest build-map` turns these into `apps/web/src/features/regions/map-data.json`.
The simplified geometry is published under ODbL (the stricter of the two). Credit line shown on the site:
"Boundaries: geoBoundaries (CC BY-SA 2.0), © OpenStreetMap contributors (ODbL). Water: Natural Earth."
