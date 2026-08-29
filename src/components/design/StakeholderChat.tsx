import { useState } from "react";
import type { ClarifyQuestion } from "@/lib/design/types";

interface StakeholderChatProps {
  questions: ClarifyQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, choiceId: string) => void;
  stakeholderName?: string;
  stakeholderRole?: string;
}

export function StakeholderChat({
  questions,
  answers,
  onAnswerChange,
  stakeholderName = "Alex Rivera",
  stakeholderRole = "Staff Systems Architect",
}: StakeholderChatProps) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const currentQuestion = questions[activeQuestionIndex];
  if (!currentQuestion) return null;

  // Generate initials for stamped seal
  const initials = stakeholderName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const answeredCount = questions.filter((q) => !!answers[q.id]).length;

  return (
    <div className="flex flex-col space-y-6">
      {/* ── Meeting Transcript Header ── */}
      <div className="flex items-center justify-between border-b border-[#3A342C] pb-4">
        <div className="flex items-center gap-3">
          {/* Stamped circular seal with initials */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#C8912B]/50 bg-[#C8912B]/10 font-serif text-sm font-bold text-[#C8912B] brass-emboss select-none">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C8912B]">
                MEETING TRANSCRIPT // STAKEHOLDER REVIEW
              </span>
            </div>
            <h3 className="font-serif text-base font-semibold text-[#F2ECE1]">{stakeholderName}</h3>
            <p className="font-mono text-xs text-[#7C7364]">{stakeholderRole}</p>
          </div>
        </div>

        {/* Docket status */}
        <div className="text-right">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364] block">
            DOCKET STATUS
          </span>
          <span className="font-mono text-xs font-bold text-[#C8912B]">
            {answeredCount} / {questions.length} CLARIFIED
          </span>
        </div>
      </div>

      {/* ── Numbered Docket Tabs ── */}
      <div className="flex items-center gap-2 border-b border-[#3A342C] pb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364] mr-2">
          DOCKET ITEM:
        </span>
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id];
          const isActive = idx === activeQuestionIndex;
          return (
            <button
              key={q.id}
              onClick={() => setActiveQuestionIndex(idx)}
              title={`Question ${idx + 1}: ${q.text}`}
              className={`flex items-center justify-center size-8 rounded-[2px] font-mono text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#C8912B] text-[#161412] brass-emboss shadow-sm"
                  : isAnswered
                    ? "border border-[#7FB88A]/40 bg-[#7FB88A]/10 text-[#7FB88A]"
                    : "border border-[#3A342C] bg-[#161412] text-[#7C7364] hover:border-[#4E4638] hover:text-[#F2ECE1]"
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* ── Transcript Accumulated Log + Active Question Ballot ── */}
      <div className="space-y-6">
        {/* Previously clarified transcript log lines */}
        {questions.map((q, idx) => {
          const chosenId = answers[q.id];
          if (!chosenId) return null;
          const chosenOpt = q.options.find((o) => o.id === chosenId);

          return (
            <div
              key={q.id}
              className={`rounded border p-4 space-y-2.5 transition-all ${
                idx === activeQuestionIndex
                  ? "border-[#C8912B]/40 bg-[#1D1A17]"
                  : "border-[#3A342C]/60 bg-[#161412]/60 opacity-85"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#7C7364]">
                <span>TRANSCRIPT ENTRY #{idx + 1}</span>
                <span className="text-[#7FB88A]">✓ CLARIFIED</span>
              </div>

              {/* Stakeholder Prompt */}
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#C8912B]">
                  {stakeholderName.toUpperCase()} ({stakeholderRole.toUpperCase()}):
                </p>
                <p className="mt-1 font-serif italic text-sm text-[#F2ECE1] leading-relaxed">
                  "{q.text}"
                </p>
              </div>

              {/* Candidate Clarification Result */}
              <div className="flex items-start gap-2 pt-1">
                <span className="font-mono text-xs text-[#7FB88A] shrink-0">→</span>
                <div className="font-mono text-xs text-[#7FB88A] bg-[#161412] px-3 py-1.5 rounded border border-[#3A342C] w-full">
                  <span className="font-bold uppercase tracking-wider text-[#7C7364] mr-2">
                    YOU CLARIFIED:
                  </span>
                  <span className="text-[#F2ECE1]">{chosenOpt?.label}</span>
                </div>
              </div>

              {/* Stakeholder Reaction if present */}
              {chosenOpt?.followUp && (
                <div className="pl-4 border-l-2 border-[#7FB88A]/40 mt-2 pt-1">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#7FB88A]">
                    {stakeholderName.toUpperCase()}:
                  </p>
                  <p className="font-serif italic text-xs text-[#B8AE9C]">"{chosenOpt.followUp}"</p>
                </div>
              )}

              {idx === activeQuestionIndex && (
                <div className="pt-2 text-right">
                  <button
                    onClick={() => onAnswerChange(q.id, "")}
                    className="font-mono text-[10px] uppercase tracking-widest text-[#7C7364] hover:text-[#C4593F] transition-colors"
                  >
                    Re-open clarification
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Active Unanswered Ballot List ── */}
        {!answers[currentQuestion.id] && (
          <div className="rounded border border-[#3A342C] bg-[#1D1A17] p-5 space-y-5">
            {/* Stakeholder prompt entry */}
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#C8912B]">
                {stakeholderName.toUpperCase()} ({stakeholderRole.toUpperCase()}):
              </p>
              <p className="mt-1.5 font-serif italic text-base text-[#F2ECE1] leading-relaxed">
                "{currentQuestion.text}"
              </p>
            </div>

            {/* Numbered Ballot List */}
            <div className="space-y-3 pt-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C7364]">
                SELECT ARCHITECTURAL CLARIFICATION (BALLOT):
              </p>
              <div className="space-y-2">
                {currentQuestion.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx); // A, B, C...
                  return (
                    <button
                      key={opt.id}
                      onClick={() => onAnswerChange(currentQuestion.id, opt.id)}
                      className="group flex items-center gap-3 w-full text-left rounded border border-[#3A342C] bg-[#161412] p-3.5 transition-all border-l-2 border-l-transparent hover:border-l-[#C8912B] hover:border-[#4E4638] hover:bg-[#26221D]/60"
                    >
                      <span className="font-mono text-xs font-bold text-[#C8912B] group-hover:text-[#E8B04A]">
                        {letter}.
                      </span>
                      <span className="font-sans text-xs text-[#F2ECE1] leading-relaxed">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Question Navigation Bar ── */}
      <div className="flex items-center justify-between border-t border-[#3A342C] pt-4">
        <button
          disabled={activeQuestionIndex === 0}
          onClick={() => setActiveQuestionIndex((i) => i - 1)}
          className="font-mono text-xs text-[#7C7364] hover:text-[#F2ECE1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous Docket Item
        </button>

        <span className="font-mono text-xs text-[#7C7364]">
          DOCKET {activeQuestionIndex + 1} OF {questions.length}
        </span>

        {activeQuestionIndex < questions.length - 1 ? (
          <button
            onClick={() => setActiveQuestionIndex((i) => i + 1)}
            className="font-mono text-xs text-[#F2ECE1] hover:text-[#C8912B] transition-colors"
          >
            Next Docket Item →
          </button>
        ) : (
          <span className="font-mono text-xs text-[#7FB88A] font-medium">Review Complete ✓</span>
        )}
      </div>
    </div>
  );
}
