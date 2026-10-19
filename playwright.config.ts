import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @study-os/api dev",
      url: "http://127.0.0.1:4000/health",
      reuseExistingServer: !CI,
      timeout: 90_000,
    },
    {
      command: "pnpm --filter @study-os/web dev",
      url: "http://localhost:3000/zh-CN",
      reuseExistingServer: !CI,
      timeout: 150_000,
    },
  ],
});
