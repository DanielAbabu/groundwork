import type {
  CapacityAnswer,
  ClarifyAnswer,
  ComponentsAnswer,
  DesignScenario,
  DesignStage,
  StageAnswer,
  StageFeedbackItem,
  StageGrade,
  TradeoffAnswer,
} from "./types";
import { gradeGraph } from "./graph-grading";

const PASS_THRESHOLD = 0.75;

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

function gradeTradeoff(stage: Extract<DesignStage, { kind: "tradeoff" }>, answer: TradeoffAnswer) {
  const text = (answer.text ?? "").toLowerCase();
  const feedback: StageFeedbackItem[] = stage.concepts.map((concept) => {
    let ok = concept.keywords.some((keyword) => text.includes(keyword.toLowerCase()));

    if (!ok && concept.patterns && concept.patterns.length > 0) {
      ok = concept.patterns.some((pat) => {
        try {
          return new RegExp(pat, "i").test(text);
        } catch {
          return false;
        }
      });
    }

    return {
      label: concept.label,
      ok,
      rule: concept.axis ? `axis-${concept.axis}` : "answer",
      detail: ok
        ? "Covered effectively."
        : "A strong answer touches this concept. Advisory only — it does not fail the stage.",
    };
  });

  const hit = feedback.filter((item) => item.ok === true).length;
  const score = stage.concepts.length === 0 ? 0 : hit / stage.concepts.length;
  const enoughLength = text.trim().split(/\s+/).filter(Boolean).length >= 25;
  feedback.push({
    label: "Sufficient depth & reasoning",
    ok: enoughLength,
    rule: "answer",
    detail: enoughLength
      ? "Long enough to judge the architectural reasoning."
      : "Aim for a few sentences so your design logic is clear and reviewable.",
  });
  return { score, feedback, hit };
}

export function gradeStage(stage: DesignStage, answer: StageAnswer): StageGrade {
  switch (stage.kind) {
    case "clarify": {
      const { score, feedback } = gradeClarify(stage, answer as ClarifyAnswer);
      return {
        stageId: stage.id,
        score,
        passed: score >= PASS_THRESHOLD,
        advisory: false,
        feedback,
      };
    }
    case "capacity": {
      const { score, feedback } = gradeCapacity(stage, answer as CapacityAnswer);
      return {
        stageId: stage.id,
        score,
        passed: score >= PASS_THRESHOLD,
        advisory: false,
        feedback,
      };
    }
    case "components": {
      const graph = (answer ?? {}) as ComponentsAnswer;
      const { score, feedback } = gradeGraph(stage.spec, {
        nodes: graph.nodes ?? [],
        edges: graph.edges ?? [],
      });
      return {
        stageId: stage.id,
        score,
        passed: score >= PASS_THRESHOLD,
        advisory: false,
        feedback,
      };
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
  return scenario.stages.map((stage) =>
    gradeStage(stage, answers[stage.id] ?? ({} as StageAnswer)),
  );
}
