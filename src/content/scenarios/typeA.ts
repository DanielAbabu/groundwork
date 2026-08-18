import type { Scenario } from "@/lib/scenarios/types";

export const typeAScenarios: Scenario[] = [
  {
    id: "cart-total-null",
    title: "Checkout crashes on every order",
    service: "storefront-api",
    severity: "SEV-1",
    type: "A",
    difficulty: "starter",
    symptom: "TypeError: Cannot read properties of undefined (reading 'toFixed') in POST /checkout",
    framing:
      "INCIDENT SUMMARY:\nEvery checkout attempt across the e-commerce platform is returning HTTP 500 status codes. A deploy 20 minutes ago refactored the pricing engine to delegate line-item normalization to the cart model, but the `calculateTotal()` service function was left as an incomplete stub.\n\nARCHITECTURE & REASONING:\n`POST /checkout` invokes `handleCheckout(cart)`, expecting a numerical total to format via `.toFixed(2)` for payment processing. The pricing service in `src/services/pricing.js` must sum the subtotal (price × quantity for every line item), compute shipping ($4.99 flat rate, free if subtotal ≥ $50.00), and return the final dollar amount.\n\nOBJECTIVES:\n1. Reimplement `calculateTotal(cart)` using `lineItems(cart)` from `src/models/cart.js`.\n2. Ensure empty carts return flat shipping ($4.99).\n3. Waive shipping fees automatically when subtotal reaches or exceeds $50.00.\n4. Return an accurate numerical total so `.toFixed(2)` succeeds.",
    files: [
      {
        path: "src/routes/checkout.js",
        context: true,
        content: `const { calculateTotal } = require("../services/pricing");

// Pricing rules (from the product spec):
//  - subtotal = sum of price * quantity for every line item
//  - shipping = 4.99, but free when subtotal is 50 or more
//  - total = subtotal + shipping, rounded to 2 decimals
function handleCheckout(cart) {
  const total = calculateTotal(cart);
  return {
    status: "ok",
    amountDue: total.toFixed(2),
  };
}

module.exports = { handleCheckout };
`,
      },
      {
        path: "src/services/pricing.js",
        content: `const { lineItems } = require("../models/cart");

const SHIPPING_FLAT = 4.99;
const FREE_SHIPPING_THRESHOLD = 50;

function calculateTotal(cart) {
  // TODO(refactor): reimplement using lineItems()
}

module.exports = { calculateTotal };
`,
      },
      {
        path: "src/models/cart.js",
        context: true,
        content: `// Normalizes a cart into line items. Already covered by its own tests.
function lineItems(cart) {
  return (cart.items || []).map((item) => ({
    sku: item.sku,
    price: Number(item.price),
    quantity: Number(item.quantity || 1),
  }));
}

module.exports = { lineItems };
`,
      },
    ],
    signal: `TypeError: Cannot read properties of undefined (reading 'toFixed')
    at handleCheckout (src/routes/checkout.js:12:19)
    at POST /checkout (src/server.js:44:12)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)

  10 |   return {
  11 |     status: "ok",
  12 |   amountDue: total.toFixed(2),
     |                      ^
  13 |   };`,
    testPath: "hidden.test.js",
    testContent: `const { calculateTotal } = require("./src/services/pricing");

test("sums line items and adds flat shipping", () => {
  expect(calculateTotal({ items: [{ sku: "a", price: 10, quantity: 2 }] })).toBeCloseTo(24.99);
});

test("respects quantities across multiple items", () => {
  const cart = { items: [{ sku: "a", price: 4.5, quantity: 3 }, { sku: "b", price: 2, quantity: 1 }] };
  expect(calculateTotal(cart)).toBeCloseTo(20.49);
});

test("shipping is free at the 50 threshold", () => {
  expect(calculateTotal({ items: [{ sku: "a", price: 50, quantity: 1 }] })).toBeCloseTo(50);
});

test("shipping is free above the threshold", () => {
  expect(calculateTotal({ items: [{ sku: "a", price: 30, quantity: 3 }] })).toBeCloseTo(90);
});

test("an empty cart still returns a number", () => {
  expect(calculateTotal({ items: [] })).toBeCloseTo(4.99);
});
`,
    postmortem:
      "calculateTotal() was left as an empty stub during the refactor, so it returned undefined and the route crashed on total.toFixed(). The fix is to implement it: sum price × quantity, add 4.99 shipping unless the subtotal reaches 50, and round to 2 decimals.",
  },
  {
    id: "tax-helper-missing",
    title: "Invoices are missing tax lines",
    service: "billing-worker",
    severity: "SEV-2",
    type: "A",
    difficulty: "starter",
    symptom: "Every EU invoice renders `tax: NaN` and the total equals the net amount",
    framing:
      "INCIDENT SUMMARY:\nFinance flagged hundreds of European invoices generated overnight with invalid `NaN` tax totals. While the regional tax rate map `RATES` exists in `src/billing/tax.js`, the `taxFor(net, region)` helper function does not calculate or return any value.\n\nARCHITECTURE & REASONING:\n`buildInvoice({ net, region })` in `src/billing/invoice.js` calls `taxFor(net, region)` to calculate taxes. When `taxFor` returns `undefined`, evaluating `net + tax` produces `NaN`, invalidating downstream invoicing records and financial compliance reports.\n\nOBJECTIVES:\n1. Complete `taxFor(net, region)` in `src/billing/tax.js` to look up the regional rate from `RATES`.\n2. Compute `net * rate` and round the result to 2 decimal places.\n3. Ensure unknown regions or regions with missing rates default to a tax rate of 0 (returning 0 instead of undefined or NaN).",
    files: [
      {
        path: "src/billing/invoice.js",
        context: true,
        content: `const { taxFor } = require("./tax");

function buildInvoice({ net, region }) {
  const tax = taxFor(net, region);
  return {
    net,
    tax,
    total: Math.round((net + tax) * 100) / 100,
  };
}

module.exports = { buildInvoice };
`,
      },
      {
        path: "src/billing/tax.js",
        content: `const RATES = {
  DE: 0.19,
  FR: 0.2,
  IE: 0.23,
  US: 0,
};

// Returns the tax owed on \`net\` for \`region\`, rounded to 2 decimals.
// Unknown regions are taxed at 0.
function taxFor(net, region) {
  const rate = RATES[region];
}

module.exports = { taxFor, RATES };
`,
      },
    ],
    signal: `FAIL src/billing/__tests__/invoice.test.js
  ● buildInvoice › adds German VAT

    expected: { net: 100, tax: 19, total: 119 }
    received: { net: 100, tax: undefined, total: NaN }

      at Object.<anonymous> (src/billing/__tests__/invoice.test.js:9:31)`,
    testPath: "hidden.test.js",
    testContent: `const { taxFor } = require("./src/billing/tax");
const { buildInvoice } = require("./src/billing/invoice");

test("applies the German rate", () => {
  expect(taxFor(100, "DE")).toBeCloseTo(19);
});

test("rounds to two decimals", () => {
  expect(taxFor(19.99, "FR")).toBeCloseTo(4);
});

test("untaxed regions return 0, not undefined", () => {
  expect(taxFor(80, "US")).toBe(0);
});

test("unknown regions are taxed at 0", () => {
  expect(taxFor(80, "ZZ")).toBe(0);
});

test("invoice totals add up again", () => {
  expect(buildInvoice({ net: 200, region: "IE" })).toEqual({ net: 200, tax: 46, total: 246 });
});
`,
    postmortem:
      "taxFor() looked up the rate but never returned anything, so tax was undefined and net + undefined produced NaN. It needed to return the rounded net × rate, defaulting unknown regions to 0.",
  },
  {
    id: "cache-key-builder",
    title: "Search cache never hits",
    service: "search-gateway",
    severity: "SEV-3",
    type: "A",
    difficulty: "routine",
    symptom: "Cache hit rate dropped to 0% and upstream QPS tripled",
    framing:
      "INCIDENT SUMMARY:\nSince the cache key generator was extracted into its own module `src/cache/keys.js`, the search gateway's cache hit rate plummeted to 0%. Upstream elasticsearch nodes are handling triple their normal QPS because every query produces `undefined` as its cache key.\n\nARCHITECTURE & REASONING:\n`src/cache/store.js` relies on `buildCacheKey(params)` to generate deterministic cache keys. When `buildCacheKey` returns `undefined`, every lookup collisions onto the same undefined key or fails equality comparisons.\n\nCONTRACT SPECIFICATION:\n- Always prefix the key string with 'v1'.\n- Filter out parameter keys whose values are `undefined` or `null`.\n- Sort remaining parameter keys alphabetically.\n- Format each pair as `key=value` and join them with '|'.\n- Example: `buildCacheKey({ q: 'shoes', page: 2 })` MUST equal `'v1|page=2|q=shoes'`.\n\nOBJECTIVES:\n1. Implement `buildCacheKey(params)` adhering strictly to the contract above.",
    files: [
      {
        path: "src/cache/keys.js",
        content: `// Builds a stable cache key from a params object.
// Contract:
//  - prefix with "v1"
//  - drop keys whose value is undefined or null
//  - sort remaining keys alphabetically
//  - render each as key=value and join everything with "|"
// Example: buildCacheKey({ q: "shoes", page: 2 }) === "v1|page=2|q=shoes"
function buildCacheKey(params) {
  // TODO: implement
}

module.exports = { buildCacheKey };
`,
      },
      {
        path: "src/cache/store.js",
        context: true,
        content: `const { buildCacheKey } = require("./keys");

function makeCache() {
  const entries = new Map();
  return {
    get(params) {
      return entries.get(buildCacheKey(params));
    },
    set(params, value) {
      entries.set(buildCacheKey(params), value);
      return value;
    },
  };
}

module.exports = { makeCache };
`,
      },
    ],
    signal: `FAIL src/cache/__tests__/store.test.js
  ● cache › returns a stored value for equivalent params

    expected: [ { id: 1 } ]
    received: undefined

    Instrumented keys during the failing run:
      set -> undefined
      get -> undefined      <-- every request collapses onto the same key`,
    testPath: "hidden.test.js",
    testContent: `const { buildCacheKey } = require("./src/cache/keys");
const { makeCache } = require("./src/cache/store");

test("sorts keys and prefixes with v1", () => {
  expect(buildCacheKey({ q: "shoes", page: 2 })).toBe("v1|page=2|q=shoes");
});

test("key order in the input does not matter", () => {
  expect(buildCacheKey({ page: 2, q: "shoes" })).toBe(buildCacheKey({ q: "shoes", page: 2 }));
});

test("drops undefined and null values", () => {
  expect(buildCacheKey({ q: "hats", filter: undefined, sort: null })).toBe("v1|q=hats");
});

test("no params still yields the version prefix", () => {
  expect(buildCacheKey({})).toBe("v1");
});

test("different params produce different keys", () => {
  const cache = makeCache();
  cache.set({ q: "shoes" }, [{ id: 1 }]);
  expect(cache.get({ q: "shoes" })).toEqual([{ id: 1 }]);
  expect(cache.get({ q: "hats" })).toBeUndefined();
});
`,
    postmortem:
      "buildCacheKey() was never implemented, so it returned undefined for every params object — all requests shared one key and nothing could ever hit. Implementing the documented contract (filter empties, sort keys, join with |) restores distinct keys.",
  },
  {
    id: "permission-resolver",
    title: "Support agents can see admin pages",
    service: "identity",
    severity: "SEV-1",
    type: "A",
    difficulty: "tricky",
    symptom: "resolvePermissions() returns an empty list, so the UI falls back to allow-all",
    framing:
      "INCIDENT SUMMARY:\nA privilege escalation vulnerability occurred when support team members gained access to internal billing admin screens. Investigation revealed `resolvePermissions(user, roleMatrix)` in `src/authz/resolve.js` returns an empty array `[]` because its calculation body is unwritten.\n\nARCHITECTURE & SECURITY RISK:\n`can(user, permission)` in `src/authz/guard.js` uses legacy fallback logic: `if (permissions.length === 0) return true;`. Because `resolvePermissions` always returns `[]`, permissions checks succeed for every single action!\n\nRESOLUTION SPECIFICATION:\n- Iterate over all roles listed in `user.roles`.\n- Collect permissions granted by each valid role from `roleMatrix` (ignore unknown roles).\n- Remove any permissions specified in `user.denied` array.\n- De-duplicate the resultant permission list.\n- Return the final list sorted alphabetically.\n\nOBJECTIVES:\n1. Reimplement `resolvePermissions(user, roleMatrix)` to follow all five authorization steps.",
    files: [
      {
        path: "src/authz/resolve.js",
        content: `// Resolves the effective permission list for a user.
// Contract:
//  - union of the permissions granted by every role the user has
//  - remove anything listed in user.denied
//  - de-duplicate, then sort alphabetically
//  - unknown roles contribute nothing
function resolvePermissions(user, roleMatrix) {
  const granted = [];
  // TODO: walk user.roles, collect from roleMatrix, subtract user.denied
  return granted;
}

module.exports = { resolvePermissions };
`,
      },
      {
        path: "src/authz/matrix.js",
        context: true,
        content: `const roleMatrix = {
  support: ["tickets:read", "tickets:write", "users:read"],
  billing: ["invoices:read", "invoices:refund"],
  admin: ["users:read", "users:write", "billing:admin", "invoices:read"],
};

module.exports = { roleMatrix };
`,
      },
      {
        path: "src/authz/guard.js",
        context: true,
        content: `const { resolvePermissions } = require("./resolve");
const { roleMatrix } = require("./matrix");

function can(user, permission) {
  const permissions = resolvePermissions(user, roleMatrix);
  // Legacy fallback: an empty list is treated as "not yet loaded" and allows through.
  if (permissions.length === 0) return true;
  return permissions.includes(permission);
}

module.exports = { can };
`,
      },
    ],
    signal: `FAIL src/authz/__tests__/guard.test.js
  ● can › denies billing:admin to a support agent

    expected: false
    received: true

    resolvePermissions({ roles: ["support"] }, roleMatrix)
      expected: [ "tickets:read", "tickets:write", "users:read" ]
      received: []`,
    testPath: "hidden.test.js",
    testContent: `const { resolvePermissions } = require("./src/authz/resolve");
const { roleMatrix } = require("./src/authz/matrix");
const { can } = require("./src/authz/guard");

test("collects the permissions of a single role, sorted", () => {
  expect(resolvePermissions({ roles: ["support"] }, roleMatrix)).toEqual([
    "tickets:read",
    "tickets:write",
    "users:read",
  ]);
});

test("unions multiple roles without duplicates", () => {
  expect(resolvePermissions({ roles: ["billing", "admin"] }, roleMatrix)).toEqual([
    "billing:admin",
    "invoices:read",
    "invoices:refund",
    "users:read",
    "users:write",
  ]);
});

test("explicit denials win over grants", () => {
  expect(
    resolvePermissions({ roles: ["admin"], denied: ["billing:admin", "users:write"] }, roleMatrix),
  ).toEqual(["invoices:read", "users:read"]);
});

test("unknown roles contribute nothing", () => {
  expect(resolvePermissions({ roles: ["ghost"] }, roleMatrix)).toEqual([]);
});

test("support agents cannot reach billing admin", () => {
  expect(can({ roles: ["support"] }, "billing:admin")).toBe(false);
  expect(can({ roles: ["support"] }, "tickets:read")).toBe(true);
});
`,
    postmortem:
      "resolvePermissions() never walked user.roles, so it always returned []. The guard treats an empty list as 'permissions not loaded' and allows everything through — so the missing implementation became a privilege escalation. Collecting, denying, de-duplicating and sorting fixes it.",
  },
];
