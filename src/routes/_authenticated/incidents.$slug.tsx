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
import { DiffBlock } from "@/components/DiffBlock";
import { HintDrawer } from "@/components/HintDrawer";
import { Button } from "@/components/ui/button";

const CodeEditor = lazy(() => import("@/components/CodeEditor"));

export const Route = createFileRoute("/_authenticated/incidents/$slug")({
  loader: ({ params }) => {
    const scenario = getScenario(params.slug);
    if (!scenario) throw notFound();
    return { scenario };
  },
  head: ({ loaderData }) => {
    const scenario = loaderData?.scenario;
    if (!scenario) {
      return {
        meta: [{ title: "Unavailable — Groundwork" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: `${scenario.title} — Groundwork room` },
        { name: "description", content: scenario.symptom },
        { property: "og:title", content: `${scenario.title} — Groundwork room` },
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
  const [tab, setTab] = useState<"signal" | "results">("signal");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [failedRuns, setFailedRuns] = useState(0);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    setEdits({});
    setResult(null);
    setFailedRuns(0);
    setPassed(false);
    setTab("signal");
    setActivePath(scenario.files.find((f) => !f.context)?.path ?? scenario.files[0]!.path);
    try {
      const raw = window.localStorage.getItem(storageKey(scenario.id));
      if (raw) setEdits(JSON.parse(raw) as Record<string, string>);
    } catch {
      /* ignore malformed cache */
    }
  }, [scenario]);

  const persist = (next: Record<string, string>) => {
    setEdits(next);
    try {
      window.localStorage.setItem(storageKey(scenario.id), JSON.stringify(next));
    } catch {
      /* storage may be unavailable */
    }
  };

  const mutation = useMutation({
    mutationFn: (didPass: boolean) => save({ data: { scenarioId: scenario.id, passed: didPass } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress"] }),
  });

  const activeFile = scenario.files.find((f) => f.path === activePath)!;
  const activeValue = edits[activePath] ?? activeFile.content;

  const cases = result?.kind === "results" ? result.cases : [];
  const passCount = cases.filter((c) => c.passed).length;
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
    setTab("results");
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
      console.error("Sandbox execution error:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <Link to="/incidents" className="font-mono text-xs text-primary hover:underline">
              ← groundwork board
            </Link>
            <h1 className="mt-2 text-lg font-semibold text-foreground">{scenario.title}</h1>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {DIFFICULTY_LABELS[scenario.difficulty]} · {scenario.service} ·{" "}
              {TYPE_LABELS[scenario.type]}
            </p>
          </div>
          {passed && (
            <span className="rounded border border-pass/40 px-3 py-1 font-mono text-xs uppercase tracking-widest text-pass">
              resolved
            </span>
          )}
        </div>
      </header>

      <p className="border-b border-border bg-surface px-6 py-3 text-sm text-muted-foreground">
        {scenario.framing}
      </p>

      <div className="grid flex-1 gap-0 lg:grid-cols-[200px_minmax(0,1fr)_380px]">
        <aside className="border-b border-border bg-sidebar p-3 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              files
            </p>
            <button
              onClick={() => persist({})}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground lg:hidden"
            >
              Reset
            </button>
          </div>
          <ul className="mt-2 flex overflow-x-auto gap-1.5 lg:flex-col lg:space-y-1 lg:overflow-visible pb-1 lg:pb-0">
            {scenario.files.map((file) => (
              <li key={file.path} className="shrink-0 lg:shrink">
                <button
                  onClick={() => setActivePath(file.path)}
                  className={`w-full whitespace-nowrap lg:truncate rounded px-2.5 py-1 text-left font-mono text-xs transition-colors ${
                    file.path === activePath
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/60"
                  }`}
                  title={file.path}
                >
                  {file.path.split("/").pop()}
                  {dirty.has(file.path) && <span className="ml-1 text-amber-500">●</span>}
                  {file.context && (
                    <span className="ml-1 text-[9px] uppercase text-muted-foreground">ro</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="mt-4 hidden w-full font-mono text-xs lg:flex"
            onClick={() => persist({})}
          >
            Reset files
          </Button>
        </aside>

        <section className="flex min-h-[420px] flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <p className="font-mono text-xs text-muted-foreground">{activePath}</p>
            {activeFile.context && (
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                read-only context
              </p>
            )}
          </div>
          <div className="flex-1">
            <ClientOnly
              fallback={
                <pre className="h-full overflow-auto p-4 font-mono text-xs text-muted-foreground">
                  {activeValue}
                </pre>
              }
            >
              <Suspense
                fallback={
                  <p className="p-4 font-mono text-xs text-muted-foreground">loading editor…</p>
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
        </section>

        <aside className="flex min-h-[420px] flex-col bg-surface-strong">
          <div className="flex border-b border-border">
            {(["signal", "results"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                  tab === key
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {tab === "signal" ? (
              <div>
                <SignalPanel signal={scenario.signal} />
                <HintDrawer hints={scenario.hints} />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    hidden tests
                  </p>
                  {result?.kind === "results" && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {passCount}/{cases.length} passing
                    </span>
                  )}
                </div>

                {!result && !running && (
                  <p className="mt-4 font-mono text-xs text-muted-foreground">
                    Click "Run hidden tests" to evaluate your changes.
                  </p>
                )}

                {running && (
                  <p className="mt-4 font-mono text-xs text-muted-foreground animate-pulse">
                    Running test harness…
                  </p>
                )}

                {result?.kind === "crash" && (
                  <div className="mt-3 rounded border border-sev1/40 bg-sev1/10 p-3 font-mono text-xs text-sev1">
                    Evaluation error: {result.error}
                  </div>
                )}

                {result?.kind === "timeout" && (
                  <div className="mt-3 rounded border border-sev1/40 bg-sev1/10 p-3 font-mono text-xs text-sev1">
                    Execution timed out after 3000ms.
                  </div>
                )}

                {result?.kind === "results" && (
                  <ul className="mt-3 space-y-2">
                    {cases.map((c, i) => (
                      <li
                        key={i}
                        className={`rounded border p-2.5 font-mono text-xs ${
                          c.passed
                            ? "border-pass/30 bg-pass/5 text-pass"
                            : "border-sev1/30 bg-sev1/5 text-sev1"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{c.name}</span>
                          <span>{c.passed ? "PASS" : "FAIL"}</span>
                        </div>
                        {!c.passed && <DiffBlock diff={c.diff} fallbackMessage={c.message} />}
                      </li>
                    ))}
                  </ul>
                )}

                {scenario.conceptNote && failedRuns > 0 && !passed && (
                  <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2">
                    <details className="group">
                      <summary className="cursor-pointer font-mono text-xs font-bold uppercase tracking-widest text-amber-500 flex items-center justify-between">
                        <span>💡 View Conceptual Breakdown</span>
                        <span className="text-[10px] text-muted-foreground group-open:rotate-180 transition-transform">
                          ▼
                        </span>
                      </summary>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="font-semibold text-foreground border-b border-amber-500/20 pb-1">
                          {scenario.conceptNote.concept}
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {scenario.conceptNote.explanation}
                        </p>
                        <div className="rounded bg-background p-2 border border-border">
                          <span className="font-mono text-[10px] uppercase font-bold text-amber-500 block">
                            Real-World Analogy:
                          </span>
                          <span className="text-muted-foreground italic">
                            "{scenario.conceptNote.realWorldAnalogy}"
                          </span>
                        </div>
                        <div className="rounded bg-background p-2 border border-border">
                          <span className="font-mono text-[10px] uppercase font-bold text-pass block">
                            Canonical Fix Pattern:
                          </span>
                          <span className="font-mono text-foreground">
                            {scenario.conceptNote.fixPattern}
                          </span>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>

          {showPostmortem && (
            <div className="border-t border-border bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber-500 font-bold">
                incident postmortem
              </p>
              {typeof scenario.postmortem === "string" ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {scenario.postmortem}
                </p>
              ) : (
                <div className="mt-3 space-y-2 font-mono text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-sev1 mr-2">
                      Root Cause:
                    </span>
                    <span className="text-foreground">{scenario.postmortem.rootCause}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-500 mr-2">
                      Impact:
                    </span>
                    <span className="text-muted-foreground">{scenario.postmortem.impact}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-pass mr-2">
                      Prevention:
                    </span>
                    <span className="text-muted-foreground">{scenario.postmortem.prevention}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border p-4">
            <Button className="w-full font-mono" onClick={run} disabled={running}>
              {running ? "Evaluating…" : "Run hidden tests"}
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
