import type { LatencyEstimate } from "@/lib/design/graph-grading";

export function LatencyBar({ estimate }: { estimate: LatencyEstimate }) {
  if (estimate.hops.length === 0) return null;

  const qualityColor =
    estimate.quality === "optimal"
      ? "text-[#7FB88A] border-[#7FB88A]/30 bg-[#7FB88A]/10"
      : estimate.quality === "acceptable"
        ? "text-[#C8912B] border-[#C8912B]/30 bg-[#C8912B]/10"
        : "text-[#C4593F] border-[#C4593F]/30 bg-[#C4593F]/10";

  return (
    <div className="mt-4 rounded border border-[#3A342C] bg-[#1D1A17] p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#7C7364]">
            ⏱ Estimated Read Path Latency
          </span>
          <span
            className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${qualityColor}`}
          >
            {estimate.quality} ({estimate.totalMs} ms)
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#7C7364]">
          {estimate.hops.length} hops traced
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {estimate.hops.map((hop, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 rounded border border-[#3A342C] bg-[#161412] px-2.5 py-1 font-mono text-xs">
              <span className="font-medium text-[#F2ECE1]">{hop.label}</span>
              <span className="text-[10px] text-[#7C7364]">+{hop.ms}ms</span>
            </div>
            {i < estimate.hops.length - 1 && (
              <span className="font-mono text-xs text-[#7C7364]">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
