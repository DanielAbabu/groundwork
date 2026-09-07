import type { Scenario } from "@/lib/scenarios/types";

export const typeFScenarios: Scenario[] = [
  {
    id: "counter-race",
    title: "Like counter drifts on concurrent clicks",
    service: "reactions-service",
    severity: "SEV-2",
    type: "F",
    difficulty: "routine",
    symptom: "Post like counts lag behind actual user interactions",
    framing:
      "High-traffic posts show inconsistent like counts. The update helper reads the current count, increments it in JS memory, and writes it back, overwriting concurrent updates.",
    webPreview: {
      url: "http://localhost:8000/api/v1/reactions/counter/apply",
      method: "POST",
      appName: "REACTIONS & ENGAGEMENT AGGREGATOR",
      description: "Reaction delta counter worker endpoint",
      defaultPayload: { currentCount: 5, delta: 1 }
    },
    files: [
      {
        path: "src/reactions/counter.js",
        content: `/**
 * Reactions Subsystem - Counter Delta Engine
 */

/**
 * Applies an incremental delta (+1 or -1) to a reaction counter safely.
 *
 * @param {number|null|undefined} currentCount
 * @param {number} delta
 */
function applyReactionDelta(currentCount, delta) {
  const base = Number(currentCount) || 0;
  const next = base + delta;
  return Math.max(0, next);
}

module.exports = { applyReactionDelta };
`,
      },
    ],
    signal: {
      stackTrace: `AssertionError: expected 0 but received NaN
    at test (hidden.test.js:12:5)`,
      logs: [
        {
          ts: "18:05:00Z",
          level: "ERROR",
          service: "reactions-service",
          msg: "Invalid counter state resulting in NaN",
          fields: { current: null, delta: -1 },
        },
      ],
    },
    hints: [
      {
        tier: 1,
        text: "Passing null or undefined currentCount with a negative delta causes calculation issues if not properly guarded.",
      },
      {
        tier: 2,
        text: "Ensure Number(currentCount || 0) correctly handles zero and missing values before adding delta.",
      },
      {
        tier: 3,
        text: "Math.max(0, (Number(currentCount) || 0) + delta) prevents negative counter states.",
      },
    ],
    testPath: "hidden.test.js",
    testContent: `const { applyReactionDelta } = require("./src/reactions/counter");

test("increments count", () => {
  expect(applyReactionDelta(5, 1)).toBe(6);
});

test("decrements count but floor at 0", () => {
  expect(applyReactionDelta(0, -1)).toBe(0);
});

test("handles null currentCount gracefully", () => {
  expect(applyReactionDelta(null, 1)).toBe(1);
});
`,
    postmortem: {
      rootCause:
        "Unchecked null/undefined coercion resulted in NaN propagation in counter updates.",
      impact: "Reaction counts displayed as corrupted or NaN on new posts.",
      prevention: "Enforce strict nullish defaulting on numeric state updates.",
    },
  },
];
