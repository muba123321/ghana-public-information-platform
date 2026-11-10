import { expect, it } from 'vitest';

it('core package entry resolves', async () => {
  await expect(import('./index.js')).resolves.toBeDefined();
});
