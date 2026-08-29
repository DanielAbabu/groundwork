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
    { label: "RESOLVED", value: `${resolved}/${total}` },
    { label: "IN PROGRESS", value: `${Math.max(attempted - resolved, 0)}` },
    { label: "RUNS LOGGED", value: `${totalAttempts}` },
    { label: "AVG ATTEMPTS TO PASS", value: average === null ? "—" : average.toFixed(1) },
  ];

  return (
    <section className="rounded border border-[#3A342C] bg-[#1D1A17] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#7C7364]">
          STAT LEDGER // ROTATION SUMMARY
        </h2>
        <p className="font-mono text-xs font-bold text-[#C8912B]">{percent}% COMPLETE</p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-[#161412] border border-[#3A342C]">
        <div
          className="h-full rounded bg-[#C8912B] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded border border-[#3A342C] bg-[#161412] p-3">
            <dd className="font-mono text-2xl font-bold text-[#F2ECE1]">{stat.value}</dd>
            <dt className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#7C7364]">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default ProgressSummary;
