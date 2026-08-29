import type { Scenario } from "@/lib/scenarios/types";

const DIFFICULTY_MAP = {
  starter: { label: "Starter", cls: "bg-[#7A93A6]/10 text-[#7A93A6] border border-[#7A93A6]/30" },
  routine: { label: "Routine", cls: "bg-[#D99B26]/10 text-[#D99B26] border border-[#D99B26]/30" },
  tricky: { label: "Tricky", cls: "bg-[#C4593F]/10 text-[#C4593F] border border-[#C4593F]/30" },
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
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${cls} ${className}`}
    >
      {showDot && <span className="inline-block size-1.5 rounded-full bg-current opacity-90" />}
      {label}
    </span>
  );
}
