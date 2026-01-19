// services/macroGoalsEngineV2.ts
// Drop-in engine wrapper around your existing calculateGoalTargets.
// Adds: MSJ + (optional) Katch-McArdle + reconciliation + safety rails + explain/confidence.

import { calculateGoalTargets } from "@/services/goalsEngine";

export type GoalMode = "cut" | "maintain" | "lean_bulk" | "bulk";
export type Sex = "male" | "female";
export type JobActivity = "sedentary" | "light" | "active";

export type Targets = {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
};

export type MacroGoalsEngineInput = {
  sex?: Sex;
  age?: number;
  heightCm?: number;
  weightKg: number;

  // Optional: helps Katch–McArdle
  bodyFatPct?: number; // 5–60 sensible range

  // Activity
  stepsPerDay?: number;
  gymSessionsPerWeek?: number;
  sportSessionsPerWeek?: number;
  jobActivity?: JobActivity;

  // Goal
  mode: GoalMode;

  // Simple/Advanced tuning (0..1)
  goalIntensity?: number; // gentle -> assertive
  performanceFocus?: number; // fat loss -> performance (carb bias, training day support)
  proteinFocus?: number; // standard -> higher

  // Compatibility fallback
  maintenanceTargets?: Targets;

  // For confidence weighting
  trackingAccurate?: boolean;
};

export type MacroGoalsEngineOutput = Targets & {
  meta: {
    mode: GoalMode;
    confidence: number; // 0..1
    confidenceLabel: "Low" | "Medium" | "High";
    modelsUsed: Array<"legacy_engine" | "mifflin_st_jeor" | "katch_mcardle">;
    reconciliation: {
      method: "weighted_median_then_safety_clamp";
      weights: { legacy: number; msj: number; kma: number };
    };
    tdeeEstimate: number;
    pace: {
      weeklyKg: number; // negative for cut, positive for gain
      weeklyPctBodyweight: number;
    };
    safety: {
      clamped: boolean;
      reasons: string[];
    };
    explain: Array<{ title: string; value: string }>;
    debug?: Record<string, any>;
  };
};

