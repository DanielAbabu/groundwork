import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getDesignScenario } from "@/content/design";
import { COMPONENT_LABELS, STAGE_KIND_LABELS } from "@/lib/design/types";
import type {
  CapacityAnswer,
  ClarifyAnswer,
  ComponentKind,
  ComponentsAnswer,
  DesignStage,
  StageAnswer,
  StageGrade,
} from "@/lib/design/types";
import { listDesignResults, submitDesignStage, type DesignStageRow } from "@/lib/design.functions";
import { Button } from "@/components/ui/button";
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
    const title = `Design Review — ${loaderData.title}`;
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

  const setAnswer = (next: StageAnswer) =>
    setAnswers((prev) => ({ ...prev, [stage.id]: next }));

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

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <Link to="/design" className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              ← design review
            </Link>
            <h1 className="mt-2 text-lg font-semibold text-foreground">
              Design Review — {scenario.system}, presenting to {scenario.stakeholder}
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              {scenario.stakeholder} · {scenario.stakeholderRole}
            </p>
          </div>
          <span className="rounded border border-primary/40 px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary">
            Stage {index + 1} of {scenario.stages.length}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          {scenario.framing}
        </p>

        <ol className="mt-6 flex flex-wrap gap-2">
          {scenario.stages.map((item, i) => {
            const cleared = grades[item.id]?.passed ?? savedPassed.has(item.id);
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setIndex(i);
                    setShowSummary(false);
                  }}
                  className={`rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    i === index && !showSummary
                      ? "border-primary text-primary"
                      : cleared
                        ? "border-pass/40 text-pass"
                        : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {i + 1}. {STAGE_KIND_LABELS[item.kind]}
                  {cleared ? " ✓" : ""}
                </button>
              </li>
            );
          })}
        </ol>

        {showSummary ? (
          <Summary
            grades={grades}
            savedPassed={savedPassed}
            onJump={(i) => {
              setIndex(i);
              setShowSummary(false);
            }}
            scenarioId={scenario.id}
          />
        ) : (
          <section className="mt-6 rounded-lg border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">{stage.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.prompt}</p>

            <div className="mt-6">
              {stage.kind === "clarify" && (
                <ClarifyStage
                  stage={stage}
                  answer={answers[stage.id] as ClarifyAnswer}
                  onChange={setAnswer}
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
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
              <Button onClick={onSubmit} disabled={submitting} className="font-mono">
                {submitting ? "Grading…" : "Submit stage"}
              </Button>
              {index > 0 && (
                <Button
                  variant="outline"
                  className="font-mono"
                  onClick={() => setIndex(index - 1)}
                >
                  Back
                </Button>
              )}
              {index < scenario.stages.length - 1 ? (
                <Button
                  variant="outline"
                  className="font-mono"
                  onClick={() => setIndex(index + 1)}
                >
                  Next stage
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="font-mono"
                  onClick={() => setShowSummary(true)}
                >
                  See review summary
                </Button>
              )}
              {grade && (
                <span
                  className={`ml-auto font-mono text-xs uppercase tracking-widest ${grade.passed ? "text-pass" : "text-fail"}`}
                >
                  {grade.advisory ? "advisory · " : ""}
                  {Math.round(grade.score * 100)}% · {grade.passed ? "cleared" : "not yet"}
                </span>
              )}
            </div>

            {grade && (
              <ul className="mt-5 space-y-2">
                {grade.feedback.map((item, i) => (
                  <li
                    key={i}
                    className="rounded border border-border bg-background p-3 font-mono text-xs"
                  >
                    <span
                      className={
                        item.ok === true
                          ? "text-pass"
                          : item.ok === "partial"
                            ? "text-primary"
                            : "text-fail"
                      }
                    >
                      {item.ok === true ? "PASS" : item.ok === "partial" ? "PART" : "FAIL"}
                    </span>{" "}
                    <span className="text-foreground">{item.label}</span>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{item.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ClarifyStage({
  stage,
  answer,
  onChange,
}: {
  stage: Extract<DesignStage, { kind: "clarify" }>;
  answer: ClarifyAnswer;
  onChange: (next: ClarifyAnswer) => void;
}) {
  return (
    <div className="space-y-5">
      {stage.questions.map((question) => (
        <div key={question.id} className="rounded-lg border border-border bg-background p-4">
          <p className="text-sm leading-relaxed text-foreground">{question.text}</p>
          <div className="mt-3 space-y-2">
            {question.options.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded border p-3 text-sm transition-colors ${
                  answer[question.id] === option.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <input
                  type="radio"
                  className="mt-1"
                  name={question.id}
                  checked={answer[question.id] === option.id}
                  onChange={() => onChange({ ...answer, [question.id]: option.id })}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CapacityStage({
  stage,
  answer,
  onChange,
}: {
  stage: Extract<DesignStage, { kind: "capacity" }>;
  answer: CapacityAnswer;
  onChange: (next: CapacityAnswer) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {stage.fields.map((field) => {
        const raw = answer[field.id];
        const invalid = raw != null && (Number.isNaN(raw) || raw < 0);
        return (
          <div key={field.id} className="rounded-lg border border-border bg-background p-4">
            <label className="text-sm font-medium text-foreground" htmlFor={field.id}>
              {field.label}
            </label>
            {field.hint && (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">hint: {field.hint}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Input
                id={field.id}
                type="number"
                inputMode="decimal"
                className="font-mono"
                value={raw ?? ""}
                onChange={(event) =>
                  onChange({
                    ...answer,
                    [field.id]: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
              />
              <span className="font-mono text-xs text-muted-foreground">{field.unit}</span>
            </div>
            {invalid && <p className="mt-2 font-mono text-[11px] text-fail">Enter a positive number.</p>}
          </div>
        );
      })}
    </div>
  );
}

function ComponentsStage({
  stage,
  answer,
  onChange,
}: {
  stage: Extract<DesignStage, { kind: "components" }>;
  answer: ComponentsAnswer;
  onChange: (next: ComponentsAnswer) => void;
}) {
  return (
    <ComponentCanvas
      palette={stage.spec.palette}
      value={answer}
      onChange={(graph) => onChange(graph)}
    />
  );
}


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
  return (
    <div className="space-y-4">
      <p className="rounded border border-primary/30 bg-primary/5 p-3 font-mono text-[11px] text-primary">
        Advisory stage: prose gets rubric-based feedback, not a precise score.
      </p>
      <Textarea
        rows={8}
        value={answer.text}
        onChange={(event) => onChange({ text: event.target.value })}
        placeholder="Explain the trade-off you're accepting and how you'd handle it…"
        className="font-mono text-sm"
      />
      {grade && (
        <details className="rounded border border-border bg-background p-4">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-primary">
            what a strong answer looked like
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{stage.ideal}</p>
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

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground">Review summary</h2>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {cleared} of {scenario.stages.length} stages cleared
      </p>
      <ul className="mt-5 space-y-3">
        {scenario.stages.map((stage, i) => {
          const grade = grades[stage.id];
          const passed = grade?.passed ?? savedPassed.has(stage.id);
          return (
            <li key={stage.id} className="rounded border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {i + 1}. {stage.title}
                </span>
                <span
                  className={`font-mono text-[11px] uppercase tracking-widest ${passed ? "text-pass" : "text-fail"}`}
                >
                  {passed ? "cleared" : grade ? "not yet" : "not submitted"}
                </span>
              </div>
              {stage.kind === "tradeoff" && grade && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{stage.ideal}</p>
              )}
              {stage.kind === "capacity" && grade && (
                <ul className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
                  {stage.fields.map((field) => (
                    <li key={field.id}>
                      {field.label}: {field.accept.min}–{field.accept.max} {field.unit} — {field.rationale}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => onJump(i)}
                className="mt-3 font-mono text-[11px] uppercase tracking-widest text-primary"
              >
                revisit stage
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
