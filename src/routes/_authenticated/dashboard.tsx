import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { scenarios } from "@/content/scenarios";
import { designScenarios } from "@/content/design";
import { listProgress, type ProgressRow } from "@/lib/progress.functions";
import { listDesignResults, type DesignStageRow } from "@/lib/design.functions";
import { ProgressSummary } from "@/components/ProgressSummary";

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
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-500 font-semibold">
          on-call rotation
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Engineer Command Center</h1>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Select a track below to jump directly into interactive debugging or architectural design
          reviews.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          to="/incidents"
          className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-amber-500/50 hover:bg-accent/40 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-500 font-semibold">
              debugging track
            </p>
            <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground">
              Explore →
            </span>
          </div>
          <h2 className="mt-3 text-3xl font-bold text-foreground">
            {resolved}/{scenarios.length}{" "}
            <span className="text-sm font-normal text-muted-foreground">resolved</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Get paged into a broken codebase, read real-time signal, fix the root cause in Monaco
            Editor, and verify against hidden test harnesses.
          </p>
        </Link>

        <Link
          to="/design"
          className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-amber-500/50 hover:bg-accent/40 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-500 font-semibold">
              design review track
            </p>
            <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground">
              Explore →
            </span>
          </div>
          <h2 className="mt-3 text-3xl font-bold text-foreground">
            {designDone}/{designScenarios.length}{" "}
            <span className="text-sm font-normal text-muted-foreground">completed</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Present to senior engineering stakeholders across four interactive stages: clarify
            requirements, calculate capacity, design components, and defend trade-offs.
          </p>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">
              Active Rotation Performance
            </h3>
            <p className="text-sm text-foreground mt-1 font-medium">
              {resolved + designDone === 0
                ? "Your rotation is ready — start your first incident scenario."
                : `Overall progress across ${scenarios.length + designScenarios.length} system engineering challenges.`}
            </p>
          </div>
        </div>
        <div className="pt-4">
          <ProgressSummary progress={progress ?? []} />
        </div>
      </div>
    </div>
  );
}