/* ----------------------------- helpers ----------------------------- */

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function round(n: number) {
  return Math.round(n);
}
function safeNum(x: any, fallback: number) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function bmrMifflinStJeor(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number
) {
  // MSJ: men: 10W + 6.25H - 5A + 5 ; women: ... -161
  const s = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

function bmrKatchMcArdle(weightKg: number, bodyFatPct: number) {
  const bf = bodyFatPct / 100;
  const lbm = weightKg * (1 - bf);
  return 370 + 21.6 * lbm;
}

function baseActivityMultiplier(job: JobActivity) {
  // Conservative base multipliers
  if (job === "active") return 1.45;
  if (job === "light") return 1.3;
  return 1.2; // sedentary
}

function stepsKcalPerDay(steps: number, weightKg: number) {
  // Rough NEAT estimate: 0.035–0.06 kcal/step depending on size/pace; keep conservative
  const perStep = clamp(0.04 + (weightKg - 70) * 0.00015, 0.035, 0.06);
  return steps * perStep;
}

function sessionKcal(sessionCount: number, kind: "gym" | "sport") {
  // Conservative session calories (per session)
  // gym: moderate lifting 180–320; sport/cardio: 250–450
  const per = kind === "gym" ? 240 : 340;
  return sessionCount * per;
}

function deficitSurplusForMode(mode: GoalMode, goalIntensity01: number) {
  // Returns daily delta in kcal as a fraction of TDEE (negative for cut)
  // Keep safe ranges. Intensity moves within range.
  const t = clamp(goalIntensity01, 0, 1);

  if (mode === "maintain") return { min: -0.03, max: 0.03, pick: 0 };
  if (mode === "cut") {
    // ~10–22% deficit
    const min = -0.22;
    const max = -0.1;
    const pick = max + (min - max) * t; // gentle -> closer to -10%, assertive -> closer to -22%
    return { min, max, pick };
  }
  if (mode === "lean_bulk") {
    // ~5–10% surplus
    const min = 0.05;
    const max = 0.1;
    const pick = min + (max - min) * t;
    return { min, max, pick };
  }
  // bulk
  {
    // ~8–14% surplus
    const min = 0.08;
    const max = 0.14;
    const pick = min + (max - min) * t;
    return { min, max, pick };
  }
}

function proteinRangePerKg(mode: GoalMode) {
  // Evidence-based ranges: cut higher, bulk moderate
  if (mode === "cut") return { min: 1.8, max: 2.4 };
  if (mode === "maintain") return { min: 1.6, max: 2.2 };
  if (mode === "lean_bulk") return { min: 1.6, max: 2.1 };
  return { min: 1.5, max: 2.0 }; // bulk
}

function fatRangePerKg(mode: GoalMode) {
  // Keep fats adequate; avoid too low.
  if (mode === "cut") return { min: 0.6, max: 1.0 };
  if (mode === "maintain") return { min: 0.7, max: 1.1 };
  return { min: 0.7, max: 1.2 };
}

function caloriesFromMacros(p: number, c: number, f: number) {
  return p * 4 + c * 4 + f * 9;
}

function weightedMedian(values: number[], weights: number[]) {
  const paired = values
    .map((v, i) => ({ v, w: weights[i] }))
    .filter((x) => Number.isFinite(x.v) && x.w > 0)
    .sort((a, b) => a.v - b.v);

  const total = paired.reduce((s, x) => s + x.w, 0);
  if (total <= 0 || paired.length === 0) return values[0] ?? 0;

  let acc = 0;
  for (const p of paired) {
    acc += p.w;
    if (acc >= total / 2) return p.v;
  }
  return paired[paired.length - 1].v;
}

function confidenceScore(input: MacroGoalsEngineInput) {
  let score = 0.35;

  const sex = input.sex;
  const age = input.age;
  const height = input.heightCm;

  if (sex) score += 0.1;
  if (Number.isFinite(age)) score += 0.1;
  if (Number.isFinite(height)) score += 0.1;

  const steps = input.stepsPerDay;
  const gym = input.gymSessionsPerWeek;
  if (Number.isFinite(steps)) score += 0.12;
  if (Number.isFinite(gym)) score += 0.1;

  if (Number.isFinite(input.bodyFatPct)) score += 0.08;
  if (input.trackingAccurate) score += 0.08;

  return clamp(score, 0.15, 0.95);
}

function confidenceLabel(c: number): "Low" | "Medium" | "High" {
  if (c >= 0.75) return "High";
  if (c >= 0.5) return "Medium";
  return "Low";
}

/* ----------------------------- models ----------------------------- */

function modelLegacyEngine(
  input: Required<
    Pick<
      MacroGoalsEngineInput,
      | "sex"
      | "age"
      | "heightCm"
      | "weightKg"
      | "stepsPerDay"
      | "gymSessionsPerWeek"
      | "sportSessionsPerWeek"
      | "jobActivity"
      | "mode"
    >
  > & {
    goalIntensity: number;
    performanceFocus: number;
    proteinFocus: number;
  }
) {
  // Map your new “premium friendly” sliders back into the legacy engine controls.
  // Legacy expects: aggressiveness, trainingBias, proteinBias, metabolismAdaptation.
  const aggressiveness = clamp(input.goalIntensity, 0, 1);
  const trainingBias = clamp(0.35 + input.performanceFocus * 0.55, 0, 1);
  const proteinBias = clamp(0.35 + input.proteinFocus * 0.6, 0, 1);
  const metabolismAdaptation = input.mode === "cut" ? 0.35 : 0.2;

  const out = calculateGoalTargets({
    sex: input.sex,
    age: input.age,
    heightCm: input.heightCm,
    weightKg: Math.max(30, input.weightKg),

    stepsPerDay: Math.max(0, input.stepsPerDay),
    gymSessionsPerWeek: Math.max(0, input.gymSessionsPerWeek),
    sportSessionsPerWeek: Math.max(0, input.sportSessionsPerWeek),
    jobActivity: input.jobActivity,

    mode:
      input.mode === "lean_bulk" || input.mode === "bulk" ? "bulk" : input.mode, // legacy only had cut/maintain/bulk
    aggressiveness,
    trainingBias,
    proteinBias,
    metabolismAdaptation,

    minFatPerKg: 0.7,
    maxFatPerKg: 1.0,
  });

  return {
    calories: safeNum(out.calorieTarget, 0),
    proteinG: safeNum(out.proteinG, 0),
    carbsG: safeNum(out.carbsG, 0),
    fatG: safeNum(out.fatG, 0),
    tdee: safeNum(out.tdee, 0),
    bmr: safeNum(out.bmr, 0),
    debug: out.debug ?? {},
  };
}

function modelMSJ(input: {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  stepsPerDay: number;
  gymSessionsPerWeek: number;
  sportSessionsPerWeek: number;
  jobActivity: JobActivity;
  mode: GoalMode;
  goalIntensity: number;
  proteinFocus: number;
  performanceFocus: number;
}) {
  const bmr = bmrMifflinStJeor(
    input.sex,
    input.weightKg,
    input.heightCm,
    input.age
  );

  const base = bmr * baseActivityMultiplier(input.jobActivity);
  const neat = stepsKcalPerDay(input.stepsPerDay, input.weightKg);
  const ex =
    (sessionKcal(input.gymSessionsPerWeek, "gym") +
      sessionKcal(input.sportSessionsPerWeek, "sport")) /
    7;

  const tdee = Math.max(1200, base + neat * 0.45 + ex); // damp NEAT a bit to avoid overestimation

  const delta = deficitSurplusForMode(input.mode, input.goalIntensity).pick;
  const calories = tdee * (1 + delta);

  // Macros
  const pRange = proteinRangePerKg(input.mode);
  const pPerKg =
    pRange.min + (pRange.max - pRange.min) * clamp(input.proteinFocus, 0, 1);
  const proteinG = input.weightKg * pPerKg;

  const fRange = fatRangePerKg(input.mode);
  const fatG =
    input.weightKg *
    clamp(0.75 + 0.15 * (1 - input.performanceFocus), fRange.min, fRange.max);

  // Carbs fill remainder
  const remainingCals = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, remainingCals / 4);

  return {
    calories: round(calories),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
    tdee: round(tdee),
    bmr: round(bmr),
  };
}

