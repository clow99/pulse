import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/public',
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3428', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 320, height: 720 } } },
  ],
});
