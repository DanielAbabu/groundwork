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

test("totalPages includes the partial page", () => {
  expect(paginate(rows, 1, 10).totalPages).toBe(3);
});

test("an exact multiple does not add an empty page", () => {
  expect(paginate(Array.from({ length: 20 }, (_, i) => i), 1, 10).totalPages).toBe(2);
});

test("an empty result set has no pages", () => {
  expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 });
});
`,
    postmortem:
      "Two off-by-one errors: slice(start, start + pageSize - 1) drops the last item of every page (slice's end is already exclusive), and Math.floor() truncates the partial final page out of totalPages. Math.ceil() is the right rounding for page counts.",
  },
  {
    id: "discount-flipped-comparison",
    title: "Small orders are getting the bulk discount",
    service: "storefront-api",
    severity: "SEV-1",
    type: "D",
    difficulty: "starter",
    symptom: "A 12.00 order receives the 10% bulk discount; a 400.00 order receives nothing",
    framing:
      "Margin alerting fired: the bulk discount is landing on tiny orders and skipping the large ones it was designed for. Discounts are being honoured at checkout, so revenue is leaking now.",
    files: [
      {
        path: "src/pricing/discount.js",
        content: `const BULK_THRESHOLD = 100;
const BULK_RATE = 0.1;

// Should apply a 10% discount when the subtotal reaches 100 or more.
// Returns { subtotal, discount, total }, all rounded to 2 decimals.
function applyBulkDiscount(subtotal) {
  const qualifies = subtotal < BULK_THRESHOLD;
  const discount = qualifies ? Math.round(subtotal * BULK_RATE * 100) / 100 : 0;
  return {
    subtotal: subtotal,
    discount: discount,
    total: Math.round((subtotal - discount) * 100) / 100,
  };
}

module.exports = { applyBulkDiscount };
`,
      },
      {
        path: "src/routes/quote.js",
        context: true,
        content: `const { applyBulkDiscount } = require("../pricing/discount");

function quote(subtotal) {
  const priced = applyBulkDiscount(subtotal);
  return { amountDue: priced.total.toFixed(2), discountApplied: priced.discount > 0 };
}

module.exports = { quote };
`,
      },
    ],
    signal: `FAIL src/pricing/__tests__/discount.test.js
  ● applyBulkDiscount › discounts a large order

    input: 400
    expected: { subtotal: 400, discount: 40, total: 360 }
    received: { subtotal: 400, discount: 0, total: 400 }

  ● applyBulkDiscount › leaves a small order alone

    input: 12
    expected discount: 0
    received discount: 1.2`,
    testPath: "hidden.test.js",
    testContent: `const { applyBulkDiscount } = require("./src/pricing/discount");
const { quote } = require("./src/routes/quote");

test("discounts a large order", () => {
  expect(applyBulkDiscount(400)).toEqual({ subtotal: 400, discount: 40, total: 360 });
});

test("leaves a small order alone", () => {
  expect(applyBulkDiscount(12).discount).toBe(0);
});

test("the threshold itself qualifies", () => {
  expect(applyBulkDiscount(100)).toEqual({ subtotal: 100, discount: 10, total: 90 });
});

test("just under the threshold does not qualify", () => {
  expect(applyBulkDiscount(99.99).discount).toBe(0);
});

test("rounds the discount to cents", () => {
  expect(applyBulkDiscount(133.33)).toEqual({ subtotal: 133.33, discount: 13.33, total: 120 });
});

test("the quote route reports whether a discount applied", () => {
  expect(quote(250)).toEqual({ amountDue: "225.00", discountApplied: true });
});
`,
    postmortem:
      "The qualification check was inverted: `subtotal < BULK_THRESHOLD` discounted everything below 100 instead of at or above it. `subtotal >= BULK_THRESHOLD` restores the rule, and the boundary case (exactly 100) has to qualify.",
  },
  {
    id: "date-range-exclusive",
    title: "Monthly report is missing the first and last day",
    service: "reporting",
    severity: "SEV-2",
    type: "D",
    difficulty: "routine",
    symptom: "Rows dated on the range boundaries are excluded from every report",
    framing:
      "The finance team reconciled the March report against raw data and found two missing days: the 1st and the 31st. The range filter is treating an inclusive range as exclusive.",
    files: [
      {
        path: "src/reporting/range.js",
        content: `// Should return the events whose date falls inside [start, end] — both ends
// inclusive. Dates are ISO "YYYY-MM-DD" strings and sort lexicographically.
function eventsInRange(events, start, end) {
  return events.filter((event) => event.date > start && event.date < end);
}

function totalInRange(events, start, end) {
  return eventsInRange(events, start, end).reduce((sum, event) => sum + event.amount_cents, 0);
}

module.exports = { eventsInRange, totalInRange };
`,
      },
      {
        path: "src/reporting/fixtures.js",
        context: true,
        content: `const marchEvents = [
  { id: "e_1", date: "2026-02-28", amount_cents: 500 },
  { id: "e_2", date: "2026-03-01", amount_cents: 1000 },
  { id: "e_3", date: "2026-03-15", amount_cents: 2500 },
  { id: "e_4", date: "2026-03-31", amount_cents: 4000 },
  { id: "e_5", date: "2026-04-01", amount_cents: 700 },
];

