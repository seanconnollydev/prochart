import { expect, test } from "@playwright/test";

test("redirects from root to student hub", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/student\/?(\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: "Choose a practice mode" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Assessments" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Simulations" }),
  ).toBeVisible();
});
