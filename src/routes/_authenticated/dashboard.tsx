import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { scenarios } from "@/content/scenarios";
import { designScenarios } from "@/content/design";
import { listProgress, type ProgressRow } from "@/lib/progress.functions";
import { listDesignResults, type DesignStageRow } from "@/lib/design.functions";
import { StreakBadge } from "@/components/StreakBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Engineer Command Center — Groundwork" },
      {
        name: "description",
        content:
          "Track your progress in the debugging rotation and system design reviews.",
      },
      { property: "og:title", content: "Engineer Command Center — Groundwork" },
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
  const resolvedCount = (progress ?? []).filter(
    (row) => row.status === "passed" && debugIds.has(row.scenario_id),
  ).length;

  const designDoneCount = designScenarios.filter((scenario) => {
    const passed = new Set(
      (designResults ?? [])
        .filter((row) => row.scenario_id === scenario.id && row.passed)
        .map((row) => row.stage_id),
    );
    return scenario.stages.every((stage) => passed.has(stage.id));
  }).length;

  // Streak calculation
  const streakDays = (() => {
    const dates = (progress ?? [])
      .filter((r) => r.first_passed_at)
      .map((r) => new Date(r.first_passed_at!).toDateString());
    const unique = Array.from(new Set(dates)).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
    let count = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (const d of unique) {
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      const diff = Math.round((cursor.getTime() - day.getTime()) / 86400000);
      if (diff <= 1) {
        count++;
        cursor = day;
      } else {
        break;
      }
    }
    return count;
  })();

  const nextDebugScenario =
    scenarios.find((s) => {
      const row = (progress ?? []).find((r) => r.scenario_id === s.id);
      return !row || row.status !== "passed";
    }) ?? scenarios[0]!;

  const nextDesignScenario =
    designScenarios.find((s) => {
      const passed = new Set(
        (designResults ?? [])
          .filter((row) => row.scenario_id === s.id && row.passed)
          .map((row) => row.stage_id),
      );
      return !s.stages.every((st) => passed.has(st.id));
    }) ?? designScenarios[0]!;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8 min-h-[calc(100vh-44px)] bg-background">
      {/* ── Welcome Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Engineer Command Center</h1>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Practice debugging realistic production codebases and presenting system design reviews.
        </p>
      </div>

      {/* ── Streak & Metric Hero ── */}
      <StreakBadge
        streakDays={streakDays}
        resolvedCount={resolvedCount}
        totalScenarios={scenarios.length}
      />

      {/* ── Track Cards ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Debugging Track */}
        <div className="group rounded-xl border border-border bg-card p-6 flex flex-col justify-between space-y-4 hover:border-primary/50 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                Debugging Track
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {resolvedCount}/{scenarios.length} solved
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Debugging Rotation</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get paged into broken codebases, read signals, fix root causes in Monaco, and verify with hidden test harnesses.
            </p>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Next Up:</span>
              <span className="text-foreground font-semibold truncate max-w-xs">{nextDebugScenario.title}</span>
            </div>
            <Link
              to="/incidents/$slug"
              params={{ slug: nextDebugScenario.id }}
              className="run-btn flex items-center justify-center gap-1.5 w-full py-2.5"
            >
              Continue Debugging →
            </Link>
          </div>
        </div>

        {/* System Design Track */}
        <div className="group rounded-xl border border-border bg-card p-6 flex flex-col justify-between space-y-4 hover:border-primary/50 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-submit bg-submit/10 px-2.5 py-0.5 rounded border border-submit/20">
                System Design Track
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {designDoneCount}/{designScenarios.length} cleared
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Design Review Simulator</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Present to senior engineering stakeholders across four stages: clarify, calculate capacity, sketch canvas, and defend trade-offs.
            </p>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Next Up:</span>
              <span className="text-foreground font-semibold truncate max-w-xs">{nextDesignScenario.title}</span>
            </div>
            <Link
              to="/design/$slug"
              params={{ slug: nextDesignScenario.id }}
              className="submit-btn flex items-center justify-center gap-1.5 w-full py-2.5"
            >
              Continue Design Review →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
