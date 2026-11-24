import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Set PW_CHROME to a Chrome binary to use an installed browser instead of Playwright's download.
const chrome = process.env.PW_CHROME ? { launchOptions: { executablePath: process.env.PW_CHROME } } : {};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...chrome } },
    { name: "phone", use: { ...devices["Pixel 7"], ...chrome } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { BITEBOX_SAMPLE_DATA: "1", BITEBOX_AI_MOCK: "1" },
  },
});
