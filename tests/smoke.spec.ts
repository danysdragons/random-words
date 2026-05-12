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
  await expect(page.locator(".word-tile .pos")).toHaveText(Array(36).fill("V"));
});

test("classifies common inflected verb forms as verbs", async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync("public/data/words.sqlite"));
  const verbForms = [
    "hugged",
    "hugging",
    "played",
    "playing",
    "walked",
    "walking",
    "moved",
    "moving",
    "created",
    "creating",
  ];

  for (const word of verbForms) {
    const result = db.exec("SELECT pos FROM words WHERE word = ?", [word]);
    expect(result[0]?.values[0]?.[0], `${word} POS`).toBe("verb");
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
