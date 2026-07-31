export type ScenarioType = "A" | "B" | "C" | "D";

export type Difficulty = "starter" | "routine" | "tricky";

export interface ScenarioFile {
  /** Virtual path, e.g. "src/services/pricing.js" */
  path: string;
  content: string;
  /** Context files are shown but not meant to be changed. */
  context?: boolean;
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
  /** Stack trace / failing test output, rendered verbatim. */
  signal: string;
  /** Hidden test file: never listed in the file tree. */
  testPath: string;
  testContent: string;
  /** Shown after a pass, or after 2 failed runs. */
  postmortem: string;
}

export const TYPE_LABELS: Record<ScenarioType, string> = {
  A: "Missing logic",
  B: "Bad query",
  C: "Async handling",
  D: "Off-by-one",
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
