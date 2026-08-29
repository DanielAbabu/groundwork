import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDesignScenario } from "@/content/design";
import { gradeStage } from "@/lib/design/grading";
import type { StageAnswer, StageGrade } from "@/lib/design/types";

export type DesignStageRow = {
  scenario_id: string;
  stage_id: string;
  passed: boolean;
  score: number;
  answer: StageAnswer;
  updated_at: string;
};

export const listDesignResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DesignStageRow[]> => {
    const { data, error } = await context.supabase
      .from("design_stage_results")
      .select("scenario_id, stage_id, passed, score, answer, updated_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as DesignStageRow[];
  });

export const submitDesignStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        scenarioId: z.string().min(1),
        stageId: z.string().min(1),
        answer: z.any(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<StageGrade> => {
    const scenario = getDesignScenario(data.scenarioId);
    if (!scenario) throw new Error("Unknown design scenario");
    const stage = scenario.stages.find((item) => item.id === data.stageId);
    if (!stage) throw new Error("Unknown stage");

    const grade = gradeStage(stage, (data.answer ?? {}) as StageAnswer);

    const { error } = await context.supabase.from("design_stage_results").upsert(
      {
        user_id: context.userId,
        scenario_id: scenario.id,
        stage_id: stage.id,
        passed: grade.passed,
        score: grade.score,
        answer: (data.answer ?? {}) as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,scenario_id,stage_id" },
    );
    if (error) throw new Error(error.message);

    const { data: rows } = await context.supabase
      .from("design_stage_results")
      .select("stage_id, passed")
      .eq("user_id", context.userId)
      .eq("scenario_id", scenario.id);

    const passedStages = new Set((rows ?? []).filter((row) => row.passed).map((r) => r.stage_id));
    const allPassed = scenario.stages.every((item) => passedStages.has(item.id));

    const { data: existing } = await context.supabase
      .from("scenario_progress")
      .select("attempts, first_passed_at, status")
      .eq("user_id", context.userId)
      .eq("scenario_id", scenario.id)
      .maybeSingle();

    const { error: progressErr } = await context.supabase.from("scenario_progress").upsert(
      {
        user_id: context.userId,
        scenario_id: scenario.id,
        track: "design",
        status: allPassed || existing?.status === "passed" ? "passed" : "attempted",
        attempts: (existing?.attempts ?? 0) + 1,
        first_passed_at: existing?.first_passed_at ?? (allPassed ? new Date().toISOString() : null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,scenario_id" },
    );
    if (progressErr) {
      console.warn("Failed to update design scenario progress:", progressErr.message);
    }

    const { error: runErr } = await context.supabase.from("scenario_runs").insert({
      user_id: context.userId,
      scenario_id: scenario.id,
      track: "design",
      passed: grade.passed,
    });
    if (runErr) {
      console.warn("Failed to record design scenario run log:", runErr.message);
    }

    return grade;
  });
