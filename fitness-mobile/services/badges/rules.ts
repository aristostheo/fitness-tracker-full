// services/badges/rules.ts
import type { BadgeEvent, BadgeStatsSnapshot, UnlockMap } from "./types";

export type BadgeRule = {
  id: string;
  /** Return true when the badge should be unlocked. Must be pure + deterministic. */
  when: (ctx: {
    event: BadgeEvent;
    stats: BadgeStatsSnapshot;
    unlocks: UnlockMap;
  }) => boolean;
  /** Optional internal reason used for debugging / future analytics */
  reason?: string;
};

const has = (unlocks: UnlockMap, id: string) => !!unlocks?.[id];

export function getBadgeRules(): BadgeRule[] {
  return [
    // ─────────────────────────────
    // Consistency (quiet streaks)
    // ─────────────────────────────
    {
      id: "streak_1",
      reason: "streak",
      when: ({ event, unlocks }) =>
        !has(unlocks, "streak_1") &&
        (event.type === "WORKOUT_LOGGED" ||
          event.type === "MEAL_LOGGED" ||
          event.type === "STEPS_SET" ||
          event.type === "SNAPSHOT"),
    },
    {
      id: "streak_3",
      reason: "streak",
      when: ({ stats }) => stats.workoutsStreakDays >= 3,
    },
    {
      id: "streak_7",
      reason: "streak",
      when: ({ stats }) => stats.workoutsStreakDays >= 7,
    },
    {
      id: "streak_14",
      reason: "streak",
      when: ({ stats }) => stats.workoutsStreakDays >= 14,
    },
    {
      id: "streak_30",
      reason: "streak",
      when: ({ stats }) => stats.workoutsStreakDays >= 30,
    },

    // Hidden “comeback” styles (unlock only when meaningful)
    {
      id: "comeback_1",
      reason: "comeback",
      when: ({ stats, unlocks }) =>
        !has(unlocks, "comeback_1") &&
        stats.workoutsStreakDays === 1 &&
        has(unlocks, "streak_3"), // implies they had momentum before (simple proxy)
    },
    {
      id: "comeback_3",
      reason: "comeback",
      when: ({ stats, unlocks }) =>
        !has(unlocks, "comeback_3") &&
        stats.workoutsStreakDays >= 3 &&
        has(unlocks, "comeback_1"),
    },

    // ─────────────────────────────
    // Workouts all-time milestones
    // ─────────────────────────────
    {
      id: "workout_1",
      reason: "workouts_total",
      when: ({ stats }) => stats.totalWorkoutsAllTime >= 1,
    },
    {
      id: "workout_3",
      reason: "workouts_total",
      when: ({ stats }) => stats.totalWorkoutsAllTime >= 3,
    },
    {
      id: "workout_10",
      reason: "workouts_total",
      when: ({ stats }) => stats.totalWorkoutsAllTime >= 10,
    },
    {
      id: "workout_25",
      reason: "workouts_total",
      when: ({ stats }) => stats.totalWorkoutsAllTime >= 25,
    },
    {
      id: "workout_50",
      reason: "workouts_total",
      when: ({ stats }) => stats.totalWorkoutsAllTime >= 50,
    },
    {
      id: "workout_100",
      reason: "workouts_total",
      when: ({ stats }) => stats.totalWorkoutsAllTime >= 100,
    },

    // ─────────────────────────────
    // Workout streak (dedicated)
    // ─────────────────────────────
    {
      id: "wkstreak_3",
      reason: "workout_streak",
      when: ({ stats }) => stats.workoutsStreakDays >= 3,
    },
    {
      id: "wkstreak_7",
      reason: "workout_streak",
      when: ({ stats }) => stats.workoutsStreakDays >= 7,
    },
    {
      id: "wkstreak_14",
      reason: "workout_streak",
      when: ({ stats }) => stats.workoutsStreakDays >= 14,
    },

    // ─────────────────────────────
    // Weekly workout frequency
    // ─────────────────────────────
    {
      id: "wk_1",
      reason: "week_workouts",
      when: ({ stats }) => stats.workoutsThisWeek >= 1,
    },
    {
      id: "wk_2",
      reason: "week_workouts",
      when: ({ stats }) => stats.workoutsThisWeek >= 2,
    },
    {
      id: "wk_3",
      reason: "week_workouts",
      when: ({ stats }) => stats.workoutsThisWeek >= 3,
    },
    {
      id: "wk_4",
      reason: "week_workouts",
      when: ({ stats }) => stats.workoutsThisWeek >= 4,
    },
    {
      id: "wk_6",
      reason: "week_workouts",
      when: ({ stats }) => stats.workoutsThisWeek >= 6,
    },

    // ─────────────────────────────
    // Steps
    // ─────────────────────────────
    {
      id: "steps_any",
      reason: "steps",
      when: ({ stats }) => stats.stepsToday > 0,
    },
    {
      id: "steps_5k",
      reason: "steps",
      when: ({ stats }) => stats.stepsToday >= 5000,
    },
    {
      id: "steps_10k",
      reason: "steps",
      when: ({ stats }) => stats.stepsToday >= 10000,
    },
    {
      id: "steps_12k",
      reason: "steps",
      when: ({ stats }) => stats.stepsToday >= 12000,
    },
    {
      id: "steps_15k",
      reason: "steps",
      when: ({ stats }) => stats.stepsToday >= 15000,
    },
    {
      id: "steps_10k_3w",
      reason: "steps_week",
      when: ({ stats }) => stats.stepsDays10kThisWeek >= 3,
    },
    {
      id: "steps_10k_7w",
      reason: "steps_week",
      when: ({ stats }) => stats.stepsDays10kThisWeek >= 7,
    },

    // ─────────────────────────────
    // Meals (logging)
    // ─────────────────────────────
    {
      id: "meal_1",
      reason: "meals_total",
      when: ({ stats }) => stats.totalMealsAllTime >= 1,
    },
    {
      id: "meal_10",
      reason: "meals_total",
      when: ({ stats }) => stats.totalMealsAllTime >= 10,
    },
    {
      id: "meal_25",
      reason: "meals_total",
      when: ({ stats }) => stats.totalMealsAllTime >= 25,
    },
    {
      id: "meal_50",
      reason: "meals_total",
      when: ({ stats }) => stats.totalMealsAllTime >= 50,
    },
    {
      id: "meal_75",
      reason: "meals_total",
      when: ({ stats }) => stats.totalMealsAllTime >= 75,
    },
    {
      id: "meal_150",
      reason: "meals_total",
      when: ({ stats }) => stats.totalMealsAllTime >= 150,
    },
    {
      id: "meal_300",
      reason: "meals_total",
      when: ({ stats }) => stats.totalMealsAllTime >= 300,
    },

    // ─────────────────────────────
    // Weekly nutrition quality “wins”
    // ─────────────────────────────
    {
      id: "protein_3w",
      reason: "protein_week",
      when: ({ stats }) => stats.proteinDaysThisWeek >= 3,
    },
    {
      id: "protein_5w",
      reason: "protein_week",
      when: ({ stats }) => stats.proteinDaysThisWeek >= 5,
    },
    {
      id: "protein_7w",
      reason: "protein_week",
      when: ({ stats }) => stats.proteinDaysThisWeek >= 7,
    },

    {
      id: "fiber_3w",
      reason: "fiber_week",
      when: ({ stats }) => stats.fiberDaysThisWeek >= 3,
    },
    {
      id: "fiber_5w",
      reason: "fiber_week",
      when: ({ stats }) => stats.fiberDaysThisWeek >= 5,
    },
    {
      id: "fiber_7w",
      reason: "fiber_week",
      when: ({ stats }) => stats.fiberDaysThisWeek >= 7,
    },

    // ─────────────────────────────
    // Micro-reward event-only badges
    // (tiny wins users feel immediately)
    // ─────────────────────────────
    {
      id: "quick_session_finish",
      reason: "event_micro",
      when: ({ event }) =>
        event.type === "WORKOUT_LOGGED" &&
        typeof event.payload?.totalSets === "number" &&
        event.payload.totalSets >= 12,
    },
    {
      id: "protein_strike",
      reason: "event_micro",
      when: ({ event }) =>
        event.type === "MEAL_LOGGED" &&
        typeof event.payload?.proteinG === "number" &&
        event.payload.proteinG >= 40,
    },
    {
      id: "steps_boost",
      reason: "event_micro",
      when: ({ event }) =>
        event.type === "STEPS_SET" &&
        typeof event.payload?.steps === "number" &&
        event.payload.steps >= 2000,
    },
  ];
}
