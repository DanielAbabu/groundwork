import { scenarios } from "@/content/scenarios";
import type { ProgressRow } from "@/lib/progress.functions";

export function ProgressSummary({ progress }: { progress: ProgressRow[] }) {
  const total = scenarios.length;
  const resolved = progress.filter((row) => row.status === "passed").length;
  const attempted = progress.length;
  const totalAttempts = progress.reduce((sum, row) => sum + row.attempts, 0);
  const passedRows = progress.filter((row) => row.status === "passed");
  const attemptsToPass = passedRows.reduce((sum, row) => sum + row.attempts, 0);
  const average = passedRows.length > 0 ? attemptsToPass / passedRows.length : null;
  const percent = Math.round((resolved / total) * 100);

  const stats = [
    { label: "resolved", value: `${resolved}/${total}` },
    { label: "in progress", value: `${Math.max(attempted - resolved, 0)}` },
    { label: "runs logged", value: `${totalAttempts}` },
    { label: "avg attempts to pass", value: average === null ? "—" : average.toFixed(1) },
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          rotation summary
        </h2>
        <p className="font-mono text-xs text-muted-foreground">{percent}% complete</p>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dd className="font-mono text-xl text-foreground">{stat.value}</dd>
            <dt className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default ProgressSummary;
