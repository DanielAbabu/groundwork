import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getDesignScenario } from "@/content/design";
import { STAGE_KIND_LABELS } from "@/lib/design/types";
import type {
  CapacityAnswer,
  ClarifyAnswer,
  ComponentsAnswer,
  DesignStage,
  StageAnswer,
  StageGrade,
} from "@/lib/design/types";
import { listDesignResults, submitDesignStage, type DesignStageRow } from "@/lib/design.functions";
import { evaluateFormula } from "@/lib/design/formula-eval";
import { detectSpofs, estimateGraphLatency } from "@/lib/design/graph-grading";
import { LatencyBar } from "@/components/design/LatencyBar";
import { ComponentCanvas } from "@/components/design/ComponentCanvas";
import { ProblemBar } from "@/components/ProblemBar";
import { StakeholderChat } from "@/components/design/StakeholderChat";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/design/$slug")({
  loader: ({ params }) => {
    const scenario = getDesignScenario(params.slug);
    if (!scenario) throw notFound();
    return { scenarioId: scenario.id, title: scenario.title, summary: scenario.summary };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const title = `Design Review — ${loaderData.title} — RAW // SKILL`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.summary },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DesignRoom,
});

function emptyAnswer(stage: DesignStage): StageAnswer {
  switch (stage.kind) {
    case "clarify":
      return {} as ClarifyAnswer;
    case "capacity":
      return Object.fromEntries(stage.fields.map((f) => [f.id, null])) as CapacityAnswer;
    case "components":
      return { nodes: [], edges: [] } as ComponentsAnswer;
    case "tradeoff":
      return { text: "" };
  }
}

