# Prototype Alpha Specification (Authoring + Assessment + Schema)

## Purpose

Prototype Alpha exists to explore the **core concepts** of EHR simulation software for nursing education—without overcommitting to final implementation details, product scope, or long-term standards decisions.

This spec is written to be:
- **Schema-first**: a versioned case study document format that can evolve toward a public/open format.
- **Local-first**: progress is always saved in the browser; syncing is explicit and recoverable.
- **Cost-conscious**: minimize database writes, avoid always-on services, and lean on caching and client-side logic.
- **Next.js-aligned**: prefer **Next.js Server Actions** for backend operations when a durable backend exists.
- **Zero durable backend (current Alpha)**: bundled **practice assessments** ship in the repo (e.g. built-in JSON templates); student progress lives in **browser `localStorage` only**. Published case studies, remote templates, and server-side submission persistence are **deferred**.
- **Navigation**: recommended app shell and Next.js routes are described under **Information architecture** (below).

## Non-goals (Prototype Alpha)

- Supporting real patient data (no PHI). All content is mock/synthetic.
- Full fidelity EHR workflows (orders, billing, interoperability, auditing) beyond what’s needed for the demo journeys below.
- Full FHIR compliance. We will keep the schema **compatible with future alignment** (mapping-friendly) without adopting FHIR as a requirement now.
- Highly granular role-based access control and enterprise auth flows (we can stub or simplify).
- Perfect scoring/rubrics for assessments; the goal is to demonstrate a configurable assessment structure and persistence of student submissions.

## Personas

- **CaseStudyAuthor**: creates and iterates on simulation case studies; wants forms plus assisted generation to move faster.
- **Student**: consumes a case study and completes an assessment; expects autosave, resumability, and clear submission state.

## Prototype Alpha user journeys

### Author journey A: Create a case study (manual)

- Start a new case study draft.
- Fill out a guided series of forms:
  - Patient demographics
  - Past health record summary
  - Encounter/timeline entries (notes, labs, meds, vitals as applicable)
  - Optional attachments/links (no binary upload required for Alpha)
- Save continuously (local-first).
- **Publish / shared case library** (deferred): no remote sync in the current Alpha build.

### Author journey B: Create a case study (prompt-assisted in-form)

- While editing any section, choose “Generate” or “Improve” (prompting).
- Provide a short prompt (and optionally constraints like age range, conditions, unit type).
- The system generates a **structured patch** (field-level suggestions) that the author reviews and applies.
- Generated content is tracked in **provenance metadata** (for transparency and iteration).

### Author journey C: Configure an assessment for a case

- Select a case study (draft or published).
- Create an assessment template:
  - Define sections/domains
  - Define items/criteria (“Within defined limits” checks) and response types
  - Configure constraints (e.g., expected ranges for vitals, or allowed choices)
- Save (local-first); optional publish to a durable backend is deferred.

### Student journey D: Complete a practice assessment

- Open **Practice assessments** (`/student/assessments`) and choose a bundled template (e.g. H2T).
- Fill out the assessment (per item).
- Autosave progress locally; resumable across reloads.
- **Deferred:** case-linked assessments and server-backed “submit” persistence. Current Alpha stores attempts only in **this browser**.

## Information architecture

This section describes **where** author and student experiences live in the UI and **which routes** should own them. It complements **Prototype Alpha user journeys** (behavior) and **Data contracts** (documents). JSON types remain the source of truth; routes are **views** over those documents.

### Principles

- **Persona-first areas**: separate **Author** and **Student** workspaces so navigation and mental models stay clear (see Security and data policy for simplest-possible separation).
- **Deep-linkable artifacts**: case studies, **assessment templates**, and in-progress submissions should be addressable by stable IDs in the URL where it improves recovery and sharing (fits local-first persistence and resumability).
- **Explicit sync surfaces (when a backend exists)**: “Publish” and server-backed “Submit” should remain deliberate actions tied to their artifacts—not only in global chrome. **Current Alpha** has no remote publish or submit.
- **Synthetic-data visibility**: persistent or prominent **mock / synthetic data only** messaging at the app shell level (cross-reference Security and data policy).

### App shell

The root layout is conceptually divided into:

| Region | Role |
| --- | --- |
| **Global notice** | Mock-data disclaimer |
| **Primary nav** | Persona/workspace switch (Author vs Student), home |
| **Main** | Page content; optional **secondary nav** (tabs or sidebar) for multi-section authoring |

Long **case study authoring** flows (journeys A and B) benefit from **section navigation** (tabs or vertical nav) within a single case study editor rather than many top-level routes. Optional sub-routes or a `?step=` query may be used for bookmarking; the editor route remains the primary shell.

