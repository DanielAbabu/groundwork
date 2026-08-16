import { describe, expect, it } from "vitest";
import { gradeGraph } from "../graph-grading";
import { getDesignScenario } from "@/content/design";
import type { ComponentsRubric, DesignGraph } from "../types";

const rubric = (() => {
  const stage = getDesignScenario("url-shortener")!.stages.find((s) => s.kind === "components")!;
  return (stage as Extract<typeof stage, { kind: "components" }>).spec as ComponentsRubric;
})();

const goodAnswer: DesignGraph = {
  nodes: [
    { id: "n1", type: "CLIENT", instances: 1 },
    { id: "n2", type: "LOAD_BALANCER", instances: 1 },
    { id: "n3", type: "APP_SERVER", instances: 3 },
    { id: "n4", type: "CACHE", instances: 1 },
    { id: "n5", type: "DATABASE_PRIMARY", instances: 1 },
  ],
  edges: [
    { from: "n1", to: "n2", type: "SYNC_REQUEST" },
    { from: "n2", to: "n3", type: "SYNC_REQUEST" },
    { from: "n3", to: "n4", type: "CACHE_LOOKUP" },
    { from: "n4", to: "n5", type: "SYNC_REQUEST" },
  ],
};

const badAnswer: DesignGraph = {
  nodes: [
    { id: "n1", type: "CLIENT", instances: 1 },
    { id: "n2", type: "APP_SERVER", instances: 1 },
    { id: "n3", type: "DATABASE_PRIMARY", instances: 1 },
    { id: "n4", type: "OBJECT_STORE", instances: 1 },
  ],
  edges: [
    { from: "n1", to: "n3", type: "SYNC_REQUEST" },
    { from: "n2", to: "n3", type: "SYNC_REQUEST" },
    { from: "n2", to: "n4", type: "SYNC_REQUEST" },
  ],
};

describe("component canvas grading", () => {
  it("passes the intended architecture", () => {
    const { score, feedback } = gradeGraph(rubric, goodAnswer);
    expect(feedback.filter((item) => item.ok !== true)).toEqual([]);
    expect(score).toBe(1);
  });

  it("fails a broken architecture with specific reasons", () => {
    const { score, feedback } = gradeGraph(rubric, badAnswer);
    expect(score).toBeLessThan(0.75);
    const failed = feedback.filter((item) => item.ok !== true).map((item) => item.label);
    expect(failed).toContain("Includes Load Balancer");
    expect(failed).toContain("Includes Cache");
    expect(failed).toContain("No Object Store");
    expect(failed).toContain("At least 2x App Server");
    expect(failed.some((label) => label.includes("Client → Primary DB"))).toBe(true);
    expect(failed).toContain("Every connection is structurally legal");
  });

  it("rejects schema-illegal edges", () => {
    const { feedback } = gradeGraph(rubric, {
      nodes: [
        { id: "a", type: "DATABASE_PRIMARY", instances: 1 },
        { id: "b", type: "LOAD_BALANCER", instances: 1 },
      ],
      edges: [{ from: "a", to: "b", type: "SYNC_REQUEST" }],
    });
    const schema = feedback[0]!;
    expect(schema.ok).toBe(false);
    expect(schema.targets).toContain("Primary DB → Load Balancer");
    expect(schema.fix).toContain("Primary DB");

  });
});
