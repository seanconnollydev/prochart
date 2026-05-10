import type { BrowserContext, Page } from "@playwright/test";
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

/** Fixed WDL vs X choices per section gate (matches `H2T_SECTION_BLOCKS` order). */
const H2T_GATE_SELECTION_PLAN = H2T_SECTION_BLOCKS.map((b, i) => ({
  prompt: b.initialPrompt,
  choice: i === 2 ? ("X" as const) : ("WDL" as const),
}));

/** GI is X in `H2T_GATE_SELECTION_PLAN`, so these detail rows are visible in the flowsheet. */
const H2T_GI_PANEL_MULTI_ROW = "Abdomen";
const H2T_GI_PANEL_MULTI_CHOICE = "Distended";

const H2T_COMMENT_GATE_PROMPT = "GI WDL";
const H2T_COMMENT_TEXT = "Head-to-toe practice - e2e verification comment.";

function flowsheetScrollLocator(page: Page) {
  return page
    .locator("div.bg-background.min-w-0.flex-1.overflow-auto")
    .first();
}

async function openH2TPractice(page: Page): Promise<void> {
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
}

test.describe("H2T assessment", () => {
  test("sections, rollup rows, and WDL info panels (read-only)", async ({
    page,
  }) => {
    await openH2TPractice(page);

    const flowsheetScroll = flowsheetScrollLocator(page);
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

  test.describe("selections, persistence, and export", () => {
    test.describe.configure({ mode: "serial" });

    let context: BrowserContext;
    let page: Page;

    test.beforeAll(async ({ browser, baseURL }) => {
      context = await browser.newContext({ baseURL });
      page = await context.newPage();
      await openH2TPractice(page);

      const exportPdf = page.getByRole("button", { name: "Export to PDF" });
      await expect(exportPdf).toBeDisabled();

      for (const { prompt, choice } of H2T_GATE_SELECTION_PLAN) {
        const trigger = page.getByLabel(prompt, { exact: true });
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        await page.getByRole("option", { name: choice, exact: true }).click();
        await expect(trigger).toContainText(choice);
      }

      await expect(exportPdf).toBeEnabled();

      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${H2T_GI_PANEL_MULTI_ROW}`,
        })
        .scrollIntoViewIfNeeded();
      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${H2T_GI_PANEL_MULTI_ROW}`,
        })
        .click();

      const abdomenOptions = page.getByRole("group", {
        name: `Options for ${H2T_GI_PANEL_MULTI_ROW}`,
      });
      await expect(abdomenOptions).toBeVisible();
      const distended = abdomenOptions.getByRole("checkbox", {
        name: H2T_GI_PANEL_MULTI_CHOICE,
        exact: true,
      });
      await distended.check();
      await expect(distended).toBeChecked();

      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${H2T_COMMENT_GATE_PROMPT}`,
        })
        .scrollIntoViewIfNeeded();
      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${H2T_COMMENT_GATE_PROMPT}`,
        })
        .click();

      const giWdlPanel = page
        .locator("aside")
        .filter({ has: page.getByText(H2T_COMMENT_GATE_PROMPT, { exact: true }) });
      await giWdlPanel.getByRole("button", { name: "Add comment" }).click();
      await giWdlPanel.getByLabel(`Comment for ${H2T_COMMENT_GATE_PROMPT}`).fill(
        H2T_COMMENT_TEXT,
      );
      await giWdlPanel.getByRole("button", { name: "Save" }).click();
      await expect(giWdlPanel.getByText(H2T_COMMENT_TEXT)).toBeVisible();

      await page.waitForTimeout(500);
    });

    test.afterAll(async () => {
      await context.close();
    });

    test("reload restores gates, panel selections, and comments", async () => {
      await page.reload();
      await expect(
        page.getByRole("heading", {
          name: "Head-to-Toe Assessment (H2T)",
          level: 1,
        }),
      ).toBeVisible();

      for (const { prompt, choice } of H2T_GATE_SELECTION_PLAN) {
        const trigger = page.getByLabel(prompt, { exact: true });
        await trigger.scrollIntoViewIfNeeded();
        await expect(trigger).toContainText(choice);
      }

      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${H2T_GI_PANEL_MULTI_ROW}`,
        })
        .scrollIntoViewIfNeeded();
      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${H2T_GI_PANEL_MULTI_ROW}`,
        })
        .click();
      await expect(
        page.getByRole("group", {
          name: `Options for ${H2T_GI_PANEL_MULTI_ROW}`,
        }).getByRole("checkbox", {
          name: H2T_GI_PANEL_MULTI_CHOICE,
          exact: true,
        }),
      ).toBeChecked();

      await page.getByRole("button", { name: "Close info panel" }).click();

      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${H2T_COMMENT_GATE_PROMPT}`,
        })
        .scrollIntoViewIfNeeded();
      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${H2T_COMMENT_GATE_PROMPT}`,
        })
        .click();
      await expect(
        page
          .locator("aside")
          .filter({
            has: page.getByText(H2T_COMMENT_GATE_PROMPT, { exact: true }),
          })
          .getByText(H2T_COMMENT_TEXT),
      ).toBeVisible();
    });

    test("Export to PDF is enabled after selections", async () => {
      await expect(
        page.getByRole("button", { name: "Export to PDF" }),
      ).toBeEnabled();
    });
  });
});
