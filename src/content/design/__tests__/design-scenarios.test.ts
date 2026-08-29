import { describe, expect, it } from "vitest";
import { designScenarios } from "../index";

describe("Design Scenarios Schema Integrity", () => {
  it("should have at least 1 design scenario", () => {
    expect(designScenarios.length).toBeGreaterThan(0);
  });

  it("should have unique design scenario IDs", () => {
    const ids = designScenarios.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have valid stages and rubrics for each scenario", () => {
    for (const scenario of designScenarios) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.title).toBeTruthy();
      expect(scenario.summary).toBeTruthy();
      expect(scenario.system).toBeTruthy();
      expect(scenario.stages.length).toBeGreaterThan(0);

      const stageIds = scenario.stages.map((st) => st.id);
      const uniqueStageIds = new Set(stageIds);
      expect(uniqueStageIds.size).toBe(stageIds.length);

      for (const stage of scenario.stages) {
        expect(stage.id).toBeTruthy();
        expect(stage.title).toBeTruthy();
        expect(stage.kind).toBeTruthy();
        expect(stage.prompt).toBeTruthy();
      }
    }
  });
});
