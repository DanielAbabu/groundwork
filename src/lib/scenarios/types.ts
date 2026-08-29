export type ScenarioType = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export type Difficulty = "starter" | "routine" | "tricky";

export interface ScenarioFile {
  /** Virtual path, e.g. "src/services/pricing.js" */
  path: string;
  content: string;
  /** Context files are shown but not meant to be changed. */
  context?: boolean;
}

export interface LogLine {
  ts: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  service: string;
  msg: string;
  fields?: Record<string, string | number | boolean | null>;
}

export interface TraceSpan {
  name: string;
  durationMs: number;
  status: "ok" | "error" | "timeout";
  children?: TraceSpan[];
}

export interface SignalPanel {
  stackTrace: string;
  logs?: LogLine[];
  trace?: TraceSpan;
}

export interface ScenarioHint {
  tier: 1 | 2 | 3;
  text: string;
}

export interface PostmortemData {
  rootCause: string;
  impact: string;
  prevention: string;
  inspiration?: string;
}

export interface ConceptNote {
  concept: string;
  explanation: string;
  realWorldAnalogy: string;
  fixPattern: string;
}

export interface Scenario {
  id: string;
  title: string;
  service: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  type: ScenarioType;
  difficulty: Difficulty;
  /** One-line pager symptom shown on the board. */
  symptom: string;
  /** Longer incident framing shown in the room. */
  framing: string;
  files: ScenarioFile[];
  /** Stack trace or structured 3-tab signal panel. */
  signal: string | SignalPanel;
  /** Progressive hint drawer tiers. */
  hints?: ScenarioHint[];
  /** Concept explanation unlocked on failed runs. */
  conceptNote?: ConceptNote;
  /** Concept tags for filtering and recommendations. */
  concepts?: string[];
  /** IDs of related scenarios to attempt next. */
  relatedScenarios?: string[];
  /** Hidden test file: never listed in the file tree. */
  testPath: string;
  testContent: string;
  /** Shown after a pass, or after 2 failed runs. */
  postmortem: string | PostmortemData;
}

export const TYPE_LABELS: Record<ScenarioType, string> = {
  A: "Missing logic",
  B: "Bad query",
  C: "Async handling",
  D: "Off-by-one",
  E: "Data transform",
  F: "Race condition",
  G: "Config error",
  H: "Serialization",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  starter: "Easy",
  routine: "Medium",
  tricky: "Hard",
};

export const DIFFICULTY_CLASSES: Record<Difficulty, string> = {
  starter: "text-sev3 border-sev3/40",
  routine: "text-sev2 border-sev2/40",
  tricky: "text-sev1 border-sev1/40",
};

export function scenarioFileMap(scenario: Scenario, edits: Record<string, string>) {
  const files: Record<string, string> = {};
  for (const file of scenario.files) {
    files[file.path] = edits[file.path] ?? file.content;
  }
  files[scenario.testPath] = scenario.testContent;
  return files;
}
