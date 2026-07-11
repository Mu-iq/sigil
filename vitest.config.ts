import { defineConfig } from 'vitest/config';

// M1 unit tests target pure transform/theme logic and run in plain Node.
// Worker-integration tests (KV, request lifecycle) will move to
// @cloudflare/vitest-pool-workers in M2 once the request path grows.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