### Routes and pages (Next.js App Router)

Implementation should follow the **[Next.js App Router](https://nextjs.org/docs/app)** (`app/` directory): **route groups** (parentheses; no URL segment) may separate author vs student layouts, and **dynamic segments** identify artifacts (e.g. `[caseStudyId]`, `[templateId]`, `[submissionId]`).

**Nomenclature**: Information architecture uses **assessments** for authoring templates, student attempts, and submit. Schema and JSON types use names such as `AssessmentTemplate` and `AssessmentSubmission`; URLs and navigation stay generic so additional assessment formats can be added later.

**Recommended URL structure:**

```mermaid
flowchart TB
  root["/"]
  author["/author"]
  authorCaseStudies["/author/case-studies"]
  authorCase["/author/case-studies/[caseStudyId]"]
  authorAssess["/author/assessments"]
  authorAssessId["/author/assessments/[templateId]"]
  student["/student"]
  studentAssessments["/student/assessments"]
  studentAssessId["/student/assessments/[templateId]"]
  root --> author
  root --> student
  author --> authorCaseStudies
  authorCaseStudies --> authorCase
  author --> authorAssess
  authorAssess --> authorAssessId
  student --> studentAssessments
  studentAssessments --> studentAssessId
```

- **Author (journeys A–C; UI may be partial or deferred in minimal builds)**  
  - `/author`: Author hub (recent drafts, shortcuts).  
  - `/author/case-studies`, `/author/case-studies/[caseStudyId]`: Case study list and editor.  
  - `/author/assessments`, `/author/assessments/[templateId]`: Assessment templates.  
- **Student (current Alpha)**  
  - **`/student/assessments`**: List **bundled practice assessments** (templates committed in-repo).  
  - **`/student/assessments/[templateId]`**: Run an assessment with local autosave only.  
  - **Deferred:** `/student/case-studies` routes (browse published cases, read-only case view, case-scoped assessments) — no durable case catalog in this build.

**Implementation notes**

- Route groups such as `app/(author)/...` and `app/(student)/...` can provide different nested layouts (e.g. author sidebar vs simpler student layout) without changing the URLs above.
- **Server Actions** may load **bundled** read-only assets (e.g. built-in assessment templates). There is **no** database or Supabase in the current Alpha.
- Parallel routes and intercepting routes for modal-heavy flows are **optional** and can be deferred (see Open questions).

### Journey mapping

| Journey | Primary routes | Key actions |
| --- | --- | --- |
| **A** (manual case study) | `/author/case-studies`, `/author/case-studies/[caseStudyId]` | Debounced local autosave; **Publish** |
| **B** (prompt-assisted case study) | Same as A | Structured patch review/apply; provenance; **Publish** |
| **C** (assessment template for a case) | `/author/case-studies` (select case), `/author/assessments`, `/author/assessments/[templateId]` | Local save; **Publish** template |
| **D** (practice assessment) | `/student/assessments`, `/student/assessments/[templateId]` | Local autosave only; no remote submit |

### Future considerations

If draft documents outgrow **localStorage**, the same routes and views apply; only the client storage tier changes (e.g. IndexedDB) per Local-first drafts, sync, and caching.

### What this section does not specify

- **API routes vs Server Actions**: only high-level alignment with Architecture constraints—pages and layouts are the focus here.
- **Full UI design**: not a visual or component-level mock; enough detail to implement routing and shells consistently.

## Architecture constraints (implementation guidance, not mandates)

- **Preferred backend shape (when added later)**: Next.js Server Actions (or API routes) for publish/sync/submit; this Alpha has **no** durable backend.
- **Client-heavy**: editing, validation, and draft autosave run in the browser.
- **Caching**:
  - Client caches documents/templates by `id` + `updatedAt` (or `contentHash`) where applicable.
  - Server-side caching for read-mostly content is irrelevant until a backend exists.
- **Write minimization**:
  - Avoid network writes on every keystroke.
  - When a backend exists, prefer explicit publish/sync events (deferred).

## Data contracts

### Design principles

- **Versioned documents**: each top-level document includes `schemaVersion`.
- **Stable identifiers**: `id` should be a UUID (or similar). IDs must be stable across edits.
- **Extensibility**:
  - Unknown fields must be preserved when round-tripping.
  - Vendor/experimental fields use an `x_` prefix (e.g., `x_generationHints`).
- **Mapping-friendly**: use concepts that can later be mapped to standards (e.g., “Observation-like” entries) without committing to them now.
- **Compatibility rules**:
  - Consumers **must ignore unknown fields**.
  - Producers **must not remove unknown fields** when editing and re-saving a document.
  - Patch operations (manual or generated) should target the smallest reasonable scope to reduce merge conflicts.

### CaseStudyDocument v0.1

#### Summary

`CaseStudyDocument` is the primary portable artifact. It is a single JSON document describing a simulated patient and their relevant health history and scenario timeline.

#### Minimal required fields

- `schemaVersion`: `"caseStudy@0.1"`
- `id`: string
- `title`: string
- `patient`: object (minimal demographics)
- `timeline`: array (can be empty in early drafts)

#### JSON shape (illustrative; not a strict JSON Schema yet)

```json
{
  "schemaVersion": "caseStudy@0.1",
  "id": "case_9f6b7c0d-1f9a-4f8d-9e66-5a2e2a6d1f6b",
  "title": "COPD Exacerbation: ED to Med-Surg",
  "description": "Adult patient presents with shortness of breath; focus on assessment, oxygenation, and documentation.",
  "tags": ["pulmonary", "med-surg", "adult"],
  "createdAt": "2026-03-30T00:00:00.000Z",
  "updatedAt": "2026-03-30T00:00:00.000Z",
  "status": "draft",
  "patient": {
    "displayName": "Avery Jordan",
    "dateOfBirth": "1968-08-12",
    "sexAtBirth": "female",
    "genderIdentity": "female",
    "preferredPronouns": "she/her",
    "race": "White",
    "ethnicity": "Not Hispanic or Latino",
    "language": "English",
    "contact": {
      "phone": "555-0100",
      "email": "avery.jordan@example.test"
    },
    "address": {
      "line1": "100 Main St",
      "city": "Springfield",
      "state": "MA",
      "postalCode": "01101",
      "country": "US"
    },
    "identifiers": {
      "mrn": "MRN-0001234",
      "x_externalIds": []
    }
  },
  "context": {
    "careSetting": "ED",
    "organizationName": "Prototype Hospital",
    "unit": "Emergency Department",
    "x_program": "Nursing"
  },
  "summary": {
    "chiefComplaint": "Shortness of breath",
    "hpi": "Worsening dyspnea over 3 days with increased sputum production.",
    "pmh": ["COPD", "HTN"],
    "psh": [],
    "allergies": ["NKDA"],
    "homeMeds": [
      { "name": "Albuterol inhaler", "sig": "2 puffs q4-6h PRN", "route": "inhaled" }
    ]
  },
  "timeline": [
    {
      "id": "evt_1",
      "type": "encounter",
      "occurredAt": "2026-03-30T12:05:00.000Z",
      "title": "ED Triage",
      "data": {
        "vitals": { "hr": 110, "rr": 26, "spo2": 89, "tempC": 37.1, "bp": "154/92" },
        "note": "Patient anxious, speaking in short phrases."
      }
    },
    {
      "id": "evt_2",
      "type": "lab",
      "occurredAt": "2026-03-30T12:30:00.000Z",
      "title": "ABG",
      "data": { "ph": 7.33, "pco2": 54, "po2": 62, "hco3": 28 }
    }
  ],
  "assessments": {
    "assessmentTemplates": [
      {
        "templateId": "assessment_tpl_3b0d3b2f-2c3c-4a36-9b14-08f8b2a9d3a1",
        "label": "Respiratory assessment",
        "x_defaultForStudents": true
      }
    ]
  },
  "attachments": [
    {
      "id": "att_1",
      "type": "link",
      "title": "CXR report (mock)",
      "url": "https://example.test/cxr-report"
    }
  ],
  "provenance": {
    "authoredBy": { "actorType": "human", "actorId": "author_local_1" },
    "generatedBy": [
      {
        "generatedAt": "2026-03-30T00:10:00.000Z",
        "tool": "chromePromptApi",
        "scope": "summary.hpi",
        "promptSummary": "Generate a realistic HPI for COPD exacerbation; ED setting; include duration and sputum changes.",
        "x_model": "unknown"
      }
    ]
  },
  "x_extensions": {}
}
```

#### Notes on `timeline`

To keep the schema flexible, timeline entries are intentionally “typed envelopes”:
- `type` is a stable discriminator (`encounter`, `note`, `lab`, `medication`, `vitals`, `imaging`, `procedure`, `assessment`, `other`)
- `data` is type-specific and can evolve without breaking the top-level structure

### AssessmentTemplate v0.1

#### Summary

`AssessmentTemplate` defines the structure of an assessment. A template is authored/configured, then used to collect student submissions.

#### Minimal required fields

- `schemaVersion`: `"assessmentTemplate@0.1"`
- `id`: string
- `title`: string
- `items`: array

#### JSON shape (illustrative)

```json
{
  "schemaVersion": "assessmentTemplate@0.1",
  "id": "assessment_tpl_3b0d3b2f-2c3c-4a36-9b14-08f8b2a9d3a1",
  "title": "Respiratory assessment",
  "description": "Student checks key respiratory findings within defined limits.",
  "createdAt": "2026-03-30T00:00:00.000Z",
  "updatedAt": "2026-03-30T00:00:00.000Z",
  "status": "draft",
  "domains": [
    { "id": "dom_resp", "label": "Respiratory" },
    { "id": "dom_vitals", "label": "Vitals" }
  ],
  "items": [
    {
      "id": "itm_rr",
      "domainId": "dom_vitals",
      "prompt": "Respiratory rate is within defined limits",
      "responseType": "boolean",
      "definedLimits": {
        "type": "numericRange",
        "unit": "breaths/min",
        "min": 12,
        "max": 20
      },
      "x_linkedToCaseTimelineTypes": ["encounter", "vitals"]
    },
    {
      "id": "itm_spo2",
      "domainId": "dom_vitals",
      "prompt": "SpO2 is within defined limits for this scenario",
      "responseType": "choice",
      "choices": [
        { "id": "within", "label": "Within limits" },
        { "id": "outside", "label": "Outside limits" },
        { "id": "unknown", "label": "Unable to determine" }
      ],
      "definedLimits": {
        "type": "scenarioDefined",
        "description": "Scenario may define target range depending on oxygen therapy."
      }
    },
    {
      "id": "itm_breath_sounds",
      "domainId": "dom_resp",
      "prompt": "Breath sounds assessment",
      "responseType": "multiChoice",
      "choices": [
        { "id": "clear", "label": "Clear" },
        { "id": "wheezes", "label": "Wheezes" },
        { "id": "crackles", "label": "Crackles" },
        { "id": "diminished", "label": "Diminished" }
      ],
      "definedLimits": { "type": "informational", "description": "Not all findings fall within the defined limits in COPD exacerbation." }
    },
    {
      "id": "itm_notes",
      "domainId": "dom_resp",
      "prompt": "Notes / rationale",
      "responseType": "text",
      "definedLimits": { "type": "none" }
    }
  ],
  "provenance": {
    "authoredBy": { "actorType": "human", "actorId": "author_local_1" }
  },
  "x_extensions": {}
}
```

### AssessmentSubmission v0.1

#### Summary

`AssessmentSubmission` captures a student’s responses to a specific assessment template in the context of a specific case study.

#### Minimal required fields

- `schemaVersion`: `"assessmentSubmission@0.1"`
- `id`: string
- `caseStudyId`: string
- `templateId`: string
- `responses`: object keyed by `itemId`

#### JSON shape (illustrative)

```json
{
  "schemaVersion": "assessmentSubmission@0.1",
  "id": "assessment_sub_5f8b2a1c-1f2d-4fcb-9a43-2c0f0a0b12cd",
  "caseStudyId": "case_9f6b7c0d-1f9a-4f8d-9e66-5a2e2a6d1f6b",
  "templateId": "assessment_tpl_3b0d3b2f-2c3c-4a36-9b14-08f8b2a9d3a1",
  "student": {
    "actorType": "student",
    "actorId": "student_local_1",
    "displayName": "Student One"
  },
  "startedAt": "2026-03-30T13:00:00.000Z",
  "updatedAt": "2026-03-30T13:10:00.000Z",
  "submittedAt": null,
  "status": "in_progress",
  "responses": {
    "itm_rr": { "value": true, "x_observedValue": 26, "x_unit": "breaths/min" },
    "itm_spo2": { "value": "outside", "x_observedValue": 89, "x_unit": "%" },
    "itm_breath_sounds": { "value": ["wheezes", "diminished"] },
    "itm_notes": { "value": "RR elevated and SpO2 low on room air; wheezes present bilaterally." }
  },
  "x_extensions": {}
}
```

## Local-first drafts, sync, and caching (cost-conscious)

### Local persistence requirements

- **Every experience autosaves locally**:
  - Case study authoring drafts
  - Assessment template drafts
  - Student assessment in-progress submissions
- Local save should occur:
  - On any meaningful change (debounced)
  - On navigation/unload best-effort
- Local save format:
  - Store the full document JSON plus minimal metadata (`updatedAt`, `dirty`, `lastSyncedAt`, `syncError`)

### Suggested storage tiers

- **Prototype Alpha default**: `localStorage` for simplicity.
- **Fallback/upgrade path** (if drafts become large): `IndexedDB` with the same logical keys.

### Sync model (deferred — durable backend)

When a shared backend is introduced:

- **Explicit sync events** might include: publish case study, publish assessment template, submit assessment (server-backed).
- **Conflict behavior**: simplest is optimistic concurrency (server rejects stale `updatedAt`); client offers reload and preserves a local draft copy.

### Caching model

- **Client caching**: cache documents keyed by `id`; use `updatedAt` or `contentHash` to avoid unnecessary work.
- **Server caching**: relevant only after a read API or database exists.

## Prompt-assisted authoring (Chrome Prompt API)

### Goals

- Reduce author effort for realistic case content.
- Keep authors in control via review/apply.
- Preserve transparency via provenance metadata.

### Prompting interaction patterns (inside forms)

- **Generate section**: fill an empty section (e.g., HPI, timeline entry draft).
- **Improve section**: rewrite for realism/clarity while retaining key facts.
- **Expand**: add structured timeline items from a summary (“Generate 3 encounters and 2 labs consistent with this scenario”).

### Output contract (what prompting returns)

To avoid overcoupling to any model/vendor, the prompt system should return:
- **Proposed field-level patch** (target path + suggested value)
- Optional: a short rationale
- Optional: citations/assumptions as plain text (non-normative)

Example patch envelope:

```json
{
  "patches": [
    {
      "op": "replace",
      "path": "/summary/hpi",
      "value": "Worsening dyspnea over 3 days with increased sputum production..."
    },
    {
      "op": "add",
      "path": "/timeline/-",
      "value": {
        "id": "evt_generated_1",
        "type": "note",
        "occurredAt": "2026-03-30T12:10:00.000Z",
        "title": "Nursing note",
        "data": { "note": "Patient anxious; accessory muscle use noted." }
      }
    }
  ],
  "provenance": {
    "tool": "chromePromptApi",
    "promptSummary": "Generate realistic ED nursing note for COPD exacerbation",
    "generatedAt": "2026-03-30T00:10:00.000Z"
  }
}
```

### Provenance requirements

- When patches are applied, append an entry to `CaseStudyDocument.provenance.generatedBy` indicating:
  - tool name
  - target scope (best-effort)
  - prompt summary
  - timestamp

## Durable persistence (deferred)

When a database or hosted API exists, expect to store at minimum:

- **Case studies**: full `CaseStudyDocument` JSON plus metadata (`id`, `title`, `updatedAt`, `status`, `tags`).
- **Assessment templates**: full `AssessmentTemplate` JSON plus metadata (or serve from build artifacts only).
- **Assessment submissions**: full `AssessmentSubmission` JSON plus metadata, indexed by `caseStudyId` and `templateId` (and student identity if available).

**Current Alpha:** none of the above are persisted remotely; assessment templates used in practice mode are **bundled files** in the repository.

## Security and data policy

- All data is synthetic; UI should communicate “mock data only.”
- If authentication exists in Alpha, it is sufficient to separate “author” vs “student” experiences in the simplest possible way.
- Avoid storing sensitive prompt inputs that might accidentally include real details; store **prompt summaries** rather than full raw prompts where possible.

## Prototype Alpha acceptance criteria

### Case study schema

- A `CaseStudyDocument v0.1` exists with clear versioning and extension rules.
- The document can represent:
  - Patient demographics
  - A timeline of clinical events
  - Links to assessment templates
- Unknown fields are preserved (round-trip safe).

### Authoring experience

- Author can create/edit a case study via forms.
- Author drafts are autosaved locally and recover after refresh.
- **Deferred:** publish/sync of a case study to a shared backend (no remote store in this Alpha).

### Prompt-assisted authoring

- Author can generate or improve content for at least one section using the Chrome Prompt API.
- Generated content is reviewable and applied as field-level patches.
- Applied generations record provenance.

### Assessment

- Author can create/configure an `AssessmentTemplate` with multiple items and at least two response types.
- Student can complete a **practice** assessment; progress autosaves locally in the browser.
- **Deferred:** server-backed submission or case-linked assessments.

## Open questions (intentionally deferred)

- Next.js parallel routes or intercepting routes for modal-heavy flows (optional; IA defers this).
- Formal JSON Schema publication and validation rules (we’ll keep v0.1 illustrative, then harden later).
- Alignment strategy with FHIR resources (mapping table vs direct embedding).
- Scoring/rubrics, faculty review workflows, and analytics.