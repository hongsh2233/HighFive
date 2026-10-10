import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://localhost:3100', browserName: 'chromium', trace: 'retain-on-failure', viewport: { width: 1440, height: 1000 } },
  webServer: {
    command: 'npx next start -p 3100', url: 'http://localhost:3100/login', reuseExistingServer: false,
    timeout: 120000,
    env: { NEXTAUTH_SECRET: 'highfive-phase-one-local-test-secret', NEXTAUTH_URL: 'http://localhost:3100', DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/highfive_test' },
  },
});
