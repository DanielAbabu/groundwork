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
      return { meta: [{ title: "Unavailable — Incident" }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `${scenario.title} — Incident room` },
        { name: "description", content: scenario.symptom },
        { property: "og:title", content: `${scenario.title} — Incident room` },
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
        <h1 className="font-mono text-lg text-foreground">No such incident</h1>
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
        scenario.files.filter((f) => edits[f.path] !== undefined && edits[f.path] !== f.content).map((f) => f.path),
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
        outcome.kind === "results" && outcome.cases.length > 0 && outcome.cases.every((c) => c.passed);
      if (didPass) {
        setPassed(true);
        toast.success("Incident resolved — all hidden tests pass.");
      } else {
        setFailedRuns((n) => n + 1);
      }
      mutation.mutate(didPass);
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
              ← incident board
            </Link>
            <h1 className="mt-2 text-lg font-semibold text-foreground">{scenario.title}</h1>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {scenario.severity} · {scenario.service} · {TYPE_LABELS[scenario.type]} ·{" "}
              {DIFFICULTY_LABELS[scenario.difficulty]}
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
          <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            files
          </p>
          <ul className="mt-2 space-y-1">
            {scenario.files.map((file) => (
              <li key={file.path}>
                <button
                  onClick={() => setActivePath(file.path)}
                  className={`w-full truncate rounded px-2 py-1.5 text-left font-mono text-xs transition-colors ${
                    file.path === activePath
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60"
                  }`}
                  title={file.path}
                >
                  {file.path.split("/").pop()}
                  {dirty.has(file.path) && <span className="ml-1 text-primary">●</span>}
                  {file.context && (
                    <span className="ml-1 text-[9px] uppercase text-muted-foreground">ro</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="mt-4 w-full font-mono text-xs"
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
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-fail">
                {scenario.signal}
              </pre>
            ) : running ? (
              <p className="font-mono text-xs text-primary">running hidden tests…</p>
            ) : !result ? (
              <p className="font-mono text-xs text-muted-foreground">
                No runs yet. Hit “Run tests” when you think you have the root cause.
              </p>
            ) : result.kind === "timeout" ? (
              <p className="font-mono text-xs text-fail">
                Timed out after 3s — the sandbox was terminated. Look for an unresolved promise or a
                loop that never ends.
              </p>
            ) : result.kind === "crash" ? (
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-fail">
                {result.error}
              </pre>
            ) : (
              <ul className="space-y-2">
                {result.cases.map((testCase) => (
                  <li
                    key={testCase.name}
                    className="rounded border border-border bg-card p-3 font-mono text-[11px]"
                  >
                    <p className={testCase.passed ? "text-pass" : "text-fail"}>
                      {testCase.passed ? "PASS" : "FAIL"} · {testCase.name}
                    </p>
                    {testCase.message && (
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {testCase.message}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {result?.kind === "results" && result.logs.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  console
                </p>
                <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                  {result.logs.join("\n")}
                </pre>
              </div>
            )}

            {showPostmortem && (
              <div className="mt-5 rounded border border-primary/40 bg-card p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  postmortem
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {scenario.postmortem}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-3">
        <p className="font-mono text-xs text-muted-foreground">
          {result?.kind === "results"
            ? `${passCount}/${cases.length} tests passing`
            : "hidden test harness · behavior only"}
        </p>
        <Button onClick={run} disabled={running} className="font-mono">
          {running ? "Running…" : "Run tests"}
        </Button>
      </footer>
    </main>
  );
}
