import type {
  CapacityAnswer,
  ClarifyAnswer,
  ComponentKind,
  ComponentsAnswer,
  DesignScenario,
  DesignStage,
  StageAnswer,
  StageFeedbackItem,
  StageGrade,
  TradeoffAnswer,
} from "./types";
import { COMPONENT_LABELS } from "./types";

const PASS_THRESHOLD = 0.75;

function edgeKey(from: ComponentKind, to: ComponentKind) {
  return `${from}->${to}`;
}

function gradeClarify(stage: Extract<DesignStage, { kind: "clarify" }>, answer: ClarifyAnswer) {
  const feedback: StageFeedbackItem[] = stage.questions.map((question) => {
    const picked = answer[question.id];
    const ok = picked != null && question.accept.includes(picked);
    return {
      label: question.text,
      ok,
      detail: ok ? question.rationale : `Not quite — ${question.rationale}`,
    };
  });
  const correct = feedback.filter((item) => item.ok === true).length;
  const score = stage.questions.length === 0 ? 0 : correct / stage.questions.length;
  return { score, feedback };
}

function gradeCapacity(stage: Extract<DesignStage, { kind: "capacity" }>, answer: CapacityAnswer) {
  let points = 0;
  const feedback: StageFeedbackItem[] = stage.fields.map((field) => {
    const value = answer[field.id];
    if (value == null || Number.isNaN(value)) {
      return { label: field.label, ok: false as const, detail: `No answer. ${field.rationale}` };
    }
    if (value >= field.accept.min && value <= field.accept.max) {
      points += 1;
      return {
        label: field.label,
        ok: true as const,
        detail: `${value} ${field.unit} lands in the accepted range (${field.accept.min}–${field.accept.max} ${field.unit}). ${field.rationale}`,
      };
    }
    if (value >= field.magnitude.min && value <= field.magnitude.max) {
      points += 0.5;
      return {
        label: field.label,
        ok: "partial" as const,
        detail: `Right order of magnitude, but the accepted range is ${field.accept.min}–${field.accept.max} ${field.unit}. ${field.rationale}`,
      };
    }
    return {
      label: field.label,
      ok: false as const,
      detail: `Off by more than an order of magnitude. Expected ${field.accept.min}–${field.accept.max} ${field.unit}. ${field.rationale}`,
    };
  });
  const score = stage.fields.length === 0 ? 0 : points / stage.fields.length;
  return { score, feedback };
}

function gradeComponents(
  stage: Extract<DesignStage, { kind: "components" }>,
  answer: ComponentsAnswer,
) {
  const { spec } = stage;
  const nodes = new Set(answer.nodes ?? []);
  const edges = new Set((answer.edges ?? []).map(([from, to]) => edgeKey(from, to)));
  const feedback: StageFeedbackItem[] = [];
  const checks: boolean[] = [];

  for (const required of spec.required) {
    const ok = nodes.has(required);
    checks.push(ok);
    feedback.push({
      label: `Includes ${COMPONENT_LABELS[required]}`,
      ok,
      detail: ok
        ? (spec.notes[required] ?? "Present.")
        : `Missing. ${spec.notes[required] ?? "This component is required for the load described."}`,
    });
  }

  for (const [from, to] of spec.requiredEdges) {
    const ok = edges.has(edgeKey(from, to));
    checks.push(ok);
    const key = edgeKey(from, to);
    feedback.push({
      label: `${COMPONENT_LABELS[from]} → ${COMPONENT_LABELS[to]}`,
      ok,
      detail: ok
        ? (spec.notes[key] ?? "Connection present.")
        : `Missing connection. ${spec.notes[key] ?? "Add this edge."}`,
    });
  }

  for (const forbidden of spec.forbidden) {
    const present = nodes.has(forbidden);
    checks.push(!present);
    feedback.push({
      label: `No ${COMPONENT_LABELS[forbidden]}`,
      ok: !present,
      detail: present
        ? (spec.notes[`!${forbidden}`] ?? "This component is unnecessary here and adds cost.")
        : "Correctly left out.",
    });
  }

  for (const [from, to] of spec.forbiddenEdges) {
    const key = edgeKey(from, to);
    const present = edges.has(key);
    checks.push(!present);
    feedback.push({
      label: `No ${COMPONENT_LABELS[from]} → ${COMPONENT_LABELS[to]}`,
      ok: !present,
      detail: present
        ? (spec.notes[`!${key}`] ?? "This is the anti-pattern we're grading against.")
        : "Anti-pattern avoided.",
    });
  }

  const score = checks.length === 0 ? 0 : checks.filter(Boolean).length / checks.length;
  return { score, feedback };
}

function gradeTradeoff(stage: Extract<DesignStage, { kind: "tradeoff" }>, answer: TradeoffAnswer) {
  const text = (answer.text ?? "").toLowerCase();
  const feedback: StageFeedbackItem[] = stage.concepts.map((concept) => {
    const ok = concept.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    return {
      label: concept.label,
      ok,
      detail: ok
        ? "Covered."
        : "A strong answer usually touches this. Advisory only — it does not fail the stage.",
    };
  });
  const hit = feedback.filter((item) => item.ok === true).length;
  const score = stage.concepts.length === 0 ? 0 : hit / stage.concepts.length;
  const enoughLength = text.trim().split(/\s+/).filter(Boolean).length >= 25;
  feedback.push({
    label: "Enough reasoning to review",
    ok: enoughLength,
    detail: enoughLength
      ? "Long enough to judge the reasoning."
      : "Aim for a few sentences so the reasoning is reviewable.",
  });
  return { score, feedback, hit };
}

export function gradeStage(stage: DesignStage, answer: StageAnswer): StageGrade {
  switch (stage.kind) {
    case "clarify": {
      const { score, feedback } = gradeClarify(stage, answer as ClarifyAnswer);
      return { stageId: stage.id, score, passed: score >= PASS_THRESHOLD, advisory: false, feedback };
    }
    case "capacity": {
      const { score, feedback } = gradeCapacity(stage, answer as CapacityAnswer);
      return { stageId: stage.id, score, passed: score >= PASS_THRESHOLD, advisory: false, feedback };
    }
    case "components": {
      const { score, feedback } = gradeComponents(stage, answer as ComponentsAnswer);
      return { stageId: stage.id, score, passed: score >= PASS_THRESHOLD, advisory: false, feedback };
    }
    case "tradeoff": {
      const { score, feedback, hit } = gradeTradeoff(stage, answer as TradeoffAnswer);
      return {
        stageId: stage.id,
        score,
        // Advisory: passes as long as the answer is substantive enough to review.
        passed: hit >= stage.minConcepts,
        advisory: true,
        feedback,
      };
    }
  }
}

export function gradeScenario(
  scenario: DesignScenario,
  answers: Record<string, StageAnswer>,
): StageGrade[] {
  return scenario.stages.map((stage) => gradeStage(stage, answers[stage.id] ?? ({} as StageAnswer)));
}
