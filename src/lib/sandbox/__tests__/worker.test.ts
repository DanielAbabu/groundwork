import { describe, expect, it } from "vitest";
import { SANDBOX_TIMEOUT_MS } from "../runTests";

describe("Sandbox Runner Configuration", () => {
  it("defines a reasonable sandbox timeout threshold", () => {
    expect(SANDBOX_TIMEOUT_MS).toBeGreaterThan(0);
    expect(SANDBOX_TIMEOUT_MS).toBeLessThanOrEqual(10000);
  });
});
