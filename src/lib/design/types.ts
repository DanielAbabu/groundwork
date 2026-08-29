import type { ComponentType, ConnectionType } from "./registry";
import { COMPONENT_LABELS } from "./registry";

export type { ComponentType, ConnectionType };
export { COMPONENT_LABELS };

export type DesignTier = "tier-1" | "tier-2" | "tier-3";

export interface ClarifyOption {
  id: string;
  label: string;
  /** Stakeholder's reaction to this choice when selected */
  followUp?: string | undefined;
}

export interface ClarifyQuestion {
  id: string;
  /** What the stakeholder says / asks. */
  text: string;
  options: ClarifyOption[];
  /** Option ids that count as acceptable answers. */
  accept: string[];
  rationale: string;
}

export interface CapacityField {
  id: string;
  label: string;
  unit: string;
  hint?: string | undefined;
  /** Reference math expression hint, e.g. "50,000,000 / 86,400" */
  formula?: string | undefined;
  /** Full credit range. */
  accept: { min: number; max: number };
  /** Partial credit range (right order of magnitude). */
  magnitude: { min: number; max: number };
  rationale: string;
}

/** Serialized canvas state — the only thing the grader ever sees. */
export interface GraphNode {
  id: string;
  type: ComponentType;
  instances: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: ConnectionType;
}

export interface DesignGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** An edge pattern matched by node type (and optionally connection type). */
export interface EdgePattern {
  from: ComponentType;
  to: ComponentType;
  type?: ConnectionType | undefined;
}

export interface ComponentsRubric {
  /** Subset of the registry shown in this scenario's palette. */
  palette: ComponentType[];
  requiredNodeTypes: ComponentType[];
  forbiddenNodeTypes: ComponentType[];
  requiredEdges: EdgePattern[];
  forbiddenEdges: EdgePattern[];
  minInstances?: Partial<Record<ComponentType, number>> | undefined;
  /** Explanations keyed by node type, "TYPE->TYPE", or "!TYPE" / "!TYPE->TYPE". */
  notes: Record<string, string>;
}

export type TradeoffAxis = "problem" | "mitigation" | "risk";

export interface TradeoffConcept {
  id: string;
  label: string;
  keywords: string[];
  /** Optional regex patterns for phrase matching */
  patterns?: string[] | undefined;
  /** Rubric category axis for structured feedback */
  axis?: TradeoffAxis | undefined;
}

export type DesignStage =
  | {
      id: string;
      kind: "clarify";
      title: string;
      prompt: string;
      questions: ClarifyQuestion[];
    }
  | {
      id: string;
      kind: "capacity";
      title: string;
      prompt: string;
      fields: CapacityField[];
    }
  | {
      id: string;
      kind: "components";
      title: string;
      prompt: string;
      spec: ComponentsRubric;
    }
  | {
      id: string;
      kind: "tradeoff";
      title: string;
      prompt: string;
      concepts: TradeoffConcept[];
      minConcepts: number;
      ideal: string;
    };

export interface DesignDebrief {
  narrative: string;
  seniorInsights: string[];
  commonMistakes: string[];
}

export interface DesignScenario {
  id: string;
  title: string;
  system: string;
  stakeholder: string;
  stakeholderRole: string;
  tier: DesignTier;
  difficulty: "starter" | "routine" | "tricky";
  summary: string;
  framing: string;
  stages: DesignStage[];
  debrief?: DesignDebrief | undefined;
}

export const STAGE_KIND_LABELS: Record<DesignStage["kind"], string> = {
  clarify: "Clarify",
  capacity: "Capacity",
  components: "Components",
  tradeoff: "Trade-offs",
};

/** Answer shapes, one per stage kind. */
export type ClarifyAnswer = Record<string, string>;
export type CapacityAnswer = Record<string, number | null>;
export type ComponentsAnswer = DesignGraph;
export type TradeoffAnswer = { text: string };
export type StageAnswer = ClarifyAnswer | CapacityAnswer | ComponentsAnswer | TradeoffAnswer;

/** Which rule family produced a feedback line — drives grouping in the UI. */
export type FeedbackRule =
  | "schema"
  | "required-node"
  | "required-edge"
  | "instances"
  | "forbidden-node"
  | "forbidden-edge"
  | "answer";

export interface StageFeedbackItem {
  label: string;
  ok: boolean | "partial";
  detail: string;
  /** Rule family, when the grader knows it. */
  rule?: FeedbackRule | undefined;
  /** Human-readable targets this rule points at, e.g. ["Cache → Database (Primary)"]. */
  targets?: string[] | undefined;
  /** Concrete next action to satisfy the rule. */
  fix?: string | undefined;
}

export interface StageGrade {
  stageId: string;
  passed: boolean;
  /** 0..1 */
  score: number;
  /** Advisory stages give guidance, never a hard fail. */
  advisory: boolean;
  feedback: StageFeedbackItem[];
}
