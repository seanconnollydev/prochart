import { expect, test } from "@playwright/test";

test("redirects from root to student assessments", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/student\/assessments\/?(\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: "Practice assessments" }),
  ).toBeVisible();
});
