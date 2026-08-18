import type { Scenario } from "@/lib/scenarios/types";

export const typeDScenarios: Scenario[] = [
  {
    id: "pagination-off-by-one",
    title: "Every results page is missing its last row",
    service: "search-gateway",
    severity: "SEV-3",
    type: "D",
    difficulty: "starter",
    symptom: "paginate() returns 9 of 10 requested items and undercounts total pages",
    framing:
      "A customer noticed rows vanishing between page 1 and page 2 of their export. Nothing is deleted — the slice boundaries are wrong.",
    files: [
      {
        path: "src/search/paginate.js",
        content: `// Should return { items, page, pageSize, total, totalPages } for a 1-based page.
// Pages are full-size except the last one.
function paginate(rows, page, pageSize) {
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize - 1);
  return {
    items: items,
    page: page,
    pageSize: pageSize,
    total: rows.length,
    totalPages: Math.floor(rows.length / pageSize),
  };
}

module.exports = { paginate };
`,
      },
    ],
    signal: `FAIL src/search/__tests__/paginate.test.js
  ● paginate › returns a full page

    input:  rows = [1..25], page = 1, pageSize = 10
    expected items: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]  (10 items)
    received items: [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]      (9 items)

  ● paginate › counts the partial last page

    expected totalPages: 3
    received totalPages: 2`,
    testPath: "hidden.test.js",
    testContent: `const { paginate } = require("./src/search/paginate");

const rows = Array.from({ length: 25 }, (_, i) => i + 1);

test("returns a full first page", () => {
  expect(paginate(rows, 1, 10).items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("the second page continues without gaps", () => {
  expect(paginate(rows, 2, 10).items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
});

test("the partial last page returns the remainder", () => {
  expect(paginate(rows, 3, 10).items).toEqual([21, 22, 23, 24, 25]);
});
`,
    postmortem:
      "rows.slice(start, start + pageSize - 1) subtracted 1 from an exclusive end boundary. Removing -1 and fixing Math.ceil for totalPages restored complete pages.",
  },
  {
    id: "slice-boundary-inclusive",
    title: "Recent activity widget truncates top item",
    service: "dashboard-api",
    severity: "SEV-3",
    type: "D",
    difficulty: "starter",
    symptom: "getTopActivity(items, N) returns N - 1 entries",
    framing:
      "The dashboard recent activity widget is configured for 5 entries but only renders 4. An array slice boundary error is dropping the Nth item.",
    files: [
      {
        path: "src/dashboard/activity.js",
        content: `function getTopActivity(activities, limit) {
  if (!activities || !Array.isArray(activities)) return [];
  return activities.slice(0, limit - 1);
}

module.exports = { getTopActivity };
`,
      },
    ],
    signal: `FAIL src/dashboard/__tests__/activity.test.js
  ● getTopActivity › returns exact limit requested

    expected length: 5
    received length: 4`,
    testPath: "hidden.test.js",
    testContent: `const { getTopActivity } = require("./src/dashboard/activity");

test("returns requested limit count", () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  expect(getTopActivity(items, 5).length).toBe(5);
  expect(getTopActivity(items, 5)).toEqual([1, 2, 3, 4, 5]);
});
`,
    postmortem:
      "slice(0, limit - 1) prematurely truncated array output. Removing -1 from the slice call fixed the activity widget count.",
  },
  {
    id: "retry-count-off-by-one",
    title: "Webhook retries stop after 2 attempts",
    service: "webhook-worker",
    severity: "SEV-2",
    type: "D",
    difficulty: "routine",
    symptom: "Webhook notifications marked as failed after 2 retries instead of 3",
    framing:
      "Failed webhooks stop retrying after 2 attempts despite product policy requiring 3 retries. The attempt comparison operator is stopping early.",
    files: [
      {
        path: "src/webhooks/retry.js",
        content: `function shouldRetry(attemptCount, maxRetries = 3) {
  // Bug: attemptCount < maxRetries stops at 2 retries
  return attemptCount < maxRetries;
}

module.exports = { shouldRetry };
`,
      },
    ],
    signal: `FAIL src/webhooks/__tests__/retry.test.js
  ● shouldRetry › permits retry on maxRetries count

    attemptCount: 3, maxRetries: 3
    expected: true
    received: false`,
    testPath: "hidden.test.js",
    testContent: `const { shouldRetry } = require("./src/webhooks/retry");

test("allows retries up to maxRetries", () => {
  expect(shouldRetry(1, 3)).toBe(true);
  expect(shouldRetry(2, 3)).toBe(true);
  expect(shouldRetry(3, 3)).toBe(true);
  expect(shouldRetry(4, 3)).toBe(false);
});
`,
    postmortem:
      "Using `<` instead of `<=` caused the retry worker to abort 1 attempt early. Changing the comparison to `<=` enabled full retry coverage.",
  },
  {
    id: "date-range-end-exclusive",
    title: "End of month reports drop last day's records",
    service: "reports-service",
    severity: "SEV-1",
    type: "D",
    difficulty: "tricky",
    symptom: "Monthly revenue reports exclude transactions occurring on the final day of the month",
    framing:
      "End of month revenue reports exclude transactions occurring on the last day of the month. Converting the end date string defaults to 00:00:00 midnight.",
    files: [
      {
        path: "src/reports/filter.js",
        content: `function filterByDateRange(records, startDate, endDate) {
  const startMs = new Date(startDate).getTime();
  // Bug: endDate timestamp is 00:00:00, excluding transactions on that date
  const endMs = new Date(endDate).getTime();

  return records.filter(r => {
    const t = new Date(r.date).getTime();
    return t >= startMs && t < endMs;
  });
}

module.exports = { filterByDateRange };
`,
      },
    ],
    signal: `FAIL src/reports/__tests__/filter.test.js
  ● filterByDateRange › includes records on the final day of the range

    records on 2026-03-31T15:00:00:
    expected: included in report
    received: filtered out`,
    testPath: "hidden.test.js",
    testContent: `const { filterByDateRange } = require("./src/reports/filter");

test("includes records occurring on end date", () => {
  const records = [
    { id: 1, date: "2026-03-01T10:00:00Z" },
    { id: 2, date: "2026-03-31T15:00:00Z" },
    { id: 3, date: "2026-04-01T08:00:00Z" },
  ];
  const results = filterByDateRange(records, "2026-03-01", "2026-03-31");
  expect(results.length).toBe(2);
  expect(results.map(r => r.id)).toEqual([1, 2]);
});
`,
    postmortem:
      "Parsing endDate as '2026-03-31' yielded midnight (00:00:00), dropping records later that day. Setting endMs to the end of the day (or +24h - 1ms) included full-day records.",
  },
];