function DesignRoom() {
  const { scenarioId } = Route.useLoaderData();
  const scenario = getDesignScenario(scenarioId)!;
  const queryClient = useQueryClient();
  const fetchResults = useServerFn(listDesignResults);
  const submit = useServerFn(submitDesignStage);

  const { data: results } = useQuery<DesignStageRow[]>({
    queryKey: ["design-results"],
    queryFn: () => fetchResults(),
  });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StageAnswer>>(() =>
    Object.fromEntries(scenario.stages.map((stage) => [stage.id, emptyAnswer(stage)])),
  );
  const [grades, setGrades] = useState<Record<string, StageGrade>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [caseFileOpen, setCaseFileOpen] = useState(true);

  const stage = scenario.stages[index]!;
  const grade = grades[stage.id];

  const savedPassed = useMemo(() => {
    const set = new Set<string>();
    for (const row of results ?? []) {
      if (row.scenario_id === scenario.id && row.passed) set.add(row.stage_id);
    }
    return set;
  }, [results, scenario.id]);

  const setAnswer = (next: StageAnswer) => setAnswers((prev) => ({ ...prev, [stage.id]: next }));

  async function onSubmit() {
    setSubmitting(true);
    try {
      const result = await submit({
        data: { scenarioId: scenario.id, stageId: stage.id, answer: answers[stage.id] },
      });
      setGrades((prev) => ({ ...prev, [stage.id]: result }));
      queryClient.invalidateQueries({ queryKey: ["design-results"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      toast[result.passed ? "success" : "error"](
        result.passed
          ? `${STAGE_KIND_LABELS[stage.kind]} stage cleared`
          : `${STAGE_KIND_LABELS[stage.kind]} stage needs another pass`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not grade that submission");
    } finally {
      setSubmitting(false);
    }
  }

  // Generate initials for stakeholder seal
  const initials = scenario.stakeholder
    .split(" ")
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const stageNames = ["01 CLARIFY", "02 SIZE", "03 SKETCH", "04 DEFEND"];

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-[#000000] text-[#F8FAFC] overflow-hidden">
      {/* ── Problem Bar ── */}
      <ProblemBar
        title={scenario.title}
        backTo="/design"
        backLabel="Design Reviews"
        difficulty={scenario.difficulty}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSummary((v) => !v)}
              className={`rounded-sm border px-2.5 py-1 font-mono text-xs transition-colors whitespace-nowrap ${
                showSummary
                  ? "border-[#10B981] bg-[#10B981]/10 text-[#10B981] font-bold"
                  : "border-[#171717] bg-[#0A0A0A] text-[#64748B] hover:text-[#F8FAFC]"
              }`}
            >
              {showSummary ? "← Stage Workspace" : "Scorecard"}
            </button>
            {!showSummary && (
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-sm bg-[#10B981] px-3 py-1 font-mono text-xs font-bold text-[#000000] hover:bg-[#34D399] transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? "Grading…" : "Submit Stage"}
              </button>
            )}
          </div>
        }
      />

      {/* ── Top Horizontal Stage Stepper (Touch Scrollable) ── */}
      {!showSummary && (
        <div className="border-b border-[#171717] bg-[#0A0A0A] px-3 sm:px-6 py-2 flex items-center overflow-x-auto shrink-0 select-none max-w-full scrollbar-none">
          <div className="flex items-center gap-2 min-w-max w-full justify-between max-w-5xl mx-auto">
            {scenario.stages.map((st, idx) => {
              const isCurrent = idx === index;
              const isCleared = grades[st.id]?.passed || savedPassed.has(st.id);

              return (
                <button
                  key={st.id}
                  onClick={() => {
                    setIndex(idx);
                    setShowSummary(false);
                  }}
                  className={`group relative flex items-center gap-1.5 px-3 sm:px-4 py-1.5 font-mono text-xs transition-all rounded-sm whitespace-nowrap ${
                    isCurrent
                      ? "bg-[#10B981] text-[#000000] font-bold shadow-sm"
                      : isCleared
                        ? "border border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 font-bold"
                        : "border border-[#171717] bg-[#000000] text-[#64748B] hover:text-[#F8FAFC] hover:border-[#262626]"
                  }`}
                >
                  {isCleared && !isCurrent && <span className="text-xs">✓</span>}
                  <span>{stageNames[idx] ?? `0${idx + 1} ${st.kind.toUpperCase()}`}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showSummary ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#000000]">
          <div className="mx-auto max-w-4xl">
            <Summary
              grades={grades}
              savedPassed={savedPassed}
              onJump={(i) => {
                setIndex(i);
                setShowSummary(false);
              }}
              scenarioId={scenario.id}
            />
          </div>
        </div>
      ) : (
        /* ── Full-Viewport 2-Panel Workspace (Responsive Grid Stack) ── */
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* ── Left Column: "Case File" Panel (Collapsible on Mobile) ── */}
          <aside className="w-full lg:w-96 shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-[#171717] bg-[#0A0A0A]">
            {/* Mobile Accordion Header */}
            <div className="lg:hidden flex items-center justify-between p-3 border-b border-[#171717] bg-[#000000]">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-[#10B981]">
                CASE FILE // {scenario.stakeholder}
              </span>
              <button
                onClick={() => setCaseFileOpen((v) => !v)}
                className="text-[#64748B] hover:text-[#F8FAFC] flex items-center gap-1 font-mono text-xs"
              >
                {caseFileOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </div>

            <div
              className={`overflow-y-auto p-4 sm:p-6 space-y-5 transition-all ${
                caseFileOpen ? "max-h-48 sm:max-h-64 lg:max-h-none block" : "hidden lg:block"
              }`}
            >
              {/* STAKEHOLDER Section */}
              <div className="space-y-2 border-b border-[#171717] pb-4">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#10B981] block">
                  STAKEHOLDER
                </span>
                <div className="flex items-center gap-3 pt-0.5">
                  <div className="size-8 sm:size-10 rounded-full border border-[#10B981]/40 bg-[#10B981]/10 font-display text-xs sm:text-sm font-bold text-[#10B981] flex items-center justify-center shrink-0 select-none">
                    {initials}
                  </div>
                  <div>
                    <h4 className="font-display text-xs sm:text-sm font-bold text-[#F8FAFC]">
                      {scenario.stakeholder}
                    </h4>
                    <p className="font-display text-[11px] text-[#64748B] mt-0.5">{scenario.stakeholderRole}</p>
                  </div>
                </div>
              </div>

              {/* CONTEXT Section */}
              <div className="space-y-1.5 border-b border-[#171717] pb-4">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                  CONTEXT
                </span>
                <p className="font-display text-xs leading-relaxed text-[#94A3B8] italic">
                  "{scenario.framing}"
                </p>
              </div>

              {/* THIS STAGE Section */}
              <div className="space-y-1.5 border-l-2 border-[#10B981] pl-3 py-0.5">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#10B981] block">
                  THIS STAGE // FOCUS
                </span>
                <h3 className="font-display text-xs sm:text-sm font-bold text-[#F8FAFC]">{stage.title}</h3>
                <p className="font-display text-xs leading-relaxed text-[#94A3B8]">{stage.prompt}</p>
              </div>

              {/* Stage Grade Status pill if graded */}
              {grade && (
                <div
                  className={`rounded-sm border p-3 font-display text-xs space-y-1 ${
                    grade.passed
                      ? "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"
                      : "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>STAGE VERDICT</span>
                    <span>{Math.round(grade.score * 100)}%</span>
                  </div>
                  <p className="text-[11px] font-normal">
                    {grade.passed ? "✓ Stage cleared!" : "Needs adjustment before advancing."}
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* ── Right Panel: Stage Workspace Canvas / Interactive UI ── */}
          <section className="flex flex-1 flex-col overflow-hidden bg-[#000000]">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {stage.kind === "clarify" && (
                <StakeholderChat
                  questions={stage.questions}
                  answers={answers[stage.id] as ClarifyAnswer}
                  onAnswerChange={(qId, cId) =>
                    setAnswer({ ...(answers[stage.id] as ClarifyAnswer), [qId]: cId })
                  }
                  stakeholderName={scenario.stakeholder}
                  stakeholderRole={scenario.stakeholderRole}
                />
              )}

              {stage.kind === "capacity" && (
                <CapacityStage
                  stage={stage}
                  answer={answers[stage.id] as CapacityAnswer}
                  onChange={setAnswer}
                />
              )}

              {stage.kind === "components" && (
                <ComponentsStage
                  stage={stage}
                  answer={answers[stage.id] as ComponentsAnswer}
                  onChange={setAnswer}
                />
              )}

              {stage.kind === "tradeoff" && (
                <TradeoffStage
                  stage={stage}
                  answer={answers[stage.id] as { text: string }}
                  onChange={setAnswer}
                  grade={grade}
                />
              )}

              {/* Feedback rules list with hand-stamped verdicts */}
              {grade && <FeedbackList grade={grade} />}
            </div>

            {/* Bottom Navigation Bar */}
            <div className="flex shrink-0 items-center justify-between border-t border-[#171717] bg-[#0A0A0A] px-4 py-2.5 sm:px-6 sm:py-3">
              <button
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
                className="font-mono text-xs text-[#64748B] hover:text-[#F8FAFC] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous Stage
              </button>

              <div className="flex items-center gap-3">
                {index < scenario.stages.length - 1 ? (
                  <button
                    onClick={() => setIndex((i) => i + 1)}
                    className="font-mono text-xs text-[#F8FAFC] hover:text-[#10B981] font-bold transition-colors"
                  >
                    Next Stage →
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSummary(true)}
                    className="font-mono text-xs font-bold text-[#10B981] hover:underline"
                  >
                    See Final Scorecard 🏆
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const RULE_LABELS: Record<string, string> = {
  schema: "type system",
  "required-node": "required component",
  "required-edge": "required connection",
  instances: "instance count",
  "forbidden-node": "anti-pattern component",
  "forbidden-edge": "anti-pattern connection",
  answer: "answer",
};

/**
 * Hand-stamped Feedback Verdicts (-2deg rotation for tactile feel)
 */
function FeedbackList({ grade }: { grade: StageGrade }) {
  const failing = grade.feedback.filter((item) => item.ok !== true);
  const passing = grade.feedback.filter((item) => item.ok === true);

  return (
    <div className="mt-6 space-y-4 border-t border-[#171717] pt-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#64748B]">
        GRADING FEEDBACK ({passing.length}/{grade.feedback.length} RULES PASSED)
      </p>
      <div className="space-y-3">
        {[...failing, ...passing].map((item, i) => {
          const isPass = item.ok === true;
          const isPartial = item.ok === "partial";

          return (
            <div
              key={i}
              className={`rounded-sm border p-4 transition-all ${
                isPass
                  ? "border-[#10B981]/30 bg-[#10B981]/5"
                  : isPartial
                    ? "border-[#F59E0B]/30 bg-[#F59E0B]/5"
                    : "border-[#EF4444]/30 bg-[#EF4444]/5"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                {/* Scorecard Stamp Block (-2deg rotation) */}
                <span
                  className={`inline-block -rotate-2 rounded-none border px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-sm select-none ${
                    isPass
                      ? "border-[#10B981] bg-[#10B981]/20 text-[#10B981]"
                      : isPartial
                        ? "border-[#F59E0B] bg-[#F59E0B]/20 text-[#F59E0B]"
                        : "border-[#EF4444] bg-[#EF4444]/20 text-[#EF4444]"
                  }`}
                >
                  {isPass ? "PASS" : isPartial ? "PARTIAL" : "MISS"}
                </span>

                {item.rule && (
                  <span className="rounded-none border border-[#171717] bg-[#000000] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                    {RULE_LABELS[item.rule] ?? item.rule}
                  </span>
                )}
                <span className="font-mono text-xs font-semibold text-[#F8FAFC]">{item.label}</span>
              </div>

              {item.targets && item.targets.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {item.targets.map((target) => (
                    <span
                      key={target}
                      className="rounded-none border border-[#171717] bg-[#000000] px-2 py-0.5 font-mono text-[10px] text-[#94A3B8]"
                    >
                      {target}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 font-mono text-xs leading-relaxed text-[#94A3B8]">{item.detail}</p>
              {item.fix && (
                <p className="mt-2 border-l-2 border-[#F59E0B] pl-3 font-mono text-[11px] text-[#F59E0B]">
                  Fix: {item.fix}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Stage 2: Size It (Capacity Estimation Ledger Sheet)
 */
function CapacityStage({
  stage,
  answer,
  onChange,
}: {
  stage: Extract<DesignStage, { kind: "capacity" }>;
  answer: CapacityAnswer;
  onChange: (next: CapacityAnswer) => void;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of stage.fields) {
      const val = answer[field.id];
      initial[field.id] = val != null ? String(val) : "";
    }
    return initial;
  });

  const handleInputChange = (fieldId: string, rawText: string) => {
    setInputs((prev) => ({ ...prev, [fieldId]: rawText }));
    const evalResult = evaluateFormula(rawText);
    onChange({
      ...answer,
      [fieldId]: evalResult.value,
    });
  };

  const computedFields = Object.values(answer).filter((v) => v != null).length;
  const isAllComputed = computedFields === stage.fields.length;

  return (
    <div className="rounded-sm border border-[#171717] bg-[#0A0A0A] p-4 sm:p-6 space-y-6 shadow-md select-none">
      {/* Ledger Sheet Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#171717] pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#10B981] block">
            ACCOUNTING LEDGER // CAPACITY & BANDWIDTH ESTIMATION
          </span>
          <h3 className="font-display text-base sm:text-lg font-semibold text-[#F8FAFC] mt-0.5">
            System Traffic & Storage Ledger
          </h3>
        </div>
        <div className="font-mono text-xs text-[#64748B] text-left sm:text-right">
          <span>LINE ITEMS: {stage.fields.length}</span>
        </div>
      </div>

      {/* Assumption Text (Italic Note Block) */}
      <div className="rounded-sm border-l-2 border-[#10B981] bg-[#000000] p-3.5 space-y-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#10B981]">
          ESTIMATION ASSUMPTIONS & FORMULA GUIDANCE
        </span>
        <p className="font-sans italic text-xs leading-relaxed text-[#94A3B8]">
          "Assume 86,400 seconds per day. Write exact numeric inputs or mathematical expressions
          (e.g. 500 * 86400 or 1000/2) directly into each ledger row to evaluate system
          constraints."
        </p>
      </div>

      {/* Ruled Ledger Table */}
      <div className="space-y-0 divide-y divide-[#171717] border-t border-b border-[#171717]">
        {stage.fields.map((field, idx) => {
          const rawText = inputs[field.id] ?? "";
          const evalResult = evaluateFormula(rawText);
          const hasValue = evalResult.value != null;
          const invalid = evalResult.error != null || (hasValue && evalResult.value! < 0);

          return (
            <div
              key={field.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-1 sm:px-2 transition-colors hover:bg-[#171717]/40"
            >
              {/* Left Column: Label & Target Formula */}
              <div className="space-y-0.5 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#64748B]">{idx + 1}.</span>
                  <label
                    className="font-mono text-xs font-semibold text-[#F8FAFC] cursor-pointer"
                    htmlFor={field.id}
                  >
                    {field.label}
                  </label>
                </div>
                {field.formula && (
                  <p className="font-mono text-[10px] text-[#64748B] pl-4">
                    Target Formula: <span className="text-[#10B981]">{field.formula}</span>
                  </p>
                )}
              </div>

              {/* Right Column: Expression Input & Evaluated Value */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 justify-between sm:justify-end w-full sm:w-auto">
                {hasValue && !invalid && (
                  <div className="font-mono text-xs text-left sm:text-right mr-1">
                    <span className="text-[10px] text-[#64748B] uppercase block">EVALUATED</span>
                    <span className="font-bold text-[#10B981]">
                      {evalResult.value!.toLocaleString()}
                    </span>
                  </div>
                )}

                <Input
                  id={field.id}
                  type="text"
                  placeholder={field.formula ? "e.g. 500 * 86400" : "100"}
                  value={rawText}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full sm:w-48 text-left sm:text-right font-mono text-xs bg-[#000000] border-[#171717] text-[#F8FAFC] focus-visible:ring-1 focus-visible:ring-[#10B981] rounded-sm"
                />

                <span className="font-mono text-xs text-[#64748B] w-14 shrink-0 text-left">
                  {field.unit ?? ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals Footer Bar */}
      <div className="border-t-2 border-b-2 border-t-[#10B981]/80 border-b-[#10B981] py-3.5 px-4 bg-[#000000] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#10B981]">
            LEDGER STATUS // TOTALS
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-[#64748B]">COMPUTED ROWS:</span>
          <span className={`font-bold ${isAllComputed ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
            {computedFields} / {stage.fields.length} {isAllComputed ? "✓ COMPLETE" : "PENDING"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ComponentsStage({
  stage: _stage,
  answer,
  onChange,
}: {
  stage: Extract<DesignStage, { kind: "components" }>;
  answer: ComponentsAnswer;
  onChange: (next: ComponentsAnswer) => void;
}) {
  const spofs = useMemo(
    () => detectSpofs({ nodes: answer.nodes, edges: answer.edges }),
    [answer.nodes, answer.edges],
  );
  const latency = useMemo(
    () => estimateGraphLatency({ nodes: answer.nodes, edges: answer.edges }),
    [answer.nodes, answer.edges],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-[#171717] bg-[#0A0A0A] p-4">
        <div>
          <h4 className="font-display font-semibold text-[#F8FAFC] text-sm">
            System Resilience & Latency Analysis
          </h4>
          <p className="font-mono text-xs text-[#64748B] mt-0.5">
            {spofs.length === 0 ? (
              <span className="text-[#10B981] font-semibold">✓ No Single Points of Failure</span>
            ) : (
              <span className="text-[#EF4444] font-semibold">
                ⚠️ {spofs.length} Single Point(s) of Failure detected
              </span>
            )}
          </p>
        </div>

        {latency.hops.length > 0 && (
          <div className="w-full sm:w-64">
            <LatencyBar estimate={latency} />
          </div>
        )}
      </div>

      <div className="h-[450px] sm:h-[520px] rounded-sm border border-[#171717] overflow-hidden">
        <ComponentCanvas
          nodes={answer.nodes}
          edges={answer.edges}
          onChange={(next) => onChange(next)}
        />
      </div>
    </div>
  );
}

/**
 * Stage 4: Defend the Cache (Architectural Field Report)
 */
function TradeoffStage({
  stage,
  answer,
  onChange,
  grade,
}: {
  stage: Extract<DesignStage, { kind: "tradeoff" }>;
  answer: { text: string };
  onChange: (next: { text: string }) => void;
  grade: StageGrade | undefined;
}) {
  const charCount = answer.text.length;

  return (
    <div className="rounded-sm border border-[#171717] bg-[#0A0A0A] p-4 sm:p-6 space-y-6 shadow-md select-none">
      {/* Field Report Header */}
      <div className="flex items-center justify-between border-b border-[#171717] pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#10B981] block">
            FIELD REPORT // TRADE-OFF DEFENSE
          </span>
          <h3 className="font-display text-base sm:text-lg font-semibold text-[#F8FAFC] mt-0.5">
            Architectural Defense Statement
          </h3>
        </div>
        <div className="font-mono text-xs text-[#64748B]">
          <span>FORM: FR-404</span>
        </div>
      </div>

      {/* Prompt guidance */}
      <div className="rounded-sm border-l-2 border-[#10B981] bg-[#000000] p-3.5 space-y-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#10B981]">
          DEFENSE BRIEF
        </span>
        <p className="font-sans italic text-xs leading-relaxed text-[#94A3B8]">
          "Defend one key architectural trade-off accepted in your design (e.g. eventual consistency
          over strong consistency, cache warming overhead, or fan-out write amplification). Explain
          why this trade-off is optimal for the workload and how you mitigate failure modes."
        </p>
      </div>

      {/* Engineering Notebook Page Textarea */}
      <div className="relative">
        <Textarea
          rows={10}
          value={answer.text}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Authored architectural defense statement..."
          className="font-sans text-sm leading-relaxed text-[#F8FAFC] bg-[#000000] border-[#171717] p-4 sm:p-5 focus-visible:ring-1 focus-visible:ring-[#10B981] rounded-sm shadow-inner"
        />
        <div className="absolute bottom-3 right-3 font-mono text-[10px] text-[#64748B] bg-[#0A0A0A] px-2 py-0.5 border border-[#171717]">
          {charCount} CHARS
        </div>
      </div>

      {/* Staff Engineer Ideal Defense Strategy Box */}
      {grade && (
        <details className="rounded-sm border border-[#10B981]/40 bg-[#10B981]/5 p-4 transition-all">
          <summary className="cursor-pointer font-mono text-xs font-bold uppercase tracking-widest text-[#10B981] flex items-center justify-between">
            <span>💡 STAFF ENGINEER IDEAL DEFENSE STRATEGY</span>
            <span className="text-[10px] text-[#64748B]">[EXPAND]</span>
          </summary>
          <div className="mt-3.5 border-t border-[#10B981]/20 pt-3">
            <p className="font-sans text-xs leading-relaxed text-[#F8FAFC]">{stage.ideal}</p>
          </div>
        </details>
      )}
    </div>
  );
}

function Summary({
  grades,
  savedPassed,
  onJump,
  scenarioId,
}: {
  grades: Record<string, StageGrade>;
  savedPassed: Set<string>;
  onJump: (index: number) => void;
  scenarioId: string;
}) {
  const scenario = getDesignScenario(scenarioId)!;
  const cleared = scenario.stages.filter(
    (stage) => grades[stage.id]?.passed ?? savedPassed.has(stage.id),
  ).length;

  const pct = Math.round((cleared / scenario.stages.length) * 100);
  const hiringSignal =
    pct >= 85
      ? { label: "STRONG HIRE", color: "text-[#10B981] border-[#10B981]/40 bg-[#10B981]/10" }
      : pct >= 70
        ? { label: "HIRE", color: "text-[#34D399] border-[#34D399]/40 bg-[#34D399]/10" }
        : pct >= 50
          ? { label: "BORDERLINE", color: "text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10" }
          : { label: "NO HIRE", color: "text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10" };

  return (
    <section className="rounded-sm border border-[#171717] bg-[#0A0A0A] p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#171717] pb-5">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#64748B] block">
            EVALUATION DOCKET // SUMMARY
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F8FAFC] mt-1">
            {scenario.title}
          </h2>
          <p className="font-mono text-xs text-[#64748B] mt-0.5">
            Stakeholder: {scenario.stakeholder} ({scenario.stakeholderRole})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="font-mono text-xs text-[#64748B] block">Overall Score</span>
            <span className="font-mono text-2xl font-bold text-[#F8FAFC]">{pct}%</span>
          </div>
          <span
            className={`rounded-sm border px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest ${hiringSignal.color}`}
          >
            {hiringSignal.label}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-[#64748B]">
          Stage Performance Breakdown
        </h3>

        <ul className="space-y-3">
          {scenario.stages.map((stage, i) => {
            const grade = grades[stage.id];
            const passed = grade?.passed ?? savedPassed.has(stage.id);
            return (
              <li
                key={stage.id}
                className="rounded-sm border border-[#171717] bg-[#000000] p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm sm:text-base font-medium text-[#F8FAFC]">
                    {i + 1}. {stage.title} ({STAGE_KIND_LABELS[stage.kind]})
                  </span>
                  <span
                    className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${
                      passed
                        ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]"
                        : grade
                          ? "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
                          : "border-[#171717] text-[#64748B]"
                    }`}
                  >
                    {passed ? "CLEARED ✓" : grade ? "NEEDS PASS" : "NOT SUBMITTED"}
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => onJump(i)}
                    className="font-mono text-[11px] uppercase tracking-widest text-[#10B981] hover:underline font-semibold"
                  >
                    ← Revisit Stage {i + 1}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
