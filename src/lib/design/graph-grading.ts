import {
  COMPONENT_LABELS,
  CONNECTION_TYPES,
  isSchemaValidEdge,
  type ComponentType,
} from "./registry";
import type {
  ComponentsRubric,
  DesignGraph,
  EdgePattern,
  StageFeedbackItem,
} from "./types";

export function edgeKey(from: ComponentType, to: ComponentType) {
  return `${from}->${to}`;
}

function patternLabel(pattern: EdgePattern) {
  const base = `${COMPONENT_LABELS[pattern.from]} → ${COMPONENT_LABELS[pattern.to]}`;
  return pattern.type ? `${base} (${CONNECTION_TYPES[pattern.type].label})` : base;
}

interface TypedEdge {
  from: ComponentType;
  to: ComponentType;
  type: string;
}

/** Resolves node ids to component types so the rubric can match on meaning. */
function typedEdges(graph: DesignGraph): TypedEdge[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node.type]));
  const out: TypedEdge[] = [];
  for (const edge of graph.edges ?? []) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    out.push({ from, to, type: edge.type });
  }
  return out;
}

function matches(edge: TypedEdge, pattern: EdgePattern) {
  if (edge.from !== pattern.from || edge.to !== pattern.to) return false;
  return pattern.type ? edge.type === pattern.type : true;
}

export function gradeGraph(
  rubric: ComponentsRubric,
  graph: DesignGraph,
): { score: number; feedback: StageFeedbackItem[] } {
  const nodes = graph.nodes ?? [];
  const present = new Set(nodes.map((node) => node.type));
  const edges = typedEdges(graph);
  const feedback: StageFeedbackItem[] = [];
  const checks: boolean[] = [];

  // Layer 1 — schema level, free from the registry.
  const illegal = edges.filter((edge) => !isSchemaValidEdge(edge.from, edge.to));
  checks.push(illegal.length === 0);
  feedback.push({
    label: "Every connection is structurally legal",
    ok: illegal.length === 0,
    detail:
      illegal.length === 0
        ? "No connection violates the component type system."
        : `These connections are not valid for those component types: ${illegal
            .map((edge) => `${COMPONENT_LABELS[edge.from]} → ${COMPONENT_LABELS[edge.to]}`)
            .join(", ")}.`,
  });

  // Layer 2 — scenario rubric.
  for (const type of rubric.requiredNodeTypes) {
    const ok = present.has(type);
    checks.push(ok);
    feedback.push({
      label: `Includes ${COMPONENT_LABELS[type]}`,
      ok,
      detail: ok
        ? (rubric.notes[type] ?? "Present.")
        : `Missing. ${rubric.notes[type] ?? "This component is required for the load described."}`,
    });
  }

  for (const [type, min] of Object.entries(rubric.minInstances ?? {}) as [
    ComponentType,
    number,
  ][]) {
    const count = nodes
      .filter((node) => node.type === type)
      .reduce((total, node) => total + Math.max(1, node.instances ?? 1), 0);
    const ok = count >= min;
    checks.push(ok);
    feedback.push({
      label: `At least ${min}x ${COMPONENT_LABELS[type]}`,
      ok,
      detail: ok
        ? `You placed ${count}. ${rubric.notes[`#${type}`] ?? ""}`.trim()
        : `You have ${count}. ${rubric.notes[`#${type}`] ?? "Raise the instance count to survive the peak load."}`,
    });
  }

  for (const pattern of rubric.requiredEdges) {
    const ok = edges.some((edge) => matches(edge, pattern));
    checks.push(ok);
    const key = edgeKey(pattern.from, pattern.to);
    feedback.push({
      label: patternLabel(pattern),
      ok,
      detail: ok
        ? (rubric.notes[key] ?? "Connection present.")
        : `Missing connection. ${rubric.notes[key] ?? "Add this edge."}`,
    });
  }

  for (const type of rubric.forbiddenNodeTypes) {
    const bad = present.has(type);
    checks.push(!bad);
    feedback.push({
      label: `No ${COMPONENT_LABELS[type]}`,
      ok: !bad,
      detail: bad
        ? (rubric.notes[`!${type}`] ?? "This component is unnecessary here and adds cost.")
        : "Correctly left out.",
    });
  }

  for (const pattern of rubric.forbiddenEdges) {
    const bad = edges.some((edge) => matches(edge, pattern));
    checks.push(!bad);
    const key = `!${edgeKey(pattern.from, pattern.to)}`;
    feedback.push({
      label: `No ${patternLabel(pattern)}`,
      ok: !bad,
      detail: bad
        ? (rubric.notes[key] ?? "This is the anti-pattern we're grading against.")
        : "Anti-pattern avoided.",
    });
  }

  const score = checks.length === 0 ? 0 : checks.filter(Boolean).length / checks.length;
  return { score, feedback };
}
