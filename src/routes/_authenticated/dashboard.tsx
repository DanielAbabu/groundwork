import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { scenarios } from "@/content/scenarios";
import { designScenarios } from "@/content/design";
import { listProgress, type ProgressRow } from "@/lib/progress.functions";
import { listDesignResults, type DesignStageRow } from "@/lib/design.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — debugging and design review progress" },
      {
        name: "description",
        content:
          "One view of both tracks: incidents resolved in the debugging rotation and design reviews completed stage by stage.",
      },
      { property: "og:title", content: "Your dashboard — debugging and design review progress" },
      {
        property: "og:description",
        content: "Incidents resolved and design reviews completed, in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const router = useRouter();
  const fetchProgress = useServerFn(listProgress);
  const fetchDesign = useServerFn(listDesignResults);

  const { data: progress } = useQuery<ProgressRow[]>({
    queryKey: ["progress"],
    queryFn: () => fetchProgress(),
  });
  const { data: designResults } = useQuery<DesignStageRow[]>({
    queryKey: ["design-results"],
    queryFn: () => fetchDesign(),
  });

  const debugIds = new Set(scenarios.map((s) => s.id));
  const resolved = (progress ?? []).filter(
    (row) => row.status === "passed" && debugIds.has(row.scenario_id),
  ).length;

  const designDone = designScenarios.filter((scenario) => {
    const passed = new Set(
      (designResults ?? [])
        .filter((row) => row.scenario_id === scenario.id && row.passed)
        .map((row) => row.stage_id),
    );
    return scenario.stages.every((stage) => passed.has(stage.id));
  }).length;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">incident</p>
            <h1 className="mt-2 text-xl font-semibold text-foreground">Your rotation</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="font-mono">
              <Link to="/profile">Profile</Link>
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

      <div className="mx-auto grid max-w-5xl gap-4 px-6 py-10 md:grid-cols-2">
        <Link
          to="/incidents"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent/40"
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">debugging</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            {resolved}/{scenarios.length} resolved
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Get paged into a broken codebase, read the signal, fix the root cause, run the hidden
            harness.
          </p>
        </Link>

        <Link
          to="/design"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent/40"
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">design review</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            {designDone}/{designScenarios.length} completed
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Present to a stakeholder in four stages: clarify, size, sketch, and defend a trade-off.
          </p>
        </Link>
      </div>
    </main>
  );
}
