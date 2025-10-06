// utils/macros.ts
export type ComputeBase = {
  sex: "male" | "female";
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "athlete";
  goal: "cut" | "maintain" | "bulk";
};

type ProteinPerKgMode = { mode: "proteinPerKg"; proteinPerKg: number };
type PercentMode = {
  mode: "percent";
  proteinPct: number;
  carbPct: number;
  fatPct: number;
};

export function computeTargets(
  base: ComputeBase,
  cfg: ProteinPerKgMode | PercentMode
) {
  const { sex, weightKg, heightCm, age, activityLevel, goal } = base;

  // Mifflin–St Jeor BMR
  const bmr =
    sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const activityFactor = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9,
  }[activityLevel];

  const goalFactor = { cut: 0.85, maintain: 1.0, bulk: 1.1 }[goal];

  const calories = Math.max(0, Math.round(bmr * activityFactor * goalFactor));

  if (cfg.mode === "percent") {
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const p = clamp01(cfg.proteinPct);
    const c = clamp01(cfg.carbPct);
    const f = clamp01(cfg.fatPct);
    const norm = p + c + f || 1;
    const P = p / norm,
      C = c / norm,
      F = f / norm;

    const proteinGoal = Math.round((calories * P) / 4);
    const carbGoal = Math.round((calories * C) / 4);
    const fatGoal = Math.round((calories * F) / 9);
    return { calorieGoal: calories, proteinGoal, carbGoal, fatGoal };
  }

  // proteinPerKg mode
  const proteinGoal = Math.round((cfg.proteinPerKg || 0) * weightKg);
  const kcalAfterProtein = Math.max(0, calories - proteinGoal * 4);
  // simple split of remainder: 55% carbs, 45% fat (sane default)
  const carbGoal = Math.round((kcalAfterProtein * 0.55) / 4);
  const fatGoal = Math.round((kcalAfterProtein * 0.45) / 9);
  return { calorieGoal: calories, proteinGoal, carbGoal, fatGoal };
}
