import type { FastifyPluginAsync } from "fastify";

import { and, desc, eq } from "drizzle-orm";

import {
  aiErrorCodes,
  apiErrorCodes,
  createLearningPlanInputSchema,
  idParamSchema,
  learningPlanSchema,
  planListResponseSchema,
  planResponseSchema,
  spaceQuerySchema,
  updatePlanStepInputSchema,
  type LearningPlanDto,
  type PlanStep,
} from "@study-os/contracts";
import { aiInvocations, learningPlans, spaces, type LearningPlanRow } from "@study-os/db";

import { type AiMessage, type AiProvider } from "../ai/provider";
import { estimateCostMicros, monthlySpendMicros } from "../ai/usage";
import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, sendError, validationError } from "../http/errors";

export interface PlanRouteOptions {
  provider: AiProvider | null;
  budgetUsd: number;
  costPer1kUsd: number;
}

const FALLBACK_STEPS: Array<{ title: string; type: PlanStep["type"] }> = [
  { title: "诊断当前水平", type: "diagnose" },
  { title: "学习核心概念", type: "study" },
  { title: "针对性练习", type: "practice" },
  { title: "复盘与巩固", type: "review" },
];

function toSteps(raw: string): PlanStep[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set(["diagnose", "study", "practice", "review"]);
    return parsed
      .filter(
        (item): item is { title: string; type: string; id?: unknown; status?: unknown } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { title?: unknown }).title === "string" &&
          typeof (item as { type?: unknown }).type === "string" &&
          allowed.has((item as { type: string }).type),
      )
      .slice(0, 8)
      .map((item) => ({
        id:
          typeof item.id === "string" ? item.id : crypto.randomUUID(),
        title: item.title.slice(0, 200),
        type: item.type as PlanStep["type"],
        status:
          (item as { status?: unknown }).status === "done"
            ? ("done" as const)
            : (item as { status?: unknown }).status === "in_progress"
              ? ("in_progress" as const)
              : ("pending" as const),
      }));
  } catch {
    return [];
  }
}

function parsePlannerSteps(text: string): PlanStep[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { steps?: Array<{ title?: string; type?: string }> };
    const allowed = new Set(["diagnose", "study", "practice", "review"]);
    const steps = (parsed.steps ?? [])
      .filter(
        (item): item is { title: string; type: string } =>
          typeof item?.title === "string" && typeof item?.type === "string" && allowed.has(item.type),
      )
      .slice(0, 8)
      .map((item) => ({
        id: crypto.randomUUID(),
        title: item.title.slice(0, 200),
        type: item.type as PlanStep["type"],
        status: "pending" as const,
      }));
    return steps.length > 0 ? steps : [];
  } catch {
    return [];
  }
}

function toPlanDto(row: LearningPlanRow): LearningPlanDto {
  return learningPlanSchema.parse({
    id: row.id,
    spaceId: row.spaceId,
    courseId: row.courseId,
    goal: row.goal,
    status: row.status,
    steps: toSteps(row.steps),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

async function guardPlaceholder(): Promise<void> {
  return Promise.resolve();
}
void guardPlaceholder;

export const planRoutes: FastifyPluginAsync<PlanRouteOptions> = async (app, options) => {
  app.get("/api/v1/learning-plans", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select()
      .from(learningPlans)
      .where(
        and(eq(learningPlans.spaceId, query.data.spaceId), eq(learningPlans.userId, user.id)),
      )
      .orderBy(desc(learningPlans.updatedAt));
    return planListResponseSchema.parse({ plans: rows.map(toPlanDto) });
  });

  app.post("/api/v1/learning-plans", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createLearningPlanInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
      return notFound(reply);
    }
    if (!options.provider) {
      return sendError(reply, 503, apiErrorCodes.serviceUnavailable, "AI 未配置");
    }

    const [space] = await database.db
      .select({ privacyLevel: spaces.privacyLevel })
      .from(spaces)
      .where(eq(spaces.id, parsed.data.spaceId))
      .limit(1);
    if (!space) return notFound(reply);
    if (space.privacyLevel === "private_local" && options.provider.name !== "ollama") {
      return sendError(reply, 403, aiErrorCodes.privacyDenied, "私密空间默认只允许本地模型");
    }

    const spent = await monthlySpendMicros(database.db, user.id);
    if (spent >= Math.round(options.budgetUsd * 1_000_000)) {
      return sendError(reply, 402, aiErrorCodes.budgetExceeded, "本月 AI 预算已用完");
    }

    let steps: PlanStep[] = FALLBACK_STEPS.map((step) => ({
      id: crypto.randomUUID(),
      title: step.title,
      type: step.type,
      status: "pending" as const,
    }));
    try {
      const messages: AiMessage[] = [
        {
          role: "system",
          content:
            "你是 Study OS 的学习规划 Agent。把目标拆成 3–8 个步骤，只输出 JSON：" +
            '{"steps":[{"title":"...","type":"diagnose|study|practice|review"}]}',
        },
        { role: "user", content: parsed.data.goal },
      ];
      const completion = await options.provider.complete(messages);
      const generated = parsePlannerSteps(completion.text);
      if (generated.length > 0) steps = generated;
      await database.db.insert(aiInvocations).values({
        userId: user.id,
        spaceId: parsed.data.spaceId,
        purpose: "agent:planner",
        provider: completion.provider,
        model: completion.model,
        promptChars: completion.promptChars,
        completionChars: completion.completionChars,
        estimatedCostMicros: estimateCostMicros(
          completion.promptChars,
          completion.completionChars,
          options.costPer1kUsd,
        ),
        status: "ok",
      });
    } catch (error) {
      void error;
    }

    const [plan] = await database.db
      .insert(learningPlans)
      .values({
        spaceId: parsed.data.spaceId,
        courseId: parsed.data.courseId ?? null,
        userId: user.id,
        goal: parsed.data.goal,
        steps: JSON.stringify(steps),
      })
      .returning();
    if (!plan) return reply;
    return reply.code(201).send(planResponseSchema.parse({ plan: toPlanDto(plan) }));
  });

  app.patch("/api/v1/learning-plans/:id/steps", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updatePlanStepInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [plan] = await database.db
      .select()
      .from(learningPlans)
      .where(and(eq(learningPlans.id, params.data.id), eq(learningPlans.userId, user.id)))
      .limit(1);
    if (!plan) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, plan.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const steps = toSteps(plan.steps).map((step) =>
      step.id === parsed.data.stepId ? { ...step, status: parsed.data.status } : step,
    );
    const nextStatus = steps.every((step) => step.status === "done") ? "completed" : "active";
    const [updated] = await database.db
      .update(learningPlans)
      .set({ steps: JSON.stringify(steps), status: nextStatus, updatedAt: new Date() })
      .where(eq(learningPlans.id, plan.id))
      .returning();
    if (!updated) return notFound(reply);
    return planResponseSchema.parse({ plan: toPlanDto(updated) });
  });
};
