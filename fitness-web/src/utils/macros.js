// src/utils/macros.js

// Safe numbers
const N = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Mifflin–St Jeor BMR
export function calculateBMR({
  sex = "male",
  weightKg = 75,
  heightCm = 175,
  age = 25,
}) {
  const w = N(weightKg, 75);
  const h = N(heightCm, 175);
  const a = N(age, 25);
  if ((sex || "male").toLowerCase() === "female") {
    return 10 * w + 6.25 * h - 5 * a - 161;
  }
  return 10 * w + 6.25 * h - 5 * a + 5;
}

export function activityMultiplier(level = "moderate") {
  const map = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9,
  };
  return map[(level || "moderate").toLowerCase()] ?? 1.55;
}

export function goalMultiplier(goal = "maintain") {
  const g = (goal || "maintain").toLowerCase();
  if (g === "cut") return 0.85; // ~15% deficit
  if (g === "bulk") return 1.1; // ~10% surplus
  return 1.0; // maintain
}

/**
 * Compute targets.
 * mode: "proteinPerKg" (default) or "percent"
 * - proteinPerKg: protein = proteinPerKg * weightKg; remaining split 50/50 for C/F
 * - percent: proteinPct, carbPct, fatPct (sum ~ 1.0)
 */
export function computeTargets(profile, opts = {}) {
  const {
    sex = "male",
    weightKg = 75,
    heightCm = 175,
    age = 25,
    activityLevel = "moderate",
    goal = "maintain",
  } = profile || {};

  const bmr = calculateBMR({ sex, weightKg, heightCm, age });
  const tdee = bmr * activityMultiplier(activityLevel);
  const calorieGoal = Math.round(tdee * goalMultiplier(goal));

  const mode = opts.mode || "proteinPerKg";

  if (mode === "percent") {
    const p = Math.max(0, Math.min(1, N(opts.proteinPct, 0.3)));
    const c = Math.max(0, Math.min(1, N(opts.carbPct, 0.4)));
    let f = Math.max(0, Math.min(1, N(opts.fatPct, 0.3)));
    const sum = p + c + f || 1;
    // normalize to sum 1
    const P = p / sum,
      C = c / sum,
      F = f / sum;

    return {
      calorieGoal,
      proteinGoal: Math.round((calorieGoal * P) / 4),
      carbGoal: Math.round((calorieGoal * C) / 4),
      fatGoal: Math.round((calorieGoal * F) / 9),
    };
  }

  // proteinPerKg mode
  const proteinPerKg = Math.max(0, N(opts.proteinPerKg, 1.8));
  const proteinGoal = Math.round(proteinPerKg * N(weightKg, 75));
  const proteinCals = proteinGoal * 4;
  const remaining = Math.max(0, calorieGoal - proteinCals);
  return {
    calorieGoal,
    proteinGoal,
    carbGoal: Math.round((remaining * 0.5) / 4),
    fatGoal: Math.round((remaining * 0.5) / 9),
  };
}
