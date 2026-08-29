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

  return (
    <div className="flex h-full flex-col bg-[#1D1A17] border-l border-[#3A342C]">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b border-[#3A342C] bg-[#161412]">
        {(["signal", "console"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex h-9 items-center gap-1.5 px-4 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 ${
              tab === t
                ? "border-[#C8912B] text-[#F2ECE1] font-semibold"
                : "border-transparent text-[#7C7364] hover:text-[#B8AE9C]"
            }`}
          >
            {t === "signal" ? "Signal" : "Console"}
            {t === "console" && result && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  allPassed
                    ? "bg-[#7FB88A]/20 text-[#7FB88A]"
                    : cases.length > 0
                      ? "bg-[#C4593F]/20 text-[#C4593F]"
                      : "bg-[#26221D] text-[#7C7364]"
                }`}
              >
                {allPassed ? "PASSED" : cases.length > 0 ? `${passCount}/${cases.length}` : "—"}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "signal" && <div className="p-4">{signal}</div>}

        {tab === "console" && (
          <div className="flex flex-col gap-0">
            {/* Running state */}
            {running && (
              <div className="flex items-center gap-2 border-b border-[#3A342C] px-4 py-3 font-mono text-xs text-[#C8912B]">
                <svg className="size-4 animate-spin text-[#C8912B]" fill="none" viewBox="0 0 24 24">
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
                Executing hidden tests against Pyodide harness…
              </div>
            )}

            {/* Crash */}
            {result?.kind === "crash" && (
              <div className="border-b border-[#3A342C] bg-[#C4593F]/10 px-4 py-3">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#C4593F]">
                  Sandbox Crash
                </p>
                <pre className="mt-2 overflow-x-auto rounded bg-[#161412] p-3 font-mono text-xs text-[#C4593F]">
                  {result.error}
                </pre>
              </div>
            )}

            {/* Timeout */}
            {result?.kind === "timeout" && (
              <div className="border-b border-[#3A342C] bg-[#D99B26]/10 px-4 py-3">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#D99B26]">
                  Time Limit Exceeded
                </p>
                <p className="mt-1 font-sans text-xs text-[#B8AE9C]">
                  Execution timed out after 3 000 ms.
                </p>
              </div>
            )}

            {/* Verdict Passed Banner (Solid Signal Mint Box) */}
            {allPassed && (
              <div className="flex items-center gap-2.5 border-b border-[#7FB88A] bg-[#7FB88A]/15 px-4 py-3 brass-emboss">
                <span className="flex size-5 items-center justify-center rounded-[2px] bg-[#7FB88A] text-[#161412] font-mono text-xs font-bold">
                  ✓
                </span>
                <span className="font-mono text-xs font-bold tracking-wide text-[#7FB88A]">
                  VERDICT: PASSED // HIDDEN HARNESS CLEARED
                </span>
              </div>
            )}

            {/* Summary Bar */}
            {cases.length > 0 && (
              <div className="flex items-center justify-between border-b border-[#3A342C] bg-[#26221D] px-4 py-2">
                <span className="font-mono text-[10px] text-[#7C7364] uppercase tracking-wider">
                  TEST CASES DOCKET
                </span>
                <span
                  className={`font-mono text-xs font-bold ${allPassed ? "text-[#7FB88A]" : "text-[#C4593F]"}`}
                >
                  {passCount} / {cases.length} PASSING
                </span>
              </div>
            )}

            {/* Verdict rows */}
            {cases.map((c, i) => (
              <div
                key={i}
                className={`border-b border-[#3A342C]/60 px-4 py-3 ${c.passed ? "bg-[#7FB88A]/5" : "bg-[#C4593F]/5"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 font-mono text-xs font-bold ${c.passed ? "text-[#7FB88A]" : "text-[#C4593F]"}`}
                  >
                    {c.passed ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-xs font-medium text-[#F2ECE1]">
                      {c.name}
                    </p>
                    {!c.passed && c.message && (
                      <pre className="mt-1.5 overflow-x-auto rounded bg-[#161412] p-2 font-mono text-[11px] text-[#C4593F] whitespace-pre-wrap border border-[#C4593F]/30">
                        {c.message}
                      </pre>
                    )}
                    {!c.passed && c.diff && typeof c.diff === "string" && (
                      <pre className="mt-1.5 overflow-x-auto rounded bg-[#161412] p-2 font-mono text-[11px] text-[#B8AE9C] whitespace-pre-wrap border border-[#3A342C]">
                        {c.diff}
                      </pre>
                    )}
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[10px] font-bold ${c.passed ? "text-[#7FB88A]" : "text-[#C4593F]"}`}
                  >
                    {c.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
              </div>
            ))}

            {/* Conceptual breakdown */}
            {showConcept && conceptNote && (
              <div className="border-t border-[#3A342C]">
                <button
                  onClick={() => setConceptOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#26221D]"
                >
                  <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#C8912B]">
                    <span>💡</span> View Conceptual Breakdown
                  </span>
                  <svg
                    className={`size-4 text-[#7C7364] transition-transform ${conceptOpen ? "rotate-180" : ""}`}
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
                  <div className="space-y-4 border-t border-[#3A342C] bg-[#26221D] px-4 py-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#C8912B]">
                        Concept
                      </p>
                      <p className="mt-1 font-serif font-semibold text-[#F2ECE1]">
                        {conceptNote.concept}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364]">
                        Explanation
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-[#B8AE9C]">
                        {conceptNote.explanation}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364]">
                        Real-World Analogy
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-[#B8AE9C]">
                        {conceptNote.realWorldAnalogy}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364]">
                        Fix Pattern
                      </p>
                      <pre className="mt-1 overflow-x-auto rounded bg-[#161412] px-3 py-2 font-mono text-xs text-[#F2ECE1] border border-[#3A342C]">
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
                  className="size-8 text-[#3A342C]"
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
                <p className="font-mono text-xs text-[#7C7364]">
                  Run tests to view verdict console
                </p>
                <p className="font-mono text-[10px] text-[#4E4638]">Ctrl+Enter</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
