import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildMap } from './build-map.ts';

const OUT = fileURLToPath(
  new URL('../../../../apps/web/src/features/regions/map-data.json', import.meta.url),
);
const { project: _project, ...data } = buildMap();
writeFileSync(OUT, `${JSON.stringify(data)}\n`);
console.log(
  `map-data.json: ${data.regions.length} regions, ${(JSON.stringify(data).length / 1024).toFixed(1)} KB`,
);
