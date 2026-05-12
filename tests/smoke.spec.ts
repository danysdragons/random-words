import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";

test("loads the SQLite word database and generates sets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Filtered pool size")).toBeVisible();
  await expect(page.locator(".metric").filter({ hasText: "Quality mode" })).toContainText("Balanced");
  await expect(page.locator(".metric").filter({ hasText: "Filtered pool size" })).toContainText(
    /\d{1,3}(,\d{3})*/,
  );

  const hauntedPreset = page.getByRole("button", { name: "Haunted House" });
  await hauntedPreset.click();
  await expect(hauntedPreset).toHaveAttribute("aria-pressed", "true");
  await page.getByPlaceholder("e.g. sunken city, cozy village").fill("");

  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByRole("heading", { name: "Set 1" })).toBeVisible();
  await expect(page.locator(".word-tile")).toHaveCount(36);

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

  await page.getByRole("button", { name: "Help" }).click();
  await expect(page.getByRole("dialog", { name: "Help" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Manual" }).click();
  await expect(page.getByRole("heading", { name: "User manual", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quick Start" })).toBeVisible();
  await expect(page.getByText("Quality mode controls how strongly")).toBeVisible();

  await page.getByRole("button", { name: "Diagnostics" }).click();
  await expect(page.getByRole("heading", { name: "Diagnostics" })).toBeVisible();
  await expect(page.locator(".metric-card").filter({ hasText: "Generated words" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "POS Basis" })).toBeVisible();
  await expect(page.getByText("36 of 36 rows")).toBeVisible();
  await page.getByLabel("Filter diagnostics rows").fill("zzzzunlikely");
  await expect(page.getByText("No diagnostics rows match")).toBeVisible();
  await page.getByLabel("Filter diagnostics rows").fill("");
  await page.getByRole("button", { name: "Fallback" }).click();
  await expect(page.getByText(/of 36 rows/)).toBeVisible();
});

test("applies POS filters and exposes acronym filtering", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("No acronyms / initialisms")).toBeVisible();
  await expect(page.getByRole("button", { name: "Concrete objects" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actions & motion" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sensory" })).toBeVisible();

  await page.getByRole("button", { name: "Noun", exact: true }).click();
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
  await page.locator(".toggle-row").filter({ hasText: "Show word details" }).getByRole("button").click();
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
  await page.getByRole("button", { name: "Generate", exact: true }).click();

  await expect(page.locator(".metric").filter({ hasText: "Semantic matches" })).toContainText("3");
  await expect(page.locator(".metric").filter({ hasText: "Local semantic data" })).toContainText(/local/);
  await expect(page.locator(".metric").filter({ hasText: "Themed output" })).toBeVisible();
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
  await expect(page.locator(".word-tile strong")).toHaveText("painting");
  await expect(page.locator(".word-tile .pos")).toHaveText("V");
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
    ["family", "noun"],
    ["explore", "verb"],
    ["discover", "verb"],
    ["gentle", "adjective"],
    ["golden", "adjective"],
    ["lively", "adjective"],
    ["solve", "verb"],
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
    ["boring", "|adjective|"],
    ["excited", "|adjective|"],
    ["glowing", "|adjective|"],
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
  await page.getByRole("button", { name: "Evocative" }).click();
  await page.getByRole("button", { name: "More surprising" }).click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page).toHaveURL(/criteria=/);
  const sharedUrl = page.url();

  await page.evaluate(() => localStorage.clear());
  await page.goto(sharedUrl);

  await expect(page.getByPlaceholder("e.g. sunken city, cozy village")).toHaveValue("clockwork city");
  await expect(page.getByRole("button", { name: "Evocative" })).toHaveClass(/active/);
  await expect(page.getByRole("button", { name: "More surprising" })).toHaveClass(/active/);
  await expect(page.getByText("Loaded shared criteria")).toBeVisible();
});
