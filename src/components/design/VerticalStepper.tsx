import type { DesignStage } from "@/lib/design/types";

interface VerticalStepperProps {
  stages: DesignStage[];
  currentStageIndex: number;
  completedStageIds: Set<string>;
  onSelectStage: (index: number) => void;
}

export function VerticalStepper({
  stages,
  currentStageIndex,
  completedStageIds,
  onSelectStage,
}: VerticalStepperProps) {
  return (
    <div className="flex flex-col gap-0 py-2">
      {stages.map((stage, idx) => {
        const isDone = completedStageIds.has(stage.id);
        const isActive = idx === currentStageIndex;
        const isLocked =
          !isDone && !isActive && idx > 0 && !completedStageIds.has(stages[idx - 1]!.id);
        const isLast = idx === stages.length - 1;

        return (
          <div key={stage.id} className="relative flex items-start gap-3 px-4 py-3">
            {/* Connecting line */}
            {!isLast && (
              <span
                className={`absolute left-[27px] top-[34px] bottom-[-12px] w-0.5 ${
                  isDone ? "bg-[#7FB88A]" : "bg-[#3A342C]"
                }`}
              />
            )}

            {/* Stage indicator circle */}
            <button
              disabled={isLocked}
              onClick={() => onSelectStage(idx)}
              className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-all ${
                isDone
                  ? "bg-[#7FB88A] text-[#161412] font-extrabold"
                  : isActive
                    ? "bg-[#C8912B] text-[#161412] brass-emboss ring-2 ring-[#C8912B]/30"
                    : isLocked
                      ? "border border-[#3A342C] bg-[#161412] text-[#4E4638] cursor-not-allowed"
                      : "border border-[#3A342C] bg-[#26221D] text-[#7C7364] hover:border-[#C8912B] hover:text-[#F2ECE1]"
              }`}
            >
              {isDone ? (
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                idx + 1
              )}
            </button>

            {/* Stage Text */}
            <button
              disabled={isLocked}
              onClick={() => onSelectStage(idx)}
              className={`flex-1 text-left transition-colors ${
                isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer group"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-xs font-bold tracking-wide uppercase ${
                    isActive
                      ? "text-[#C8912B]"
                      : isDone
                        ? "text-[#F2ECE1]"
                        : "text-[#7C7364] group-hover:text-[#F2ECE1]"
                  }`}
                >
                  {stage.title}
                </span>
                {isDone && (
                  <span className="font-mono text-[10px] font-bold text-[#7FB88A]">✓ CLEARED</span>
                )}
              </div>
              <p className="mt-0.5 font-sans text-[11px] text-[#B8AE9C] line-clamp-1 leading-snug">
                {stage.prompt}
              </p>
            </button>
          </div>
        );
      })}
    </div>
  );
}
