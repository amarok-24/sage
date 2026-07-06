import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    // redis-memory-server downloads its binary on first use (cached under
    // node_modules/.cache afterward) — the default 10s hook timeout isn't enough
    // for that first download, especially with multiple test files in parallel.
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/config/db.ts', 'src/app.ts']
    }
  }
});
