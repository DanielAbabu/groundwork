import { describe, expect, it } from "vitest";
import { scenarios } from "../index";

describe("Scenario Schema & Integrity", () => {
  it("should have at least 1 scenario", () => {
    expect(scenarios.length).toBeGreaterThan(0);
  });

  it("should have unique scenario IDs", () => {
    const ids = scenarios.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have valid required fields for each scenario", () => {
    for (const scenario of scenarios) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.title).toBeTruthy();
      expect(scenario.symptom).toBeTruthy();
      expect(scenario.service).toBeTruthy();
      expect(scenario.difficulty).toBeDefined();
      expect(scenario.type).toBeDefined();
      expect(scenario.files.length).toBeGreaterThan(0);
      expect(scenario.testPath).toBeTruthy();

      expect(scenario.testPath).toBeTruthy();
      expect(typeof scenario.testPath).toBe("string");

      // Ensure each file has a path and content
      for (const file of scenario.files) {
        expect(file.path).toBeTruthy();
        expect(typeof file.content).toBe("string");
      }
    }
  });
});
