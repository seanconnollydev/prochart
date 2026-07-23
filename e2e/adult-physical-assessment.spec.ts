import { readFileSync } from "node:fs";

import { PDFParse } from "pdf-parse";

import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  buildAdultPhysicalAssessmentScenarioOrderedPdfFragments,
  expectPdfContainsOrderedComparableFragments,
} from "./helpers/adult-physical-assessment-export-expectations";

/**
 * Hard-coded regression snapshots for the current adult physical assessment flowsheet (empty responses).
 * Update deliberately when the workbook or grouping changes.
 */
const ADULT_PHYSICAL_ASSESSMENT_SECTION_BLOCKS: ReadonlyArray<{
  heading: string;
  initialPrompt: string;
}> = [
  { heading: "Neuro", initialPrompt: "Neuro WDL" },
  {
    heading: "NeuroVascular/Musculoskeletal",
    initialPrompt: "NeuroVascular/Musculoskeletal WDL",
  },
  { heading: "HEENT", initialPrompt: "HEENT WDL" },
  { heading: "Respiratory", initialPrompt: "Respiratory WDL" },
  { heading: "Cardiac", initialPrompt: "Cardiac WDL" },
  { heading: "GI", initialPrompt: "GI WDL" },
  { heading: "Urinary Symptoms", initialPrompt: "Urinary Symptoms WDL" },
  { heading: "Skin", initialPrompt: "Skin WDL" },
  { heading: "Behavioral", initialPrompt: "Behavior WDL" },
] as const;

/** Fixed WDL vs Exception choices per section gate (matches `ADULT_PHYSICAL_ASSESSMENT_SECTION_BLOCKS` order). */
const ADULT_PHYSICAL_ASSESSMENT_GATE_SELECTION_PLAN =
  ADULT_PHYSICAL_ASSESSMENT_SECTION_BLOCKS.map((b) => ({
    prompt: b.initialPrompt,
    choice:
      b.initialPrompt === "GI WDL" || b.initialPrompt === "Skin WDL"
        ? ("Exception" as const)
        : ("WDL" as const),
  }));

/** GI is Exception in `ADULT_PHYSICAL_ASSESSMENT_GATE_SELECTION_PLAN`, so these detail rows are visible in the flowsheet. */
const ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW = "Abdomen";
const ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_CHOICE = "Distended";

/** Skin location-scoped findings (Skin WDL = Exception in the gate plan). */
const ADULT_PHYSICAL_ASSESSMENT_SKIN_GATE_PROMPT = "Skin WDL";
const ADULT_PHYSICAL_ASSESSMENT_SKIN_LOCATION = "L forearm";
const ADULT_PHYSICAL_ASSESSMENT_SKIN_INTEGRITY_CHOICE = "Bruising";
const ADULT_PHYSICAL_ASSESSMENT_SKIN_COLOR_CHOICE = "Pale";

const ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT = "GI WDL";
const ADULT_PHYSICAL_ASSESSMENT_COMMENT_TEXT =
  "Adult physical assessment practice - e2e verification comment.";

function flowsheetScrollLocator(page: Page) {
  return page.locator("div.bg-background.min-w-0.flex-1.overflow-auto").first();
}

async function openAdultPhysicalAssessmentPractice(page: Page): Promise<void> {
  await page.goto("/student/assessments");

  await page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText("Adult Physical Assessment") })
    .getByRole("button", { name: "Open practice" })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "Adult Physical Assessment",
      level: 1,
    }),
  ).toBeVisible();
}

async function setFlowsheetWdlGate(
  page: Page,
  prompt: string,
  choice: "WDL" | "Exception",
): Promise<void> {
  const trigger = page.getByLabel(prompt, { exact: true });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.getByRole("option", { name: choice, exact: true }).click();
  await expect(trigger).toContainText(choice);
}

function abdomenPanelOptions(page: Page) {
  return page.getByRole("group", {
    name: `Options for ${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`,
  });
}

async function openAbdomenInfoPanel(page: Page): Promise<void> {
  const flowsheetScroll = flowsheetScrollLocator(page);
  await flowsheetScroll
    .getByRole("button", {
      name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`,
    })
    .scrollIntoViewIfNeeded();
  await flowsheetScroll
    .getByRole("button", {
      name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`,
    })
    .click();
}

