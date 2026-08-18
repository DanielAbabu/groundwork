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
      "INCIDENT SUMMARY:\nUsers navigating through paginated table views reported that every page displays 9 items instead of the requested page size of 10. Items at page boundary indices (e.g. item 10, item 20) are missing from search results.\n\nARCHITECTURE & REASONING:\n`paginate(rows, page, pageSize)` in `src/search/paginate.js` calculates slice indices using `rows.slice(start, start + pageSize - 1)`. In JavaScript, `Array.prototype.slice(start, end)` excludes the `end` index element, so subtracting 1 truncates the last item from every page!\n\nOBJECTIVES:\n1. Update slice boundary calculation to `start + pageSize` in `src/search/paginate.js`.\n2. Fix total page count math: `Math.ceil(rows.length / pageSize)`.",
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
      "INCIDENT SUMMARY:\nThe user dashboard's 'Recent Activity' widget is configured to display the 5 most recent events, but only displays 4 events. A recent refactor of array slicing introduced an off-by-one boundary mistake.\n\nARCHITECTURE & REASONING:\n`getTopActivity(activities, limit)` in `src/dashboard/activity.js` extracts recent entries using `activities.slice(0, limit - 1)`. Because array slice end indices are exclusive, subtracting 1 drops the Nth activity entry.\n\nOBJECTIVES:\n1. Update `activities.slice(0, limit)` in `src/dashboard/activity.js` to return exactly `limit` entries.",
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
      "INCIDENT SUMMARY:\nIntegrations team reported that failed webhook notifications are abandoned after 2 retry attempts despite product policy mandating 3 retries (4 total HTTP attempts).\n\nARCHITECTURE & REASONING:\n`shouldRetry(attemptCount, maxRetries)` in `src/webhooks/retry.js` evaluates `attemptCount < maxRetries`. When `maxRetries = 3` and `attemptCount` starts at 1, evaluating `< maxRetries` causes execution to halt at attempt 2!\n\nOBJECTIVES:\n1. Update comparison logic to `attemptCount <= maxRetries` in `src/webhooks/retry.js`.",
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
      "INCIDENT SUMMARY:\nAccounting audits uncovered discrepancies between bank settlement reports and internal monthly revenue metrics: transactions occurring on the last day of any month (e.g. March 31st at 14:00) were omitted from end-of-month summaries.\n\nARCHITECTURE & REASONING:\n`filterByDateRange(records, startDate, endDate)` in `src/reports/filter.js` compares `record.timestamp < endDate`. When `endDate` is formatted as `'2026-03-31'`, converting it to a Timestamp defaults to `'2026-03-31T00:00:00.000Z'`, excluding all transactions recorded throughout March 31st!\n\nOBJECTIVES:\n1. Adjust `endDate` in `src/reports/filter.js` to cover the full end-of-day boundary (`23:59:59.999Z` or `<= endDateEndOfDay`).",
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
