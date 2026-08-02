import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { scenarios } from "@/content/scenarios";
import { DIFFICULTY_CLASSES, DIFFICULTY_LABELS, TYPE_LABELS } from "@/lib/scenarios/types";
import { listProgress, type ProgressRow } from "@/lib/progress.functions";
import { ProgressSummary } from "@/components/ProgressSummary";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/_authenticated/incidents/")({
  head: () => ({
    meta: [
      { title: "Incident board — open pages and resolved incidents" },
      {
        name: "description",
        content:
          "Every incident in the rotation with severity, type, difficulty, your attempts, and whether you resolved it.",
      },
      { property: "og:title", content: "Incident board — open pages and resolved incidents" },
      {
        property: "og:description",
        content: "Every incident in the rotation with severity, type, difficulty and your progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Board,
});




function Board() {
  const router = useRouter();
  const fetchProgress = useServerFn(listProgress);
  const { data: progress } = useQuery<ProgressRow[]>({
    queryKey: ["progress"],
    queryFn: () => fetchProgress(),
  });

  const byId = new Map((progress ?? []).map((row) => [row.scenario_id, row]));
  const resolved = (progress ?? []).filter((row) => row.status === "passed").length;
  const nextUp = scenarios.find((s) => byId.get(s.id)?.status !== "passed") ?? scenarios[0]!;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <Link to="/" className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              incident
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-foreground">Incident board</h1>
            <p className="font-mono text-xs text-muted-foreground">
              {resolved} of {scenarios.length} resolved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="font-mono">
              <Link to="/incidents/$slug" params={{ slug: nextUp.id }}>
                {resolved === 0 ? "Start first incident" : "Next incident"}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="font-mono"
              onClick={async () => {
                await supabase.auth.signOut();
                router.navigate({ to: "/" });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-10 md:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario) => {
          const row = byId.get(scenario.id);
          const status = row?.status === "passed" ? "resolved" : row ? "attempted" : "unattempted";
          return (
            <Link
              key={scenario.id}
              to="/incidents/$slug"
              params={{ slug: scenario.id }}
              className="flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${DIFFICULTY_CLASSES[scenario.difficulty]}`}
                >
                  {DIFFICULTY_LABELS[scenario.difficulty]}
                </span>

                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    status === "resolved"
                      ? "text-pass"
                      : status === "attempted"
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {status}
                </span>
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">{scenario.title}</h2>
              <p className="mt-2 line-clamp-3 font-mono text-xs leading-relaxed text-muted-foreground">
                {scenario.symptom}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="rounded bg-secondary px-2 py-0.5">{scenario.service}</span>
                <span className="rounded bg-secondary px-2 py-0.5">
                  {TYPE_LABELS[scenario.type]}
                </span>
                <span className="rounded bg-secondary px-2 py-0.5">
                  {DIFFICULTY_LABELS[scenario.difficulty]}
                </span>
              </div>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                {row?.attempts ? `${row.attempts} attempt${row.attempts === 1 ? "" : "s"}` : "no attempts yet"}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
