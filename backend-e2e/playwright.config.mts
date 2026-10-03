import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend runs on 3000 by default (see backend/src/main.ts global prefix `api`).
const baseURL = process.env['BASE_URL'] || 'http://localhost:3000';

/**
 * Backend e2e suite.
 *
 * Drives the running NestJS HTTP API over the network, so no browser is
 * required and a single `api` project is enough.
 *
 * Note: this config intentionally avoids `nxE2EPreset` (which pulls in
 * `@nx/devkit`) so the suite can also run standalone via `npx playwright test`.
 */
export default defineConfig({
  testDir: './src',
  outputDir: '../dist/.playwright/backend-e2e/test-output',

  reporter: process.env['CI'] ? [['html', { outputFolder: '../dist/.playwright/backend-e2e/playwright-report', open: 'never' }]] : [['list'], ['html', { outputFolder: '../dist/.playwright/backend-e2e/playwright-report', open: 'never' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  // Boot the API before the suite unless one is already running.
  webServer: process.env['BASE_URL']
    ? undefined
    : {
        command: 'npx nx run backend:serve',
        url: `${baseURL}/api`,
        reuseExistingServer: true,
        cwd: path.join(dirname, '..'),
      },

  projects: [
    {
      name: 'api',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
