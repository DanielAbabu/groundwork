import type { Scenario } from "@/lib/scenarios/types";

const DIFFICULTY_MAP = {
  starter: { label: "Starter", cls: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30" },
  routine: { label: "Routine", cls: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30" },
  tricky: { label: "Tricky", cls: "bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/30" },
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
