import type { Scenario } from "@/lib/scenarios/types";

export const typeGScenarios: Scenario[] = [
  {
    id: "feature-flag-inverted",
    title: "Premium features disabled for paid users",
    service: "entitlements-svc",
    severity: "SEV-1",
    type: "G",
    difficulty: "starter",
    symptom: "Paid subscribers get 403 Forbidden on premium features",
    framing:
      "Customer support received 80 complaints: paying enterprise accounts cannot access export tools. Free users report unexpectedly having full premium access.",
    files: [
      {
        path: "src/flags/entitlements.js",
        content: `// Evaluates whether a user account has access to a feature.
// Contract:
//  - if feature is "premium", requires user.plan === "pro" OR user.plan === "enterprise"
//  - if feature is "beta", requires user.isBetaTester === true
//  - default features are allowed for all
function canAccessFeature(user, feature) {
  if (!user) return false;
  
  if (feature === "premium") {
    // TODO: Fix inverted feature check
    return user.plan !== "pro" && user.plan !== "enterprise";
  }
  
  if (feature === "beta") {
    return Boolean(user.isBetaTester);
  }
  
  return true;
}

module.exports = { canAccessFeature };
`,
      },
    ],
    signal: {
      stackTrace: `AssertionError: expected true but received false
    at test (hidden.test.js:6:5)`,
      logs: [
        {
          ts: "09:12:00Z",
          level: "ERROR",
          service: "entitlements-svc",
          msg: "Access denied for enterprise plan user",
          fields: { user_id: "u_404", feature: "premium" },
        },
      ],
    },
    hints: [
      {
        tier: 1,
        text: "The inequality operator (!==) in the premium check negates the intended permission logic.",
      },
      { tier: 2, text: "Change the condition to return true when plan is 'pro' OR 'enterprise'." },
      { tier: 3, text: "return user.plan === 'pro' || user.plan === 'enterprise';" },
    ],
    testPath: "hidden.test.js",
    testContent: `const { canAccessFeature } = require("./src/flags/entitlements");

test("grants premium access to pro and enterprise users", () => {
  expect(canAccessFeature({ plan: "pro" }, "premium")).toBe(true);
  expect(canAccessFeature({ plan: "enterprise" }, "premium")).toBe(true);
});

test("denies premium access to free users", () => {
  expect(canAccessFeature({ plan: "free" }, "premium")).toBe(false);
});

test("returns false for null user", () => {
  expect(canAccessFeature(null, "premium")).toBe(false);
});
`,
    postmortem: {
      rootCause:
        "Boolean negation operator was accidentally used instead of equality check during a refactor.",
      impact: "Paid users locked out of features while free tier users gained unauthorized access.",
      prevention:
        "Add explicit unit tests covering both positive and negative access control matrix cases.",
    },
  },
];
