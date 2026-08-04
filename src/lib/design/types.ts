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

export type ComponentKind =
  | "client"
  | "cdn"
  | "load-balancer"
  | "app-server"
  | "cache"
  | "db-primary"
  | "db-replica"
  | "queue"
  | "object-store"
  | "worker";

export interface ComponentsSpec {
  palette: ComponentKind[];
  required: ComponentKind[];
  forbidden: ComponentKind[];
  /** Edges the graph must contain, direction matters. */
  requiredEdges: [ComponentKind, ComponentKind][];
  /** Anti-patterns: edges that must NOT exist. */
  forbiddenEdges: [ComponentKind, ComponentKind][];
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
      spec: ComponentsSpec;
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

export const COMPONENT_LABELS: Record<ComponentKind, string> = {
  client: "Client",
  cdn: "CDN",
  "load-balancer": "Load Balancer",
  "app-server": "App Server",
  cache: "Cache",
  "db-primary": "DB (primary)",
  "db-replica": "DB (replica)",
  queue: "Queue",
  "object-store": "Object Store",
  worker: "Worker",
};

/** Answer shapes, one per stage kind. */
export type ClarifyAnswer = Record<string, string>;
export type CapacityAnswer = Record<string, number | null>;
export type ComponentsAnswer = {
  nodes: ComponentKind[];
  edges: [ComponentKind, ComponentKind][];
};
export type TradeoffAnswer = { text: string };
export type StageAnswer = ClarifyAnswer | CapacityAnswer | ComponentsAnswer | TradeoffAnswer;

export interface StageFeedbackItem {
  label: string;
  ok: boolean | "partial";
  detail: string;
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
