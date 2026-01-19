// components/activity/activityTypes.ts

export type ActivityType =
  | "walk"
  | "run"
  | "bike"
  | "stairs"
  | "swim"
  | "sport"
  | "yoga"
  | "stretch"
  | "other";

export type ActivityIntensity = "easy" | "moderate" | "hard";

export type ActivityEntry = {
  id: string;
  type: ActivityType;
  minutes: number;
  intensity: ActivityIntensity;

  // optional / nice-to-have
  calories?: number;
  steps?: number;
  note?: string;

  // when it happened (defaults to "now" on create)
  timestamp: number;
};

export type ActivityGoal = {
  minutesPerDay?: number; // e.g. 30
};
