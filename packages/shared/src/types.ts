export type FoodEntry = {
  id?: string;
  date: string;
  meal: "breakfast" | "lunch" | "dinner" | "snacks";
  name: string;
  qty: number;
  unit: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  source?: "manual" | "ai";
  createdAt?: number;
};
export type Muscle = {
  id: string; // "lats"
  label: string; // "Latissimus Dorsi"
  aliases: string[]; // ["lats"]
};

export type Equipment = {
  id: string; // "barbell"
  label: string; // "Barbell"
  aliases: string[];
};

export type Exercise = {
  id: string; // stable slug, e.g. "barbell-bent-over-row"
  name: string; // "Barbell Bent-Over Row"
  instructions: string[]; // split into steps
  primaryMuscles: string[]; // ["lats","middle-back","biceps"]
  secondaryMuscles: string[];
  equipment: string[]; // ["barbell"]
  mechanics?: "compound" | "isolation" | null;
  force?: "push" | "pull" | null;
  stabilization?: string[]; // optional
  level?: "beginner" | "intermediate" | "advanced" | null;
  images?: { small?: string; large?: string; gif?: string } | null; // your Cloud Storage URLs
  sources: {
    // provenance for licensing/debug
    wgerId?: number;
    exerciseDbId?: string;
  };
  lang: "en"; // store EN only at first
  updatedAt: number; // epoch ms
};
