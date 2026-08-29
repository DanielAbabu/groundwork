interface StreakBadgeProps {
  streakDays: number;
  resolvedCount: number;
  totalScenarios: number;
}

export function StreakBadge({ streakDays, resolvedCount, totalScenarios }: StreakBadgeProps) {
  const pct = Math.round((resolvedCount / totalScenarios) * 100);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Streak Hero Card */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 relative overflow-hidden">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-2xl">
          <span className={streakDays >= 7 ? "animate-bounce" : ""}>🔥</span>
        </div>
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Practice Streak
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-mono text-2xl font-extrabold text-foreground">{streakDays}</span>
            <span className="font-mono text-xs text-muted-foreground">days consecutive</span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground/80 mt-0.5">
            {streakDays >= 7 ? "🔥 On fire! Keep the momentum." : "Complete 1 scenario daily"}
          </p>
        </div>
      </div>

      {/* Debugging Solved */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-pass/10 border border-pass/20 text-xl font-mono text-pass font-bold">
          ✓
        </div>
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Debugging Rotation
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-mono text-2xl font-extrabold text-foreground">
              {resolvedCount}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              / {totalScenarios} cleared ({pct}%)
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-32 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-pass rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Target Signal */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xl font-mono text-primary font-bold">
          🎯
        </div>
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            System Design Reviews
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-mono text-2xl font-extrabold text-foreground">3</span>
            <span className="font-mono text-xs text-muted-foreground">Tier tracks active</span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground/80 mt-0.5">
            Staff review interview simulator
          </p>
        </div>
      </div>
    </div>
  );
}
