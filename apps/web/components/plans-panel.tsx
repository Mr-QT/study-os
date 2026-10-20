"use client";

import type { LearningPlanDto, PlanStep } from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import { PLANS_ENDPOINT, planStepEndpoint, plansListEndpoint } from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "学习计划",
    placeholder: "目标，例如：两周内复习完高数上册",
    create: "生成计划",
    creating: "生成中…",
    empty: "还没有计划。",
    markDone: "完成",
    markPending: "重置",
  },
  en: {
    title: "Learning plans",
    placeholder: "Goal, e.g. revise Calculus I in two weeks",
    create: "Generate plan",
    creating: "Generating…",
    empty: "No plans yet.",
    markDone: "Done",
    markPending: "Reset",
  },
} as const;

export function PlansPanel({ spaceId, locale }: { spaceId: string; locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [plans, setPlans] = useState<LearningPlanDto[]>([]);
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(plansListEndpoint(spaceId), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.ok) {
      setPlans(((await response.json()) as { plans: LearningPlanDto[] }).plans);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    if (!goal.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch(PLANS_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ spaceId, goal: goal.trim() }),
      });
      if (response.ok) {
        const body = (await response.json()) as { plan: LearningPlanDto };
        setPlans((previous) => [body.plan, ...previous]);
        setGoal("");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, goal, spaceId]);

  const toggleStep = useCallback(
    async (plan: LearningPlanDto, step: PlanStep) => {
      const response = await fetch(planStepEndpoint(plan.id), {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          stepId: step.id,
          status: step.status === "done" ? "pending" : "done",
        }),
      });
      if (response.ok) {
        const body = (await response.json()) as { plan: LearningPlanDto };
        setPlans((previous) => previous.map((item) => (item.id === body.plan.id ? body.plan : item)));
      }
    },
    [],
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{text.title}</h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          placeholder={text.placeholder}
          aria-label={text.placeholder}
          className="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy || !goal.trim()}
          className="rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {busy ? text.creating : text.create}
        </button>
      </div>

      {plans.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{text.empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-xl border border-line bg-canvas p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{plan.goal}</p>
                <span className="text-xs text-muted">{plan.status}</span>
              </div>
              <ol className="mt-2 flex flex-col gap-1">
                {plan.steps.map((step) => (
                  <li key={step.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className={step.status === "done" ? "text-muted line-through" : ""}>
                      {step.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleStep(plan, step)}
                      className="rounded-lg border border-line px-2 py-1 text-xs hover:border-accent"
                    >
                      {step.status === "done" ? text.markPending : text.markDone}
                    </button>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
