import type { RunOutcome, TestCaseResult } from "./worker";

export type { TestCaseResult, RunOutcome };

export const SANDBOX_TIMEOUT_MS = 3000;

export type RunResult =
  | { kind: "results"; cases: TestCaseResult[]; logs: string[]; durationMs: number }
  | { kind: "crash"; error: string; logs: string[]; durationMs: number }
  | { kind: "timeout"; durationMs: number };

/**
 * Runs the hidden test file against the user's files in a fresh worker.
 * The worker is always terminated afterwards, including on timeout.
 */
export function runHiddenTests(
  files: Record<string, string>,
  testPath: string,
): Promise<RunResult> {
  const startedAt = Date.now();
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

  return new Promise<RunResult>((resolve) => {
    let settled = false;
    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };

    const timer = window.setTimeout(() => {
      finish({ kind: "timeout", durationMs: Date.now() - startedAt });
    }, SANDBOX_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<RunOutcome>) => {
      finish({ ...event.data, durationMs: Date.now() - startedAt });
    };
    worker.onerror = (event) => {
      finish({
        kind: "crash",
        error: event.message || "The sandbox crashed while loading your code.",
        logs: [],
        durationMs: Date.now() - startedAt,
      });
    };

    worker.postMessage({ files, testPath });
  });
}
