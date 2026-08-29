interface StreakBadgeProps {
  streakDays: number;
  resolvedCount: number;
  totalScenarios: number;
}

export function StreakBadge({ streakDays, resolvedCount, totalScenarios }: StreakBadgeProps) {
  const pct = Math.round((resolvedCount / totalScenarios) * 100);

  // Generate 7 logbook punch-card squares representing active streak
  const days = Array.from({ length: 7 }, (_, i) => i < Math.min(streakDays, 7));

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Logbook Strip / Punch-Card Hero Card */}
      <div className="rounded-none border border-[#334155] bg-[#0F172A] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#38BDF8]">
            LOGBOOK STREAK STRIP
          </span>
          <span className="font-mono text-[10px] text-[#64748B]">{streakDays} DAYS ACTIVE</span>
        </div>

        {/* Stamped Squares */}
        <div className="mt-3 flex items-center justify-between gap-1.5 pt-2 border-t border-[#1E293B]">
          {days.map((active, idx) => (
            <div
              key={idx}
              className={`flex size-7 items-center justify-center rounded-none font-mono text-[10px] font-bold transition-all ${
                active
                  ? "bg-[#38BDF8] text-[#0B0F19]"
                  : "border border-[#1E293B] bg-[#0B0F19] text-[#64748B]"
              }`}
              title={`Day ${idx + 1}: ${active ? "Logged" : "Missed"}`}
            >
              {active ? "✓" : idx + 1}
            </div>
          ))}
        </div>
        <p className="font-sans text-[11px] text-[#94A3B8] mt-2.5">
          {streakDays >= 7
            ? "Hard-won reps logbook active."
            : "Complete 1 scenario daily to log your rep."}
        </p>
      </div>

      {/* Debugging Solved (Emerald Accent) */}
      <div className="rounded-none border border-[#1E293B] bg-[#0F172A] p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            DEBUGGING DOCKET
          </span>
          <span className="font-mono text-[10px] text-[#10B981] font-bold">
            {resolvedCount}/{totalScenarios} CLEARED
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-display text-2xl font-bold text-[#F8FAFC]">{pct}%</span>
          <span className="font-sans text-xs text-[#94A3B8]">completion score</span>
        </div>
        <div className="mt-2.5 h-1.5 w-full rounded-none bg-[#1E293B] overflow-hidden">
          <div
            className="h-full bg-[#10B981] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Design Simulator (Ice Blue Accent) */}
      <div className="rounded-none border border-[#1E293B] bg-[#0F172A] p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            DESIGN SIMULATOR
          </span>
          <span className="font-mono text-[10px] text-[#38BDF8] font-bold">ACTIVE ROOMS</span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-display text-2xl font-bold text-[#F8FAFC]">3</span>
          <span className="font-sans text-xs text-[#94A3B8]">architectural scenarios</span>
        </div>
        <p className="font-sans text-[11px] text-[#64748B] mt-2.5">
          Clarify → Capacity → Components → Trade-offs
        </p>
      </div>
    </div>
  );
}
