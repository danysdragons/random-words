import { expect, test } from "@playwright/test";

test("loads the SQLite word database and generates sets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("170,575 normalized entries")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Filtered pool size")).toBeVisible();
  await expect(page.locator(".metric").filter({ hasText: "Filtered pool size" })).toContainText(
    /\d{1,3}(,\d{3})*/,
  );

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
});
