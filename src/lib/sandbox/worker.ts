/// <reference lib="webworker" />
/**
 * Sandboxed test runner.
 *
 * Runs inside a dedicated Web Worker: no DOM, no network (fetch/XHR/WebSocket
 * are removed below), and the main thread terminates this worker on timeout.
 * User-edited files are linked by a tiny CommonJS-style loader over a virtual
 * file map, then the hidden test file is executed against them.
 */

type RunRequest = {
  files: Record<string, string>;
  testPath: string;
};

export type AssertionDiff =
  | { kind: "value"; expected: string; received: string }
  | { kind: "object"; expected: string; received: string; diff: string[] }
  | { kind: "message"; text: string };

export type TestCaseResult = {
  name: string;
  passed: boolean;
  message?: string | undefined;
  diff?: AssertionDiff | undefined;
};

export type RunOutcome =
  | { kind: "results"; cases: TestCaseResult[]; logs: string[] }
  | { kind: "crash"; error: string; logs: string[] };

const scope = self as unknown as Record<string, unknown>;
for (const key of [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "importScripts",
  "indexedDB",
  "caches",
  "navigator",
]) {
  try {
    scope[key] = undefined;
  } catch {
    /* some globals are non-writable; ignore */
  }
}

function normalize(path: string): string {
  const parts: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function serialize(value: unknown, seen = new Set<unknown>()): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serialize(entry, seen)).join(", ")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).map(
    ([key, entry]) => `${key}: ${serialize(entry, seen)}`,
  );
  return `{ ${entries.join(", ")} }`;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

class AssertionError extends Error {
  diff?: AssertionDiff | undefined;
  constructor(message: string, diff?: AssertionDiff | undefined) {
    super(message);
    this.name = "AssertionError";
    this.diff = diff;
  }
}

function computeObjectDiff(actual: unknown, expected: unknown): string[] {
  const lines: string[] = [];
  if (
    typeof actual !== "object" ||
    typeof expected !== "object" ||
    actual === null ||
    expected === null
  ) {
    return [`- expected: ${serialize(expected)}`, `+ received: ${serialize(actual)}`];
  }

  const allKeys = Array.from(
    new Set([...Object.keys(actual as object), ...Object.keys(expected as object)]),
  );

  for (const key of allKeys) {
    const actVal = (actual as Record<string, unknown>)[key];
    const expVal = (expected as Record<string, unknown>)[key];
    if (deepEqual(actVal, expVal)) {
      lines.push(`  ${key}: ${serialize(expVal)}`);
    } else {
      if (expVal !== undefined) lines.push(`- ${key}: ${serialize(expVal)}`);
      if (actVal !== undefined) lines.push(`+ ${key}: ${serialize(actVal)}`);
    }
  }

  return lines;
}

function createExpect() {
  return function expect(actual: unknown) {
    return {
      toBe(expected: unknown) {
        if (actual !== expected) {
          throw new AssertionError(
            `expected ${serialize(expected)} but received ${serialize(actual)}`,
            { kind: "value", expected: serialize(expected), received: serialize(actual) },
          );
        }
      },
      toEqual(expected: unknown) {
        if (!deepEqual(actual, expected)) {
          const diffLines = computeObjectDiff(actual, expected);
          throw new AssertionError(
            `expected ${serialize(expected)} but received ${serialize(actual)}`,
            {
              kind: "object",
              expected: serialize(expected),
              received: serialize(actual),
              diff: diffLines,
            },
          );
        }
      },
      toBeCloseTo(expected: number, digits = 2) {
        const diff = Math.abs(Number(actual) - expected);
        if (!(diff < Math.pow(10, -digits) / 2)) {
          throw new AssertionError(
            `expected ${serialize(expected)} (±${digits} digits) but received ${serialize(actual)}`,
            { kind: "value", expected: serialize(expected), received: serialize(actual) },
          );
        }
      },
      toHaveLength(expected: number) {
        const length = (actual as { length?: number } | null)?.length;
        if (length !== expected) {
          throw new AssertionError(
            `expected length ${expected} but received ${serialize(length)}`,
            { kind: "value", expected: String(expected), received: serialize(length) },
          );
        }
      },
      toBeUndefined() {
        if (actual !== undefined) {
          throw new AssertionError(`expected undefined but received ${serialize(actual)}`, {
            kind: "value",
            expected: "undefined",
            received: serialize(actual),
          });
        }
      },
      toBeTruthy() {
        if (!actual)
          throw new AssertionError(`expected a truthy value, received ${serialize(actual)}`, {
            kind: "value",
            expected: "truthy",
            received: serialize(actual),
          });
      },
      toBeFalsy() {
        if (actual)
          throw new AssertionError(`expected a falsy value, received ${serialize(actual)}`, {
            kind: "value",
            expected: "falsy",
            received: serialize(actual),
          });
      },
    };
  };
}