async function selectSkinLocationAndFindings(page: Page): Promise<void> {
  const locationsCombo = page.getByLabel("Locations", { exact: true });
  await locationsCombo.scrollIntoViewIfNeeded();
  await locationsCombo.click();
  await page
    .getByRole("option", {
      name: ADULT_PHYSICAL_ASSESSMENT_SKIN_LOCATION,
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();

  await expect(
    page.getByText(ADULT_PHYSICAL_ASSESSMENT_SKIN_LOCATION, { exact: true }),
  ).toBeVisible();

  const integrityCombo = page.getByLabel(
    `${ADULT_PHYSICAL_ASSESSMENT_SKIN_LOCATION}: Skin Integrity Exceptions (Minor findings when LDA not needed)`,
  );
  await integrityCombo.scrollIntoViewIfNeeded();
  await integrityCombo.click();
  await page
    .getByRole("option", {
      name: ADULT_PHYSICAL_ASSESSMENT_SKIN_INTEGRITY_CHOICE,
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();

  const colorCombo = page.getByLabel(
    `${ADULT_PHYSICAL_ASSESSMENT_SKIN_LOCATION}: General Skin Color`,
  );
  await colorCombo.scrollIntoViewIfNeeded();
  await colorCombo.click();
  await page
    .getByRole("option", {
      name: ADULT_PHYSICAL_ASSESSMENT_SKIN_COLOR_CHOICE,
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
}

async function openSkinIntegrityInfoPanel(page: Page): Promise<void> {
  const flowsheetScroll = flowsheetScrollLocator(page);
  await flowsheetScroll
    .getByRole("button", {
      name: "View row information for Skin Integrity Exceptions (Minor findings when LDA not needed)",
    })
    .scrollIntoViewIfNeeded();
  await flowsheetScroll
    .getByRole("button", {
      name: "View row information for Skin Integrity Exceptions (Minor findings when LDA not needed)",
    })
    .click();
}

function skinIntegrityPanelOptions(page: Page) {
  return page.getByRole("group", {
    name: "Options for Skin Integrity Exceptions (Minor findings when LDA not needed)",
  });
}

test.describe("Adult Physical Assessment", () => {
  test("sections, rollup rows, and WDL info panels (read-only)", async ({
    page,
  }) => {
    await openAdultPhysicalAssessmentPractice(page);

    const flowsheetScroll = flowsheetScrollLocator(page);
    await expect(flowsheetScroll).toBeVisible();

    const sectionBodies = flowsheetScroll.locator(
      'tbody[id^="flowsheet-section-"]',
    );
    await expect(sectionBodies).toHaveCount(
      ADULT_PHYSICAL_ASSESSMENT_SECTION_BLOCKS.length,
    );

    for (let i = 0; i < ADULT_PHYSICAL_ASSESSMENT_SECTION_BLOCKS.length; i++) {
      const section = sectionBodies.nth(i);
      const { heading, initialPrompt } =
        ADULT_PHYSICAL_ASSESSMENT_SECTION_BLOCKS[i]!;
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
    await expect(infoButtons).toHaveCount(
      ADULT_PHYSICAL_ASSESSMENT_SECTION_BLOCKS.length,
    );

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
        page.getByText("WDL = Within defined limits."),
      ).toBeVisible();

      await page.getByRole("button", { name: "Close info panel" }).click();
      await expect(
        page.getByRole("button", { name: "Close info panel" }),
      ).toBeHidden();
    }
  });

  test("clears Abdomen multiselect when GI gate returns to WDL (side panel)", async ({
    page,
  }) => {
    await openAdultPhysicalAssessmentPractice(page);

    await setFlowsheetWdlGate(
      page,
      ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT,
      "Exception",
    );
    await openAbdomenInfoPanel(page);

    const distended = abdomenPanelOptions(page).getByRole("checkbox", {
      name: ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_CHOICE,
      exact: true,
    });
    await distended.check();
    await expect(distended).toBeChecked();

    await setFlowsheetWdlGate(
      page,
      ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT,
      "WDL",
    );
    await setFlowsheetWdlGate(
      page,
      ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT,
      "Exception",
    );
    await openAbdomenInfoPanel(page);
    await expect(
      abdomenPanelOptions(page).getByRole("checkbox", {
        name: ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_CHOICE,
        exact: true,
      }),
    ).not.toBeChecked();
  });

  test("clears Abdomen multiselect when GI gate returns to WDL (row combobox)", async ({
    page,
  }) => {
    await openAdultPhysicalAssessmentPractice(page);

    await setFlowsheetWdlGate(
      page,
      ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT,
      "Exception",
    );

    /** Empty multiselect uses aria-label `Abdomen`; with one chip it becomes `Abdomen: Distended`. */
    const abdomenCombo = page.getByLabel(
      new RegExp(`^${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`),
    );
    await abdomenCombo.scrollIntoViewIfNeeded();
    await abdomenCombo.click();
    await page
      .getByRole("option", {
        name: ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_CHOICE,
        exact: true,
      })
      .click();
    await expect(abdomenCombo).toHaveAccessibleName(
      new RegExp(ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_CHOICE),
    );

    // Multiselect stays open after selection; close before other clicks.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();

    await setFlowsheetWdlGate(
      page,
      ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT,
      "WDL",
    );
    await setFlowsheetWdlGate(
      page,
      ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT,
      "Exception",
    );

    await openAbdomenInfoPanel(page);
    await expect(
      abdomenPanelOptions(page).getByRole("checkbox", {
        name: ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_CHOICE,
        exact: true,
      }),
    ).not.toBeChecked();
  });

  test("clears Skin location findings when Skin gate returns to WDL", async ({
    page,
  }) => {
    await openAdultPhysicalAssessmentPractice(page);

    await setFlowsheetWdlGate(
      page,
      ADULT_PHYSICAL_ASSESSMENT_SKIN_GATE_PROMPT,
      "Exception",
    );
    await selectSkinLocationAndFindings(page);

    await openSkinIntegrityInfoPanel(page);
    await expect(
      skinIntegrityPanelOptions(page).getByRole("checkbox", {
        name: ADULT_PHYSICAL_ASSESSMENT_SKIN_INTEGRITY_CHOICE,
        exact: true,
      }),
    ).toBeChecked();

    await setFlowsheetWdlGate(
      page,
      ADULT_PHYSICAL_ASSESSMENT_SKIN_GATE_PROMPT,
      "WDL",
    );
    await setFlowsheetWdlGate(
      page,
      ADULT_PHYSICAL_ASSESSMENT_SKIN_GATE_PROMPT,
      "Exception",
    );

    const locationsCombo = page.getByLabel("Locations", { exact: true });
    await expect(locationsCombo).toBeVisible();
    await expect(locationsCombo).toHaveAccessibleName("Locations");
    await expect(
      page.getByRole("cell", {
        name: ADULT_PHYSICAL_ASSESSMENT_SKIN_LOCATION,
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test.describe("selections, persistence, and export", () => {
    test.describe.configure({ mode: "serial" });

    let context: BrowserContext;
    let page: Page;

    test.beforeAll(async ({ browser, baseURL }) => {
      context = await browser.newContext({ baseURL });
      page = await context.newPage();
      await openAdultPhysicalAssessmentPractice(page);

      const exportPdf = page.getByRole("button", { name: "Export to PDF" });
      await expect(exportPdf).toBeDisabled();

      for (const {
        prompt,
        choice,
      } of ADULT_PHYSICAL_ASSESSMENT_GATE_SELECTION_PLAN) {
        const trigger = page.getByLabel(prompt, { exact: true });
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        await page.getByRole("option", { name: choice, exact: true }).click();
        await expect(trigger).toContainText(choice);
      }

      await expect(exportPdf).toBeEnabled();

      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`,
        })
        .scrollIntoViewIfNeeded();
      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`,
        })
        .click();

      const abdomenOptions = page.getByRole("group", {
        name: `Options for ${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`,
      });
      await expect(abdomenOptions).toBeVisible();
      const distended = abdomenOptions.getByRole("checkbox", {
        name: ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_CHOICE,
        exact: true,
      });
      await distended.check();
      await expect(distended).toBeChecked();

      await selectSkinLocationAndFindings(page);

      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT}`,
        })
        .scrollIntoViewIfNeeded();
      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT}`,
        })
        .click();

      const giWdlPanel = page.locator("aside").filter({
        has: page.getByText(ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT, {
          exact: true,
        }),
      });
      await giWdlPanel.getByRole("button", { name: "Add comment" }).click();
      await giWdlPanel
        .getByLabel(
          `Comment for ${ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT}`,
        )
        .fill(ADULT_PHYSICAL_ASSESSMENT_COMMENT_TEXT);
      await giWdlPanel.getByRole("button", { name: "Save" }).click();
      await expect(
        giWdlPanel.getByText(ADULT_PHYSICAL_ASSESSMENT_COMMENT_TEXT),
      ).toBeVisible();

      await page.waitForTimeout(500);
    });

    test.afterAll(async () => {
      await context.close();
    });

    test("reload restores gates, panel selections, and comments", async () => {
      await page.reload();
      await expect(
        page.getByRole("heading", {
          name: "Adult Physical Assessment",
          level: 1,
        }),
      ).toBeVisible();

      for (const {
        prompt,
        choice,
      } of ADULT_PHYSICAL_ASSESSMENT_GATE_SELECTION_PLAN) {
        const trigger = page.getByLabel(prompt, { exact: true });
        await trigger.scrollIntoViewIfNeeded();
        await expect(trigger).toContainText(choice);
      }

      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`,
        })
        .scrollIntoViewIfNeeded();
      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`,
        })
        .click();
      await expect(
        page
          .getByRole("group", {
            name: `Options for ${ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW}`,
          })
          .getByRole("checkbox", {
            name: ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_CHOICE,
            exact: true,
          }),
      ).toBeChecked();

      await page.getByRole("button", { name: "Close info panel" }).click();

      await expect(
        page.getByText(ADULT_PHYSICAL_ASSESSMENT_SKIN_LOCATION, {
          exact: true,
        }),
      ).toBeVisible();
      await openSkinIntegrityInfoPanel(page);
      await expect(
        skinIntegrityPanelOptions(page).getByRole("checkbox", {
          name: ADULT_PHYSICAL_ASSESSMENT_SKIN_INTEGRITY_CHOICE,
          exact: true,
        }),
      ).toBeChecked();

      await page.getByRole("button", { name: "Close info panel" }).click();

      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT}`,
        })
        .scrollIntoViewIfNeeded();
      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT}`,
        })
        .click();
      await expect(
        page
          .locator("aside")
          .filter({
            has: page.getByText(ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT, {
              exact: true,
            }),
          })
          .getByText(ADULT_PHYSICAL_ASSESSMENT_COMMENT_TEXT),
      ).toBeVisible();
    });

    test("exported PDF reflects gate selections, panel choices, and comments", async ({}, testInfo) => {
      const exportBtn = page.getByRole("button", { name: "Export to PDF" });
      await expect(exportBtn).toBeEnabled();

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        exportBtn.click(),
      ]);

      const pdfPath = testInfo.outputPath(
        "adult-physical-assessment-export.pdf",
      );
      await download.saveAs(pdfPath);

      const parser = new PDFParse({ data: readFileSync(pdfPath) });
      let text = "";
      try {
        ({ text } = await parser.getText());
      } finally {
        await parser.destroy();
      }

      const fragments = buildAdultPhysicalAssessmentScenarioOrderedPdfFragments(
        {
          gateSelectionPlan: ADULT_PHYSICAL_ASSESSMENT_GATE_SELECTION_PLAN,
          commentGatePrompt: ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT,
          commentText: ADULT_PHYSICAL_ASSESSMENT_COMMENT_TEXT,
          multiRowPrompt: ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_ROW,
          multiChoiceLabel: ADULT_PHYSICAL_ASSESSMENT_GI_PANEL_MULTI_CHOICE,
          skinLocationLabel: ADULT_PHYSICAL_ASSESSMENT_SKIN_LOCATION,
          skinIntegrityChoiceLabel:
            ADULT_PHYSICAL_ASSESSMENT_SKIN_INTEGRITY_CHOICE,
          skinColorChoiceLabel: ADULT_PHYSICAL_ASSESSMENT_SKIN_COLOR_CHOICE,
        },
      );

      expectPdfContainsOrderedComparableFragments(text, fragments);
    });

    test("Reset clears all selections", async () => {
      await page.getByRole("button", { name: "Reset" }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Reset" })
        .click();

      const gatePlaceholder = "Select…";
      for (const { prompt } of ADULT_PHYSICAL_ASSESSMENT_GATE_SELECTION_PLAN) {
        const trigger = page.getByLabel(prompt, { exact: true });
        await trigger.scrollIntoViewIfNeeded();
        await expect(trigger).toHaveText(gatePlaceholder);
      }

      await expect(
        page.getByRole("button", { name: "Export to PDF" }),
      ).toBeDisabled();
      await expect(page.getByRole("button", { name: "Reset" })).toBeDisabled();

      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT}`,
        })
        .scrollIntoViewIfNeeded();
      await flowsheetScrollLocator(page)
        .getByRole("button", {
          name: `View row information for ${ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT}`,
        })
        .click();

      const giCommentPanel = page.locator("aside").filter({
        has: page.getByText(ADULT_PHYSICAL_ASSESSMENT_COMMENT_GATE_PROMPT, {
          exact: true,
        }),
      });
      await expect(
        giCommentPanel.getByText(ADULT_PHYSICAL_ASSESSMENT_COMMENT_TEXT, {
          exact: true,
        }),
      ).not.toBeVisible();
    });
  });
});
