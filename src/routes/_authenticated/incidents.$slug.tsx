import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getScenario } from "@/content/scenarios";
import { TYPE_LABELS, scenarioFileMap, type Scenario } from "@/lib/scenarios/types";
import { runHiddenTests, type RunResult } from "@/lib/sandbox/runTests";
import { recordRun } from "@/lib/progress.functions";
import { SignalPanel } from "@/components/SignalPanel";
import { HintDrawer } from "@/components/HintDrawer";
import { ProblemBar } from "@/components/ProblemBar";
import { ConsolePanel } from "@/components/ConsolePanel";
import {
  AlertCircle,
  FileCode,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Terminal,
  HelpCircle,
  Tag,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  Cpu,
} from "lucide-react";

const CodeEditor = lazy(() => import("@/components/CodeEditor"));

export const Route = createFileRoute("/_authenticated/incidents/$slug")({
  loader: ({ params }) => {
    const scenario = getScenario(params.slug);
    if (!scenario) throw notFound();
    return { scenario };
  },
  head: ({ loaderData }) => {
    const scenario = loaderData?.scenario;
    if (!scenario)
      return {
        meta: [{ title: "Unavailable — RawSkill" }, { name: "robots", content: "noindex" }],
      };
    return {
      meta: [
        { title: `${scenario.title} — RawSkill` },
        { name: "description", content: scenario.symptom },
        { property: "og:title", content: scenario.title },
        { property: "og:description", content: scenario.symptom },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: IncidentRoom,
  notFoundComponent: MissingIncident,
});

function MissingIncident() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F19] px-6 text-center text-[#F8FAFC]">
      <div className="space-y-4">
        <AlertCircle className="mx-auto size-10 text-[#EF4444]" />
        <h1 className="font-mono text-lg font-bold">No such scenario found in docket</h1>
        <Link
          to="/incidents"
          className="inline-block rounded-sm bg-[#38BDF8] px-4 py-2 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-colors"
        >
          Return to Debugging Docket
        </Link>
      </div>
    </main>
  );
}

const storageKey = (id: string) => `incident:edits:${id}`;

function IncidentRoom() {
  const { scenario } = Route.useLoaderData() as { scenario: Scenario };
  const queryClient = useQueryClient();
  const save = useServerFn(recordRun);

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activePath, setActivePath] = useState(
    scenario.files.find((f) => !f.context)?.path ?? scenario.files[0]!.path,
  );
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [failedRuns, setFailedRuns] = useState(0);
  const [passed, setPassed] = useState(false);
  const [descCollapsed, setDescCollapsed] = useState(false);

  useEffect(() => {
    setEdits({});
    setResult(null);
    setFailedRuns(0);
    setPassed(false);
    setActivePath(scenario.files.find((f) => !f.context)?.path ?? scenario.files[0]!.path);
    try {
      const raw = window.localStorage.getItem(storageKey(scenario.id));
      if (raw) setEdits(JSON.parse(raw) as Record<string, string>);
    } catch {
      /* ignore */
    }
  }, [scenario]);

  // Ctrl+Enter shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!running && !passed) run();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, passed]);

  const persist = (next: Record<string, string>) => {
    setEdits(next);
    try {
      window.localStorage.setItem(storageKey(scenario.id), JSON.stringify(next));
    } catch {
      /**/
    }
  };

  const mutation = useMutation({
    mutationFn: (didPass: boolean) => save({ data: { scenarioId: scenario.id, passed: didPass } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress"] }),
  });

  const activeFile = scenario.files.find((f) => f.path === activePath)!;
  const activeValue = edits[activePath] ?? activeFile.content;
  const showPostmortem = passed || failedRuns >= 2;

  const dirty = useMemo(
    () =>
      new Set(
        scenario.files
          .filter((f) => edits[f.path] !== undefined && edits[f.path] !== f.content)
          .map((f) => f.path),
      ),
    [edits, scenario],
  );

  const run = async () => {
    setRunning(true);
    try {
      const outcome = await runHiddenTests(scenarioFileMap(scenario, edits), scenario.testPath);
      setResult(outcome);
      const didPass =
        outcome.kind === "results" &&
        outcome.cases.length > 0 &&
        outcome.cases.every((c) => c.passed);
      if (outcome.kind === "timeout") {
        toast.error("Test execution timed out after 3 seconds.");
        setFailedRuns((n) => n + 1);
      } else if (outcome.kind === "crash") {
        toast.error(`Sandbox crash: ${outcome.error}`);
        setFailedRuns((n) => n + 1);
      } else if (didPass) {
        setPassed(true);
        toast.success("Scenario resolved — all hidden tests pass.");
      } else {
        setFailedRuns((n) => n + 1);
      }
      mutation.mutate(didPass);
    } catch (err) {
      toast.error(
        `Execution error: ${err instanceof Error ? err.message : "Sandbox worker crashed"}`,
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col bg-[#0B0F19] text-[#F8FAFC] overflow-hidden selection:bg-[#38BDF8] selection:text-[#0B0F19]">
      {/* ── Problem Command Bar ── */}
      <ProblemBar
        title={scenario.title}
        backTo="/incidents"
        backLabel="Docket"
        severity={scenario.severity}
        difficulty={scenario.difficulty}
        passed={passed}
        running={running}
        onRun={run}
      />

      {/* ── 3-Panel IDE Workspace Layout ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── LEFT PANEL: Problem Brief & Diagnostic Telemetry ── */}
        <aside
          className={`hidden lg:flex flex-col border-r border-[#1E293B] bg-[#0F172A] overflow-hidden transition-all duration-200 ${descCollapsed ? "w-0" : "w-80 shrink-0"}`}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Collapse toggle */}
            <button
              onClick={() => setDescCollapsed((v) => !v)}
              title={descCollapsed ? "Expand Incident Brief" : "Collapse Incident Brief"}
              className="absolute left-[318px] top-[14px] z-10 flex size-5 items-center justify-center rounded-r-sm border border-l-0 border-[#1E293B] bg-[#0F172A] text-[#64748B] hover:text-[#F8FAFC] transition-colors"
            >
              {descCollapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
            </button>

            <div className="p-5 space-y-6">
              {/* Severity + Service Metadata Header */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#1E293B] pb-4">
                <span
                  className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${scenario.severity === "SEV-1" ? "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]" : scenario.severity === "SEV-2" ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"}`}
                >
                  {scenario.severity}
                </span>
                <span className="rounded-sm border border-[#1E293B] bg-[#0B0F19] px-2 py-0.5 font-mono text-[10px] text-[#94A3B8]">
                  {scenario.service}
                </span>
                <span className="rounded-sm border border-[#1E293B] bg-[#0B0F19] px-2 py-0.5 font-mono text-[10px] text-[#94A3B8]">
                  {TYPE_LABELS[scenario.type]}
                </span>
              </div>

              {/* Incident Framing Context */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold">
                  <Terminal className="size-3 text-[#38BDF8]" />
                  Incident Context
                </div>
                <p className="font-sans text-xs leading-relaxed text-[#F8FAFC]">
                  {scenario.framing}
                </p>
              </div>

              {/* Alert Symptom Terminal Block */}
              <div className="rounded-sm border border-[#EF4444]/30 bg-[#0B0F19] p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#EF4444] font-bold">
                  <ShieldAlert className="size-3.5 text-[#EF4444]" />
                  Alert Symptom
                </div>
                <p className="font-mono text-xs text-[#F8FAFC] leading-relaxed">
                  {scenario.symptom}
                </p>
              </div>

              {/* Hints Drawer */}
              {scenario.hints && scenario.hints.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold">
                    <HelpCircle className="size-3 text-[#38BDF8]" />
                    Investigation Hints
                  </div>
                  <HintDrawer hints={scenario.hints} />
                </div>
              )}

              {/* Concept Tags */}
              {scenario.concepts && scenario.concepts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold">
                    <Tag className="size-3 text-[#38BDF8]" />
                    Target Concepts
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.concepts.map((c) => (
                      <span
                        key={c}
                        className="rounded-sm border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-2 py-0.5 font-mono text-[10px] text-[#38BDF8] font-semibold"
                      >
                        #{c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Incident Postmortem */}
              {showPostmortem && (
                <div className="rounded-sm border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4 space-y-3 pt-3 border-t border-[#1E293B]">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#F59E0B] font-bold">
                    <CheckCircle2 className="size-3.5 text-[#F59E0B]" />
                    Incident Postmortem
                  </div>
                  {typeof scenario.postmortem === "string" ? (
                    <p className="font-sans text-xs leading-relaxed text-[#94A3B8]">
                      {scenario.postmortem}
                    </p>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="font-mono text-[10px] uppercase font-bold text-[#EF4444] block">
                          Root Cause
                        </span>
                        <span className="text-[#F8FAFC] leading-relaxed block mt-0.5">
                          {scenario.postmortem.rootCause}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] uppercase font-bold text-[#F59E0B] block">
                          Impact Breakdown
                        </span>
                        <span className="text-[#94A3B8] leading-relaxed block mt-0.5">
                          {scenario.postmortem.impact}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] uppercase font-bold text-[#10B981] block">
                          Prevention Strategy
                        </span>
                        <span className="text-[#94A3B8] leading-relaxed block mt-0.5">
                          {scenario.postmortem.prevention}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── CENTER PANEL: Monaco Code Editor ── */}
        <section className="flex flex-1 flex-col overflow-hidden border-r border-[#1E293B]">
          {/* File Tabs Strip */}
          <div
            className="flex shrink-0 items-center overflow-x-auto border-b border-[#1E293B] bg-[#0B0F19]"
            style={{ scrollbarWidth: "none" }}
          >
            {scenario.files.map((file) => {
              const isActive = file.path === activePath;
              const isDirty = dirty.has(file.path);
              return (
                <button
                  key={file.path}
                  onClick={() => setActivePath(file.path)}
                  title={file.path}
                  className={`flex h-9 shrink-0 items-center gap-1.5 border-r border-[#1E293B] px-3.5 font-mono text-xs transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-b-2 border-b-[#38BDF8] bg-[#0F172A] text-[#F8FAFC] font-bold"
                      : "text-[#64748B] hover:bg-[#0F172A]/50 hover:text-[#F8FAFC]"
                  }`}
                >
                  <FileCode className="size-3.5 text-[#38BDF8]" />
                  {isDirty && <span className="text-[#F59E0B] text-[8px]">●</span>}
                  {file.path.split("/").pop()}
                  {file.context && (
                    <span className="text-[9px] text-[#64748B] bg-[#0B0F19] px-1 rounded border border-[#1E293B]">
                      ro
                    </span>
                  )}
                </button>
              );
            })}
            {/* Reset button */}
            <button
              onClick={() => persist({})}
              title="Reset all file modifications to initial scenario state"
              className="ml-auto shrink-0 px-3 font-mono text-[10px] text-[#64748B] hover:text-[#F8FAFC] transition-colors flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              Reset Edits
            </button>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 overflow-hidden bg-[#0B0F19]">
            <ClientOnly
              fallback={
                <pre className="h-full overflow-auto p-4 font-mono text-xs text-[#94A3B8]">
                  {activeValue}
                </pre>
              }
            >
              <Suspense
                fallback={
                  <div className="p-6 font-mono text-xs text-[#64748B] flex items-center gap-2">
                    <Cpu className="size-4 animate-spin text-[#38BDF8]" />
                    Initializing Monaco IDE Environment…
                  </div>
                }
              >
                <CodeEditor
                  path={activePath}
                  value={activeValue}
                  readOnly={activeFile.context ?? false}
                  onChange={(next) => persist({ ...edits, [activePath]: next })}
                />
              </Suspense>
            </ClientOnly>
          </div>

          {/* Editor Footer Telemetry Bar */}
          <div className="flex shrink-0 items-center justify-between border-t border-[#1E293B] bg-[#0B0F19] px-4 py-1.5 font-mono text-[10px] text-[#64748B]">
            <div className="flex items-center gap-3">
              <span>{activePath.split(".").pop()?.toUpperCase() ?? "PYTHON"} ENVIRONMENT</span>
              <span>·</span>
              <span>{activeFile.context ? "READ ONLY CONTEXT" : "EDITABLE SOURCE"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#38BDF8]">PYODIDE HARNESS READY</span>
            </div>
          </div>
        </section>

        {/* ── RIGHT PANEL: Test Console & Signal Telemetry ── */}
        <div className="hidden lg:flex w-[380px] shrink-0 flex-col overflow-hidden">
          <ConsolePanel
            result={result}
            running={running}
            failedRuns={failedRuns}
            conceptNote={scenario.conceptNote ?? undefined}
            signal={<SignalPanel signal={scenario.signal} />}
          />
        </div>

        {/* Mobile: bottom panel run trigger */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-[#1E293B] bg-[#0B0F19] z-30">
          <div className="flex">
            <button
              onClick={run}
              disabled={running || passed}
              className="flex-1 py-3 bg-[#38BDF8] font-mono text-xs font-bold text-[#0B0F19] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {running ? "Running Hidden Tests…" : passed ? "✓ VERDICT: PASSED" : "▶ Run Tests (Ctrl+Enter)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
