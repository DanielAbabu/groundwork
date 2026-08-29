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
    <div className="flex h-[calc(100vh-44px)] flex-col bg-[#161412] text-[#F2ECE1] overflow-hidden">
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
              className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
                showSummary
                  ? "border-[#C8912B] bg-[#C8912B]/10 text-[#C8912B] font-semibold"
                  : "border-[#3A342C] bg-[#1D1A17] text-[#7C7364] hover:text-[#F2ECE1]"
              }`}
            >
              {showSummary ? "← Back to Stage Workspace" : "Review Scorecard"}
            </button>
            {!showSummary && (
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded bg-[#C8912B] px-3.5 py-1.5 font-mono text-xs font-bold text-[#161412] hover:bg-[#E8B04A] transition-all brass-emboss disabled:opacity-50"
              >
                {submitting ? "Grading…" : "Submit Stage"}
              </button>
            )}
          </div>
        }
      />

      {/* ── 3.1 Top Horizontal Ruler Stage Stepper ── */}
      {!showSummary && (
        <div className="border-b border-[#3A342C] bg-[#1D1A17] px-6 py-2.5 flex items-center justify-between overflow-x-auto shrink-0 select-none">
          <div className="flex items-center gap-1 min-w-max w-full justify-between max-w-5xl mx-auto">
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
                  className={`group relative flex items-center gap-2 px-4 py-1.5 font-mono text-xs transition-all ${
                    isCurrent
                      ? "bg-[#C8912B] text-[#161412] font-bold brass-emboss"
                      : isCleared
                        ? "border border-[#7FB88A]/30 bg-[#7FB88A]/5 text-[#7FB88A] hover:bg-[#7FB88A]/10"
                        : "border border-[#3A342C] bg-[#161412] text-[#7C7364] hover:text-[#F2ECE1] hover:border-[#4E4638]"
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
        <div className="flex-1 overflow-y-auto p-6 bg-[#161412]">
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
        /* ── Full-Viewport 2-Panel Workspace ── */
        <div className="flex flex-1 overflow-hidden">
          {/* ── 3.2 Left Column: "Case File" Panel (320px) ── */}
          <aside className="w-80 shrink-0 flex flex-col border-r border-[#3A342C] bg-[#1D1A17] overflow-y-auto p-5 space-y-6">
            {/* STAKEHOLDER Section */}
            <div className="space-y-2 border-b border-[#3A342C] pb-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C7364] block">
                STAKEHOLDER
              </span>
              <div className="flex items-center gap-3 pt-1">
                <div className="size-9 rounded-full border border-[#C8912B]/40 bg-[#C8912B]/10 font-serif text-sm font-bold text-[#C8912B] flex items-center justify-center brass-emboss shrink-0 select-none">
                  {initials}
                </div>
                <div>
                  <h4 className="font-serif text-sm font-semibold text-[#F2ECE1]">
                    {scenario.stakeholder}
                  </h4>
                  <p className="font-mono text-[11px] text-[#7C7364]">{scenario.stakeholderRole}</p>
                </div>
              </div>
            </div>

            {/* CONTEXT Section */}
            <div className="space-y-2 border-b border-[#3A342C] pb-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C7364] block">
                CONTEXT
              </span>
              <p className="font-serif text-xs leading-relaxed text-[#B8AE9C] italic">
                "{scenario.framing}"
              </p>
            </div>

            {/* THIS STAGE Section */}
            <div className="space-y-2 border-l-2 border-[#C8912B] pl-3 py-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C8912B] block">
                THIS STAGE // FOCUS
              </span>
              <h3 className="font-serif text-sm font-semibold text-[#F2ECE1]">{stage.title}</h3>
              <p className="font-sans text-xs leading-relaxed text-[#B8AE9C]">{stage.prompt}</p>
            </div>

            {/* Stage Grade Status pill if graded */}
            {grade && (
              <div
                className={`rounded border p-3 font-mono text-xs space-y-1 ${
                  grade.passed
                    ? "border-[#7FB88A]/40 bg-[#7FB88A]/10 text-[#7FB88A]"
                    : "border-[#C4593F]/40 bg-[#C4593F]/10 text-[#C4593F]"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>STAGE VERDICT</span>
                  <span>{Math.round(grade.score * 100)}%</span>
                </div>
                <p className="text-[11px] font-normal">
                  {grade.passed ? "✓ Stage cleared!" : "Needs adjustment before advancing."}
                </p>
              </div>
            )}
          </aside>

          {/* ── Right Panel: Stage Workspace Canvas / Interactive UI ── */}
          <section className="flex flex-1 flex-col overflow-hidden bg-[#161412]">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            <div className="flex shrink-0 items-center justify-between border-t border-[#3A342C] bg-[#1D1A17] px-6 py-3">
              <button
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
                className="font-mono text-xs text-[#7C7364] hover:text-[#F2ECE1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous Stage
              </button>

              <div className="flex items-center gap-3">
                {index < scenario.stages.length - 1 ? (
                  <button
                    onClick={() => setIndex((i) => i + 1)}
                    className="font-mono text-xs text-[#F2ECE1] hover:text-[#C8912B] transition-colors"
                  >
                    Next Stage →
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSummary(true)}
                    className="font-mono text-xs font-bold text-[#7FB88A] hover:underline"
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
    <div className="mt-6 space-y-4 border-t border-[#3A342C] pt-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#7C7364]">
        GRADING FEEDBACK ({passing.length}/{grade.feedback.length} RULES PASSED)
      </p>
      <div className="space-y-3">
        {[...failing, ...passing].map((item, i) => {
          const isPass = item.ok === true;
          const isPartial = item.ok === "partial";

          return (
            <div
              key={i}
              className={`rounded border p-4 transition-all ${
                isPass
                  ? "border-[#7FB88A]/30 bg-[#7FB88A]/5"
                  : isPartial
                    ? "border-[#C8912B]/30 bg-[#C8912B]/5"
                    : "border-[#C4593F]/30 bg-[#C4593F]/5"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                {/* Scorecard Stamp Block (-2deg rotation) */}
                <span
                  className={`inline-block -rotate-2 rounded-none border px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-sm select-none ${
                    isPass
                      ? "border-[#7FB88A] bg-[#7FB88A]/20 text-[#7FB88A]"
                      : isPartial
                        ? "border-[#C8912B] bg-[#C8912B]/20 text-[#C8912B]"
                        : "border-[#C4593F] bg-[#C4593F]/20 text-[#C4593F]"
                  }`}
                >
                  {isPass ? "PASS" : isPartial ? "PARTIAL" : "MISS"}
                </span>

                {item.rule && (
                  <span className="rounded-none border border-[#3A342C] bg-[#161412] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#7C7364]">
                    {RULE_LABELS[item.rule] ?? item.rule}
                  </span>
                )}
                <span className="font-mono text-xs font-semibold text-[#F2ECE1]">{item.label}</span>
              </div>

              {item.targets && item.targets.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {item.targets.map((target) => (
                    <span
                      key={target}
                      className="rounded-none border border-[#3A342C] bg-[#161412] px-2 py-0.5 font-mono text-[10px] text-[#B8AE9C]"
                    >
                      {target}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 font-mono text-xs leading-relaxed text-[#B8AE9C]">{item.detail}</p>
              {item.fix && (
                <p className="mt-2 border-l-2 border-[#C8912B] pl-3 font-mono text-[11px] text-[#C8912B]">
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
    <div className="rounded-none border border-[#3A342C] bg-[#1D1A17] p-6 space-y-6 shadow-md select-none">
      {/* Ledger Sheet Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3A342C] pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C8912B] block">
            ACCOUNTING LEDGER // CAPACITY & BANDWIDTH ESTIMATION
          </span>
          <h3 className="font-serif text-lg font-semibold text-[#F2ECE1] mt-0.5">
            System Traffic & Storage Ledger
          </h3>
        </div>
        <div className="font-mono text-xs text-[#7C7364] text-left sm:text-right">
          <span>LINE ITEMS: {stage.fields.length}</span>
        </div>
      </div>

      {/* Assumption Text (Serif Italic Note Block) */}
      <div className="rounded-none border-l-2 border-[#C8912B] bg-[#161412] p-3.5 space-y-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C8912B]">
          ESTIMATION ASSUMPTIONS & FORMULA GUIDANCE
        </span>
        <p className="font-serif italic text-xs leading-relaxed text-[#B8AE9C]">
          "Assume 86,400 seconds per day. Write exact numeric inputs or mathematical expressions
          (e.g. 500 * 86400 or 1000/2) directly into each ledger row to evaluate system
          constraints."
        </p>
      </div>

      {/* Ruled Ledger Table */}
      <div className="space-y-0 divide-y divide-[#3A342C]/40 border-t border-b border-[#3A342C]">
        {stage.fields.map((field, idx) => {
          const rawText = inputs[field.id] ?? "";
          const evalResult = evaluateFormula(rawText);
          const hasValue = evalResult.value != null;
          const invalid = evalResult.error != null || (hasValue && evalResult.value! < 0);

          return (
            <div
              key={field.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-2 transition-colors hover:bg-[#26221D]/40"
            >
              {/* Left Column: Label & Target Formula */}
              <div className="space-y-0.5 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#7C7364]">{idx + 1}.</span>
                  <label
                    className="font-mono text-xs font-semibold text-[#F2ECE1] cursor-pointer"
                    htmlFor={field.id}
                  >
                    {field.label}
                  </label>
                </div>
                {field.formula && (
                  <p className="font-mono text-[10px] text-[#7C7364] pl-4">
                    Target Formula: <span className="text-[#C8912B]">{field.formula}</span>
                  </p>
                )}
              </div>

              {/* Right Column: Expression Input & Evaluated Value */}
              <div className="flex items-center gap-3 justify-end">
                {hasValue && !invalid && (
                  <div className="font-mono text-xs text-right mr-1">
                    <span className="text-[10px] text-[#7C7364] uppercase block">EVALUATED</span>
                    <span className="font-bold text-[#7FB88A]">
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
                  className="w-48 text-right font-mono text-xs bg-[#161412] border-[#3A342C] text-[#F2ECE1] focus-visible:ring-1 focus-visible:ring-[#C8912B] rounded-none"
                />

                <span className="font-mono text-xs text-[#7C7364] w-14 shrink-0 text-left">
                  {field.unit ?? ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals Footer Bar with Accounting Double-Rule */}
      <div className="border-t-2 border-b-2 border-t-[#C8912B]/80 border-b-[#C8912B] py-3.5 px-4 bg-[#161412] flex items-center justify-between brass-emboss select-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C8912B]">
            LEDGER STATUS // TOTALS
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-[#7C7364]">COMPUTED ROWS:</span>
          <span className={`font-bold ${isAllComputed ? "text-[#7FB88A]" : "text-[#C8912B]"}`}>
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-[#3A342C] bg-[#1D1A17] p-4">
        <div>
          <h4 className="font-serif font-semibold text-[#F2ECE1] text-sm">
            System Resilience & Latency Analysis
          </h4>
          <p className="font-mono text-xs text-[#7C7364] mt-0.5">
            {spofs.length === 0 ? (
              <span className="text-[#7FB88A] font-semibold">✓ No Single Points of Failure</span>
            ) : (
              <span className="text-[#C4593F] font-semibold">
                ⚠️ {spofs.length} Single Point(s) of Failure detected
              </span>
            )}
          </p>
        </div>

        {latency.hops.length > 0 && (
          <div className="w-64">
            <LatencyBar estimate={latency} />
          </div>
        )}
      </div>

      <div className="h-[520px] rounded border border-[#3A342C] overflow-hidden">
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
 * Stage 4: Defend the Cache (Field Report)
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
    <div className="rounded border border-[#3A342C] bg-[#1D1A17] p-6 space-y-5">
      <div className="border-b border-[#3A342C] pb-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C8912B] block">
          FIELD REPORT // TRADE-OFF DEFENSE
        </span>
        <p className="font-serif italic text-xs text-[#B8AE9C] mt-1">
          Defend one key architectural trade-off accepted in your design (e.g., eventual
          consistency, cache warming overhead).
        </p>
      </div>

      <div className="relative">
        <Textarea
          rows={9}
          value={answer.text}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Explain the trade-off you accepted and how you mitigate operational risks..."
          className="font-serif text-sm leading-relaxed text-[#F2ECE1] bg-[#161412] border-[#3A342C] p-4 focus-visible:ring-1 focus-visible:ring-[#C8912B]"
        />
        <span className="absolute bottom-3 right-3 font-mono text-[10px] text-[#7C7364]">
          {charCount} CHARS
        </span>
      </div>

      {grade && (
        <details className="rounded border border-[#3A342C] bg-[#161412] p-4">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-[#C8912B] font-bold">
            💡 Staff Engineer Ideal Defense Strategy
          </summary>
          <p className="mt-3 font-sans text-xs leading-relaxed text-[#B8AE9C]">{stage.ideal}</p>
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
      ? { label: "STRONG HIRE", color: "text-[#7FB88A] border-[#7FB88A]/40 bg-[#7FB88A]/10" }
      : pct >= 70
        ? { label: "HIRE", color: "text-[#C8912B] border-[#C8912B]/40 bg-[#C8912B]/10" }
        : pct >= 50
          ? { label: "BORDERLINE", color: "text-[#D99B26] border-[#D99B26]/40 bg-[#D99B26]/10" }
          : { label: "NO HIRE", color: "text-[#C4593F] border-[#C4593F]/40 bg-[#C4593F]/10" };

  return (
    <section className="rounded border border-[#3A342C] bg-[#1D1A17] p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3A342C] pb-5">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C7364] block">
            EVALUATION DOCKET // SUMMARY
          </span>
          <h2 className="font-serif text-2xl font-semibold text-[#F2ECE1] mt-1">
            {scenario.title}
          </h2>
          <p className="font-mono text-xs text-[#7C7364] mt-0.5">
            Stakeholder: {scenario.stakeholder} ({scenario.stakeholderRole})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="font-mono text-xs text-[#7C7364] block">Overall Score</span>
            <span className="font-mono text-2xl font-bold text-[#F2ECE1]">{pct}%</span>
          </div>
          <span
            className={`rounded border px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest brass-emboss ${hiringSignal.color}`}
          >
            {hiringSignal.label}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-[#7C7364]">
          Stage Performance Breakdown
        </h3>

        <ul className="space-y-3">
          {scenario.stages.map((stage, i) => {
            const grade = grades[stage.id];
            const passed = grade?.passed ?? savedPassed.has(stage.id);
            return (
              <li
                key={stage.id}
                className="rounded border border-[#3A342C] bg-[#161412] p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-serif text-base font-medium text-[#F2ECE1]">
                    {i + 1}. {stage.title} ({STAGE_KIND_LABELS[stage.kind]})
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${
                      passed
                        ? "border-[#7FB88A]/30 bg-[#7FB88A]/10 text-[#7FB88A]"
                        : grade
                          ? "border-[#C4593F]/30 bg-[#C4593F]/10 text-[#C4593F]"
                          : "border-[#3A342C] text-[#7C7364]"
                    }`}
                  >
                    {passed ? "CLEARED ✓" : grade ? "NEEDS PASS" : "NOT SUBMITTED"}
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => onJump(i)}
                    className="font-mono text-[11px] uppercase tracking-widest text-[#C8912B] hover:underline font-semibold"
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
