import { expect, test } from "@playwright/test";

/**
 * Hard-coded regression snapshots for the current H2T flowsheet (empty responses).
 * Update deliberately when the workbook or grouping changes.
 */
const H2T_SECTION_BLOCKS: ReadonlyArray<{
  heading: string;
  initialPrompt: string;
}> = [
  { heading: "Behavioral", initialPrompt: "Behavior WDL" },
  { heading: "Cardiac", initialPrompt: "Cardiac WDL" },
  { heading: "GI", initialPrompt: "GI WDL" },
  { heading: "HEENT", initialPrompt: "HEENT WDL" },
  {
    heading: "NeuroVascular/Musculoskeletal",
    initialPrompt: "NeuroVascular/Musculoskeletal WDL",
  },
  { heading: "Neuro", initialPrompt: "Neuro WDL" },
  { heading: "Respiratory", initialPrompt: "Respiratory WDL" },
  { heading: "Skin", initialPrompt: "Skin WDL" },
  { heading: "Urinary Symptoms", initialPrompt: "Urinary Symptoms WDL" },
] as const;

test.describe("H2T assessment", () => {
  test("sections, rollup rows, and WDL info panels (read-only)", async ({
    page,
  }) => {
    await page.goto("/student/assessments");

    await page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText("Head-to-Toe Assessment (H2T)") })
      .getByRole("button", { name: "Open practice" })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Head-to-Toe Assessment (H2T)",
        level: 1,
      }),
    ).toBeVisible();

    const flowsheetScroll = page
      .locator("div.bg-background.min-w-0.flex-1.overflow-auto")
      .first();
    await expect(flowsheetScroll).toBeVisible();

    const sectionBodies = flowsheetScroll.locator(
      'tbody[id^="flowsheet-section-"]',
    );
    await expect(sectionBodies).toHaveCount(H2T_SECTION_BLOCKS.length);

    for (let i = 0; i < H2T_SECTION_BLOCKS.length; i++) {
      const section = sectionBodies.nth(i);
      const { heading, initialPrompt } = H2T_SECTION_BLOCKS[i]!;
      await section.scrollIntoViewIfNeeded();
      await expect(
        section.getByRole("cell", { name: heading, exact: true }),
      ).toBeVisible();
      await expect(
        section.getByText(initialPrompt, { exact: true }),
      ).toBeVisible();
    }

    const infoButtons = flowsheetScroll.getByRole("button", {
      name: /^View row information for /,
    });
    await expect(infoButtons).toHaveCount(H2T_SECTION_BLOCKS.length);

    const n = await infoButtons.count();
    for (let i = 0; i < n; i++) {
      const btn = infoButtons.nth(i);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();

      await expect(
        page.getByRole("button", { name: "Close info panel" }),
      ).toBeVisible();
      await expect(
        page.getByText("Within Defined Limits (WDL) ="),
      ).toBeVisible();
      await expect(
        page.getByText("WDL = Within defined limits. X = Exceptions to WDL."),
      ).toBeVisible();

      await page.getByRole("button", { name: "Close info panel" }).click();
      await expect(
        page.getByRole("button", { name: "Close info panel" }),
      ).toBeHidden();
    }
  });
});
