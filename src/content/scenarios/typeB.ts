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
      "INCIDENT SUMMARY:\nCustomer support received 60+ tickets in the past hour from users unable to view account profile pages. Navigating to `/users/u_1` returns HTTP 404 'not_found' error responses despite the database containing valid user records.\n\nARCHITECTURE & REASONING:\n`getUser(req)` in `src/routes/users.js` parses `req.params.id` (e.g. `'u_1'`) and calls `findUserById(id)` in `src/data/users.js`. However, `findUserById` queries `.where('email', id)` instead of matching on the primary key `'id'` column!\n\nOBJECTIVES:\n1. Update `findUserById(id)` in `src/data/users.js` to query `.where('id', id)`.\n2. Ensure user records are returned properly when queried by primary key ID.",
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
  ● findUserById › finds user by ID

    expected: { id: "u_1", email: "ada@example.com", ... }
    received: null

    Query executing: query("users").where("email", "u_1")`,
    testPath: "hidden.test.js",
    testContent: `const { findUserById } = require("./src/data/users");

test("looks up user by ID", () => {
  const user = findUserById("u_1");
  expect(user).not.toBeNull();
  expect(user.email).toBe("ada@example.com");
});

test("returns null for non-existent ID", () => {
  expect(findUserById("u_99")).toBeNull();
});
`,
    postmortem:
      "findUserById() was querying the 'email' column with an ID argument. Changing the column parameter from 'email' to 'id' fixed the lookup.",
  },
  {
    id: "inactive-users-included",
    title: "Billing export includes suspended users",
    service: "billing-cron",
    severity: "SEV-2",
    type: "B",
    difficulty: "starter",
    symptom: "Monthly invoices charge orgs for suspended user accounts",
    framing:
      "INCIDENT SUMMARY:\nEnterprise clients reported being billed for suspended and inactive team members on their monthly invoices. The billing cron job invokes `findActiveUsers(orgId)` to determine billable seats, but suspended users are currently included in the count.\n\nARCHITECTURE & REASONING:\n`findActiveUsers(orgId)` in `src/data/active-users.js` filters user accounts by `org_id`. However, it omits filtering by `status === 'active'`. Suspended or deleted users retain their `org_id` value in storage, leading to over-billing.\n\nOBJECTIVES:\n1. Update `findActiveUsers(orgId)` to chain `.where('status', 'active')` along with the `org_id` filter.",
    files: [
      {
        path: "src/data/active-users.js",
        content: `const { query } = require("../db");

function findActiveUsers(orgId) {
  return query("users").where("org_id", orgId).all();
}

module.exports = { findActiveUsers };
`,
      },
      {
        path: "src/db.js",
        context: true,
        content: dbSource(userSeed),
      },
    ],
    signal: `FAIL src/data/__tests__/active-users.test.js
  ● findActiveUsers › excludes suspended users

    expected length: 1 (for org o_2)
    received length: 2 (includes suspended user Alan Turing)`,
    testPath: "hidden.test.js",
    testContent: `const { findActiveUsers } = require("./src/data/active-users");

test("returns active users for organization", () => {
  const users = findActiveUsers("o_1");
  expect(users.length).toBe(2);
});

test("excludes suspended users from count", () => {
  const users = findActiveUsers("o_2");
  expect(users.length).toBe(1);
  expect(users[0].name).toBe("Edsger Dijkstra");
});
`,
    postmortem:
      "findActiveUsers() filtered by org_id but missed filtering by status='active'. Chaining .where('status', 'active') resolved the billing issue.",
  },
  {
    id: "audit-log-tenant-leak",
    title: "Audit logs leak cross-tenant events",
    service: "audit-service",
    severity: "SEV-1",
    type: "B",
    difficulty: "routine",
    symptom: "GET /audit-logs displays security events belonging to other companies",
    framing:
      "INCIDENT SUMMARY:\nA high-severity security incident was flagged during a SOC2 compliance check: organization administrators viewing their audit dashboard could see security events belonging to external organizations.\n\nARCHITECTURE & REASONING:\n`queryLogsForTenant(tenantId)` in `src/audit/logs.js` executes queries against the `audit_logs` table. The existing query fails to scope log entries by `tenant_id`, returning un-partitioned security event records across all tenants.\n\nOBJECTIVES:\n1. Scope `queryLogsForTenant(tenantId)` to filter rows strictly matching `.where('tenant_id', tenantId)`.\n2. Ensure cross-tenant data leakage is completely eliminated.",
    files: [
      {
        path: "src/audit/logs.js",
        content: `const { query } = require("../db");

