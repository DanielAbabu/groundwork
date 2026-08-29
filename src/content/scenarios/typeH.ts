import type { Scenario } from "@/lib/scenarios/types";

export const typeHScenarios: Scenario[] = [
  {
    id: "number-string-coercion",
    title: "Revenue reports show concatenated string sums",
    service: "reporting-api",
    severity: "SEV-2",
    type: "H",
    difficulty: "starter",
    symptom: "Monthly total revenue displays $100200300 instead of $600",
    framing:
      "The executive dashboard displays astronomical revenue totals like $500500. Database queries return numeric amounts as strings, which + converts to string concatenation instead of addition.",
    files: [
      {
        path: "src/reports/revenue.js",
        content: `// Sums a list of transaction amounts.
// Note: DB driver returns amounts as strings (e.g. "100.50") to prevent float truncation.
function sumRevenue(transactions) {
  let total = 0;
  for (const tx of transactions) {
    // TODO: Coerce tx.amount to a number before adding
    total += tx.amount;
  }
  return typeof total === "number" ? Math.round(total * 100) / 100 : 0;
}

module.exports = { sumRevenue };
`,
      },
    ],
    signal: {
      stackTrace: `AssertionError: expected 300 but received "0100200"
    at test (hidden.test.js:7:5)`,
      logs: [
        {
          ts: "08:00:15Z",
          level: "WARN",
          service: "reporting-api",
          msg: "Calculated revenue sum returned string type",
          fields: { raw_result: "0100200" },
        },
      ],
    },
    hints: [
      {
        tier: 1,
        text: "Adding a string to a number in JS performs string concatenation (e.g. 0 + '100' = '0100').",
      },
      {
        tier: 2,
        text: "Coerce tx.amount to a number using Number(tx.amount) or parseFloat(tx.amount) inside the loop.",
      },
      { tier: 3, text: "total += Number(tx.amount || 0);" },
    ],
    testPath: "hidden.test.js",
    testContent: `const { sumRevenue } = require("./src/reports/revenue");

test("sums string transaction amounts as numbers", () => {
  const txs = [{ amount: "100.50" }, { amount: "200.25" }];
  expect(sumRevenue(txs)).toBeCloseTo(300.75, 2);
});

test("handles empty transactions array", () => {
  expect(sumRevenue([])).toBe(0);
});
`,
    postmortem: {
      rootCause:
        "Database driver returned stringified decimals, causing + operator to concatenate strings.",
      impact: "Revenue dashboard metrics reported incorrect multi-million values.",
      prevention: "Always sanitize and explicitly parse raw DB inputs at boundary entry points.",
    },
  },
];
