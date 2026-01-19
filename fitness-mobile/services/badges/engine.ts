// services/badges/engine.ts
import type {
  EvaluateInput,
  EvaluateResult,
  UnlockMap,
  ProgressMap,
} from "./types";

type Rule = {
  id: string;
  when: (ctx: EvaluateInput) => boolean;
  reason?: string;
};

function already(unlocks: UnlockMap, id: string) {
  return !!unlocks?.[id];
}
function unlock(unlocks: UnlockMap, id: string, reason?: string): UnlockMap {
  if (already(unlocks, id)) return unlocks;
  return {
    ...(unlocks || {}),
    [id]: {
      unlockedAt: Date.now(),
      reason,
      seen: false, // ✅ add this (new badges start unseen)
    },
  };
}

export function evaluateBadges(input: EvaluateInput): EvaluateResult {
  const { stats } = input;

  let nextUnlocks: UnlockMap = { ...(input.unlocks || {}) };
  let nextProgress: ProgressMap = { ...(input.progress || {}) };

  const rules: Rule[] = [
    // ── Overall log streak-based (from stats.workoutsStreakDays if you map it that way elsewhere)
    { id: "streak_1", when: () => true, reason: "first_log" }, // event implies a log happened
    {
      id: "streak_3",
      when: () => stats.workoutsStreakDays >= 3,
      reason: "streak",
    },
    {
      id: "streak_7",
      when: () => stats.workoutsStreakDays >= 7,
      reason: "streak",
    },
    {
      id: "streak_14",
      when: () => stats.workoutsStreakDays >= 14,
      reason: "streak",
    },
    {
      id: "streak_30",
      when: () => stats.workoutsStreakDays >= 30,
      reason: "streak",
    },

    // ── Workouts total
    {
      id: "workout_1",
      when: () => stats.totalWorkoutsAllTime >= 1,
      reason: "workouts_total",
    },
    {
      id: "workout_3",
      when: () => stats.totalWorkoutsAllTime >= 3,
      reason: "workouts_total",
    },
    {
      id: "workout_10",
      when: () => stats.totalWorkoutsAllTime >= 10,
      reason: "workouts_total",
    },
    {
      id: "workout_25",
      when: () => stats.totalWorkoutsAllTime >= 25,
      reason: "workouts_total",
    },
    {
      id: "workout_50",
      when: () => stats.totalWorkoutsAllTime >= 50,
      reason: "workouts_total",
    },
    {
      id: "workout_100",
      when: () => stats.totalWorkoutsAllTime >= 100,
      reason: "workouts_total",
    },

    // ── Workout streak (dedicated)
    {
      id: "wkstreak_3",
      when: () => stats.workoutsStreakDays >= 3,
      reason: "workout_streak",
    },
    {
      id: "wkstreak_7",
      when: () => stats.workoutsStreakDays >= 7,
      reason: "workout_streak",
    },
    {
      id: "wkstreak_14",
      when: () => stats.workoutsStreakDays >= 14,
      reason: "workout_streak",
    },

    // ── Workouts in week
    {
      id: "wk_1",
      when: () => stats.workoutsThisWeek >= 1,
      reason: "week_workouts",
    },
    {
      id: "wk_2",
      when: () => stats.workoutsThisWeek >= 2,
      reason: "week_workouts",
    },
    {
      id: "wk_3",
      when: () => stats.workoutsThisWeek >= 3,
      reason: "week_workouts",
    },
    {
      id: "wk_4",
      when: () => stats.workoutsThisWeek >= 4,
      reason: "week_workouts",
    },
    {
      id: "wk_6",
      when: () => stats.workoutsThisWeek >= 6,
      reason: "week_workouts",
    },

    // ── Steps
    { id: "steps_any", when: () => stats.stepsToday > 0, reason: "steps" },
    { id: "steps_5k", when: () => stats.stepsToday >= 5000, reason: "steps" },
    { id: "steps_10k", when: () => stats.stepsToday >= 10000, reason: "steps" },
    { id: "steps_12k", when: () => stats.stepsToday >= 12000, reason: "steps" },
    { id: "steps_15k", when: () => stats.stepsToday >= 15000, reason: "steps" },
    {
      id: "steps_10k_3w",
      when: () => stats.stepsDays10kThisWeek >= 3,
      reason: "steps_week",
    },
    {
      id: "steps_10k_7w",
      when: () => stats.stepsDays10kThisWeek >= 7,
      reason: "steps_week",
    },

    // ── Meals total
    {
      id: "meal_1",
      when: () => stats.totalMealsAllTime >= 1,
      reason: "meals_total",
    },
    {
      id: "meal_10",
      when: () => stats.totalMealsAllTime >= 10,
      reason: "meals_total",
    },
    {
      id: "meal_25",
      when: () => stats.totalMealsAllTime >= 25,
      reason: "meals_total",
    },
    {
      id: "meal_50",
      when: () => stats.totalMealsAllTime >= 50,
      reason: "meals_total",
    },
    {
      id: "meal_75",
      when: () => stats.totalMealsAllTime >= 75,
      reason: "meals_total",
    },
    {
      id: "meal_150",
      when: () => stats.totalMealsAllTime >= 150,
      reason: "meals_total",
    },
    {
      id: "meal_300",
      when: () => stats.totalMealsAllTime >= 300,
      reason: "meals_total",
    },

    // ── Protein / fiber weekly
    {
      id: "protein_3w",
      when: () => stats.proteinDaysThisWeek >= 3,
      reason: "protein_week",
    },
    {
      id: "protein_5w",
      when: () => stats.proteinDaysThisWeek >= 5,
      reason: "protein_week",
    },
    {
      id: "protein_7w",
      when: () => stats.proteinDaysThisWeek >= 7,
      reason: "protein_week",
    },
    {
      id: "fiber_3w",
      when: () => stats.fiberDaysThisWeek >= 3,
      reason: "fiber_week",
    },
    {
      id: "fiber_5w",
      when: () => stats.fiberDaysThisWeek >= 5,
      reason: "fiber_week",
    },
    {
      id: "fiber_7w",
      when: () => stats.fiberDaysThisWeek >= 7,
      reason: "fiber_week",
    },
  ];

  // Apply rules (quiet, deterministic)
  const before = new Set(Object.keys(nextUnlocks));
  for (const r of rules) {
    if (!already(nextUnlocks, r.id) && r.when(input)) {
      nextUnlocks = unlock(nextUnlocks, r.id, r.reason);
    }
  }
  const after = Object.keys(nextUnlocks);
  const newlyUnlocked = after.filter((id) => !before.has(id));

  // Update a small “activity” progress stamp (useful later)
  nextProgress["_last"] = { value: Date.now(), updatedAt: Date.now() };

  return { unlocks: nextUnlocks, progress: nextProgress, newlyUnlocked };
}
