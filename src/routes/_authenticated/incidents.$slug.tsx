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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
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
  BookOpen,
  Code2,
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
  const [mobileTab, setMobileTab] = useState<"brief" | "editor" | "console">("editor");

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
    <div className="flex h-[calc(100vh-56px)] flex-col bg-[#000000] text-[#F8FAFC] overflow-hidden selection:bg-[#10B981] selection:text-[#000000]">
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
        {/* ── DESKTOP VIEW: Resizable 3-Panel Group ── */}
        <div className="hidden lg:flex w-full h-full">
          <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
            {/* ── LEFT PANEL: Problem Brief & Diagnostic Telemetry ── */}
            <ResizablePanel
              defaultSize={descCollapsed ? 4 : 25}
              minSize={descCollapsed ? 4 : 15}
              maxSize={descCollapsed ? 4 : 40}
              className="bg-[#0A0A0A] transition-all duration-200"
            >
              <div className="flex h-full flex-col overflow-hidden border-r border-[#171717] relative">
                {/* Collapse toggle */}
                <button
                  onClick={() => setDescCollapsed((v) => !v)}
                  title={descCollapsed ? "Expand Incident Brief" : "Collapse Incident Brief"}
                  className="absolute right-3 top-3 z-20 flex size-7 items-center justify-center rounded-sm border border-[#171717] bg-[#000000] text-[#64748B] hover:text-[#F8FAFC] transition-colors"
                >
                  {descCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                </button>

                {!descCollapsed && (
                  <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-7">
                    {/* Severity + Service Metadata Header */}
                    <div className="flex flex-wrap items-center gap-2.5 border-b border-[#171717] pb-5 pr-8">
                      <span
                        className={`rounded-sm border px-2.5 py-1 font-display text-xs font-bold uppercase tracking-wider ${scenario.severity === "SEV-1" ? "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]" : scenario.severity === "SEV-2" ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"}`}
                      >
                        {scenario.severity}
                      </span>
                      <span className="rounded-sm border border-[#171717] bg-[#000000] px-2.5 py-1 font-display text-xs font-semibold text-[#94A3B8]">
                        {scenario.service}
                      </span>
                      <span className="rounded-sm border border-[#171717] bg-[#000000] px-2.5 py-1 font-display text-xs font-semibold text-[#94A3B8]">
                        {TYPE_LABELS[scenario.type]}
                      </span>
                    </div>

                    {/* Incident Framing Context */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 font-display text-xs uppercase tracking-wider text-[#64748B] font-bold">
                        <Terminal className="size-3.5 text-[#10B981]" />
                        Incident Context
                      </div>
                      <p className="font-display text-sm leading-relaxed text-[#F8FAFC]">
                        {scenario.framing}
                      </p>
                    </div>

                    {/* Alert Symptom Terminal Block */}
                    <div className="rounded-sm border border-[#EF4444]/30 bg-[#000000] p-4 sm:p-5 space-y-2">
                      <div className="flex items-center gap-2 font-display text-xs uppercase tracking-wider text-[#EF4444] font-bold">
                        <ShieldAlert className="size-4 text-[#EF4444]" />
                        Alert Symptom
                      </div>
                      <p className="font-display text-sm text-[#F8FAFC] leading-relaxed">
                        {scenario.symptom}
                      </p>
                    </div>

                    {/* Hints Drawer */}
                    {scenario.hints && scenario.hints.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-[#171717]">
                        <div className="flex items-center gap-2 font-display text-xs uppercase tracking-wider text-[#64748B] font-bold">
                          <HelpCircle className="size-3.5 text-[#10B981]" />
                          Investigation Hints
                        </div>
                        <HintDrawer hints={scenario.hints} />
                      </div>
                    )}

                    {/* Concept Tags */}
                    {scenario.concepts && scenario.concepts.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-[#171717]">
                        <div className="flex items-center gap-2 font-display text-xs uppercase tracking-wider text-[#64748B] font-bold">
                          <Tag className="size-3.5 text-[#10B981]" />
                          Target Concepts
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {scenario.concepts.map((c) => (
                            <span
                              key={c}
                              className="rounded-sm border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 font-display text-xs text-[#10B981] font-semibold"
                            >
                              #{c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Incident Postmortem */}
                    {showPostmortem && (
                      <div className="rounded-sm border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4 space-y-3 pt-3 border-t border-[#171717]">
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
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* ── CENTER PANEL: Monaco Code Editor ── */}
            <ResizablePanel defaultSize={descCollapsed ? 66 : 45} minSize={25}>
              <section className="flex h-full flex-col overflow-hidden border-r border-[#171717]">
                {/* File Tabs Strip */}
                <div
                  className="flex shrink-0 items-center overflow-x-auto border-b border-[#171717] bg-[#000000]"
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
                        className={`flex h-9 shrink-0 items-center gap-1.5 border-r border-[#171717] px-3.5 font-mono text-xs transition-colors whitespace-nowrap ${
                          isActive
                            ? "border-b-2 border-b-[#10B981] bg-[#0A0A0A] text-[#F8FAFC] font-bold"
                            : "text-[#64748B] hover:bg-[#0A0A0A]/50 hover:text-[#F8FAFC]"
                        }`}
                      >
                        <FileCode className="size-3.5 text-[#10B981]" />
                        {isDirty && <span className="text-[#F59E0B] text-[8px]">●</span>}
                        {file.path.split("/").pop()}
                        {file.context && (
                          <span className="text-[9px] text-[#64748B] bg-[#000000] px-1 rounded border border-[#171717]">
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
                <div className="flex-1 overflow-hidden bg-[#000000]">
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
                          <Cpu className="size-4 animate-spin text-[#10B981]" />
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
                <div className="flex shrink-0 items-center justify-between border-t border-[#171717] bg-[#000000] px-4 py-1.5 font-mono text-[10px] text-[#64748B]">
                  <div className="flex items-center gap-3">
                    <span>{activePath.split(".").pop()?.toUpperCase() ?? "PYTHON"} ENVIRONMENT</span>
                    <span>·</span>
                    <span>{activeFile.context ? "READ ONLY CONTEXT" : "EDITABLE SOURCE"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#10B981]">PYODIDE HARNESS READY</span>
                  </div>
                </div>
              </section>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* ── RIGHT PANEL: Test Console & Signal Telemetry ── */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <div className="flex h-full flex-col overflow-hidden">
                <ConsolePanel
                  result={result}
                  running={running}
                  failedRuns={failedRuns}
                  conceptNote={scenario.conceptNote ?? undefined}
                  signal={<SignalPanel signal={scenario.signal} />}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* ── MOBILE VIEW: High-Density Tab View Switcher ── */}
        <div className="lg:hidden flex flex-1 flex-col overflow-hidden pb-12 w-full">
          {/* Mobile Top View Switcher */}
          <div className="flex items-center border-b border-[#171717] bg-[#0A0A0A] shrink-0">
            <button
              onClick={() => setMobileTab("brief")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-mono text-xs font-semibold transition-colors border-b-2 ${
                mobileTab === "brief"
                  ? "border-[#10B981] text-[#10B981] bg-[#000000]"
                  : "border-transparent text-[#94A3B8]"
              }`}
            >
              <BookOpen className="size-3.5" />
              Brief
            </button>
            <button
              onClick={() => setMobileTab("editor")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-mono text-xs font-semibold transition-colors border-b-2 ${
                mobileTab === "editor"
                  ? "border-[#10B981] text-[#10B981] bg-[#000000]"
                  : "border-transparent text-[#94A3B8]"
              }`}
            >
              <Code2 className="size-3.5" />
              Code
            </button>
            <button
              onClick={() => setMobileTab("console")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-mono text-xs font-semibold transition-colors border-b-2 ${
                mobileTab === "console"
                  ? "border-[#10B981] text-[#10B981] bg-[#000000]"
                  : "border-transparent text-[#94A3B8]"
              }`}
            >
              <Terminal className="size-3.5" />
              Console
              {result && (
                <span className={`size-2 rounded-full ${passed ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
              )}
            </button>
          </div>

          {/* Mobile View Container */}
          <div className="flex-1 overflow-hidden">
            {mobileTab === "brief" && (
              <div className="h-full overflow-y-auto p-4 space-y-5 bg-[#0A0A0A]">
                <div className="flex flex-wrap items-center gap-2 border-b border-[#171717] pb-3">
                  <span className="rounded-sm border border-[#EF4444]/40 bg-[#EF4444]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#EF4444]">
                    {scenario.severity}
                  </span>
                  <span className="rounded-sm border border-[#171717] bg-[#000000] px-2 py-0.5 font-mono text-[10px] text-[#94A3B8]">
                    {scenario.service}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold">
                    Incident Context
                  </div>
                  <p className="text-xs leading-relaxed text-[#F8FAFC]">{scenario.framing}</p>
                </div>

                <div className="rounded-sm border border-[#EF4444]/30 bg-[#000000] p-3 space-y-1">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#EF4444] font-bold">
                    Alert Symptom
                  </div>
                  <p className="font-mono text-xs text-[#F8FAFC]">{scenario.symptom}</p>
                </div>

                {scenario.hints && scenario.hints.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#171717]">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold">
                      Hints
                    </div>
                    <HintDrawer hints={scenario.hints} />
                  </div>
                )}
              </div>
            )}

            {mobileTab === "editor" && (
              <div className="flex h-full flex-col overflow-hidden">
                {/* File Tabs Strip */}
                <div className="flex shrink-0 items-center overflow-x-auto border-b border-[#171717] bg-[#000000]">
                  {scenario.files.map((file) => {
                    const isActive = file.path === activePath;
                    return (
                      <button
                        key={file.path}
                        onClick={() => setActivePath(file.path)}
                        className={`flex h-8 shrink-0 items-center gap-1 border-r border-[#171717] px-3 font-mono text-xs ${
                          isActive
                            ? "border-b-2 border-b-[#10B981] bg-[#0A0A0A] text-[#F8FAFC] font-bold"
                            : "text-[#64748B]"
                        }`}
                      >
                        <FileCode className="size-3 text-[#10B981]" />
                        {file.path.split("/").pop()}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-hidden bg-[#000000]">
                  <ClientOnly
                    fallback={<pre className="p-3 font-mono text-xs">{activeValue}</pre>}
                  >
                    <Suspense fallback={<div className="p-4 font-mono text-xs">Loading IDE…</div>}>
                      <CodeEditor
                        path={activePath}
                        value={activeValue}
                        readOnly={activeFile.context ?? false}
                        onChange={(next) => persist({ ...edits, [activePath]: next })}
                      />
                    </Suspense>
                  </ClientOnly>
                </div>
              </div>
            )}

            {mobileTab === "console" && (
              <div className="h-full overflow-hidden flex flex-col">
                <ConsolePanel
                  result={result}
                  running={running}
                  failedRuns={failedRuns}
                  conceptNote={scenario.conceptNote ?? undefined}
                  signal={<SignalPanel signal={scenario.signal} />}
                />
              </div>
            )}
          </div>

          {/* Mobile Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 border-t border-[#171717] bg-[#000000] z-30">
            <button
              onClick={run}
              disabled={running || passed}
              className="w-full py-3 bg-[#10B981] font-mono text-xs font-bold text-[#000000] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {running ? "Running Hidden Tests…" : passed ? "✓ VERDICT: PASSED" : "▶ Run Tests (Ctrl+Enter)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
