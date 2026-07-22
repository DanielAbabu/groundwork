import type { Scenario } from "@/lib/scenarios/types";

/**
 * Shared in-memory mock database used by the Type B scenarios.
 * Deterministic: the seed is a literal and every query() call works on a copy,
 * so the hidden tests always see the same rows.
 */
function dbSource(seed: string) {
  return `// Tiny in-memory database. Seeded data is fixed; every query works on a copy.
const data = ${seed};

function query(table) {
  let rows = (data[table] || []).map((row) => ({ ...row }));
  const api = {
    where(field, value) {
      rows = rows.filter((row) => row[field] === value);
      return api;
    },
    whereIn(field, values) {
      rows = rows.filter((row) => values.includes(row[field]));
      return api;
    },
    whereNot(field, value) {
      rows = rows.filter((row) => row[field] !== value);
      return api;
    },
    orderBy(field) {
      rows = rows.slice().sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0));
      return api;
    },
    limit(n) {
      rows = rows.slice(0, n);
      return api;
    },
    all() {
      return rows;
    },
    first() {
      return rows.length ? rows[0] : null;
    },
    count() {
      return rows.length;
    },
  };
  return api;
}

module.exports = { query, data };
`;
}

const userSeed = `{
  users: [
    { id: "u_1", email: "ada@example.com", name: "Ada Lovelace", org_id: "o_1", status: "active" },
    { id: "u_2", email: "grace@example.com", name: "Grace Hopper", org_id: "o_1", status: "active" },
    { id: "u_3", email: "alan@example.com", name: "Alan Turing", org_id: "o_2", status: "suspended" },
    { id: "u_4", email: "edsger@example.com", name: "Edsger Dijkstra", org_id: "o_2", status: "active" },
    { id: "u_5", email: "barbara@example.com", name: "Barbara Liskov", org_id: "o_3", status: "active" },
  ],
}`;