module.exports = { marchEvents };
`,
      },
    ],
    signal: `FAIL src/reporting/__tests__/range.test.js
  ● eventsInRange › includes both boundary days

    input: start = "2026-03-01", end = "2026-03-31"
    expected ids: [ "e_2", "e_3", "e_4" ]
    received ids: [ "e_3" ]

  ● totalInRange › matches the ledger

    expected: 7500
    received: 2500`,
    testPath: "hidden.test.js",
    testContent: `const { eventsInRange, totalInRange } = require("./src/reporting/range");
const { marchEvents } = require("./src/reporting/fixtures");

test("includes both boundary days", () => {
  expect(eventsInRange(marchEvents, "2026-03-01", "2026-03-31").map((e) => e.id)).toEqual([
    "e_2",
    "e_3",
    "e_4",
  ]);
});

test("excludes days outside the range", () => {
  const ids = eventsInRange(marchEvents, "2026-03-01", "2026-03-31").map((e) => e.id);
  expect(ids.includes("e_1")).toBe(false);
  expect(ids.includes("e_5")).toBe(false);
});

test("totals match the ledger", () => {
  expect(totalInRange(marchEvents, "2026-03-01", "2026-03-31")).toBe(7500);
});

test("a single-day range returns that day", () => {
  expect(eventsInRange(marchEvents, "2026-03-15", "2026-03-15").map((e) => e.id)).toEqual(["e_3"]);
});

test("a range with no events is empty", () => {
  expect(eventsInRange(marchEvents, "2026-05-01", "2026-05-31")).toEqual([]);
});
`,
    postmortem:
      "The filter used strict > and <, which excludes the boundary dates the report is defined to include. Using >= and <= makes the range inclusive — and makes a single-day range return that day instead of nothing.",
  },
  {
    id: "retry-cap-exceeded",
    title: "Retries are hammering a degraded provider",
    service: "webhook-dispatcher",
    severity: "SEV-2",
    type: "D",
    difficulty: "tricky",
    symptom: "maxAttempts: 3 produces 4 provider calls and the provider is rate-limiting us",
    framing:
      "The provider sent an abuse warning: we're sending 33% more traffic than our own retry policy allows during their outage. The loop bound is one attempt too generous.",
    files: [
      {
        path: "src/dispatch/retry.js",
        content: `// Should call \`send\` until it succeeds or maxAttempts is reached.
// Resolves { ok, attempts, result } on success, { ok: false, attempts, error }
// after the final failure. Never exceeds maxAttempts calls.
async function withRetries(send, maxAttempts) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxAttempts) {
    attempt += 1;
    try {
      const result = await send(attempt);
      return { ok: true, attempts: attempt, result: result };
    } catch (error) {
      lastError = error;
    }
  }

  return { ok: false, attempts: attempt, error: lastError.message };
}

module.exports = { withRetries };
`,
      },
      {
        path: "src/dispatch/provider.js",
        context: true,
        content: `// Test double: fails the first \`failures\` calls, then succeeds.
function makeSender(failures) {
  let calls = 0;
  const send = async () => {
    calls += 1;
    if (calls <= failures) throw new Error("provider_unavailable");
    return { delivered: true, onCall: calls };
  };
  send.calls = () => calls;
  return send;
}

module.exports = { makeSender };
`,
      },
    ],
    signal: `FAIL src/dispatch/__tests__/retry.test.js
  ● withRetries › never exceeds maxAttempts

    policy: maxAttempts = 3
    expected provider calls: 3
    received provider calls: 4

    expected: { ok: false, attempts: 3, error: "provider_unavailable" }
    received: { ok: false, attempts: 4, error: "provider_unavailable" }`,
    testPath: "hidden.test.js",
    testContent: `const { withRetries } = require("./src/dispatch/retry");
const { makeSender } = require("./src/dispatch/provider");

test("stops at maxAttempts calls", async () => {
  const send = makeSender(99);
  const result = await withRetries(send, 3);
  expect(send.calls()).toBe(3);
  expect(result).toEqual({ ok: false, attempts: 3, error: "provider_unavailable" });
});

test("succeeds on the first call without retrying", async () => {
  const send = makeSender(0);
  const result = await withRetries(send, 3);
  expect(send.calls()).toBe(1);
  expect(result).toEqual({ ok: true, attempts: 1, result: { delivered: true, onCall: 1 } });
});

test("recovers on a later attempt", async () => {
  const send = makeSender(2);
  const result = await withRetries(send, 3);
  expect(result.ok).toBe(true);
  expect(result.attempts).toBe(3);
});

test("maxAttempts of 1 means no retry", async () => {
  const send = makeSender(99);
  const result = await withRetries(send, 1);
  expect(send.calls()).toBe(1);
  expect(result.attempts).toBe(1);
});
`,
    postmortem:
      "The loop condition `attempt <= maxAttempts` ran one extra iteration because attempt is incremented inside the body — with maxAttempts 3 it made 4 calls. `attempt < maxAttempts` bounds the loop to exactly the allowed number of attempts.",
  },
];
