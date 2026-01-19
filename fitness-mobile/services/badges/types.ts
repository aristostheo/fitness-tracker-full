// services/badges/types.ts

export type BadgeCategory =
  | "consistency"
  | "strength"
  | "nutrition"
  | "recovery"
  | "habits"
  | "milestones"
  | "premium";

export type BadgeRarity = "common" | "rare" | "epic";

export type BadgeDef = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  criteriaText: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  icon: string; // Ionicons glyph name
  accent: string; // hex
  canFeature?: boolean;
  hiddenUntilUnlocked?: boolean; // “invisible” badges
};

export type BadgeUnlockState = {
  unlockedAt: number; // ms
  // optional metadata (safe to extend)
  reason?: string; // short internal reason
  seen?: boolean;
};

export type BadgeProgressState = {
  // generic progress tracking per badge (safe to extend)
  value?: number; // e.g., count, streak, etc.
  updatedAt?: number;
};

export type BadgeStatsSnapshot = {
  // Keys
  todayKey: string; // YYYY-MM-DD
  weekKey: string; // e.g. 2025-W01 or YYYY-MM-DD fallback
  // Workouts
  totalWorkoutsAllTime: number;
  workoutsThisWeek: number;
  workoutsStreakDays: number;

  // Nutrition
  totalMealsAllTime: number;
  mealsLoggedThisWeek: number;
  proteinDaysThisWeek: number;
  fiberDaysThisWeek: number;

  // Steps / Activity
  stepsToday: number;
  stepsDays10kThisWeek: number;
};

export type UnlockMap = Record<string, BadgeUnlockState>;
export type ProgressMap = Record<string, BadgeProgressState>;

/**
 * Event model: keep payloads strict and simple (matches your TS error union).
 * Add more event types later safely.
 */
export type BadgeEvent =
  | {
      type: "WORKOUT_LOGGED";
      timestamp: number;
      payload: {
        workoutId?: string;
        totalSets?: number;
        totalVolumeKg?: number;
      };
    }
  | {
      type: "MEAL_LOGGED";
      timestamp: number;
      payload: {
        calories?: number;
        proteinG?: number;
        fiberG?: number;
        sugarG?: number;
      };
    }
  | {
      type: "STEPS_SET";
      timestamp: number;
      payload: {
        steps?: number;
      };
    }
  | {
      // For retroactive awarding from a snapshot without needing a specific event
      type: "SNAPSHOT";
      timestamp: number;
      payload: {};
    };

export type EvaluateInput = {
  event: BadgeEvent;
  stats: BadgeStatsSnapshot;
  unlocks: UnlockMap;
  progress: ProgressMap;
};

export type EvaluateResult = {
  unlocks: UnlockMap;
  progress: ProgressMap;
  newlyUnlocked: string[]; // badge IDs
};
