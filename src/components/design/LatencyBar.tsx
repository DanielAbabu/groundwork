import type { LatencyEstimate } from "@/lib/design/graph-grading";

export function LatencyBar({ estimate }: { estimate: LatencyEstimate }) {
  if (estimate.hops.length === 0) return null;

  const qualityColor =
    estimate.quality === "optimal"
      ? "text-pass border-pass/30 bg-pass/10"
      : estimate.quality === "acceptable"
        ? "text-primary border-primary/30 bg-primary/10"
        : "text-fail border-fail/30 bg-fail/10";

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            ⚡ Estimated Read Path Latency
          </span>
          <span
            className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${qualityColor}`}
          >
            {estimate.quality} ({estimate.totalMs} ms)
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {estimate.hops.length} hops traced
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {estimate.hops.map((hop, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1 font-mono text-xs">
              <span className="font-medium text-foreground">{hop.label}</span>
              <span className="text-[10px] text-muted-foreground">+{hop.ms}ms</span>
            </div>
            {i < estimate.hops.length - 1 && (
              <span className="font-mono text-xs text-muted-foreground">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