function queryLogsForTenant(tenantId) {
  return query("audit_logs").all();
}

module.exports = { queryLogsForTenant };
`,
      },
      {
        path: "src/db.js",
        context: true,
        content: dbSource(`{
  audit_logs: [
    { id: "l_1", tenant_id: "t_1", action: "user.login", timestamp: 100 },
    { id: "l_2", tenant_id: "t_2", action: "api_key.create", timestamp: 105 },
    { id: "l_3", tenant_id: "t_1", action: "user.logout", timestamp: 110 },
  ],
}`),
      },
    ],
    signal: `FAIL src/audit/__tests__/logs.test.js
  ● queryLogsForTenant › leaks logs across tenant boundaries

    expected: tenant t_1 logs only (length: 2)
    received: all logs (length: 3)`,
    testPath: "hidden.test.js",
    testContent: `const { queryLogsForTenant } = require("./src/audit/logs");

test("returns only logs for specified tenant", () => {
  const logs = queryLogsForTenant("t_1");
  expect(logs.length).toBe(2);
  expect(logs.every(l => l.tenant_id === "t_1")).toBe(true);
});
`,
    postmortem:
      "queryLogsForTenant() fetched all rows without tenant isolation. Adding .where('tenant_id', tenantId) fixed the tenant leak.",
  },
  {
    id: "or-where-clause-precedence",
    title: "Search results bypass date filters",
    service: "events-api",
    severity: "SEV-2",
    type: "B",
    difficulty: "tricky",
    symptom: "Date-restricted searches return events outside the requested date range",
    framing:
      "INCIDENT SUMMARY:\nSearch API queries with date restrictions are returning historical event logs from years outside the specified start/end boundary. When users apply a keyword search alongside date filters, logical operator precedence breaks the filtering boundary.\n\nARCHITECTURE & REASONING:\nIn `src/events/search.js`, `searchEvents(tenantId, keyword, startDate)` combines filters without proper logical grouping. `WHERE tenant_id = T AND (action = K OR message = K) AND created_at >= S` requires explicitly grouping OR conditions, otherwise un-parenthesized OR operations bypass tenant and date restrictions.\n\nOBJECTIVES:\n1. Fix query filtering in `src/events/search.js` to evaluate keyword matches within proper AND/OR precedence bounds.",
    files: [
      {
        path: "src/events/search.js",
        content: `const { query } = require("../db");

function searchEvents(tenantId, keyword, startDate) {
  // Returns events for tenant matching keyword in action OR message, created >= startDate
  const rows = query("events").where("tenant_id", tenantId).all();
  return rows.filter((r) => {
    // TODO: fix precedence bug where keyword OR bypasses date filter
    return r.created_at >= startDate && (r.action.includes(keyword) || r.message.includes(keyword));
  });
}

module.exports = { searchEvents };
`,
      },
      {
        path: "src/db.js",
        context: true,
        content: dbSource(`{
  events: [
    { id: "e_1", tenant_id: "t_1", action: "deploy.start", message: "deploying", created_at: 100 },
    { id: "e_2", tenant_id: "t_1", action: "deploy.fail", message: "error in build", created_at: 200 },
    { id: "e_3", tenant_id: "t_1", action: "user.signup", message: "new user", created_at: 50 },
  ],
}`),
      },
    ],
    signal: `FAIL src/events/__tests__/search.test.js
  ● searchEvents › respects start date filter when keyword matches message

    expected: events created_at >= 150 only (e_2)
    received: included e_1 or e_3 due to incorrect precedence`,
    testPath: "hidden.test.js",
    testContent: `const { searchEvents } = require("./src/events/search");

test("filters by tenant, date, and keyword properly", () => {
  const results = searchEvents("t_1", "deploy", 150);
  expect(results.length).toBe(1);
  expect(results[0].id).toBe("e_2");
});
`,
    postmortem:
      "The filter predicate failed to enforce all three criteria simultaneously due to misplaced parenthesis precedence. Grouping (action OR message) AND date AND tenant restored expected filter bounds.",
  },
];
