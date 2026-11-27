import { defineConfig } from '@playwright/test';
const port = process.env.TEST_PORT || '5183';
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, fullyParallel: false,
  use: { baseURL, viewport: { width: 1440, height: 1000 }, browserName: 'chromium',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {} },
  outputDir: 'artifacts/browser', reporter: 'list',
  webServer: { command: 'npm run dev', url: baseURL, env: { PORT: port }, reuseExistingServer: false },
});