function modelKMA(
  input: Parameters<typeof modelMSJ>[0] & { bodyFatPct: number }
) {
  const bmr = bmrKatchMcArdle(input.weightKg, input.bodyFatPct);

  const base = bmr * baseActivityMultiplier(input.jobActivity);
  const neat = stepsKcalPerDay(input.stepsPerDay, input.weightKg);
  const ex =
    (sessionKcal(input.gymSessionsPerWeek, "gym") +
      sessionKcal(input.sportSessionsPerWeek, "sport")) /
    7;

  const tdee = Math.max(1200, base + neat * 0.45 + ex);

  const delta = deficitSurplusForMode(input.mode, input.goalIntensity).pick;
  const calories = tdee * (1 + delta);

  // macros same strategy
  const pRange = proteinRangePerKg(input.mode);
  const pPerKg =
    pRange.min + (pRange.max - pRange.min) * clamp(input.proteinFocus, 0, 1);
  const proteinG = input.weightKg * pPerKg;

  const fRange = fatRangePerKg(input.mode);
  const fatG =
    input.weightKg *
    clamp(0.75 + 0.15 * (1 - input.performanceFocus), fRange.min, fRange.max);

  const remainingCals = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, remainingCals / 4);

  return {
    calories: round(calories),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
    tdee: round(tdee),
    bmr: round(bmr),
  };
}

/* ----------------------------- safety rails ----------------------------- */

function applySafetyRails(
  input: { mode: GoalMode; weightKg: number },
  tdee: number,
  targets: Targets
) {
  const reasons: string[] = [];
  let { calorieGoal, proteinGoal, carbGoal, fatGoal } = targets;

  // Minimum calorie floors (conservative)
  const minFloor = input.weightKg < 55 ? 1400 : 1600;
  if (calorieGoal < minFloor) {
    calorieGoal = minFloor;
    reasons.push("min_calorie_floor");
  }

  // Cap deficit/surplus vs tdee
  const delta = calorieGoal - tdee;
  const deltaPct = tdee > 0 ? delta / tdee : 0;

  if (input.mode === "cut") {
    // don’t exceed ~25% deficit
    if (deltaPct < -0.25) {
      calorieGoal = round(tdee * 0.75);
      reasons.push("max_deficit_cap");
    }
  } else if (input.mode === "lean_bulk") {
    // don’t exceed ~12% surplus
    if (deltaPct > 0.12) {
      calorieGoal = round(tdee * 1.12);
      reasons.push("max_surplus_cap");
    }
  } else if (input.mode === "bulk") {
    // don’t exceed ~16% surplus
    if (deltaPct > 0.16) {
      calorieGoal = round(tdee * 1.16);
      reasons.push("max_surplus_cap");
    }
  } else {
    // maintain clamp
    if (Math.abs(deltaPct) > 0.06) {
      calorieGoal = round(tdee);
      reasons.push("maintain_clamp");
    }
  }

  // Protein safety floor: at least 1.4 g/kg
  const minProtein = round(input.weightKg * 1.4);
  if (proteinGoal < minProtein) {
    proteinGoal = minProtein;
    reasons.push("protein_floor");
  }

  // Fat safety floor: at least 0.55 g/kg
  const minFat = round(input.weightKg * 0.55);
  if (fatGoal < minFat) {
    fatGoal = minFat;
    reasons.push("fat_floor");
  }

  // Recompute carbs to match calories (best effort)
  const remainingCals = calorieGoal - proteinGoal * 4 - fatGoal * 9;
  carbGoal = Math.max(0, round(remainingCals / 4));

  // If macros exceed calories (can happen), scale carbs down
  const total = caloriesFromMacros(proteinGoal, carbGoal, fatGoal);
  if (total > calorieGoal + 25) {
    const over = total - calorieGoal;
    const reduceC = round(over / 4);
    carbGoal = Math.max(0, carbGoal - reduceC);
    reasons.push("macro_rebalance");
  }

  return {
    targets: { calorieGoal, proteinGoal, carbGoal, fatGoal },
    reasons,
  };
}

