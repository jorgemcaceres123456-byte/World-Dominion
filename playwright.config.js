import { defineConfig } from "@playwright/test";
// CI may provide its own installed Chromium. By default use Playwright's bundled browser.
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1366, height: 810 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
