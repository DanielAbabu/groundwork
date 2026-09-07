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
      "Two thousand welcome emails went out saying 'Hi undefined'. The user records are complete — the send path is reading data that hasn't arrived yet.",
    webPreview: {
      url: "http://localhost:8000/api/v1/notifications/welcome",
      method: "POST",
      appName: "NOTIFICATIONS & TRANSACTIONAL EMAIL WORKER",
      description: "Welcome email template compilation worker endpoint",
      defaultPayload: { userId: "u_1" }
    },
    files: [
      {
        path: "src/notifications/welcome.js",
        content: `/**
 * Notifications Service - Welcome Email Pipeline
 */

const { fetchUser } = require("./repo");

class EmailRenderingError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "EmailRenderingError";
  }
}

/**
 * Builds personalized welcome email object for newly registered users.
 *
 * @param {string} userId - Unique account user identifier
 * @returns {Promise<{to: string, subject: string, body: string}>}
 */
async function buildWelcomeEmail(userId) {
  if (!userId) {
    throw new EmailRenderingError("Cannot render email: missing userId");
  }

  const user = await fetchUser(userId);

  return {
    to: user.email,
    subject: "Welcome to Groundwork",
    body: \`Hi \${user.firstName}, your workspace is ready.\`,
  };
}

module.exports = { buildWelcomeEmail, EmailRenderingError };
`,
      },
      {
        path: "src/notifications/repo.js",
        context: true,
        content: `/**
 * User Profile Repository Adapter
 */

const USERS = {
  u_1: { email: "ada@example.com", firstName: "Ada" },
  u_2: { email: "grace@example.com", firstName: "Grace" },
};

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
      "Long-running browser sessions experience 401 errors after an hour. The token store refreshes in the background, but the HTTP client keeps using the initial token.",
    webPreview: {
      url: "http://localhost:8000/api/v1/gateway/dispatch",
      method: "GET",
      appName: "API GATEWAY AUTHENTICATED HTTP CLIENT",
      description: "OAuth 2.1 token store & bearer header generator",
    },
    files: [
      {
        path: "src/api/client.js",
        content: `/**
 * API Gateway Client - Authenticated Fetcher
 */

const { getToken } = require("./token-store");

/**
 * Dispatches an HTTP request formatted with active bearer authorization header.
 *
 * @param {string} url - Target endpoint URI
 */
async function fetchWithAuth(url) {
  const currentToken = getToken();
  return {
    url,
    headers: { Authorization: \`Bearer \${currentToken}\` },
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
      "Rapidly clicking the payment button submits duplicate charges to the payment gateway. The payment processor needs to lock concurrent requests for the same payment ID.",
    webPreview: {
      url: "http://localhost:8000/api/v1/payments/process",
      method: "POST",
      appName: "PAYMENTS GATEWAY MUTEX ENGINE",
      description: "Payment concurrency control & idempotent lock server",
      defaultPayload: { paymentId: "pay_100", amount: 50 }
    },
    files: [
      {
        path: "src/payments/processor.js",
        content: `/**
 * Payments Subsystem - Idempotent Payment Processor
 */

const { chargeGateway } = require("./gateway");

const pending = new Set();

/**
 * Processes a payment transaction ensuring strict idempotency per payment ID.
 *
 * @param {string} paymentId - Unique payment attempt transaction ID
 * @param {number} amount - Charge amount
 */
async function processPayment(paymentId, amount) {
  if (pending.has(paymentId)) {
    throw new Error(\`Duplicate payment request already in progress for \${paymentId}\`);
  }

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
      "Nightly data exports crash with heap memory exhaustion when processing large datasets. Unbounded Promise.all execution launches every item concurrently.",
    webPreview: {
      url: "http://localhost:8000/api/v1/exporter/batch",
      method: "POST",
      appName: "LARGE SCALE DATA EXPORTER PIPELINE",
      description: "Batch data transformation & stream export pipeline",
      defaultPayload: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }
    },
    files: [
      {
        path: "src/exporter/batch.js",
        content: `/**
 * Data Exporter Subsystem - Batch Stream Processor
 */

const { processItem } = require("./worker");

/**
 * Exports all items while controlling memory pressure.
 *
 * @param {Array<Object>} items - Array of data records to process
 */
async function exportAllBatches(items) {
  const results = [];
  for (const item of items) {
    const res = await processItem(item);
    results.push(res);
  }
  return results;
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
