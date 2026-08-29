import type { Scenario } from "@/lib/scenarios/types";

export const typeEScenarios: Scenario[] = [
  {
    id: "currency-rounding",
    title: "Split refund amounts are off by 1 cent",
    service: "payments-api",
    severity: "SEV-2",
    type: "E",
    difficulty: "starter",
    symptom: "Refund batch reconciliation fails with $0.01 imbalance",
    framing:
      "Finance is seeing 1-cent discrepancy errors during nightly payout reconciliation. The line-item refund helper rounds individual items before summing instead of rounding the final total.",
    files: [
      {
        path: "src/payments/refund.js",
        content: `// Calculates total refund for a list of line items with a percentage discount applied.
// Contract:
//  - calculate discount per item or subtotal
//  - final refund must be rounded to 2 decimals
function calculateRefund(items, discountRate = 0) {
  let total = 0;
  for (const item of items) {
    const itemNet = item.price * item.quantity * (1 - discountRate);
    // TODO: Fix Premature per-item rounding accumulation
    total += Math.round(itemNet * 100) / 100;
  }
  return total;
}

module.exports = { calculateRefund };
`,
      },
    ],
    signal: {
      stackTrace: `AssertionError: expected 28.33 but received 28.34
    at test (hidden.test.js:8:5)`,
      logs: [
        {
          ts: "23:00:10Z",
          level: "WARN",
          service: "payments-api",
          msg: "Batch reconciliation imbalance detected",
          fields: { expected: 28.33, calculated: 28.34 },
        },
      ],
      trace: {
        name: "POST /refunds/batch",
        durationMs: 12,
        status: "error",
        children: [{ name: "calculateRefund()", durationMs: 1, status: "error" }],
      },
    },
    hints: [
      {
        tier: 1,
        text: "Rounding floating-point values inside the loop accumulates fractional rounding errors across items.",
      },
      {
        tier: 2,
        text: "Sum unrounded floating-point amounts inside the loop, then apply Math.round(... * 100) / 100 once to the final total.",
      },
      {
        tier: 3,
        text: "Move Math.round(...) to the return statement: return Math.round(total * 100) / 100.",
      },
    ],
    concepts: ["floating-point", "rounding-accumulation", "financial-precision"],
    conceptNote: {
      concept: "Premature Floating-Point Rounding",
      explanation:
        "Rounding intermediate floating-point numbers inside iteration loops discards sub-cent fractions prematurely. Across multiple line items, these dropped fractions compound into multi-cent accounting discrepancies.",
      realWorldAnalogy:
        "Truncating gas price fractions at every gallon pumped instead of calculating total gallons first.",
      fixPattern:
        "Accumulate exact unrounded floating-point totals inside calculation loops and apply rounding once at the boundary.",
    },
    testPath: "hidden.test.js",
    testContent: `const { calculateRefund } = require("./src/payments/refund");

test("avoids 1-cent rounding accumulation across split items", () => {
  const items = [
    { price: 10.333, quantity: 1 },
    { price: 10.333, quantity: 1 },
    { price: 10.333, quantity: 1 },
  ];
  expect(calculateRefund(items, 0.088)).toBeCloseTo(28.33, 2);
});

test("returns 0 for empty items", () => {
  expect(calculateRefund([], 0.1)).toBe(0);
});
`,
    postmortem: {
      rootCause:
        "Per-item rounding inside the iteration loop caused floating-point precision drift across multi-line refunds.",
      impact: "Nightly accounting reconciliation failed on split-item refunds.",
      prevention:
        "Always maintain floating-point precision throughout calculation steps and round only at presentation/persistence boundary.",
    },
  },
  {
    id: "pagination-offset",
    title: "Search page 2 duplicates items from page 1",
    service: "catalog-search",
    severity: "SEV-3",
    type: "E",
    difficulty: "routine",
    symptom: "GET /products?page=2 returns items already seen on page 1",
    framing:
      "Users report that clicking 'Next page' in search results shows the exact same items at the top of the list. The pagination offset calculation assumes 0-indexed page numbers.",
    files: [
      {
        path: "src/search/paginate.js",
        content: `// Computes DB limit and offset for 1-indexed page requests.
// Example: computePagination(1, 20) -> { limit: 20, offset: 0 }
// Example: computePagination(2, 20) -> { limit: 20, offset: 20 }
function computePagination(page, pageSize) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.max(1, Number(pageSize) || 20);
  
  // TODO: Fix offset calculation for 1-indexed page
  const offset = safePage * safeSize;
  return { limit: safeSize, offset };
}

module.exports = { computePagination };
`,
      },
    ],
    signal: {
      stackTrace: `AssertionError: expected offset 0 for page 1 but received 20
    at test (hidden.test.js:6:5)`,
      logs: [
        {
          ts: "14:22:01Z",
          level: "INFO",
          service: "catalog-search",
          msg: "GET /products?page=1",
          fields: { page: 1, pageSize: 20, computedOffset: 20 },
        },
      ],
    },
    hints: [
      {
        tier: 1,
        text: "Page 1 should start at offset 0, but safePage * safeSize produces offset 20 for page 1.",
      },
      { tier: 2, text: "Convert 1-indexed page to 0-indexed offset: (safePage - 1) * safeSize." },
      { tier: 3, text: "Replace offset = safePage * safeSize with (safePage - 1) * safeSize." },
    ],
    testPath: "hidden.test.js",
    testContent: `const { computePagination } = require("./src/search/paginate");

test("page 1 starts at offset 0", () => {
  expect(computePagination(1, 20)).toEqual({ limit: 20, offset: 0 });
});

test("page 2 starts at offset 20", () => {
  expect(computePagination(2, 20)).toEqual({ limit: 20, offset: 20 });
});

test("defaults invalid page values to page 1", () => {
  expect(computePagination(0, 10)).toEqual({ limit: 10, offset: 0 });
});
`,
    postmortem: {
      rootCause:
        "Page 1 calculated offset = 1 * 20 = 20, skipping the first page of results entirely.",
      impact: "Users missed the top 20 search results and saw duplicate entries across pagination.",
      prevention:
        "Standardize pagination helper contracts with clear 1-indexed vs 0-indexed unit test assertions.",
    },
  },
];
