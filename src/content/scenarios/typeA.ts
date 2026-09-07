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
      "Every checkout attempt is 500ing. The deploy 20 minutes ago shipped a refactor of the pricing service. Order volume is zero right now — find out why the total never comes back.",
    webPreview: {
      url: "http://localhost:8000/api/v2/storefront/checkout",
      method: "POST",
      appName: "STOREFRONT E-COMMERCE CHECKOUT",
      description: "Live storefront order placement endpoint",
      defaultPayload: {
        cart_id: "cart_8821",
        items: [
          { sku: "SKU-DESK-MAT", price: 10, quantity: 2 },
          { sku: "SKU-MECH-KEYBOARD", price: 35, quantity: 1 }
        ]
      }
    },
    files: [
      {
        path: "src/routes/checkout.js",
        context: true,
        content: `/**
 * Storefront API - Checkout & Order Processing Controller
 * Route: POST /api/v2/storefront/checkout
 */

const { calculateTotal } = require("../services/pricing");
const { lineItems, validateCartPayload } = require("../models/cart");

class CheckoutValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CheckoutValidationError";
    this.status = status;
  }
}

/**
 * Log structured transaction event to observability pipeline
 */
function logTransactionEvent(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, service: "storefront-api", level, message, ...metadata }));
}

/**
 * Handles incoming checkout requests from online storefront clients.
 * Validates payload schema, computes final order amounts, and returns
 * formatted checkout confirmation response.
 *
 * Spec requirements:
 *  - Subtotal = sum of (price * quantity) for every line item
 *  - Shipping = 4.99 flat rate, free when subtotal is 50 or more
 *  - Total = subtotal + shipping, rounded to 2 decimal places
 */
function handleCheckout(cart) {
  logTransactionEvent("INFO", "Initiating checkout calculation", { cartId: cart ? cart.id : undefined });

  if (!cart) {
    throw new CheckoutValidationError("Invalid request: missing cart payload", 400);
  }

  // Validate items collection schema
  const validationResult = validateCartPayload(cart);
  if (!validationResult.valid) {
    logTransactionEvent("WARN", "Cart validation failed", { errors: validationResult.errors });
    throw new CheckoutValidationError(\`Cart schema invalid: \${validationResult.errors.join(", ")}\`, 400);
  }

  // Calculate pricing total using active pricing engine module
  const total = calculateTotal(cart);

  logTransactionEvent("INFO", "Pricing engine evaluation returned total", { total });

  return {
    status: "ok",
    cartId: cart.id || "guest_session",
    currency: "USD",
    amountDue: total.toFixed(2),
    timestamp: Date.now(),
  };
}

module.exports = { handleCheckout, CheckoutValidationError };
`,
      },
      {
        path: "src/services/pricing.js",
        content: `/**
 * Pricing Engine Service Layer
 * Responsible for line item aggregation, promotion applications,
 * tax bracket computations, and final checkout total calculation.
 */

const { lineItems } = require("../models/cart");

const SHIPPING_FLAT = 4.99;
const FREE_SHIPPING_THRESHOLD = 50;

/**
 * Audit record log structure for financial reconciliation
 */
function auditPricingComputation(cart, subtotal, shipping, finalTotal) {
  return {
    itemCount: cart && cart.items ? cart.items.length : 0,
    subtotal: subtotal ? subtotal.toFixed(2) : "0.00",
    shipping: shipping ? shipping.toFixed(2) : "0.00",
    finalTotal: finalTotal ? finalTotal.toFixed(2) : "0.00",
    calculatedAt: process.hrtime(),
  };
}

/**
 * Calculates the grand total for a given cart payload.
 *
 * Rules:
 *  1. Parse line items using normalized helper lineItems(cart).
 *  2. Calculate subtotal = sum of (item.price * item.quantity).
 *  3. Determine shipping cost:
 *       - If subtotal >= FREE_SHIPPING_THRESHOLD (50), shipping is 0.
 *       - Otherwise shipping is SHIPPING_FLAT (4.99).
 *  4. Return subtotal + shipping as a number.
 *
 * @param {Object} cart - Raw or normalized cart payload
 * @returns {number} The calculated grand total
 */
function calculateTotal(cart) {
  // TODO(refactor): reimplement using lineItems()
  const items = lineItems(cart);
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  return subtotal + shipping;
}

module.exports = {
  calculateTotal,
  SHIPPING_FLAT,
  FREE_SHIPPING_THRESHOLD,
  auditPricingComputation,
};
`,
      },
      {
        path: "src/models/cart.js",
        content: `/**
 * Cart Data Model & Normalization Module
 * Enforces schema typing, SKU normalization, and quantity defaults.
 */

class CartItemModel {
  constructor(sku, price, quantity = 1) {
    this.sku = String(sku || "UNKNOWN_SKU").trim();
    this.price = Math.max(0, Number(price) || 0);
    this.quantity = Math.max(1, Math.floor(Number(quantity) || 1));
  }

  get lineTotal() {
    return this.price * this.quantity;
  }
}

/**
 * Validates cart payload integrity before processing
 */
function validateCartPayload(cart) {
  const errors = [];
  if (typeof cart !== "object" || cart === null) {
    return { valid: false, errors: ["Payload must be an object"] };
  }
  if (!Array.isArray(cart.items)) {
    return { valid: false, errors: ["cart.items must be an array"] };
  }
  cart.items.forEach((item, index) => {
    if (!item.sku) errors.push(\`Item at index \${index} missing SKU\`);
    if (isNaN(Number(item.price))) errors.push(\`Item at index \${index} has invalid price\`);
  });
  return { valid: errors.length === 0, errors };
}

/**
 * Normalizes a raw cart into line item objects.
 * Covered by domain suite unit tests.
 *
 * @param {Object} cart
 * @returns {Array<{sku: string, price: number, quantity: number}>}
 */
function lineItems(cart) {
  if (!cart || !Array.isArray(cart.items)) return [];
  return cart.items.map((item) => {
    const model = new CartItemModel(item.sku, item.price, item.quantity);
    return {
      sku: model.sku,
      price: model.price,
      quantity: model.quantity,
    };
  });
}

module.exports = { lineItems, validateCartPayload, CartItemModel };
`,
      },
    ],
    signal: {
      stackTrace: `TypeError: Cannot read properties of undefined (reading 'toFixed')
    at handleCheckout (src/routes/checkout.js:46:27)
    at POST /checkout (src/server.js:44:12)`,
      logs: [
        {
          ts: "03:41:50Z",
          level: "INFO",
          service: "storefront-api",
          msg: "Received POST /checkout",
          fields: { cart_id: "cart_991" },
        },
        {
          ts: "03:41:51Z",
          level: "WARN",
          service: "pricing",
          msg: "calculateTotal returned undefined",
          fields: { cart_id: "cart_991" },
        },
        {
          ts: "03:41:51Z",
          level: "ERROR",
          service: "storefront-api",
          msg: "Unhandled TypeError in route execution",
          fields: {
            path: "/checkout",
            error: "Cannot read properties of undefined (reading 'toFixed')",
          },
        },
      ],
      trace: {
        name: "POST /checkout",
        durationMs: 6,
        status: "error",
        children: [
          { name: "lineItems(cart)", durationMs: 1, status: "ok" },
          { name: "calculateTotal(cart)", durationMs: 0, status: "error" },
        ],
      },
    },
    hints: [
      {
        tier: 1,
        text: "total.toFixed() failed because total is undefined, not a number. The function that computes it returned nothing.",
      },
      {
        tier: 2,
        text: "Look at src/services/pricing.js. The calculateTotal function has a comment indicating it needs implementation.",
      },
      {
        tier: 3,
        text: "Implement calculateTotal using lineItems(cart): sum (price * quantity), add 4.99 shipping if subtotal < 50, and return the total number.",
      },
    ],
    concepts: ["null-pointer", "missing-return", "pricing-rules"],
    conceptNote: {
      concept: "Missing Return Value & Stubbed Handlers",
      explanation:
        "When refactoring functions, incomplete stubbed handlers return 'undefined'. Calling methods like '.toFixed()' on an undefined return value causes fatal runtime TypeErrors.",
      realWorldAnalogy:
        "Like a waiter taking your order to the kitchen, but returning with empty hands and asking you to pay.",
      fixPattern:
        "Ensure all logic branches return an explicit calculated value or throw a typed DomainError.",
    },
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
    postmortem: {
      rootCause:
        "calculateTotal() was left as an empty stub during refactoring, returning undefined.",
      impact: "Order volume dropped to zero due to 100% 500 error rate on POST /checkout.",
      prevention:
        "Empty function stubs must throw explicit NotImplemented errors or fail CI unit tests.",
      inspiration: "Common refactor regression pattern in microservices.",
    },
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
      "Finance flagged 400 invoices generated overnight with a NaN tax line. The rate table is right there and unchanged — something downstream of it never got written.",
    webPreview: {
      url: "http://localhost:8000/api/v1/billing/invoices/generate",
      method: "POST",
      appName: "EU VAT INVOICE GENERATOR WORKER",
      description: "Tax compliance billing worker endpoint",
      defaultPayload: { net: 100, region: "DE" }
    },
    files: [
      {
        path: "src/billing/invoice.js",
        context: true,
        content: `/**
 * Billing Worker Subsystem - Invoice Generator
 * Generates customer invoices with region-specific VAT compliance lines.
 */

const { taxFor } = require("./tax");

class InvoiceFormattingError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "InvoiceFormattingError";
  }
}

function auditInvoiceRecord(invoice) {
  return {
    netAmount: invoice.net,
    taxAmount: invoice.tax,
    grandTotal: invoice.total,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Builds an invoice payload given net amount and region ISO code.
 *
 * @param {{ net: number, region: string }} params
 */
function buildInvoice({ net, region }) {
  if (typeof net !== "number" || isNaN(net)) {
    throw new InvoiceFormattingError("Net amount must be a valid number");
  }

  const tax = taxFor(net, region);

  return {
    net,
    tax,
    total: Math.round((net + tax) * 100) / 100,
  };
}

module.exports = { buildInvoice, auditInvoiceRecord, InvoiceFormattingError };
`,
      },
      {
        path: "src/billing/tax.js",
        content: `/**
 * EU Tax Table & Currency Resolution Helper
 * Defines VAT tables across European jurisdictions and untaxed regions.
 */

const RATES = {
  DE: 0.19,
  FR: 0.2,
  IE: 0.23,
  US: 0,
};

/**
 * Returns the tax owed on \`net\` for \`region\`, rounded to 2 decimals.
 * Unknown or unsupported regions default to 0.
 *
 * @param {number} net - Base net amount
 * @param {string} region - Region ISO code (e.g. "DE", "FR", "US")
 * @returns {number} Calculated tax amount rounded to 2 decimal places
 */
function taxFor(net, region) {
  const rate = RATES[region] !== undefined ? RATES[region] : 0;
  return Math.round(net * rate * 100) / 100;
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
      "Since the cache key helper was extracted into its own module, every request is a miss and the upstream search cluster is doing three times the work. The key builder is the only thing that changed.",
    webPreview: {
      url: "http://localhost:8000/api/v1/search/cache/inspect",
      method: "GET",
      appName: "DISTRIBUTED SEARCH CACHE GATEWAY",
      description: "Search cache key hashing & serialization service",
      defaultPayload: { q: "shoes", page: 2 }
    },
    files: [
      {
        path: "src/cache/keys.js",
        content: `/**
 * Search Gateway Cache Key Serialization Module
 * Encapsulates deterministic hashing and normalization rules for query caching.
 */

/**
 * Normalizes query string parameter values for stable hashing
 */
function sanitizeValue(val) {
  if (typeof val === "string") return val.trim().toLowerCase();
  return String(val);
}

/**
 * Builds a stable cache key from a params object.
 *
 * Contract:
 *  - Prefix with "v1"
 *  - Drop keys whose value is undefined or null
 *  - Sort remaining keys alphabetically
 *  - Render each as key=value and join everything with "|"
 *
 * Example: buildCacheKey({ q: "shoes", page: 2 }) === "v1|page=2|q=shoes"
 *
 * @param {Object} params - Query parameters object
 * @returns {string} Serialized cache key string
 */
function buildCacheKey(params) {
  if (!params || typeof params !== "object") return "v1";
  const validKeys = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort();

  if (validKeys.length === 0) return "v1";

  const segments = validKeys.map((k) => \`\${k}=\${params[k]}\`);
  return ["v1", ...segments].join("|");
}

module.exports = { buildCacheKey, sanitizeValue };
`,
      },
      {
        path: "src/cache/store.js",
        context: true,
        content: `/**
 * In-Memory Key-Value Store Adapter
 */

const { buildCacheKey } = require("./keys");

function makeCache() {
  const entries = new Map();
  return {
    get(params) {
      const key = buildCacheKey(params);
      return entries.get(key);
    },
    set(params, value) {
      const key = buildCacheKey(params);
      entries.set(key, value);
      return value;
    },
    clear() {
      entries.clear();
    },
    size() {
      return entries.size;
    }
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
      "A support agent screenshotted the billing admin screen in a shared channel. The gate is permissions.includes(...), and permissions is coming back empty for everyone.",
    webPreview: {
      url: "http://localhost:8000/api/v1/authz/resolve",
      method: "POST",
      appName: "IDENTITY ROLE & PERMISSION RESOLVER",
      description: "RBAC privilege matrix resolution service",
      defaultPayload: { roles: ["support"], denied: [] }
    },
    files: [
      {
        path: "src/authz/resolve.js",
        content: `/**
 * Identity & Access Management - Permission Resolver
 * Computes effective permission sets by combining role matrix mappings
 * and explicit deny overrides.
 */

/**
 * Resolves the effective permission list for a user.
 *
 * Contract:
 *  - Union of permissions granted by every role the user has
 *  - Remove anything explicitly listed in user.denied
 *  - De-duplicate permissions and sort alphabetically
 *  - Unknown or unmapped roles contribute no permissions
 *
 * @param {{ roles: string[], denied?: string[] }} user - User security context
 * @param {Record<string, string[]>} roleMatrix - System role permission matrix
 * @returns {string[]} Alphabetically sorted array of granted permissions
 */
function resolvePermissions(user, roleMatrix) {
  if (!user || !Array.isArray(user.roles)) return [];

  const grantedSet = new Set();
  const deniedSet = new Set(user.denied || []);

  for (const role of user.roles) {
    const rolePermissions = roleMatrix[role];
    if (Array.isArray(rolePermissions)) {
      for (const perm of rolePermissions) {
        if (!deniedSet.has(perm)) {
          grantedSet.add(perm);
        }
      }
    }
  }

  return Array.from(grantedSet).sort();
}

module.exports = { resolvePermissions };
`,
      },
      {
        path: "src/authz/matrix.js",
        context: true,
        content: `/**
 * Role Permission Matrix Definitions
 */

const roleMatrix = {
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
        content: `/**
 * Access Control Middleware Guard
 */

const { resolvePermissions } = require("./resolve");
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
