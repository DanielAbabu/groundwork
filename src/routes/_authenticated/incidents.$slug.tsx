import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getScenario } from "@/content/scenarios";
import {
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  scenarioFileMap,
  type Scenario,
} from "@/lib/scenarios/types";
import { runHiddenTests, type RunResult } from "@/lib/sandbox/runTests";
import { recordRun } from "@/lib/progress.functions";
import { SignalPanel } from "@/components/SignalPanel";
import { HintDrawer } from "@/components/HintDrawer";
import { DifficultyPill } from "@/components/DifficultyPill";
import { ProblemBar } from "@/components/ProblemBar";
import { ConsolePanel } from "@/components/ConsolePanel";

const CodeEditor = lazy(() => import("@/components/CodeEditor"));

export const Route = createFileRoute("/_authenticated/incidents/$slug")({
  loader: ({ params }) => {
    const scenario = getScenario(params.slug);
    if (!scenario) throw notFound();
    return { scenario };
  },
  head: ({ loaderData }) => {
    const scenario = loaderData?.scenario;
    if (!scenario) return { meta: [{ title: "Unavailable — Groundwork" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${scenario.title} — Groundwork` },
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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="font-mono text-lg text-foreground">No such scenario</h1>
        <Link to="/incidents" className="mt-4 inline-block font-mono text-sm text-primary underline">
          Back to the board
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
    } catch { /* ignore */ }
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
    try { window.localStorage.setItem(storageKey(scenario.id), JSON.stringify(next)); } catch { /**/ }
  };

  const mutation = useMutation({
    mutationFn: (didPass: boolean) => save({ data: { scenarioId: scenario.id, passed: didPass } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress"] }),
  });

  const activeFile = scenario.files.find((f) => f.path === activePath)!;
  const activeValue = edits[activePath] ?? activeFile.content;
  const showPostmortem = passed || failedRuns >= 2;

  const dirty = useMemo(
    () => new Set(scenario.files.filter((f) => edits[f.path] !== undefined && edits[f.path] !== f.content).map((f) => f.path)),
    [edits, scenario],
  );

  const run = async () => {
    setRunning(true);
    try {
      const outcome = await runHiddenTests(scenarioFileMap(scenario, edits), scenario.testPath);
      setResult(outcome);
      const didPass = outcome.kind === "results" && outcome.cases.length > 0 && outcome.cases.every((c) => c.passed);
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
      toast.error(`Execution error: ${err instanceof Error ? err.message : "Sandbox worker crashed"}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col bg-background overflow-hidden">
      {/* ── Problem Bar ── */}
      <ProblemBar
        title={scenario.title}
        backTo="/incidents"
        backLabel="Problems"
        severity={scenario.severity}
        difficulty={scenario.difficulty}
        passed={passed}
        running={running}
        onRun={run}
      />

      {/* ── 3-Panel Workspace ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Problem Description (fixed 320px, collapsible) ── */}
        <aside
          className={`hidden lg:flex flex-col border-r border-border bg-[#161616] overflow-hidden transition-all duration-200 ${descCollapsed ? "w-0" : "w-80 shrink-0"}`}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Collapse toggle */}
            <button
              onClick={() => setDescCollapsed((v) => !v)}
              className="absolute left-[318px] top-[88px] z-10 flex size-5 items-center justify-center rounded-r border border-l-0 border-border bg-[#161616] text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={descCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
              </svg>
            </button>

            <div className="p-5 space-y-5">
              {/* Severity + type */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${scenario.severity === "SEV-1" ? "border-sev1/40 bg-sev1/10 text-sev1" : scenario.severity === "SEV-2" ? "border-sev2/40 bg-sev2/10 text-sev2" : "border-sev3/40 bg-sev3/10 text-sev3"}`}>
                  {scenario.severity}
                </span>
                <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {scenario.service}
                </span>
                <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {TYPE_LABELS[scenario.type]}
                </span>
              </div>

              {/* Framing */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Incident Context</p>
                <p className="text-sm leading-relaxed text-foreground">{scenario.framing}</p>
              </div>

              {/* Symptom */}
              <div className="rounded border border-border bg-card px-3 py-2.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Alert Symptom</p>
                <p className="font-mono text-xs text-foreground">{scenario.symptom}</p>
              </div>

              {/* Hints */}
              {scenario.hints && scenario.hints.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Hints</p>
                  <HintDrawer hints={scenario.hints} />
                </div>
              )}

              {/* Concept tags */}
              {scenario.concepts && scenario.concepts.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Concepts</p>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.concepts.map((c) => (
                      <span key={c} className="rounded border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[10px] text-primary">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Postmortem */}
              {showPostmortem && (
                <div className="rounded border border-sev2/30 bg-sev2/5 p-3.5 space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-sev2 font-bold">Incident Postmortem</p>
                  {typeof scenario.postmortem === "string" ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">{scenario.postmortem}</p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div><span className="font-mono text-[10px] uppercase font-bold text-fail">Root Cause: </span><span className="text-foreground">{scenario.postmortem.rootCause}</span></div>
                      <div><span className="font-mono text-[10px] uppercase font-bold text-sev2">Impact: </span><span className="text-muted-foreground">{scenario.postmortem.impact}</span></div>
                      <div><span className="font-mono text-[10px] uppercase font-bold text-pass">Prevention: </span><span className="text-muted-foreground">{scenario.postmortem.prevention}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Center: Editor ── */}
        <section className="flex flex-1 flex-col overflow-hidden border-r border-border">
          {/* VSCode-style file tabs */}
          <div className="flex shrink-0 items-center overflow-x-auto border-b border-border bg-[#161616]" style={{ scrollbarWidth: "none" }}>
            {scenario.files.map((file) => {
              const isActive = file.path === activePath;
              const isDirty = dirty.has(file.path);
              return (
                <button
                  key={file.path}
                  onClick={() => setActivePath(file.path)}
                  title={file.path}
                  className={`flex h-9 shrink-0 items-center gap-1.5 border-r border-border px-3 font-mono text-xs transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-b-2 border-b-primary bg-card text-foreground"
                      : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                  }`}
                >
                  {isDirty && <span className="text-medium text-[8px]">●</span>}
                  {file.path.split("/").pop()}
                  {file.context && <span className="text-[9px] text-muted-foreground/60">ro</span>}
                </button>
              );
            })}
            {/* Reset button in tab row */}
            <button
              onClick={() => persist({})}
              className="ml-auto shrink-0 px-3 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Monaco editor */}
          <div className="flex-1 overflow-hidden">
            <ClientOnly fallback={<pre className="h-full overflow-auto p-4 font-mono text-xs text-muted-foreground">{activeValue}</pre>}>
              <Suspense fallback={<p className="p-4 font-mono text-xs text-muted-foreground">loading editor…</p>}>
                <CodeEditor
                  path={activePath}
                  value={activeValue}
                  readOnly={activeFile.context ?? false}
                  onChange={(next) => persist({ ...edits, [activePath]: next })}
                />
              </Suspense>
            </ClientOnly>
          </div>

          {/* Editor bottom mini-bar */}
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-[#161616] px-3 py-1">
            <span className="font-mono text-[10px] text-muted-foreground">
              {activePath.split(".").pop()?.toUpperCase() ?? "JS"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">JetBrains Mono</span>
          </div>
        </section>

        {/* ── Right: Console Panel (fixed 380px) ── */}
        <div className="hidden lg:flex w-[380px] shrink-0 flex-col overflow-hidden">
          <ConsolePanel
            result={result}
            running={running}
            failedRuns={failedRuns}
            conceptNote={scenario.conceptNote ?? undefined}
            signal={<SignalPanel signal={scenario.signal} />}
          />
        </div>

        {/* Mobile: bottom panel tabs */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-[#161616] z-30">
          <div className="flex">
            <button
              onClick={run}
              disabled={running || passed}
              className="run-btn flex-1 rounded-none border-0 py-3 disabled:opacity-50"
            >
              {running ? "Running…" : passed ? "✓ Resolved" : "▶ Run Tests"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
