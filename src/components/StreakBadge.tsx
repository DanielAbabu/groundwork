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
      <div className="rounded border border-[#4E4638] bg-[#1D1A17] p-5 brass-emboss">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C8912B]">
            LOGBOOK STREAK STRIP
          </span>
          <span className="font-mono text-[10px] text-[#7C7364]">{streakDays} DAYS ACTIVE</span>
        </div>

        {/* Stamped Squares */}
        <div className="mt-3 flex items-center justify-between gap-1.5 pt-2 border-t border-[#3A342C]">
          {days.map((active, idx) => (
            <div
              key={idx}
              className={`flex size-7 items-center justify-center rounded-[2px] font-mono text-[10px] font-bold transition-all ${
                active
                  ? "bg-[#C8912B] text-[#161412] brass-emboss"
                  : "border border-[#3A342C] bg-[#161412] text-[#7C7364]"
              }`}
              title={`Day ${idx + 1}: ${active ? "Logged" : "Missed"}`}
            >
              {active ? "✓" : idx + 1}
            </div>
          ))}
        </div>
        <p className="font-sans text-[11px] text-[#B8AE9C] mt-2.5">
          {streakDays >= 7
            ? "Hard-won reps logbook active."
            : "Complete 1 scenario daily to log your rep."}
        </p>
      </div>

      {/* Debugging Solved (Sage Accent) */}
      <div className="rounded border border-[#3A342C] bg-[#1D1A17] p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#7C7364]">
            DEBUGGING DOCKET
          </span>
          <span className="font-mono text-[10px] text-[#7FB88A] font-semibold">
            {resolvedCount}/{totalScenarios} CLEARED
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-mono text-2xl font-bold text-[#F2ECE1]">{pct}%</span>
          <span className="font-sans text-xs text-[#B8AE9C]">completion score</span>
        </div>
        <div className="mt-2.5 h-1.5 w-full rounded-[1px] bg-[#26221D] overflow-hidden">
          <div
            className="h-full bg-[#7FB88A] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Design Simulator (Slate Accent) */}
      <div className="rounded border border-[#3A342C] bg-[#1D1A17] p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#7C7364]">
            DESIGN SIMULATOR
          </span>
          <span className="font-mono text-[10px] text-[#7A93A6] font-semibold">ACTIVE ROOMS</span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-mono text-2xl font-bold text-[#F2ECE1]">3</span>
          <span className="font-sans text-xs text-[#B8AE9C]">architectural scenarios</span>
        </div>
        <p className="font-sans text-[11px] text-[#7C7364] mt-2.5">
          Clarify → Capacity → Components → Trade-offs
        </p>
      </div>
    </div>
  );
}
