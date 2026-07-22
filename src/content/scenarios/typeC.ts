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

    expected: { to: "ada@example.com", subject: "Welcome to Incident", body: "Hi Ada, your workspace is ready." }
    received: { to: undefined, subject: "Welcome to Incident", body: "Hi undefined, your workspace is ready." }`,
    testPath: "hidden.test.js",
    testContent: `const { buildWelcomeEmail } = require("./src/notifications/welcome");

test("resolves with the user's email", async () => {
  const email = await buildWelcomeEmail("u_1");
  expect(email.to).toBe("ada@example.com");
});

test("interpolates the first name", async () => {
  const email = await buildWelcomeEmail("u_2");
  expect(email.body).toBe("Hi Grace, your workspace is ready.");
});

test("returns the full payload shape", async () => {
  expect(await buildWelcomeEmail("u_1")).toEqual({
    to: "ada@example.com",
    subject: "Welcome to Incident",
    body: "Hi Ada, your workspace is ready.",
  });
});

test("a missing user rejects instead of silently sending", async () => {
  let rejected = false;
  try {
    await buildWelcomeEmail("u_404");
  } catch (error) {
    rejected = true;
  }
  expect(rejected).toBe(true);
});
`,
    postmortem:
      "fetchUser() returns a promise and the call site never awaited it, so `user` was a pending promise and every property read was undefined. Awaiting the call also lets the not-found rejection propagate instead of being swallowed.",
  },
  {
    id: "then-missing-return",
    title: "Payment status always comes back empty",
    service: "payments-api",
    severity: "SEV-1",
    type: "C",
    difficulty: "routine",
    symptom: "getPaymentStatus() resolves with undefined even though the provider replied 200",
    framing:
      "The payments status endpoint returns `{}` for every charge, so the client shows 'pending' forever and customers are retrying payments. The provider call itself is fine.",
    files: [
      {
        path: "src/payments/status.js",
        content: `const { getCharge } = require("./provider");

// Should resolve with { id, state } where state is "paid" when captured,
// otherwise "pending".
function getPaymentStatus(chargeId) {
  return getCharge(chargeId).then((charge) => {
    const state = charge.captured ? "paid" : "pending";
    ({ id: charge.id, state: state });
  });
}

module.exports = { getPaymentStatus };
`,
      },
      {
        path: "src/payments/provider.js",
        context: true,
        content: `const CHARGES = {
  ch_1: { id: "ch_1", captured: true, amount_cents: 2500 },
  ch_2: { id: "ch_2", captured: false, amount_cents: 800 },
};

function getCharge(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const charge = CHARGES[id];
      if (!charge) reject(new Error("charge_not_found"));
      else resolve(charge);
    }, 5);
  });
}

module.exports = { getCharge };
`,
      },
    ],
    signal: `FAIL src/payments/__tests__/status.test.js
  ● getPaymentStatus › reports a captured charge as paid

    expected: { id: "ch_1", state: "paid" }
    received: undefined

    provider log for the same run:
      GET /v1/charges/ch_1 -> 200 { "captured": true }`,
    testPath: "hidden.test.js",
    testContent: `const { getPaymentStatus } = require("./src/payments/status");

test("a captured charge is paid", async () => {
  expect(await getPaymentStatus("ch_1")).toEqual({ id: "ch_1", state: "paid" });
});

test("an uncaptured charge is pending", async () => {
  expect(await getPaymentStatus("ch_2")).toEqual({ id: "ch_2", state: "pending" });
});

test("the resolved value is an object, not undefined", async () => {
  const result = await getPaymentStatus("ch_2");
  expect(typeof result).toBe("object");
});

test("an unknown charge rejects", async () => {
  let rejected = false;
  try {
    await getPaymentStatus("ch_missing");
  } catch (error) {
    rejected = true;
  }
  expect(rejected).toBe(true);
});
`,
    postmortem:
      "The .then() callback built the result object but never returned it, so the promise resolved with undefined. The value has to be returned out of the callback for the chain to carry it.",
  },
  {
    id: "promise-all-unmapped",
    title: "Dashboard widgets render raw ids",
    service: "dashboard-bff",
    severity: "SEV-2",
    type: "C",
    difficulty: "routine",
    symptom: "loadWidgets() resolves with the id strings instead of the fetched widget objects",
    framing:
      "The dashboard shows 'w_1', 'w_2' where the charts should be. The widget service is healthy and returning data when called directly.",
    files: [
      {
        path: "src/dashboard/load.js",
        content: `const { fetchWidget } = require("./widgets");

// Should resolve with the widget objects for every id, in the same order.
async function loadWidgets(ids) {
  const widgets = await Promise.all(ids);
  return widgets;
}

