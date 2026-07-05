export const SIMULATION_TEMPLATE_SCHEMA_VERSION = "simulationTemplate@0.1" as const;

export type SimulationTemplateStatus = "draft" | "published";

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export type SimulationMeta = {
  skillFocus?: string;
  discipline?: string;
  /** Numeric or descriptive level label (e.g. 4 or "Advanced"). */
  level?: string | number;
  estimatedTimeMinutes?: number;
  debriefingTimeMinutes?: number;
};

// ---------------------------------------------------------------------------
// Learning objectives & curriculum mapping
// ---------------------------------------------------------------------------

export type SimulationLearningObjective = {
  id: string;
  text: string;
};

export type SimulationCurriculumCategory = {
  id: string;
  /** e.g. "WTCS Nursing Program Outcomes", "Basic Skills", "Nursing Fundamentals" */
  category: string;
  outcomes: string[];
};

// ---------------------------------------------------------------------------
// Patient
// ---------------------------------------------------------------------------

export type SimulationPatient = {
  displayName?: string;
  dateOfBirth?: string;
  /** Numeric age at time of simulation. */
  age?: number;
  mrn?: string;
  gender?: string;
  height?: string;
  weight?: string;
  codeStatus?: string;
  primaryLanguage?: string;
  allergies?: string[];
  /** Current home medications prior to admission. */
  currentMedications?: string[];
  admittingDiagnoses?: string[];
  medicalHistory?: string[];
};

// ---------------------------------------------------------------------------
// Setup / learning environment
// ---------------------------------------------------------------------------

export type SimulationMonitorSettings = {
  /** Initial vital sign values displayed on the monitor. */
  initialVitals?: Record<string, string>;
  /** Free-text notes about monitor configuration (e.g. "2 PVCs/minute initially"). */
  notes?: string[];
};

export type SimulationSetup = {
  /** Items present inside the patient room. */
  insideRoom?: string[];
  /** Items staged outside the patient room. */
  outsideRoom?: string[];
  /** Initial physical setup applied to the patient manikin / actor. */
  patientSetup?: string[];
  monitorSettings?: SimulationMonitorSettings;
  supplies?: {
    general?: string[];
    medications?: string[];
  };
};

// ---------------------------------------------------------------------------
// History & Physical
// ---------------------------------------------------------------------------

export type SimulationSystemEntry = {
  /** Clinical system label (e.g. "Respiratory", "Cardiovascular"). */
  system: string;
  findings: string;
};

export type SimulationHistoryAndPhysical = {
  /** Name as it appears on the chart (may differ from simulation patient displayName). */
  displayName?: string;
  mrn?: string;
  dateOfBirth?: string;
  chiefComplaint?: string;
  hpi?: string;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  recentHospitalizations?: string;
  medications?: string[];
  allergies?: string[];
  familyHistory?: string;
  reviewOfSystems?: SimulationSystemEntry[];
  /** Vital signs recorded at the time of the physical exam. */
  examVitals?: Record<string, string>;
  physicalExam?: SimulationSystemEntry[];
  assessmentAndPlan?: string;
  signedBy?: string;
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type SimulationOrderCategory =
  | "activity"
  | "monitoring"
  | "ivFluids"
  | "medication"
  | "diagnostic"
  | "diet"
  | "nursing"
  | "other";

export type SimulationOrder = {
  id: string;
  category: SimulationOrderCategory;
  text: string;
  /** Additional clinical detail, instructions, or dosing calculations. */
  details?: string;
};

// ---------------------------------------------------------------------------
// MAR (Medication Administration Record)
// ---------------------------------------------------------------------------

export type SimulationMAREntry = {
  id: string;
  medication: string;
  dose?: string;
  route?: string;
  frequency?: string;
  /** Clock times at which the medication is scheduled (e.g. ["0800", "2000"]). */
  scheduledTimes?: string[];
  prn?: boolean;
  prnIndication?: string;
  instructions?: string;
};

// ---------------------------------------------------------------------------
// Labs & Diagnostics
// ---------------------------------------------------------------------------

export type SimulationLabResult = {
  id: string;
  name: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: "H" | "L" | "critical";
};

export type SimulationLabPanel = {
  id: string;
  name: string;
  orderedAt?: string;
  resultedAt?: string;
  results: SimulationLabResult[];
};

// ---------------------------------------------------------------------------
// Imaging
// ---------------------------------------------------------------------------

export type SimulationImagingResult = {
  id: string;
  /** e.g. "Chest X-Ray", "CT Angiography" */
  modality: string;
  title?: string;
  findings?: string;
  impression?: string;
  imageUrl?: string;
  orderedAt?: string;
  reportedAt?: string;
};

// ---------------------------------------------------------------------------
// ECG
// ---------------------------------------------------------------------------

export type SimulationECGResult = {
  id: string;
  title?: string;
  interpretation?: string;
  imageUrl?: string;
  obtainedAt?: string;
  awaitingInterpretation?: boolean;
};

// ---------------------------------------------------------------------------
// Progress Notes
// ---------------------------------------------------------------------------

export type SimulationProgressNote = {
  id: string;
  noteType?: string;
  author?: string;
  authorRole?: string;
  occurredAt?: string;
  content?: string;
};

// ---------------------------------------------------------------------------
// Scenario states
// ---------------------------------------------------------------------------

export type SimulationTechnicianPrompt = {
  id: string;
  /**
   * What triggers this response — e.g. "initial", "on ask about pain",
   * "after O2 increased". Omit for general standing prompts.
   */
  trigger?: string;
  response: string;
};

export type SimulationTabContentChange = {
  /** The name of the tablet/EHR tab that changes (e.g. "Vitals", "ECG", "Level Up"). */
  tab: string;
  /** Condition under which this content is shown (e.g. "before Patient ID scan"). */
  condition?: string;
  content: string;
};

export type SimulationLevelUpTrigger = {
  id: string;
  /** Human-readable description of what causes the level-up (e.g. "QR Code: Morphine IV scanned"). */
  condition: string;
  /** ID of the state this trigger advances the scenario to. */
  advancesToStateId?: string;
};

export type SimulationState = {
  id: string;
  stateNumber: number;
  title: string;
  patientOverview?: string;
  expectedStudentBehaviors?: string[];
  technicianPrompts?: SimulationTechnicianPrompt[];
  facilitatorQuestions?: string[];
  tabContentChanges?: SimulationTabContentChange[];
  levelUpTriggers?: SimulationLevelUpTrigger[];
};

// ---------------------------------------------------------------------------
// Debrief
// ---------------------------------------------------------------------------

export type SimulationDebriefQuestion = {
  id: string;
  text: string;
  subQuestions?: string[];
  /** ID of a SimulationLearningObjective this question maps back to. */
  linkedObjectiveId?: string;
};

export type SimulationDebrief = {
  questions?: SimulationDebriefQuestion[];
  /** Free-text notes for the facilitator (e.g. debriefing methodology references). */
  facilitatorNotes?: string;
};

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

export type SimulationTemplate = {
  schemaVersion: typeof SIMULATION_TEMPLATE_SCHEMA_VERSION;
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: SimulationTemplateStatus;
  meta?: SimulationMeta;
  learningObjectives?: SimulationLearningObjective[];
  curriculumMapping?: SimulationCurriculumCategory[];
  patient: SimulationPatient;
  setup?: SimulationSetup;
  historyAndPhysical?: SimulationHistoryAndPhysical;
  orders?: SimulationOrder[];
  mar?: SimulationMAREntry[];
  labPanels?: SimulationLabPanel[];
  imagingResults?: SimulationImagingResult[];
  ecgResults?: SimulationECGResult[];
  progressNotes?: SimulationProgressNote[];
  /** Ordered list of scenario states; the first entry is the initial state. */
  states: SimulationState[];
  debrief?: SimulationDebrief;
  licenseNotice?: string;
};

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSimulationState(v: unknown): v is SimulationState {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.stateNumber === "number" &&
    typeof v.title === "string"
  );
}

