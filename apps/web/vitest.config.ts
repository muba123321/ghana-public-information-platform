import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['components/**/*.test.tsx', 'lib/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
