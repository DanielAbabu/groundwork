import type { ActivityDay } from "@/lib/profile.functions";

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

const LEVEL_CLASS = [
  "bg-secondary",
  "bg-primary/25",
  "bg-primary/50",
  "bg-primary/75",
  "bg-primary",
];

function level(day: ActivityDay | undefined) {
  if (!day || day.runs === 0) return 0;
  if (day.passes >= 2) return 4;
  if (day.passes === 1) return 3;
  if (day.runs >= 3) return 2;
  return 1;
}

export function ActivityCalendar({ days }: { days: ActivityDay[] }) {
  const byDay = new Map(days.map((d) => [d.day, d]));

  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  // Start 26 weeks back, aligned to Sunday.
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 26 * 7 + 1);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks: Date[][] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  // Streaks over the rendered window.
  let currentStreak = 0;
  const walker = new Date(end);
  while (byDay.get(toKey(walker))) {
    currentStreak += 1;
    walker.setUTCDate(walker.getUTCDate() - 1);
  }
  const activeDays = days.filter((d) => d.runs > 0).length;

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          on-call consistency
        </h2>
        <p className="font-mono text-xs text-muted-foreground">
          <span className="text-foreground">{currentStreak}</span> day streak ·{" "}
          <span className="text-foreground">{activeDays}</span> active days
        </p>
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="flex gap-1">
          {weeks.map((week, index) => (
            <div key={index} className="flex flex-col gap-1">
              {week.map((date) => {
                const key = toKey(date);
                const entry = byDay.get(key);
                const future = date > end;
                return (
                  <div
                    key={key}
                    title={
                      future
                        ? key
                        : `${key} — ${entry?.runs ?? 0} run${entry?.runs === 1 ? "" : "s"}, ${entry?.passes ?? 0} resolved`
                    }
                    className={`size-3 rounded-[2px] ${future ? "bg-transparent" : LEVEL_CLASS[level(entry)]}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        quieter
        {LEVEL_CLASS.map((cls) => (
          <span key={cls} className={`size-3 rounded-[2px] ${cls}`} />
        ))}
        busier
      </div>
    </section>
  );
}

export default ActivityCalendar;
