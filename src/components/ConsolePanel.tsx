import { useState } from "react";
import type { RunResult } from "@/lib/sandbox/runTests";
import type { ConceptNote } from "@/lib/scenarios/types";

interface ConsolePanelProps {
  result: RunResult | null;
  running: boolean;
  signal: React.ReactNode;
  conceptNote?: ConceptNote | undefined;
  failedRuns: number;
}

export function ConsolePanel({
  result,
  running,
  signal,
  conceptNote,
  failedRuns,
}: ConsolePanelProps) {
  const [tab, setTab] = useState<"signal" | "console">("signal");
  const [conceptOpen, setConceptOpen] = useState(false);

  const cases = result?.kind === "results" ? result.cases : [];
  const passCount = cases.filter((c) => c.passed).length;
  const allPassed = cases.length > 0 && passCount === cases.length;
  const showConcept = !!conceptNote && failedRuns >= 1 && !allPassed;

  // Switch to console tab automatically after a run
  if (result && tab === "signal") {
    // deliberate: do not auto-switch on first render
  }

  return (
    <div className="flex h-full flex-col bg-sidebar border-l border-border">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b border-border bg-[#161616]">
        {(["signal", "console"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex h-9 items-center gap-1.5 px-4 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "signal" ? "Signal" : "Console"}
            {t === "console" && result && (
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-bold ${
                  allPassed
                    ? "bg-pass/20 text-pass"
                    : cases.length > 0
                      ? "bg-fail/20 text-fail"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {allPassed ? "AC" : cases.length > 0 ? `${passCount}/${cases.length}` : "—"}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "signal" && <div className="p-4 slide-up">{signal}</div>}

        {tab === "console" && (
          <div className="flex flex-col gap-0 slide-up">
            {/* Running state */}
            {running && (
              <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm text-muted-foreground">
                <svg className="size-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Executing hidden tests…
              </div>
            )}

            {/* Crash */}
            {result?.kind === "crash" && (
              <div className="border-b border-border px-4 py-3">
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-fail">
                  Sandbox Crash
                </p>
                <pre className="mt-2 overflow-x-auto rounded bg-fail/5 p-3 font-mono text-xs text-fail/80">
                  {result.error}
                </pre>
              </div>
            )}

            {/* Timeout */}
            {result?.kind === "timeout" && (
              <div className="border-b border-border px-4 py-3">
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-warning">
                  Time Limit Exceeded
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Execution timed out after 3 000 ms.
                </p>
              </div>
            )}

            {/* Accepted banner */}
            {allPassed && (
              <div className="accepted-flash flex items-center gap-2 border-b border-pass/20 px-4 py-3">
                <svg
                  className="size-5 text-pass"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="font-mono text-sm font-bold text-pass">
                  Accepted — All tests pass
                </span>
              </div>
            )}

            {/* Summary bar */}
            {cases.length > 0 && (
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  Test Cases
                </span>
                <span
                  className={`font-mono text-sm font-bold ${allPassed ? "text-pass" : "text-fail"}`}
                >
                  {passCount} / {cases.length} passing
                </span>
              </div>
            )}

            {/* Verdict rows */}
            {cases.map((c, i) => (
              <div
                key={i}
                className={`border-b border-border px-4 py-3 ${c.passed ? "hover:bg-pass/5" : "hover:bg-fail/5"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 font-mono text-base font-bold ${c.passed ? "text-pass" : "text-fail"}`}
                  >
                    {c.passed ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{c.name}</p>
                    {!c.passed && c.message && (
                      <pre className="mt-1.5 overflow-x-auto rounded bg-fail/8 p-2 font-mono text-xs text-fail/80 whitespace-pre-wrap">
                        {c.message}
                      </pre>
                    )}
                    {!c.passed && c.diff && typeof c.diff === "string" && (
                      <pre className="mt-1.5 overflow-x-auto rounded bg-card p-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                        {c.diff}
                      </pre>
                    )}
                  </div>
                  <span
                    className={`shrink-0 font-mono text-xs font-semibold ${c.passed ? "text-pass" : "text-fail"}`}
                  >
                    {c.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
              </div>
            ))}

            {/* Conceptual breakdown */}
            {showConcept && conceptNote && (
              <div className="border-t border-border">
                <button
                  onClick={() => setConceptOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/30"
                >
                  <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                    <span>💡</span> View Conceptual Breakdown
                  </span>
                  <svg
                    className={`size-4 text-muted-foreground transition-transform ${conceptOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {conceptOpen && (
                  <div className="slide-up space-y-4 border-t border-border bg-primary/5 px-4 py-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                        Concept
                      </p>
                      <p className="mt-1 font-semibold text-foreground">{conceptNote.concept}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Explanation
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground">
                        {conceptNote.explanation}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Real-World Analogy
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {conceptNote.realWorldAnalogy}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Fix Pattern
                      </p>
                      <pre className="mt-1 overflow-x-auto rounded bg-card px-3 py-2 font-mono text-xs text-foreground">
                        {conceptNote.fixPattern}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!running && !result && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <svg
                  className="size-8 text-border"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="font-mono text-xs text-muted-foreground">Run tests to see output</p>
                <p className="font-mono text-[10px] text-muted-foreground/60">Ctrl+Enter</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