export const typeBScenarios: Scenario[] = [
  {
    id: "user-lookup-wrong-field",
    title: "Profile page 404s for every user",
    service: "accounts-api",
    severity: "SEV-1",
    type: "B",
    difficulty: "starter",
    symptom: "GET /users/:id returns 404 for ids that definitely exist",
    framing:
      "Support has 60 tickets in an hour: everyone's profile page says the account does not exist. The rows are still in the database — the lookup is asking the wrong question.",
    files: [
      {
        path: "src/routes/users.js",
        context: true,
        content: `const { findUserById } = require("../data/users");

function getUser(req) {
  const user = findUserById(req.params.id);
  if (!user) return { status: 404, body: { error: "not_found" } };
  return { status: 200, body: user };
}

module.exports = { getUser };
`,
      },
      {
        path: "src/data/users.js",
        content: `const { query } = require("../db");

function findUserById(id) {
  return query("users").where("email", id).first();
}

module.exports = { findUserById };
`,
      },
      {
        path: "src/db.js",
        context: true,
        content: dbSource(userSeed),
      },
    ],
    signal: `FAIL src/data/__tests__/users.test.js
  ● findUserById › returns the matching user

    expected 1 user, got 0

    expected: { id: "u_2", email: "grace@example.com", name: "Grace Hopper", org_id: "o_1", status: "active" }
    received: null

      at Object.<anonymous> (src/data/__tests__/users.test.js:6:34)`,
    testPath: "hidden.test.js",
    testContent: `const { findUserById } = require("./src/data/users");
const { getUser } = require("./src/routes/users");

test("finds a user by id", () => {
  expect(findUserById("u_2")).toEqual({
    id: "u_2",
    email: "grace@example.com",
    name: "Grace Hopper",
    org_id: "o_1",
    status: "active",
  });
});

test("finds a different user by id", () => {
  expect(findUserById("u_5").name).toBe("Barbara Liskov");
});

test("unknown ids still return null", () => {
  expect(findUserById("u_999")).toBe(null);
});

test("an email is not a valid id", () => {
  expect(findUserById("ada@example.com")).toBe(null);
});

test("the route returns 200 for a real user", () => {
  expect(getUser({ params: { id: "u_1" } }).status).toBe(200);
});
`,
    postmortem:
      "The query filtered on the email column while the route passes an id, so nothing ever matched and the route returned 404. Filtering on id fixes it — and note that matching an email would have made the id parameter interchangeable with an email, which the tests now forbid.",
  },
  {
    id: "subscriptions-missing-filter",
    title: "Cancelled customers are still being billed",
    service: "billing-worker",
    severity: "SEV-1",
    type: "B",
    difficulty: "starter",
    symptom: "The nightly charge run picked up every subscription, not just active ones",
    framing:
      "The nightly job charged 6 customers who cancelled weeks ago. Refunds are going out manually. The job iterates whatever the data layer hands it — so the data layer is handing it too much.",
    files: [
      {
        path: "src/jobs/charge.js",
        context: true,
        content: `const { listActiveSubscriptions } = require("../data/subscriptions");

function runChargeJob() {
  return listActiveSubscriptions().map((sub) => ({
    subscription_id: sub.id,
    amount_cents: sub.amount_cents,
  }));
}

module.exports = { runChargeJob };
`,
      },
      {
        path: "src/data/subscriptions.js",
        content: `const { query } = require("../db");

// Should return only subscriptions with status "active", oldest first by id.
function listActiveSubscriptions() {
  return query("subscriptions").orderBy("id").all();
}

module.exports = { listActiveSubscriptions };
`,
      },
      {
        path: "src/db.js",
        context: true,
        content: dbSource(`{
  subscriptions: [
    { id: "s_1", customer: "ada", status: "active", amount_cents: 2900 },
    { id: "s_2", customer: "grace", status: "cancelled", amount_cents: 2900 },
    { id: "s_3", customer: "alan", status: "active", amount_cents: 9900 },
    { id: "s_4", customer: "edsger", status: "past_due", amount_cents: 2900 },
    { id: "s_5", customer: "barbara", status: "cancelled", amount_cents: 4900 },
    { id: "s_6", customer: "john", status: "active", amount_cents: 1900 },
  ],
}`),
      },
    ],
    signal: `FAIL src/jobs/__tests__/charge.test.js
  ● runChargeJob › only charges active subscriptions

    expected 3 subscriptions, got 6

    expected: [ "s_1", "s_3", "s_6" ]
    received: [ "s_1", "s_2", "s_3", "s_4", "s_5", "s_6" ]

      at Object.<anonymous> (src/jobs/__tests__/charge.test.js:8:41)`,
    testPath: "hidden.test.js",
    testContent: `const { listActiveSubscriptions } = require("./src/data/subscriptions");
const { runChargeJob } = require("./src/jobs/charge");

test("returns only active subscriptions", () => {
  expect(listActiveSubscriptions().map((s) => s.id)).toEqual(["s_1", "s_3", "s_6"]);
});

test("cancelled subscriptions are excluded", () => {
  expect(listActiveSubscriptions().some((s) => s.status === "cancelled")).toBe(false);
});

test("past_due is not active either", () => {
  expect(listActiveSubscriptions().some((s) => s.status === "past_due")).toBe(false);
});

test("ordering by id is preserved", () => {
  const ids = listActiveSubscriptions().map((s) => s.id);
  expect(ids).toEqual(ids.slice().sort());
});

test("the charge job only bills the active three", () => {
  expect(runChargeJob()).toEqual([
    { subscription_id: "s_1", amount_cents: 2900 },
    { subscription_id: "s_3", amount_cents: 9900 },
    { subscription_id: "s_6", amount_cents: 1900 },
  ]);
});
`,
    postmortem:
      "listActiveSubscriptions() had no status filter, so it returned every row and the job charged cancelled and past-due customers. Adding .where(\"status\", \"active\") restores the intended result set.",
  },
  {
    id: "orders-wrong-join-key",
    title: "Order history shows other people's orders",
    service: "orders-api",
    severity: "SEV-1",
    type: "B",
    difficulty: "routine",
    symptom: "ordersForUser() returns one unrelated order instead of that user's orders",
    framing:
      "A customer emailed a screenshot of someone else's order in their history. This is a data-exposure incident: the join is matching the wrong columns.",
    files: [
      {
        path: "src/data/orders.js",
        content: `const { query } = require("../db");

// Should return every order belonging to userId, oldest first by id,
// each shaped as { id, total_cents, customer_email }.
function ordersForUser(userId) {
  const user = query("users").where("id", userId).first();
  if (!user) return [];

  const orders = query("orders")
    .where("id", userId)
    .orderBy("id")
    .all();

  return orders.map((order) => ({
    id: order.id,
    total_cents: order.total_cents,
    customer_email: user.email,
  }));
}

module.exports = { ordersForUser };
`,
      },
      {
        path: "src/db.js",
        context: true,
        content: dbSource(`{
  users: [
    { id: "u_1", email: "ada@example.com" },
    { id: "u_2", email: "grace@example.com" },
  ],
  orders: [
    { id: "u_1", user_id: "u_2", total_cents: 9900 },
    { id: "o_2", user_id: "u_1", total_cents: 1200 },
    { id: "o_3", user_id: "u_1", total_cents: 4500 },
    { id: "o_4", user_id: "u_2", total_cents: 300 },
  ],
}`),
      },
    ],
    signal: `FAIL src/data/__tests__/orders.test.js
  ● ordersForUser › returns the user's own orders

    expected 2 orders, got 1

    expected: [ { id: "o_2", total_cents: 1200, ... }, { id: "o_3", total_cents: 4500, ... } ]
    received: [ { id: "u_1", total_cents: 9900, customer_email: "ada@example.com" } ]

    note: order "u_1" belongs to user_id "u_2"`,
    testPath: "hidden.test.js",
    testContent: `const { ordersForUser } = require("./src/data/orders");

test("returns only that user's orders", () => {
  expect(ordersForUser("u_1")).toEqual([
    { id: "o_2", total_cents: 1200, customer_email: "ada@example.com" },
    { id: "o_3", total_cents: 4500, customer_email: "ada@example.com" },
  ]);
});

test("does not leak another user's order", () => {
  expect(ordersForUser("u_1").some((o) => o.total_cents === 9900)).toBe(false);
});

test("works for the second user too", () => {
  expect(ordersForUser("u_2").map((o) => o.id)).toEqual(["o_4", "u_1"]);
});

test("unknown users get an empty list", () => {
  expect(ordersForUser("u_999")).toEqual([]);
});
`,
    postmortem:
      "The orders query joined on the orders table's own id column instead of its user_id foreign key. Because one order id happened to collide with a user id, the query returned a stranger's order. Filtering on user_id is the fix.",
  },
  {
    id: "projects-archived-rows",
    title: "Archived projects reappeared in the sidebar",
    service: "workspace-api",
    severity: "SEV-2",
    type: "B",
    difficulty: "routine",
    symptom: "listProjects() returns archived and deleted rows alongside live ones",
    framing:
      "Customers who cleaned up their workspace last quarter are seeing all of it back. Nothing was restored — the read path stopped filtering.",
    files: [
      {
        path: "src/data/projects.js",
        content: `const { query } = require("../db");

// Should return the workspace's projects that are neither archived nor deleted,
// ordered by name.
function listProjects(workspaceId) {
  return query("projects")
    .where("workspace_id", workspaceId)
    .orderBy("name")
    .all();
}

module.exports = { listProjects };
`,
      },
      {
        path: "src/routes/sidebar.js",
        context: true,
        content: `const { listProjects } = require("../data/projects");

function sidebar(workspaceId) {
  return listProjects(workspaceId).map((project) => project.name);
}

module.exports = { sidebar };
`,
      },
      {
        path: "src/db.js",
        context: true,
        content: dbSource(`{
  projects: [
    { id: "p_1", workspace_id: "w_1", name: "Apollo", state: "live" },
    { id: "p_2", workspace_id: "w_1", name: "Borealis", state: "archived" },
    { id: "p_3", workspace_id: "w_1", name: "Cinder", state: "live" },
    { id: "p_4", workspace_id: "w_1", name: "Dune", state: "deleted" },
    { id: "p_5", workspace_id: "w_2", name: "Elm", state: "live" },
  ],
}`),
      },
    ],
    signal: `FAIL src/data/__tests__/projects.test.js
  ● listProjects › hides archived and deleted projects

    expected 2 projects, got 4

    expected: [ "Apollo", "Cinder" ]
    received: [ "Apollo", "Borealis", "Cinder", "Dune" ]`,
    testPath: "hidden.test.js",
    testContent: `const { listProjects } = require("./src/data/projects");
const { sidebar } = require("./src/routes/sidebar");

test("returns only live projects for the workspace", () => {
  expect(listProjects("w_1").map((p) => p.name)).toEqual(["Apollo", "Cinder"]);
});

test("archived projects stay hidden", () => {
  expect(listProjects("w_1").some((p) => p.state === "archived")).toBe(false);
});

test("deleted projects stay hidden", () => {
  expect(listProjects("w_1").some((p) => p.state === "deleted")).toBe(false);
});

test("other workspaces are unaffected", () => {
  expect(listProjects("w_2").map((p) => p.name)).toEqual(["Elm"]);
});

test("the sidebar renders the live names in order", () => {
  expect(sidebar("w_1")).toEqual(["Apollo", "Cinder"]);
});
`,
    postmortem:
      "The read query filtered by workspace but never by state, so archived and deleted rows came back with the live ones. Restricting the query to live projects fixes the sidebar without touching the rows themselves.",
  },
];