/* ----------------------------- public API ----------------------------- */

export function computeMacroGoalsV2(
  inputRaw: MacroGoalsEngineInput
): MacroGoalsEngineOutput {
  const sex = (inputRaw.sex ?? "male") as Sex;
  const age = clamp(round(safeNum(inputRaw.age, 25)), 13, 90);
  const heightCm = clamp(round(safeNum(inputRaw.heightCm, 175)), 120, 230);

  const weightKg = clamp(safeNum(inputRaw.weightKg, 75), 30, 250);

  const stepsPerDay = clamp(
    round(safeNum(inputRaw.stepsPerDay, 7000)),
    0,
    30000
  );
  const gymSessionsPerWeek = clamp(
    round(safeNum(inputRaw.gymSessionsPerWeek, 4)),
    0,
    14
  );
  const sportSessionsPerWeek = clamp(
    round(safeNum(inputRaw.sportSessionsPerWeek, 0)),
    0,
    14
  );
  const jobActivity = (inputRaw.jobActivity ?? "light") as JobActivity;

  const mode = inputRaw.mode;

  const goalIntensity = clamp(safeNum(inputRaw.goalIntensity, 0.35), 0, 1);
  const performanceFocus = clamp(
    safeNum(inputRaw.performanceFocus, 0.55),
    0,
    1
  );
  const proteinFocus = clamp(safeNum(inputRaw.proteinFocus, 0.6), 0, 1);

  const maintenanceTargets = inputRaw.maintenanceTargets;

  // A) legacy engine (kept)
  const legacy = modelLegacyEngine({
    sex,
    age,
    heightCm,
    weightKg,
    stepsPerDay,
    gymSessionsPerWeek,
    sportSessionsPerWeek,
    jobActivity,
    mode,
    goalIntensity,
    performanceFocus,
    proteinFocus,
  });

  // B) MSJ
  const msj = modelMSJ({
    sex,
    age,
    heightCm,
    weightKg,
    stepsPerDay,
    gymSessionsPerWeek,
    sportSessionsPerWeek,
    jobActivity,
    mode,
    goalIntensity,
    performanceFocus,
    proteinFocus,
  });

  // C) KMA (optional)
  const bf = safeNum(inputRaw.bodyFatPct, NaN);
  const bfOk = Number.isFinite(bf) && bf >= 5 && bf <= 60;
  const kma = bfOk
    ? modelKMA({
        sex,
        age,
        heightCm,
        weightKg,
        stepsPerDay,
        gymSessionsPerWeek,
        sportSessionsPerWeek,
        jobActivity,
        mode,
        goalIntensity,
        performanceFocus,
        proteinFocus,
        bodyFatPct: bf,
      })
    : null;

  // weights
  const conf = confidenceScore(inputRaw);

  let wLegacy = 0.45;
  let wMsj = 0.35;
  let wKma = bfOk ? 0.2 : 0.0;

  // If missing key body inputs (defaults likely), lean more on maintenanceTargets and legacy.
  const missingCore =
    !inputRaw.sex ||
    !Number.isFinite(inputRaw.age) ||
    !Number.isFinite(inputRaw.heightCm);

  if (missingCore) {
    wLegacy += 0.1;
    wMsj -= 0.05;
    wKma -= 0.05;
  }

  // If steps/training unknown, damp MSJ/KMA a bit
  const missingActivity =
    !Number.isFinite(inputRaw.stepsPerDay) ||
    !Number.isFinite(inputRaw.gymSessionsPerWeek);
  if (missingActivity) {
    wLegacy += 0.08;
    wMsj -= 0.08;
  }

  // Normalize
  const sum = Math.max(0.0001, wLegacy + wMsj + wKma);
  wLegacy /= sum;
  wMsj /= sum;
  wKma /= sum;

  const calCandidates = [legacy.calories, msj.calories, kma?.calories ?? NaN];
  const wCandidates = [wLegacy, wMsj, wKma];

  // Robust center: weighted median
  let reconciledCalories = weightedMedian(
    calCandidates.filter((x) => Number.isFinite(x)),
    wCandidates.filter((_, i) => Number.isFinite(calCandidates[i]))
  );

  // If reconciliation fails or too low, fallback to maintenanceTargets if available
  if (!Number.isFinite(reconciledCalories) || reconciledCalories <= 0) {
    reconciledCalories =
      maintenanceTargets?.calorieGoal ??
      legacy.calories ??
      msj.calories ??
      2200;
  }

  // Pick TDEE estimate similarly (use available)
  const tdeeCandidates = [legacy.tdee, msj.tdee, kma?.tdee ?? NaN];
  const tdee =
    weightedMedian(
      tdeeCandidates.filter((x) => Number.isFinite(x)),
      wCandidates.filter((_, i) => Number.isFinite(tdeeCandidates[i]))
    ) ||
    (maintenanceTargets?.calorieGoal ?? 2400);

  // Macros from reconciled calories with a consistent macro strategy
  const pRange = proteinRangePerKg(mode);
  const pPerKg = pRange.min + (pRange.max - pRange.min) * proteinFocus;
  let proteinGoal = round(weightKg * pPerKg);

  const fRange = fatRangePerKg(mode);
  let fatGoal = round(
    weightKg *
      clamp(0.75 + 0.15 * (1 - performanceFocus), fRange.min, fRange.max)
  );

  let carbGoal = Math.max(
    0,
    round((reconciledCalories - proteinGoal * 4 - fatGoal * 9) / 4)
  );

  // Safety rails
  const safety = applySafetyRails({ mode, weightKg }, tdee, {
    calorieGoal: round(reconciledCalories),
    proteinGoal,
    carbGoal,
    fatGoal,
  });

  const finalTargets = safety.targets;

  // pace estimate (kg/week) using 7700 kcal per kg heuristic
  const dailyDelta = finalTargets.calorieGoal - tdee;
  const weeklyKg = (dailyDelta * 7) / 7700;
  const weeklyPct = weightKg > 0 ? (Math.abs(weeklyKg) / weightKg) * 100 : 0;

  const used: Array<"legacy_engine" | "mifflin_st_jeor" | "katch_mcardle"> = [
    "legacy_engine",
    "mifflin_st_jeor",
  ];
  if (bfOk) used.push("katch_mcardle");

  const explain: Array<{ title: string; value: string }> = [
    { title: "Your baseline burn", value: `TDEE ~${round(tdee)} kcal/day` },
    {
      title: "Goal adjustment",
      value:
        mode === "cut"
          ? `${round(dailyDelta)} kcal/day (deficit)`
          : mode === "maintain"
          ? `${round(dailyDelta)} kcal/day (near maintenance)`
          : `${round(dailyDelta)} kcal/day (surplus)`,
    },
    {
      title: "Macros",
      value: `Protein prioritized · fats clamped · carbs fill remainder`,
    },
  ];

  if (safety.reasons.length) {
    explain.push({
      title: "Safety adjustments",
      value: `Applied: ${safety.reasons.join(", ")}`,
    });
  }

  return {
    ...finalTargets,
    meta: {
      mode,
      confidence: conf,
      confidenceLabel: confidenceLabel(conf),
      modelsUsed: used,
      reconciliation: {
        method: "weighted_median_then_safety_clamp",
        weights: { legacy: wLegacy, msj: wMsj, kma: wKma },
      },
      tdeeEstimate: round(tdee),
      pace: {
        weeklyKg: round(weeklyKg * 100) / 100,
        weeklyPctBodyweight: round(weeklyPct * 100) / 100,
      },
      safety: {
        clamped: safety.reasons.length > 0,
        reasons: safety.reasons,
      },
      explain,
      debug: {
        legacy,
        msj,
        kma,
        inputs: {
          sex,
          age,
          heightCm,
          weightKg,
          stepsPerDay,
          gymSessionsPerWeek,
          sportSessionsPerWeek,
          jobActivity,
          goalIntensity,
          performanceFocus,
          proteinFocus,
          bodyFatPct: bfOk ? bf : null,
        },
      },
    },
  };
}
