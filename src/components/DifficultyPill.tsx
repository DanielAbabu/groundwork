import type { Scenario } from "@/lib/scenarios/types";

const DIFFICULTY_MAP = {
  starter: { label: "Easy", cls: "difficulty-easy" },
  routine: { label: "Medium", cls: "difficulty-medium" },
  tricky: { label: "Hard", cls: "difficulty-hard" },
} satisfies Record<Scenario["difficulty"], { label: string; cls: string }>;

interface DifficultyPillProps {
  difficulty: Scenario["difficulty"];
  showDot?: boolean;
  className?: string;
}

export function DifficultyPill({
  difficulty,
  showDot = true,
  className = "",
}: DifficultyPillProps) {
  const { label, cls } = DIFFICULTY_MAP[difficulty];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${cls} ${className}`}
    >
      {showDot && <span className="inline-block size-1.5 rounded-full bg-current opacity-80" />}
      {label}
    </span>
  );
}
