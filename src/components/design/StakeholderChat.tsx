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

  const currentSelectedChoiceId = answers[currentQuestion.id];
  const selectedChoiceObj = currentQuestion.options.find((o) => o.id === currentSelectedChoiceId);

  return (
    <div className="flex flex-col gap-6">
      {/* Header / Stakeholder Card */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-[#161616] p-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-sm font-bold text-primary border border-primary/30">
          AR
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
            {stakeholderName}
            <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-mono font-medium text-primary">
              Interviewer
            </span>
          </h4>
          <p className="font-mono text-xs text-muted-foreground">{stakeholderRole}</p>
        </div>
      </div>

      {/* Question tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id];
          const isActive = idx === activeQuestionIndex;
          return (
            <button
              key={q.id}
              onClick={() => setActiveQuestionIndex(idx)}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-primary text-white font-semibold"
                  : isAnswered
                    ? "bg-pass/10 text-pass border border-pass/30 font-medium"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <span>Q{idx + 1}</span>
              {isAnswered && <span className="text-[10px]">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Active Question Bubble */}
      <div className="space-y-4 slide-up">
        {/* Interviewer Chat Bubble */}
        <div className="flex items-start gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-xs font-bold text-primary">
            Q
          </div>
          <div className="rounded-2xl rounded-tl-none border border-border bg-[#1a1a1a] p-4 text-sm text-foreground max-w-2xl leading-relaxed shadow-sm">
            <p className="font-semibold text-foreground">{currentQuestion.text}</p>
          </div>
        </div>

        {/* Choice Cards (Candidate Answers) */}
        <div className="pl-10 space-y-2.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Select your architectural clarification:
          </p>
          <div className="grid gap-2.5">
            {currentQuestion.options.map((opt) => {
              const isSelected = currentSelectedChoiceId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onAnswerChange(currentQuestion.id, opt.id)}
                  className={`flex flex-col text-left rounded-lg border p-3.5 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-sm">
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span className="font-mono text-xs font-bold text-primary flex items-center gap-1">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* FollowUp Response Bubble if selected */}
        {selectedChoiceObj?.followUp && (
          <div className="flex items-start gap-3 pl-6 pt-2 slide-up">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pass/20 font-mono text-xs font-bold text-pass">
              AR
            </div>
            <div className="rounded-2xl rounded-tl-none border border-pass/30 bg-pass/5 p-4 text-xs text-foreground max-w-2xl leading-relaxed">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-pass block mb-1">
                Stakeholder Reaction
              </span>
              <p className="text-foreground italic">"{selectedChoiceObj.followUp}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation between questions */}
      <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
        <button
          disabled={activeQuestionIndex === 0}
          onClick={() => setActiveQuestionIndex((i) => i - 1)}
          className="font-mono text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Previous Question
        </button>
        {activeQuestionIndex < questions.length - 1 ? (
          <button
            onClick={() => setActiveQuestionIndex((i) => i + 1)}
            className="run-btn font-mono text-xs flex items-center gap-1"
          >
            Next Question →
          </button>
        ) : (
          <span className="font-mono text-xs text-pass font-semibold">
            All clarifications completed ✓
          </span>
        )}
      </div>
    </div>
  );
}
