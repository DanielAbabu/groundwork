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
    <div className="flex h-full flex-col bg-[#0F172A] border-l border-[#1E293B]">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b border-[#1E293B] bg-[#0B0F19]">
        {(["signal", "console"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex h-9 items-center gap-1.5 px-4 font-mono text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              tab === t
                ? "border-[#38BDF8] text-[#F8FAFC]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            {t === "signal" ? "Signal" : "Console"}
            {t === "console" && result && (
              <span
                className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                  allPassed
                    ? "bg-[#10B981]/20 text-[#10B981]"
                    : cases.length > 0
                      ? "bg-[#F43F5E]/20 text-[#F43F5E]"
                      : "bg-[#1E293B] text-[#64748B]"
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
              <div className="flex items-center gap-2 border-b border-[#1E293B] px-4 py-3 font-mono text-xs text-[#38BDF8]">
                <svg className="size-4 animate-spin text-[#38BDF8]" fill="none" viewBox="0 0 24 24">
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
              <div className="border-b border-[#1E293B] bg-[#F43F5E]/10 px-4 py-3">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#F43F5E]">
                  Sandbox Crash
                </p>
                <pre className="mt-2 overflow-x-auto rounded-sm bg-[#0B0F19] p-3 font-mono text-xs text-[#F43F5E]">
                  {result.error}
                </pre>
              </div>
            )}

            {/* Timeout */}
            {result?.kind === "timeout" && (
              <div className="border-b border-[#1E293B] bg-[#F59E0B]/10 px-4 py-3">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  Time Limit Exceeded
                </p>
                <p className="mt-1 font-sans text-xs text-[#94A3B8]">
                  Execution timed out after 3 000 ms.
                </p>
              </div>
            )}

            {/* Verdict Passed Banner */}
            {allPassed && (
              <div className="flex items-center gap-2.5 border-b border-[#10B981] bg-[#10B981]/15 px-4 py-3 shadow-sm">
                <span className="flex size-5 items-center justify-center rounded-sm bg-[#10B981] text-[#0B0F19] font-mono text-xs font-bold">
                  ✓
                </span>
                <span className="font-mono text-xs font-bold tracking-wide text-[#10B981]">
                  VERDICT: PASSED // HIDDEN HARNESS CLEARED
                </span>
              </div>
            )}

            {/* Summary Bar */}
            {cases.length > 0 && (
              <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#0B0F19] px-4 py-2">
                <span className="font-mono text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
                  TEST CASES DOCKET
                </span>
                <span
                  className={`font-mono text-xs font-bold ${allPassed ? "text-[#10B981]" : "text-[#F43F5E]"}`}
                >
                  {passCount} / {cases.length} PASSING
                </span>
              </div>
            )}

            {/* Verdict rows */}
            {cases.map((c, i) => (
              <div
                key={i}
                className={`border-b border-[#1E293B]/60 px-4 py-3 ${c.passed ? "bg-[#10B981]/5" : "bg-[#F43F5E]/5"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 font-mono text-xs font-bold ${c.passed ? "text-[#10B981]" : "text-[#F43F5E]"}`}
                  >
                    {c.passed ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-xs font-medium text-[#F8FAFC]">
                      {c.name}
                    </p>
                    {!c.passed && c.message && (
                      <pre className="mt-1.5 overflow-x-auto rounded-sm bg-[#0B0F19] p-2 font-mono text-[11px] text-[#F43F5E] whitespace-pre-wrap border border-[#F43F5E]/30">
                        {c.message}
                      </pre>
                    )}
                    {!c.passed && c.diff && typeof c.diff === "string" && (
                      <pre className="mt-1.5 overflow-x-auto rounded-sm bg-[#0B0F19] p-2 font-mono text-[11px] text-[#94A3B8] whitespace-pre-wrap border border-[#1E293B]">
                        {c.diff}
                      </pre>
                    )}
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[10px] font-bold ${c.passed ? "text-[#10B981]" : "text-[#F43F5E]"}`}
                  >
                    {c.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
              </div>
            ))}

            {/* Conceptual breakdown */}
            {showConcept && conceptNote && (
              <div className="border-t border-[#1E293B]">
                <button
                  onClick={() => setConceptOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#1E293B]"
                >
                  <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#38BDF8]">
                    <span>💡</span> View Conceptual Breakdown
                  </span>
                  <svg
                    className={`size-4 text-[#64748B] transition-transform ${conceptOpen ? "rotate-180" : ""}`}
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
                  <div className="space-y-4 border-t border-[#1E293B] bg-[#0B0F19] px-4 py-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#38BDF8] font-bold">
                        Concept
                      </p>
                      <p className="mt-1 font-display font-bold text-[#F8FAFC]">
                        {conceptNote.concept}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold">
                        Explanation
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-[#94A3B8]">
                        {conceptNote.explanation}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold">
                        Real-World Analogy
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-[#94A3B8]">
                        {conceptNote.realWorldAnalogy}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold">
                        Fix Pattern
                      </p>
                      <pre className="mt-1 overflow-x-auto rounded-sm bg-[#0F172A] px-3 py-2 font-mono text-xs text-[#F8FAFC] border border-[#1E293B]">
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
                  className="size-8 text-[#1E293B]"
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
                <p className="font-mono text-xs text-[#64748B]">
                  Run tests to view verdict console
                </p>
                <p className="font-mono text-[10px] text-[#475569]">Ctrl+Enter</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