/**
 * Returns a valid template or null (e.g. corrupt or wrong schema). No migration of legacy shapes.
 */
export function tryNormalizeSimulationTemplate(
  raw: unknown,
): SimulationTemplate | null {
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== SIMULATION_TEMPLATE_SCHEMA_VERSION) return null;
  if (
    typeof raw.id !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.createdAt !== "string" ||
    typeof raw.updatedAt !== "string" ||
    (raw.status !== "draft" && raw.status !== "published")
  ) {
    return null;
  }
  if (!isRecord(raw.patient)) return null;
  if (!Array.isArray(raw.states) || !raw.states.every(isSimulationState)) {
    return null;
  }

  const template: SimulationTemplate = {
    schemaVersion: SIMULATION_TEMPLATE_SCHEMA_VERSION,
    id: raw.id,
    title: raw.title,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    status: raw.status,
    patient: raw.patient as SimulationPatient,
    states: raw.states as SimulationState[],
  };

  if (typeof raw.description === "string") template.description = raw.description;
  if (isRecord(raw.meta)) template.meta = raw.meta as SimulationMeta;
  if (Array.isArray(raw.learningObjectives))
    template.learningObjectives = raw.learningObjectives as SimulationLearningObjective[];
  if (Array.isArray(raw.curriculumMapping))
    template.curriculumMapping = raw.curriculumMapping as SimulationCurriculumCategory[];
  if (isRecord(raw.setup)) template.setup = raw.setup as SimulationSetup;
  if (isRecord(raw.historyAndPhysical))
    template.historyAndPhysical = raw.historyAndPhysical as SimulationHistoryAndPhysical;
  if (Array.isArray(raw.orders)) template.orders = raw.orders as SimulationOrder[];
  if (Array.isArray(raw.mar)) template.mar = raw.mar as SimulationMAREntry[];
  if (Array.isArray(raw.labPanels)) template.labPanels = raw.labPanels as SimulationLabPanel[];
  if (Array.isArray(raw.imagingResults))
    template.imagingResults = raw.imagingResults as SimulationImagingResult[];
  if (Array.isArray(raw.ecgResults))
    template.ecgResults = raw.ecgResults as SimulationECGResult[];
  if (Array.isArray(raw.progressNotes))
    template.progressNotes = raw.progressNotes as SimulationProgressNote[];
  if (isRecord(raw.debrief)) template.debrief = raw.debrief as SimulationDebrief;
  if (typeof raw.licenseNotice === "string") template.licenseNotice = raw.licenseNotice;

  return template;
}

/** Strict parse; throws if the document is not a valid current-schema template. */
export function normalizeSimulationTemplate(raw: unknown): SimulationTemplate {
  const parsed = tryNormalizeSimulationTemplate(raw);
  if (!parsed) throw new Error("Invalid simulation template document");
  return parsed;
}

export function emptySimulationTemplate(id: string): SimulationTemplate {
  const t = new Date().toISOString();
  return {
    schemaVersion: SIMULATION_TEMPLATE_SCHEMA_VERSION,
    id,
    title: "Untitled simulation",
    createdAt: t,
    updatedAt: t,
    status: "draft",
    patient: {},
    states: [],
  };
}
