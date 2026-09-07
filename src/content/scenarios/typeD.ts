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
    webPreview: {
      url: "http://localhost:8000/api/v1/search/paginate?page=1&pageSize=10",
      method: "GET",
      appName: "SEARCH PAGINATION ROUTER",
      description: "Search results pagination helper endpoint",
    },
    files: [
      {
        path: "src/search/paginate.js",
        content: `/**
 * Search Gateway - Pagination Subsystem
 */

/**
 * Returns paginated items for a 1-based page index.
 *
 * @param {Array} rows - Complete dataset
 * @param {number} page - 1-based page number
 * @param {number} pageSize - Number of items per page
 */
function paginate(rows, page, pageSize) {
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);
  return {
    items: items,
    page: page,
    pageSize: pageSize,
    total: rows.length,
    totalPages: Math.ceil(rows.length / pageSize),
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
    webPreview: {
      url: "http://localhost:8000/api/v1/dashboard/activity?limit=5",
      method: "GET",
      appName: "EXECUTIVE DASHBOARD ACTIVITY FEED",
      description: "Top recent user activity feed API",
    },
    files: [
      {
        path: "src/dashboard/activity.js",
        content: `/**
 * Dashboard API - Activity Feed Engine
 */

/**
 * Returns top N activity entries from activity log collection.
 *
 * @param {Array} activities - List of activity events
 * @param {number} limit - Maximum number of entries to return
 */
function getTopActivity(activities, limit) {
  if (!activities || !Array.isArray(activities)) return [];
  return activities.slice(0, limit);
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
    webPreview: {
      url: "http://localhost:8000/api/v1/webhooks/retry/evaluate",
      method: "POST",
      appName: "WEBHOOK DELIVERY RETRY WORKER",
      description: "Exponential backoff & retry evaluator",
      defaultPayload: { attemptCount: 3, maxRetries: 3 }
    },
    files: [
      {
        path: "src/webhooks/retry.js",
        content: `/**
 * Webhook Dispatcher - Retry Strategy Module
 */

/**
 * Evaluates whether a failed webhook dispatch should be re-attempted.
 *
 * @param {number} attemptCount - Current attempt number (1-based)
 * @param {number} maxRetries - Maximum allowed retry attempts
 */
function shouldRetry(attemptCount, maxRetries = 3) {
  return attemptCount <= maxRetries;
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
    webPreview: {
      url: "http://localhost:8000/api/v1/reports/revenue?startDate=2026-03-01&endDate=2026-03-31",
      method: "GET",
      appName: "REVENUE REPORTING AGGREGATOR",
      description: "Financial date boundary report filter",
    },
    files: [
      {
        path: "src/reports/filter.js",
        content: `/**
 * Financial Reports Subsystem - Date Range Filter
 */

/**
 * Filters transaction records occurring within [startDate, endDate] inclusive.
 *
 * @param {Array<{id: number, date: string}>} records - List of records with ISO date string
 * @param {string} startDate - Start date YYYY-MM-DD
 * @param {string} endDate - End date YYYY-MM-DD
 */
function filterByDateRange(records, startDate, endDate) {
  const startMs = new Date(startDate).getTime();
  const endObj = new Date(endDate);
  endObj.setUTCHours(23, 59, 59, 999);
  const endMs = endObj.getTime();

  return records.filter(r => {
    const t = new Date(r.date).getTime();
    return t >= startMs && t <= endMs;
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
