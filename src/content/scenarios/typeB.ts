import type { Scenario } from "@/lib/scenarios/types";

function dbSource(seed: string) {
  return `/**
 * Core Database Abstraction & ORM Query Builder Layer
 * Simulates a knex / django-style chained query interface over seeded SQL tables.
 */

const data = ${seed};

class DatabaseConnectionPool {
  constructor(seedData) {
    this.tables = JSON.parse(JSON.stringify(seedData));
  }

  table(tableName) {
    const rawRows = (this.tables[tableName] || []).map((row) => ({ ...row }));
    let rows = [...rawRows];

    const builder = {
      where(field, value) {
        rows = rows.filter((row) => row[field] === value);
        return builder;
      },
      whereIn(field, values) {
        const set = new Set(values);
        rows = rows.filter((row) => set.has(row[field]));
        return builder;
      },
      whereNot(field, value) {
        rows = rows.filter((row) => row[field] !== value);
        return builder;
      },
      orderBy(field, direction = "asc") {
        rows = rows.slice().sort((a, b) => {
          if (a[field] > b[field]) return direction === "asc" ? 1 : -1;
          if (a[field] < b[field]) return direction === "asc" ? -1 : 1;
          return 0;
        });
        return builder;
      },
      limit(n) {
        rows = rows.slice(0, n);
        return builder;
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
    return builder;
  }
}

const pool = new DatabaseConnectionPool(data);

function query(tableName) {
  return pool.table(tableName);
}

module.exports = { query, pool, data };
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
    webPreview: {
      url: "http://localhost:8000/api/v1/accounts/users/u_1",
      method: "GET",
      appName: "ACCOUNTS & USER DIRECTORY API",
      description: "User profile lookup service endpoint",
    },
    files: [
      {
        path: "src/routes/users.js",
        context: true,
        content: `/**
 * Accounts Subsystem - User HTTP Controller
 * Route: GET /api/v1/accounts/users/:id
 */

const { findUserById } = require("../data/users");

function getUser(req) {
  const userId = req && req.params ? req.params.id : null;
  if (!userId) {
    return { status: 400, body: { error: "bad_request", message: "Missing required parameter :id" } };
  }

  const user = findUserById(userId);
  if (!user) {
    return { status: 404, body: { error: "not_found", message: \`User '\${userId}' does not exist in accounts directory\` } };
  }

  return { status: 200, body: user };
}

module.exports = { getUser };
`,
      },
      {
        path: "src/data/users.js",
        content: `/**
 * User Repository Layer
 * Queries the accounts relational data store for user records.
 */

const { query } = require("../db");

/**
 * Finds a user record by primary key ID.
 *
 * @param {string} id - Unique user ID (e.g. "u_1")
 * @returns {Object|null} User record or null if not found
 */
function findUserById(id) {
  return query("users").where("id", id).first();
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
      "Customers are getting billed for suspended team members. The active user count query filters by organization ID, but fails to check account status.",
    webPreview: {
      url: "http://localhost:8000/api/v1/billing/cron/active-users?org_id=o_2",
      method: "GET",
      appName: "MONTHLY BILLING CRON WORKER",
      description: "Active billable seat counting pipeline",
    },
    files: [
      {
        path: "src/data/active-users.js",
        content: `/**
 * Active Seat Count Repository
 * Queries billable active user seats for organization billing exports.
 */

const { query } = require("../db");

/**
 * Returns all active (billable) users for a given organization ID.
 * Excludes suspended and archived accounts.
 *
 * @param {string} orgId - Organization ID
 * @returns {Array<Object>} List of active billable user rows
 */
function findActiveUsers(orgId) {
  return query("users")
    .where("org_id", orgId)
    .where("status", "active")
    .all();
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
      "A tenant administrator saw audit log events belonging to another company. The tenant ID query parameter is received but never passed to the database filter.",
    webPreview: {
      url: "http://localhost:8000/api/v1/audit/logs?tenant_id=t_1",
      method: "GET",
      appName: "ENTERPRISE AUDIT LOG EXPLORER",
      description: "Tenant audit logging and compliance service",
    },
    files: [
      {
        path: "src/audit/logs.js",
        content: `/**
 * Audit Service - Security Log Repository
 * Enforces strict multi-tenant isolation across security log queries.
 */

const { query } = require("../db");

/**
 * Queries security audit logs specifically isolated to a tenant.
 *
 * @param {string} tenantId - Tenant UUID/ID filter
 * @returns {Array<Object>} Tenant audit log events
 */
function queryLogsForTenant(tenantId) {
  return query("audit_logs").where("tenant_id", tenantId).all();
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
      "Searching with a keyword returns event logs created before the requested start date. The OR condition between action and message overrides the date filter.",
    webPreview: {
      url: "http://localhost:8000/api/v1/events/search?tenant_id=t_1&q=deploy&start_date=150",
      method: "GET",
      appName: "EVENTS & OBSERVABILITY SEARCH ENGINE",
      description: "Log analytics search gateway endpoint",
    },
    files: [
      {
        path: "src/events/search.js",
        content: `/**
 * Telemetry Events Gateway - Search Subsystem
 */

const { query } = require("../db");

/**
 * Searches tenant event logs matching keyword in action OR message,
 * filtered strictly to events created on or after startDate.
 *
 * @param {string} tenantId - Tenant identifier
 * @param {string} keyword - Search term
 * @param {number} startDate - Timestamp lower bound
 * @returns {Array<Object>} Matching events
 */
function searchEvents(tenantId, keyword, startDate) {
  const rows = query("events").where("tenant_id", tenantId).all();
  return rows.filter((r) => {
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
