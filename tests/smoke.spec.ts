import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";

test("loads the SQLite word database and generates sets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Generator" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Filtered pool size")).toBeVisible();
  await expect(page.locator(".metric").filter({ hasText: "Quality mode" })).toContainText("Balanced");
  await expect(page.getByRole("switch", { name: "Common / useful words" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: "Balanced" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Noun", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Export", exact: true })).toBeDisabled();
  await expect(page.locator(".metric").filter({ hasText: "Filtered pool size" })).toContainText(
    /\d{1,3}(,\d{3})*/,
  );
  await expect(page.getByText("Version 1.0.0")).toBeVisible();

  const hauntedPreset = page.getByRole("button", { name: "Haunted House" });
  await hauntedPreset.click();
  await expect(hauntedPreset).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Evocative", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Haunted House · Evocative")).toBeVisible();
  await page.getByPlaceholder("e.g. sunken city, cozy village").fill("");

  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByRole("heading", { name: "Set 1" })).toBeVisible();
  await expect(page.locator(".word-tile")).toHaveCount(36);

  const setsDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const setsDownload = await setsDownloadPromise;
  expect(setsDownload.suggestedFilename()).toMatch(/^random-word-sets-\d{4}-\d{2}-\d{2}\.json$/);

  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page.getByText("Saved Random Set 1")).toBeVisible();

  await page.getByRole("button", { name: "Saved Sets" }).click();
  await expect(page.getByRole("heading", { name: "Saved sets" })).toBeVisible();
  await expect(page.getByText("Random Set 1")).toBeVisible();

  await page.getByRole("button", { name: "Collections" }).click();
  await page.getByPlaceholder("New collection name").fill("Story prompts");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Story prompts" })).toBeVisible();

  await page.getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("Collection name").fill("Campaign prompts");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Campaign prompts" })).toBeVisible();

  await page.getByRole("button", { name: "Saved Sets" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export library" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("random-words-library.json");
  const importPath = "test-results/random-words-library.json";
  await download.saveAs(importPath);

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Clear saved workspace data" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "No saved sets yet" })).toBeVisible();
  await page.getByLabel("Import saved library").setInputFiles(importPath);
  await expect(page.getByText("Random Set 1")).toBeVisible();
  await expect(page.getByLabel("Collection")).toContainText("Campaign prompts");
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("heading", { name: "Set 1" })).toBeVisible();

  await page.getByRole("button", { name: "Help" }).click();
  await expect(page.getByRole("dialog", { name: "Help" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Help" })).toBeHidden();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Manual" }).click();
  await expect(page.getByRole("heading", { name: "User manual", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quick Start" })).toBeVisible();
  await expect(page.getByText("Quality mode controls how strongly")).toBeVisible();

  await page.getByRole("button", { name: "Diagnostics" }).click();
  await expect(page.getByRole("button", { name: "Diagnostics", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Diagnostics" })).toBeVisible();
  await expect(page.locator(".metric-card").filter({ hasText: "Generated words" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "POS Basis" })).toBeVisible();
  await expect(page.getByText("12 of 12 rows")).toBeVisible();
  const diagnosticsDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export diagnostics" }).click();
  const diagnosticsDownload = await diagnosticsDownloadPromise;
  expect(diagnosticsDownload.suggestedFilename()).toMatch(/^random-words-diagnostics-\d{4}-\d{2}-\d{2}\.csv$/);
  const diagnosticsPath = "test-results/random-words-diagnostics.csv";
  await diagnosticsDownload.saveAs(diagnosticsPath);
  const diagnosticsCsv = readFileSync(diagnosticsPath, "utf8");
  expect(diagnosticsCsv).toContain("exported_at,row_filter,query,set,position,word");
  expect(diagnosticsCsv).toContain('"all"');
  await page.getByLabel("Filter diagnostics rows").fill("zzzzunlikely");
  await expect(page.getByText("No diagnostics rows match")).toBeVisible();
  await page.getByLabel("Filter diagnostics rows").fill("");
  await page.getByRole("button", { name: "Fallback" }).click();
  await expect(page.getByRole("button", { name: "Fallback" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/of 12 rows/)).toBeVisible();
});

test("prefers the compressed SQLite artifact", async ({ page }) => {
  let compressedRequests = 0;
  let rawRequests = 0;
  await page.route("**/data/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/data/words.sqlite.gz")) compressedRequests += 1;
    if (url.endsWith("/data/words.sqlite")) rawRequests += 1;
    await route.continue();
  });

  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });
  expect(compressedRequests).toBeGreaterThan(0);
  expect(rawRequests).toBe(0);
});

test("falls back to raw SQLite when the compressed artifact is unavailable", async ({ page }) => {
  let rawRequests = 0;
  await page.route("**/data/words.sqlite.gz", async (route) => {
    await route.fulfill({ status: 404, body: "missing compressed database" });
  });
  await page.route("**/data/words.sqlite", async (route) => {
    rawRequests += 1;
    await route.continue();
  });

  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.locator(".word-tile")).toHaveCount(36);
  expect(rawRequests).toBeGreaterThan(0);
});

test("normalizes older persisted filter state", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "random-words:filters:v1",
      JSON.stringify({
        wordsPerSet: 2,
        setCount: 1,
        minLength: 4,
        maxLength: 8,
        includeRare: false,
        qualityMode: "balanced",
        selectedPos: ["noun"],
        dialect: "us",
      }),
    );
  });

  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.locator(".word-tile")).toHaveCount(2);
});

