import { describe, expect, it } from "vitest";
import { gradeStage, gradeScenario } from "../grading";
import { getDesignScenario } from "@/content/design";

const scenario = getDesignScenario("url-shortener")!;

describe("Design Stage Grading Engine", () => {
  it("grades clarify stage correctly", () => {
    const stage = scenario.stages.find((s) => s.kind === "clarify")!;
    const goodAnswer = {
      "read-write": "read-heavy",
      "custom-slug": "yes-custom",
      expiry: "ttl",
      latency: "p99-100",
    };
    const grade = gradeStage(stage, goodAnswer);
    expect(grade.stageId).toBe(stage.id);
    expect(grade.score).toBeGreaterThanOrEqual(0.75);
    expect(grade.passed).toBe(true);
    expect(grade.advisory).toBe(false);
  });

  it("grades capacity estimation stage with partial/full credit", () => {
    const stage = scenario.stages.find((s) => s.kind === "capacity")!;

    // Perfect capacity estimation (redirect-qps: 580, peak-qps: 2900, storage-5y: 5, hot-cache: 50)
    const perfectAnswer = {
      "redirect-qps": 580,
      "peak-qps": 2900,
      "storage-5y": 5,
      "hot-cache": 50,
    };
    const perfectGrade = gradeStage(stage, perfectAnswer);
    expect(perfectGrade.score).toBe(1);
    expect(perfectGrade.passed).toBe(true);

    // Partial capacity estimation (right order of magnitude)
    const partialAnswer = {
      "redirect-qps": 400,
      "peak-qps": 2000,
      "storage-5y": 3,
      "hot-cache": 30,
    };
    const partialGrade = gradeStage(stage, partialAnswer);
    expect(partialGrade.score).toBeGreaterThan(0);
  });

  it("grades tradeoff defense stage with concept keywords & length check", () => {
    const stage = scenario.stages.find((s) => s.kind === "tradeoff")!;
    const goodDefense = {
      text: "Caching redirects creates a staleness window when a link is edited. We invalidate or evict the key on write, setting a short TTL to limit the blast radius and risk. This trade-off is acceptable for campaign links.",
    };
    const grade = gradeStage(stage, goodDefense);
    expect(grade.passed).toBe(true);
    expect(grade.advisory).toBe(true);
  });

  it("grades full scenario stages array", () => {
    const grades = gradeScenario(scenario, {});
    expect(grades.length).toBe(scenario.stages.length);
    for (const g of grades) {
      expect(g.stageId).toBeTruthy();
      expect(typeof g.score).toBe("number");
    }
  });
});