async function run({ files, testPath }: RunRequest): Promise<RunOutcome> {
  const logs: string[] = [];
  const sandboxConsole = {
    log: (...args: unknown[]) => logs.push(args.map((a) => serialize(a)).join(" ")),
    warn: (...args: unknown[]) => logs.push(args.map((a) => serialize(a)).join(" ")),
    error: (...args: unknown[]) => logs.push(args.map((a) => serialize(a)).join(" ")),
    info: (...args: unknown[]) => logs.push(args.map((a) => serialize(a)).join(" ")),
  };

  const cache = new Map<string, Record<string, unknown>>();
  const queued: { name: string; fn: () => unknown }[] = [];
  const beforeEachHooks: (() => unknown)[] = [];

  function resolve(from: string, request: string): string {
    const base = request.startsWith(".")
      ? normalize(`${dirname(from)}/${request}`)
      : normalize(request);
    for (const candidate of [base, `${base}.js`, `${base}/index.js`]) {
      if (candidate in files) return candidate;
    }
    throw new Error(`Cannot find module '${request}' from '${from || "root"}'`);
  }

  function load(path: string): Record<string, unknown> {
    const cached = cache.get(path);
    if (cached) return cached;
    const moduleExports: Record<string, unknown> = {};
    const moduleObject = { exports: moduleExports };
    cache.set(path, moduleExports);
    const source = files[path] ?? "";
    const factory = new Function(
      "require",
      "module",
      "exports",
      "console",
      "test",
      "it",
      "expect",
      "beforeEach",
      `"use strict";\n${source}`,
    );
    factory(
      (request: string) => load(resolve(path, request)),
      moduleObject,
      moduleExports,
      sandboxConsole,
      (name: string, fn: () => unknown) => queued.push({ name, fn }),
      (name: string, fn: () => unknown) => queued.push({ name, fn }),
      createExpect(),
      (fn: () => unknown) => beforeEachHooks.push(fn),
    );
    if (moduleObject.exports !== moduleExports) {
      cache.set(path, moduleObject.exports as Record<string, unknown>);
    }
    return cache.get(path)!;
  }

  try {
    load(testPath);
  } catch (error) {
    return { kind: "crash", error: describeError(error), logs };
  }

  const cases: TestCaseResult[] = [];
  for (const testCase of queued) {
    try {
      for (const hook of beforeEachHooks) await hook();
      await testCase.fn();
      cases.push({ name: testCase.name, passed: true });
    } catch (error) {
      const diff = error instanceof AssertionError ? error.diff : undefined;
      cases.push({ name: testCase.name, passed: false, message: describeError(error), diff });
    }
  }

  return { kind: "results", cases, logs };
}

function describeError(error: unknown): string {
  if (error instanceof AssertionError) return error.message;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return serialize(error);
}

self.onmessage = (event: MessageEvent<RunRequest>) => {
  void run(event.data).then((outcome) => {
    (self as unknown as { postMessage: (value: RunOutcome) => void }).postMessage(outcome);
  });
};
