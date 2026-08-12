import type { ComponentType, ConnectionType } from "./registry";
import { COMPONENT_LABELS } from "./registry";

export type { ComponentType, ConnectionType };
export { COMPONENT_LABELS };

export type DesignTier = "tier-1" | "tier-2" | "tier-3";

export interface ClarifyQuestion {
  id: string;
  /** What the stakeholder says / asks. */
  text: string;
  options: { id: string; label: string }[];
  /** Option ids that count as acceptable answers. */
  accept: string[];
  rationale: string;
}

export interface CapacityField {
  id: string;
  label: string;
  unit: string;
  hint?: string;
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
  type?: ConnectionType;
}

export interface ComponentsRubric {
  /** Subset of the registry shown in this scenario's palette. */
  palette: ComponentType[];
  requiredNodeTypes: ComponentType[];
  forbiddenNodeTypes: ComponentType[];
  requiredEdges: EdgePattern[];
  forbiddenEdges: EdgePattern[];
  minInstances?: Partial<Record<ComponentType, number>>;
  /** Explanations keyed by node type, "TYPE->TYPE", or "!TYPE" / "!TYPE->TYPE". */
  notes: Record<string, string>;
}

export interface TradeoffConcept {
  id: string;
  label: string;
  keywords: string[];
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
  rule?: FeedbackRule;
  /** Human-readable targets this rule points at, e.g. ["Cache → Database (Primary)"]. */
  targets?: string[];
  /** Concrete next action to satisfy the rule. */
  fix?: string;
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