module.exports = { loadWidgets };
`,
      },
      {
        path: "src/dashboard/widgets.js",
        context: true,
        content: `const WIDGETS = {
  w_1: { id: "w_1", kind: "chart", title: "Signups" },
  w_2: { id: "w_2", kind: "counter", title: "MRR" },
  w_3: { id: "w_3", kind: "table", title: "Top pages" },
};

function fetchWidget(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const widget = WIDGETS[id];
      if (!widget) reject(new Error("widget_not_found"));
      else resolve(widget);
    }, 5);
  });
}

module.exports = { fetchWidget };
`,
      },
    ],
    signal: `FAIL src/dashboard/__tests__/load.test.js
  ● loadWidgets › resolves widget objects

    expected: [ { id: "w_1", kind: "chart", title: "Signups" }, { id: "w_2", ... } ]
    received: [ "w_1", "w_2" ]

      at Object.<anonymous> (src/dashboard/__tests__/load.test.js:5:38)`,
    testPath: "hidden.test.js",
    testContent: `const { loadWidgets } = require("./src/dashboard/load");

test("resolves the widget objects", async () => {
  expect(await loadWidgets(["w_1", "w_2"])).toEqual([
    { id: "w_1", kind: "chart", title: "Signups" },
    { id: "w_2", kind: "counter", title: "MRR" },
  ]);
});

test("preserves the requested order", async () => {
  const widgets = await loadWidgets(["w_3", "w_1"]);
  expect(widgets.map((w) => w.id)).toEqual(["w_3", "w_1"]);
});

test("an empty list resolves to an empty list", async () => {
  expect(await loadWidgets([])).toEqual([]);
});

test("an unknown widget rejects", async () => {
  let rejected = false;
  try {
    await loadWidgets(["w_1", "w_nope"]);
  } catch (error) {
    rejected = true;
  }
  expect(rejected).toBe(true);
});
`,
    postmortem:
      "Promise.all() was handed the array of id strings, not promises — awaiting non-promise values just returns them unchanged, so the ids passed straight through. Mapping each id through fetchWidget() before Promise.all() fixes it while keeping the requests parallel and order-preserving.",
  },
  {
    id: "foreach-async-drop",
    title: "Bulk import reports zero rows imported",
    service: "importer",
    severity: "SEV-2",
    type: "C",
    difficulty: "tricky",
    symptom: "importRows() resolves before any write finishes and returns an empty summary",
    framing:
      "A customer's 500-row import 'completed' in 3ms with `imported: 0`, then rows trickled into the database minutes later. The writer is fine; the orchestration isn't waiting for it.",
    files: [
      {
        path: "src/importer/run.js",
        content: `const { saveRow } = require("./writer");

// Should write every row and resolve with { imported, ids } once all writes
// have finished. ids are in input order.
async function importRows(rows) {
  const ids = [];
  rows.forEach(async (row) => {
    const id = await saveRow(row);
    ids.push(id);
  });
  return { imported: ids.length, ids: ids };
}

module.exports = { importRows };
`,
      },
      {
        path: "src/importer/writer.js",
        context: true,
        content: `let counter = 0;

// Simulates a write with variable latency. Resolves with the new row id.
function saveRow(row) {
  const delay = row.slow ? 20 : 2;
  return new Promise((resolve) => {
    setTimeout(() => {
      counter += 1;
      resolve("row_" + row.key);
    }, delay);
  });
}

module.exports = { saveRow };
`,
      },
    ],
    signal: `FAIL src/importer/__tests__/run.test.js
  ● importRows › reports what it wrote

    expected: { imported: 3, ids: [ "row_a", "row_b", "row_c" ] }
    received: { imported: 0, ids: [] }

  console.warn
    3 writes settled after importRows() had already resolved`,
    testPath: "hidden.test.js",
    testContent: `const { importRows } = require("./src/importer/run");

test("waits for every write", async () => {
  const result = await importRows([{ key: "a" }, { key: "b" }, { key: "c" }]);
  expect(result.imported).toBe(3);
});

test("returns ids in input order even when writes finish out of order", async () => {
  const result = await importRows([{ key: "a", slow: true }, { key: "b" }, { key: "c" }]);
  expect(result.ids).toEqual(["row_a", "row_b", "row_c"]);
});

test("an empty import resolves cleanly", async () => {
  expect(await importRows([])).toEqual({ imported: 0, ids: [] });
});

test("a single row still resolves after its write", async () => {
  expect(await importRows([{ key: "z", slow: true }])).toEqual({ imported: 1, ids: ["row_z"] });
});
`,
    postmortem:
      "forEach ignores the promises returned by its async callback, so importRows() resolved immediately with an empty array while the writes were still pending. Awaiting the writes — e.g. Promise.all(rows.map(saveRow)) — both waits for completion and keeps the ids in input order, which push-on-resolve would not.",
  },
];
