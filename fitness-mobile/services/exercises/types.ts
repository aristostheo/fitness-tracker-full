// services/exercises/types.ts

export type MuscleGroup = string; // your DB uses slugified strings (e.g. "chest", "lats", "quadriceps")
export type Equipment = string; // slugified (e.g. "barbell", "cable-machine")

export type ExerciseImages = {
  gif?: string; // signed URL from Storage (enrich-media.ts)
  thumb?: string;
} | null;

export type ExerciseDoc = {
  id: string;
  name: string;

  instructions?: string[];
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  equipment?: Equipment[];

  // Optional future fields (safe to exist or not)
  level?: "beginner" | "intermediate" | "advanced" | null;
  category?: "strength" | "cardio" | "mobility" | null;

  images?: ExerciseImages;
  sources?: Record<string, any> | null;

  updatedAt?: number;
  lang?: string;
};

export type ExerciseFilters = {
  muscle?: MuscleGroup | "all";
  equipment?: Equipment | "all";
  hasDemo?: boolean; // gif exists
};
