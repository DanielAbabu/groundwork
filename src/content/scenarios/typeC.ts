import type { Scenario } from "@/lib/scenarios/types";

export const typeCScenarios: Scenario[] = [
  {
    id: "missing-await-profile",
    title: "Welcome emails go out addressed to 'undefined'",
    service: "notifications",
    severity: "SEV-2",
    type: "C",
    difficulty: "starter",
    symptom: "buildWelcomeEmail() resolves with `to: undefined` and a blank first name",
    framing:
      "INCIDENT SUMMARY:\nOver 2,000 automated welcome emails were sent out to newly onboarded users rendered as 'Hi undefined'. While user profile records exist in the database, the email worker attempts to read fields off an unresolved Promise object.\n\nARCHITECTURE & REASONING:\n`buildWelcomeEmail(userId)` in `src/notifications/welcome.js` calls `fetchUser(userId)` from `src/notifications/repo.js`. `fetchUser` returns a Promise that resolves after a database round-trip. Because `fetchUser` was invoked without `await`, `user` evaluates to a Promise object instead of the user data record (`user.email` -> `undefined`).\n\nOBJECTIVES:\n1. Update `buildWelcomeEmail(userId)` to `await fetchUser(userId)` before populating email fields.",
    files: [
      {
        path: "src/notifications/welcome.js",
        content: `const { fetchUser } = require("./repo");

// Should resolve with { to, subject, body } for the given user id.
async function buildWelcomeEmail(userId) {
  const user = fetchUser(userId);
  return {
    to: user.email,
    subject: "Welcome to Incident",
    body: \`Hi \${user.firstName}, your workspace is ready.\`,
  };
}

module.exports = { buildWelcomeEmail };
`,
      },
      {
        path: "src/notifications/repo.js",
        context: true,
        content: `const USERS = {
  u_1: { email: "ada@example.com", firstName: "Ada" },
  u_2: { email: "grace@example.com", firstName: "Grace" },
};

// Simulates a database round-trip.
function fetchUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = USERS[id];
      if (!user) reject(new Error("user_not_found"));
      else resolve(user);
    }, 5);
  });
}

module.exports = { fetchUser };
`,
      },
    ],
    signal: `TypeError: Cannot read properties of undefined (reading 'email')
  ...unhandled in production; in tests it surfaces as:

FAIL src/notifications/__tests__/welcome.test.js
  ● buildWelcomeEmail › addresses the user

    expected: { to: "ada@example.com", body: "Hi Ada..." }
    received: { to: undefined, body: "Hi undefined..." }`,
    testPath: "hidden.test.js",
    testContent: `const { buildWelcomeEmail } = require("./src/notifications/welcome");

test("builds personalized welcome email", async () => {
  const email = await buildWelcomeEmail("u_1");
  expect(email.to).toBe("ada@example.com");
  expect(email.body).toContain("Hi Ada");
});
`,
    postmortem:
      "buildWelcomeEmail() omitted 'await' on fetchUser(), reading properties off an unfulfilled Promise object. Adding await resolved the user record.",
  },
  {
    id: "stale-closure-token",
    title: "API requests keep using expired auth token",
    service: "gateway-client",
    severity: "SEV-2",
    type: "C",
    difficulty: "starter",
    symptom: "HTTP 401 Unauthorized errors persist after background token refresh",
    framing:
      "INCIDENT SUMMARY:\nLong-running browser client sessions experience continuous HTTP 401 Unauthorized errors after 60 minutes of inactivity. Although background refresh timers acquire a fresh OAuth bearer token, API request helpers continue sending the original expired token string.\n\nARCHITECTURE & REASONING:\n`fetchWithAuth(url)` in `src/api/client.js` captures `currentToken` in a closure or evaluation cache at initialization time without invoking `getToken()` dynamically per request, causing requests to transmit stale headers.\n\nOBJECTIVES:\n1. Update `fetchWithAuth(url)` to call `getToken()` on every request to fetch the latest active access token.",
    files: [
      {
        path: "src/api/client.js",
        content: `const { getToken } = require("./token-store");

const cachedToken = getToken();

async function fetchWithAuth(url) {
  return {
    url,
    headers: { Authorization: \`Bearer \${cachedToken}\` },
  };
}

module.exports = { fetchWithAuth };
`,
      },
      {
        path: "src/api/token-store.js",
        context: true,
        content: `let activeToken = "token_initial";

function setToken(t) { activeToken = t; }
function getToken() { return activeToken; }

module.exports = { setToken, getToken };
`,
      },
    ],
    signal: `FAIL src/api/__tests__/client.test.js
  ● fetchWithAuth › reflects refreshed token

    expected header: "Bearer token_refreshed"
    received header: "Bearer token_initial"`,
    testPath: "hidden.test.js",
    testContent: `const { fetchWithAuth } = require("./src/api/client");
const { setToken } = require("./src/api/token-store");

test("fetches with updated token", async () => {
  setToken("token_refreshed");
  const res = await fetchWithAuth("/api/data");
  expect(res.headers.Authorization).toBe("Bearer token_refreshed");
});
`,
    postmortem:
      "cachedToken stored the token string once at module load time. Calling getToken() dynamically inside fetchWithAuth() ensures updated tokens are transmitted.",
  },
  {
    id: "race-condition-double-submit",
    title: "Double clicks create duplicate charges",
    service: "payments-api",
    severity: "SEV-1",
    type: "C",
    difficulty: "routine",
    symptom: "Rapid POST /pay calls issue duplicate payment requests to payment gateway",
    framing:
      "INCIDENT SUMMARY:\nCustomers with slow network connections clicking the 'Pay Now' button multiple times inadvertently generate duplicate transactions. The payment processing handler fails to guard against concurrent request execution.\n\nARCHITECTURE & REASONING:\n`processPayment(paymentId, amount)` in `src/payments/processor.js` must track pending request locks or verify idempotency status before initiating gateway calls. If an in-flight request exists for `paymentId`, subsequent concurrent requests must be rejected or returned immediately.\n\nOBJECTIVES:\n1. Implement an in-flight request mutex/lock set in `src/payments/processor.js` to block concurrent duplicate submissions.",
    files: [
      {
        path: "src/payments/processor.js",
        content: `const { chargeGateway } = require("./gateway");

const pending = new Set();

async function processPayment(paymentId, amount) {
  // TODO: lock paymentId in pending set while processing, reject duplicates
  pending.add(paymentId);
  try {
    const res = await chargeGateway(paymentId, amount);
    return res;
  } finally {
    pending.delete(paymentId);
  }
}

module.exports = { processPayment };
`,
      },
      {
        path: "src/payments/gateway.js",
        context: true,
        content: `async function chargeGateway(id, amount) {
  await new Promise(r => setTimeout(r, 10));
  return { status: "success", txId: \`tx_\${id}\`, amount };
}
module.exports = { chargeGateway };
`,
      },
    ],
    signal: `FAIL src/payments/__tests__/processor.test.js
  ● processPayment › prevents concurrent duplicate payments

    expected: second call throws "duplicate_request" or returns existing promise
    received: gateway charged twice for same paymentId`,
    testPath: "hidden.test.js",
    testContent: `const { processPayment } = require("./src/payments/processor");

test("blocks concurrent duplicate payment attempts", async () => {
  const p1 = processPayment("pay_100", 50);
  await expect(processPayment("pay_100", 50)).rejects.toThrow();
  await p1;
});
`,
    postmortem:
      "Checking `pending.has(paymentId)` before adding to the set and throwing an error for duplicate requests prevents concurrent charge execution.",
  },
  {
    id: "unbounded-promise-all",
    title: "Batch export crashes node process with OOM",
    service: "data-exporter",
    severity: "SEV-1",
    type: "C",
    difficulty: "tricky",
    symptom: "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory",
    framing:
      "INCIDENT SUMMARY:\nThe nightly data export pipeline crashed with an Out Of Memory (OOM) error when attempting to process 50,000 user records. The exporter attempted to fire all HTTP batch requests simultaneously using `Promise.all()` without concurrency limiting.\n\nARCHITECTURE & REASONING:\n`exportAllBatches(items, batchSize)` in `src/exporter/batch.js` launches an unbounded array of Promises. When `items.length` is large, thousands of unfulfilled promises exhaust V8 heap memory.\n\nOBJECTIVES:\n1. Refactor `exportAllBatches(items, batchSize)` to process batches sequentially or with controlled concurrency chunking.",
    files: [
      {
        path: "src/exporter/batch.js",
        content: `const { processItem } = require("./worker");

async function exportAllBatches(items) {
  // Bug: unbounded Promise.all launches all promises at once
  return Promise.all(items.map(item => processItem(item)));
}

module.exports = { exportAllBatches };
`,
      },
      {
        path: "src/exporter/worker.js",
        context: true,
        content: `async function processItem(item) {
  return { id: item.id, status: "exported" };
}
module.exports = { processItem };
`,
      },
    ],
    signal: `FAIL src/exporter/__tests__/batch.test.js
  ● exportAllBatches › runs items sequentially in controlled chunks`,
    testPath: "hidden.test.js",
    testContent: `const { exportAllBatches } = require("./src/exporter/batch");

test("exports items successfully", async () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const results = await exportAllBatches(items);
  expect(results.length).toBe(3);
  expect(results[0].status).toBe("exported");
});
`,
    postmortem:
      "Replacing unbounded Promise.all with sequential chunked loop processing prevented memory exhaustion while retaining output order.",
  },
];
