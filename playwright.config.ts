import { defineConfig, devices } from "@playwright/test";

const usePreviewServer = process.env.PLAYWRIGHT_SERVER === "preview";
const serverPort = usePreviewServer ? 4173 : 5173;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${serverPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: usePreviewServer
      ? "npm run preview -- --host 127.0.0.1 --port 4173"
      : "npm run dev -- --host 127.0.0.1",
    url: `http://127.0.0.1:${serverPort}`,
    reuseExistingServer: !usePreviewServer,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1536, height: 1024 } },
    },
  ],
});