test("keeps seeds hidden by default and deterministic when enabled", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Randomness")).toContainText("Fresh each click");
  await expect(page.getByLabel("Seed value")).toBeHidden();

  await page.getByRole("switch", { name: "Reproducible seed mode" }).click();
  await expect(page.getByText("Randomness")).toContainText("Seeded");
  await page.getByLabel("Seed value").fill("123456");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const firstWords = await page.locator(".word-tile > strong").allTextContents();

  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.locator(".word-tile")).toHaveCount(36);
  await expect.poll(async () => page.locator(".word-tile > strong").allTextContents()).toEqual(firstWords);
});

test("can select and persist a UI theme", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("UI theme")).toHaveValue("system");

  await page.getByLabel("UI theme").selectOption("solar-dark");
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "solar-dark");
  await expect(page.getByText("Solar Dark is pinned for this browser.")).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "solar-dark");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("UI theme")).toHaveValue("solar-dark");
});

test("applies POS filters and exposes acronym filtering", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("No acronyms / initialisms")).toBeVisible();
  await expect(page.getByRole("button", { name: "Concrete objects", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actions & motion", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sensory", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Broad theme", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Story worlds" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Speculative" })).toBeVisible();
  await page.getByRole("button", { name: "Underworld Journey" }).click();
  await expect(page.getByRole("button", { name: "Mood / tone", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("switch", { name: "Include phrases" })).toHaveAttribute("aria-checked", "true");
  await page.getByPlaceholder("e.g. sunken city, cozy village").fill("");

  await page.getByRole("button", { name: "Noun", exact: true }).click();
  await expect(page.getByRole("button", { name: "Noun", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Adjective", exact: true }).click();
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.locator(".word-tile")).toHaveCount(36);
  const posLabels = await page.locator(".word-tile .pos").allTextContents();
  expect(posLabels.every((label) => ["N", "V", "Adj"].includes(label))).toBe(true);
});

test("can show word metadata details on generated tiles", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("switch", { name: "Show word details" })).toHaveAttribute("aria-checked", "false");
  await page.getByRole("switch", { name: "Show word details" }).click();
  await expect(page.getByRole("switch", { name: "Show word details" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.locator(".word-tile")).toHaveCount(36);
  await expect(page.locator(".word-details").first()).toBeVisible();
  await expect(page.locator(".word-details").first()).toContainText(/Curated|Morphology|Suffix|Default|Datamuse/);
});

test("shows semantic pool provenance for themed generation", async ({ page }) => {
  await page.route("https://api.datamuse.com/words?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("md") === "d") {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({
      json: [
        { word: "ocean", score: 60000, tags: ["n"] },
        { word: "reef", score: 42000, tags: ["n"] },
        { word: "pelagic", score: 12000, tags: ["adj"] },
      ],
    });
  });

  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder("e.g. sunken city, cozy village").fill("ocean");
  await page.getByRole("button", { name: "Strict category", exact: true }).click();
  await page.getByRole("button", { name: "Generate", exact: true }).click();

  await expect(page.locator(".metric").filter({ hasText: "Semantic matches" })).toContainText("3");
  await expect(page.locator(".metric").filter({ hasText: "Local semantic data" })).toContainText(/local/);
  await expect(page.locator(".metric").filter({ hasText: "Themed output" })).toBeVisible();
  await expect(page.locator(".definition-tooltip").first()).toContainText("No definition");
});

test("keeps primary workflows usable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });

  await expect(page.getByRole("button", { name: "Generator" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saved Sets" })).toBeVisible();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.locator(".word-tile")).toHaveCount(36);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(horizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "Diagnostics" }).click();
  await expect(page.getByRole("heading", { name: "Diagnostics" })).toBeVisible();
  await expect(page.getByLabel("Filter diagnostics rows")).toBeVisible();
});

test("uses alternate POS entries when filtering generated words", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Verb", exact: true }).click();
  await page.getByRole("button", { name: "Adjective", exact: true }).click();
  await page.getByPlaceholder("e.g. dr").fill("painting");
  await page.getByPlaceholder("e.g. ing").fill("painting");
  await page.getByRole("button", { name: "Generate", exact: true }).click();

  await expect(page.locator(".word-tile")).toHaveCount(1);
  await expect(page.getByText("Generated output is smaller than requested")).toBeVisible();
  await expect(page.locator(".word-tile > strong")).toHaveText("painting");
  await expect(page.locator(".word-tile .pos")).toHaveText("V");

  await page.getByRole("button", { name: "Diagnostics" }).click();
  await expect(page.getByLabel("Diagnostics warnings")).toContainText("Generated output is smaller than requested");
});

test("applies advanced pattern, syllable, and duplicate controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("Minimum word length").fill("6");
  await page.getByLabel("Maximum word length").last().fill("8");
  await page.getByLabel("Word pattern").fill("c*e");
  await page.getByLabel("Minimum syllables").fill("2");
  await page.getByLabel("Maximum syllables").last().fill("2");
  await expect(page.getByRole("button", { name: "Unique families" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Unique words" }).click();
  await expect(page.getByRole("button", { name: "Unique words" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Generate", exact: true }).click();

  const words = await page.locator(".word-tile > strong").allTextContents();
  expect(words.length).toBeGreaterThan(0);
  expect(words.every((word) => /^c.*e$/.test(word))).toBe(true);
});

test("classifies common inflected verb forms as verbs", async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync("public/data/words.sqlite"));
  const verbForms = new Map([
    ["hugged", "hug"],
    ["hugging", "hug"],
    ["played", "play"],
    ["playing", "play"],
    ["walked", "walk"],
    ["walking", "walk"],
    ["moved", "move"],
    ["moving", "move"],
    ["created", "create"],
    ["creating", "create"],
  ]);

  for (const [word, baseForm] of verbForms) {
    const result = db.exec("SELECT pos, base_form, pos_source, pos_confidence FROM words WHERE word = ?", [word]);
    expect(result[0]?.values[0], `${word} POS metadata`).toEqual(["verb", baseForm, "morphology", 80]);
  }

  db.close();
});

test("applies curated POS overrides for high-impact common words", async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync("public/data/words.sqlite"));
  const expected = new Map([
    ["ability", "noun"],
    ["boring", "adjective"],
    ["family", "noun"],
    ["explore", "verb"],
    ["excited", "adjective"],
    ["discover", "verb"],
    ["gentle", "adjective"],
    ["golden", "adjective"],
    ["glowing", "adjective"],
    ["interesting", "adjective"],
    ["lively", "adjective"],
    ["solve", "verb"],
    ["tired", "adjective"],
    ["transform", "verb"],
    ["wander", "verb"],
    ["whisper", "verb"],
  ]);

  for (const [word, pos] of expected) {
    const result = db.exec("SELECT pos, pos_source, pos_confidence FROM words WHERE word = ?", [word]);
    expect(result[0]?.values[0], `${word} curated POS`).toEqual([pos, "override", 100]);
  }

  db.close();
});

test("stores alternate POS metadata for ambiguous words", async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync("public/data/words.sqlite"));
  const expected = new Map([
    ["painting", "|noun|"],
    ["light", "|noun|verb|"],
    ["set", "|adjective|noun|"],
    ["run", "|noun|"],
    ["boring", "|verb|"],
    ["excited", "|verb|"],
    ["glowing", "|verb|"],
    ["interesting", "|verb|"],
    ["tired", "|verb|"],
  ]);

  for (const [word, alternatePos] of expected) {
    const result = db.exec("SELECT alternate_pos FROM words WHERE word = ?", [word]);
    expect(result[0]?.values[0]?.[0], `${word} alternate POS`).toBe(alternatePos);
  }

  db.close();
});

test("round-trips criteria through a share URL", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Clockwork City" }).click();
  await page.getByRole("button", { name: "Evocative", exact: true }).click();
  await page.getByRole("button", { name: "More surprising" }).click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page).toHaveURL(/criteria=/);
  await expect(page.getByText(/criteria link/i)).toBeVisible();
  const sharedUrl = page.url();

  await page.evaluate(() => localStorage.clear());
  await page.goto(sharedUrl);

  await expect(page.getByPlaceholder("e.g. sunken city, cozy village")).toHaveValue("clockwork city");
  await expect(page.getByRole("button", { name: "Evocative", exact: true })).toHaveClass(/active/);
  await expect(page.getByRole("button", { name: "More surprising" })).toHaveClass(/active/);
  await expect(page.getByText(/Loaded shared criteria: 3 sets, 12 words each, theme "clockwork city", Evocative, More surprising/)).toBeVisible();
});

test("reports malformed shared criteria links", async ({ page }) => {
  await page.goto("/?criteria=not-valid-base64");
  await expect(page.getByText("Could not load shared criteria")).toBeVisible();
  await expect(page.getByPlaceholder("e.g. sunken city, cozy village")).toHaveValue("");
});
