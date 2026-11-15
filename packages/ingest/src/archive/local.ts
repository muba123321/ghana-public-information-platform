import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { DocumentStore } from './store.ts';

export function createLocalStore(dir: string): DocumentStore {
  const root = resolve(dir);
  const pathFor = (key: string) => {
    const p = resolve(join(root, key));
    if (!p.startsWith(`${root}/`)) throw new Error(`Invalid storage key: ${key}`);
    return p;
  };
  return {
    async put(key, body) {
      const p = pathFor(key);
      await mkdir(dirname(p), { recursive: true });
      await writeFile(p, body);
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(pathFor(key)));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw e;
      }
    },
  };
}
