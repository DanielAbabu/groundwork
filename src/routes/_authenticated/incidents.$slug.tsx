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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="font-mono text-lg text-foreground">No such scenario</h1>
        <Link
          to="/incidents"
          className="mt-4 inline-block font-mono text-sm text-primary underline"
        >
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
    <div className="flex h-[calc(100vh-44px)] flex-col bg-[#161412] text-[#F2ECE1] overflow-hidden">
      {/* ── Problem Bar ── */}
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

      {/* ── 3-Panel Workspace ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Problem Description (fixed 320px, collapsible) ── */}
        <aside
          className={`hidden lg:flex flex-col border-r border-[#3A342C] bg-[#1D1A17] overflow-hidden transition-all duration-200 ${descCollapsed ? "w-0" : "w-80 shrink-0"}`}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Collapse toggle */}
            <button
              onClick={() => setDescCollapsed((v) => !v)}
              className="absolute left-[318px] top-[88px] z-10 flex size-5 items-center justify-center rounded-r border border-l-0 border-[#3A342C] bg-[#1D1A17] text-[#7C7364] hover:text-[#F2ECE1] transition-colors"
            >
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={descCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                />
              </svg>
            </button>

            <div className="p-5 space-y-5">
              {/* Severity + type */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${scenario.severity === "SEV-1" ? "border-[#C4593F]/40 bg-[#C4593F]/10 text-[#C4593F]" : scenario.severity === "SEV-2" ? "border-[#D99B26]/40 bg-[#D99B26]/10 text-[#D99B26]" : "border-[#7A93A6]/40 bg-[#7A93A6]/10 text-[#7A93A6]"}`}
                >
                  {scenario.severity}
                </span>
                <span className="rounded border border-[#3A342C] bg-[#161412] px-1.5 py-0.5 font-mono text-[10px] text-[#B8AE9C]">
                  {scenario.service}
                </span>
                <span className="rounded border border-[#3A342C] bg-[#161412] px-1.5 py-0.5 font-mono text-[10px] text-[#B8AE9C]">
                  {TYPE_LABELS[scenario.type]}
                </span>
              </div>

              {/* Framing */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364] mb-1.5">
                  Incident Context
                </p>
                <p className="font-sans text-xs leading-relaxed text-[#F2ECE1]">
                  {scenario.framing}
                </p>
              </div>

              {/* Symptom */}
              <div className="rounded border border-[#3A342C] bg-[#161412] px-3 py-2.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364] mb-1">
                  Alert Symptom
                </p>
                <p className="font-mono text-xs text-[#F2ECE1]">{scenario.symptom}</p>
              </div>

              {/* Hints */}
              {scenario.hints && scenario.hints.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364] mb-1.5">
                    Hints
                  </p>
                  <HintDrawer hints={scenario.hints} />
                </div>
              )}

              {/* Concept tags */}
              {scenario.concepts && scenario.concepts.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364] mb-1.5">
                    Concepts
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.concepts.map((c) => (
                      <span
                        key={c}
                        className="rounded border border-[#C8912B]/30 bg-[#C8912B]/5 px-2 py-0.5 font-mono text-[10px] text-[#C8912B]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Postmortem */}
              {showPostmortem && (
                <div className="rounded border border-[#D99B26]/30 bg-[#D99B26]/5 p-3.5 space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#D99B26] font-bold">
                    Incident Postmortem
                  </p>
                  {typeof scenario.postmortem === "string" ? (
                    <p className="font-sans text-xs leading-relaxed text-[#B8AE9C]">
                      {scenario.postmortem}
                    </p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-mono text-[10px] uppercase font-bold text-[#C4593F]">
                          Root Cause:{" "}
                        </span>
                        <span className="text-[#F2ECE1]">{scenario.postmortem.rootCause}</span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] uppercase font-bold text-[#D99B26]">
                          Impact:{" "}
                        </span>
                        <span className="text-[#B8AE9C]">{scenario.postmortem.impact}</span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] uppercase font-bold text-[#7FB88A]">
                          Prevention:{" "}
                        </span>
                        <span className="text-[#B8AE9C]">{scenario.postmortem.prevention}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Center: Editor ── */}
        <section className="flex flex-1 flex-col overflow-hidden border-r border-[#3A342C]">
          {/* File tabs */}
          <div
            className="flex shrink-0 items-center overflow-x-auto border-b border-[#3A342C] bg-[#161412]"
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
                  className={`flex h-9 shrink-0 items-center gap-1.5 border-r border-[#3A342C] px-3 font-mono text-xs transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-b-2 border-b-[#C8912B] bg-[#1D1A17] text-[#F2ECE1] font-semibold"
                      : "text-[#7C7364] hover:bg-[#1D1A17]/50 hover:text-[#F2ECE1]"
                  }`}
                >
                  {isDirty && <span className="text-[#D99B26] text-[8px]">●</span>}
                  {file.path.split("/").pop()}
                  {file.context && <span className="text-[9px] text-[#7C7364]">ro</span>}
                </button>
              );
            })}
            {/* Reset button in tab row */}
            <button
              onClick={() => persist({})}
              className="ml-auto shrink-0 px-3 font-mono text-[10px] text-[#7C7364] hover:text-[#F2ECE1] transition-colors"
            >
              Reset File Edits
            </button>
          </div>

          {/* Monaco editor */}
          <div className="flex-1 overflow-hidden bg-[#161412]">
            <ClientOnly
              fallback={
                <pre className="h-full overflow-auto p-4 font-mono text-xs text-[#B8AE9C]">
                  {activeValue}
                </pre>
              }
            >
              <Suspense
                fallback={<p className="p-4 font-mono text-xs text-[#7C7364]">loading editor…</p>}
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

          {/* Editor bottom mini-bar */}
          <div className="flex shrink-0 items-center justify-between border-t border-[#3A342C] bg-[#161412] px-3 py-1">
            <span className="font-mono text-[10px] text-[#7C7364]">
              {activePath.split(".").pop()?.toUpperCase() ?? "JS"}
            </span>
            <span className="font-mono text-[10px] text-[#7C7364]">JetBrains Mono</span>
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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-[#3A342C] bg-[#161412] z-30">
          <div className="flex">
            <button
              onClick={run}
              disabled={running || passed}
              className="flex-1 py-3 bg-[#C8912B] font-mono text-xs font-bold text-[#161412] brass-emboss disabled:opacity-50"
            >
              {running ? "Running…" : passed ? "✓ VERDICT: PASSED" : "▶ Run Tests"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
