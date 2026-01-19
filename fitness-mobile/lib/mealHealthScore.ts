// lib/mealHealthScore.ts
// Advanced Meal Health Score (1–100)
// Macro-first, upgraded by optional quality signals.
// Includes confidence so you can visually indicate "estimate" vs "high certainty".

export type MealHealthInput = {
  // Required (your app always has these)
  calories: number; // kcal
  proteinG: number;
  carbsG: number;
  fatG: number;

  // Optional but strongly recommended
  fiberG?: number; // g
  sugarG?: number; // g (if you have added sugar separately, pass addedSugarG instead)
  addedSugarG?: number; // g
  satFatG?: number; // g
  sodiumMg?: number; // mg

  // Optional “quality” levers (0..1 or discrete)
  // If you don’t have these, you can still use the algorithm (confidence drops).
  wholeFoodRatio?: number; // 0..1 (higher = less processed)
  veggieFruitServings?: number; // 0..6+ (bonus)
  unsatFatRatio?: number; // 0..1 (unsaturated fat / total fat)
  alcoholCalories?: number; // kcal from alcohol (penalty)
};

export type MealHealthContext = {
  // Optional personalization knobs
  dailyCaloriesTarget?: number; // user daily target
  mealsPerDay?: number; // default 3
  goal?: "cut" | "maintain" | "bulk";

  // If you track sodium/fiber targets in profile you can pass them
  dailyFiberTargetG?: number; // default 28
  dailySodiumLimitMg?: number; // default 2300

  // user preferences
  proteinBias?: number; // 0..1, default 0.5 (how much to prioritize protein)
  carbQualityBias?: number; // 0..1, default 0.5
  processingBias?: number; // 0..1, default 0.5
};

export type MealHealthResult = {
  score: number; // 1..100
  confidence: number; // 0..1
  tier: "Excellent" | "Good" | "Okay" | "Poor";
  colorKey: "green" | "mint" | "amber" | "red";
  breakdown: {
    protein: number;
    fiber: number;
    sugar: number;
    satFat: number;
    sodium: number;
    calorieFit: number;
    carbQuality: number;
    processing: number;
    plants: number;
    alcohol: number;
  };
  debug?: {
    proteinPer100kcal: number;
    fiberPer100kcal: number;
    addedSugarPer100kcal: number;
    satFatPer100kcal: number;
    sodiumPer100kcal: number;
    mealTargetCalories: number;
    missingKeys: string[];
  };
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

// Smoothstep-ish mapping for nicer curves
function smooth01(x: number) {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function safeDiv(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

function pointsFromRange(
  value: number,
  minGood: number,
  maxGood: number,
  maxPoints: number
) {
  // Returns 0..maxPoints: full points when value is within [minGood,maxGood]
  // and decays smoothly outside.
  if (value >= minGood && value <= maxGood) return maxPoints;

  // Below range: ramp from 0 at 0 to full at minGood
  if (value < minGood) {
    const t = safeDiv(value, minGood);
    return maxPoints * smooth01(t);
  }

  // Above range: decay from full at maxGood to 0 at 2*maxGood
  const t = safeDiv(value - maxGood, maxGood);
  return maxPoints * (1 - smooth01(clamp(t, 0, 1)));
}

function penaltyFromThreshold(
  value: number,
  threshold: number,
  hard: number,
  maxPenalty: number
) {
  // 0 penalty below threshold
  // grows to maxPenalty by "hard"
  if (value <= threshold) return 0;
  const t = safeDiv(value - threshold, hard - threshold);
  return maxPenalty * smooth01(clamp(t, 0, 1));
}

export function computeMealHealthScore(
  input: MealHealthInput,
  ctx: MealHealthContext = {}
): MealHealthResult {
  const calories = Math.max(0, input.calories || 0);
  const proteinG = Math.max(0, input.proteinG || 0);
  const carbsG = Math.max(0, input.carbsG || 0);
  const fatG = Math.max(0, input.fatG || 0);

  const fiberG = input.fiberG;
  const sugarG = input.addedSugarG ?? input.sugarG;
  const satFatG = input.satFatG;
  const sodiumMg = input.sodiumMg;

  const mealsPerDay = ctx.mealsPerDay ?? 3;
  const dailyCaloriesTarget = ctx.dailyCaloriesTarget;
  const goal = ctx.goal ?? "maintain";

  const dailyFiberTargetG = ctx.dailyFiberTargetG ?? 28;
  const dailySodiumLimitMg = ctx.dailySodiumLimitMg ?? 2300;

  const proteinBias = clamp(ctx.proteinBias ?? 0.55, 0, 1);
  const carbQualityBias = clamp(ctx.carbQualityBias ?? 0.5, 0, 1);
  const processingBias = clamp(ctx.processingBias ?? 0.5, 0, 1);

  // Meal target calories: personalized if possible
  let mealTargetCalories = 600;
  if (dailyCaloriesTarget && dailyCaloriesTarget > 800) {
    mealTargetCalories = dailyCaloriesTarget / mealsPerDay;
    // Goal nudges: cutting → slightly smaller meal target, bulking → slightly larger
    if (goal === "cut") mealTargetCalories *= 0.92;
    if (goal === "bulk") mealTargetCalories *= 1.08;
  }

  // Normalize per 100kcal so meal size doesn’t dominate quality
  const per100 = calories > 0 ? 100 / calories : 0;

  const proteinPer100kcal = proteinG * per100; // g / 100 kcal
  const fiberPer100kcal = (fiberG ?? 0) * per100;
  const addedSugarPer100kcal = (sugarG ?? 0) * per100;
  const satFatPer100kcal = (satFatG ?? 0) * per100;
  const sodiumPer100kcal = (sodiumMg ?? 0) * per100; // mg / 100 kcal

  // Macro ratios (calorie-based)
  const pCal = proteinG * 4;
  const cCal = carbsG * 4;
  const fCal = fatG * 9;
  const totalMacroCal = pCal + cCal + fCal;
  const pPct = totalMacroCal > 0 ? pCal / totalMacroCal : 0;
  const fPct = totalMacroCal > 0 ? fCal / totalMacroCal : 0;

  // ---- Subscores / penalties (weights sum roughly to 100) ----
  // Protein quality:
  // Target range ~ 2.0–4.0g protein / 100kcal (higher is generally better for satiety)
  const proteinMax = lerp(18, 26, proteinBias); // 18..26 pts
  const proteinPts = pointsFromRange(proteinPer100kcal, 2.0, 4.2, proteinMax);

  // Fiber (big predictor of healthfulness)
  // Target ~ 1.4g/100kcal (28g/2000kcal); good range 1.0–2.4
  const fiberMax = 18; // pts
  const fiberPts =
    fiberG == null
      ? fiberMax * 0.45 // partial credit if unknown (prevents harsh penalty)
      : pointsFromRange(fiberPer100kcal, 1.0, 2.6, fiberMax);

  // Added sugar penalty (if unknown, minimal penalty but lower confidence)
  // Threshold: 1.5g/100kcal; hard: 4g/100kcal
  const sugarMaxPenalty = 16;
  const sugarPenalty =
    sugarG == null
      ? sugarMaxPenalty * 0.25
      : penaltyFromThreshold(addedSugarPer100kcal, 1.5, 4.0, sugarMaxPenalty);

  // Sat fat penalty (threshold 1.2g/100kcal, hard 2.2g/100kcal)
  const satFatMaxPenalty = 12;
  const satFatPenalty =
    satFatG == null
      ? satFatMaxPenalty * 0.25
      : penaltyFromThreshold(satFatPer100kcal, 1.2, 2.2, satFatMaxPenalty);

  // Sodium penalty (threshold 120mg/100kcal, hard 240mg/100kcal)
  const sodiumMaxPenalty = 12;
  const sodiumPenalty =
    sodiumMg == null
      ? sodiumMaxPenalty * 0.2
      : penaltyFromThreshold(sodiumPer100kcal, 120, 240, sodiumMaxPenalty);

  // Calorie fit: centered near mealTarget; punishes very small/very large
  // Full points if within ±20%; fades by ±70%
  const calorieFitMax = 12;
  const ratio = mealTargetCalories > 0 ? calories / mealTargetCalories : 1;
  const dist = Math.abs(Math.log(ratio)); // symmetric (0 is best)
  const distGood = Math.abs(Math.log(1.2));
  const distHard = Math.abs(Math.log(1.7));
  const calorieFitPts =
    calorieFitMax * (1 - smooth01(clamp((dist - 0) / (distHard - 0), 0, 1)));
  // Slightly soften penalty for low-cal meals (snacks) so they aren't automatically "bad"
  const snackSoftener = ratio < 0.65 ? 0.75 + 0.25 * smooth01(ratio / 0.65) : 1;
  const calorieFitPtsAdj = clamp(
    calorieFitPts * snackSoftener,
    0,
    calorieFitMax
  );

  // Carb quality: favor higher fiber share + avoid extreme low-fiber high-carb meals
  // We can’t know GI, so we use fiber density + carb pct heuristics.
  const carbQualityMax = lerp(8, 14, carbQualityBias); // 8..14 pts
  const fiberSignal =
    fiberG == null ? 0.45 : clamp(fiberPer100kcal / 1.4, 0, 1.4);
  const carbPctPenalty = clamp(
    (pPct < 0.18 ? 0.15 : 0) + (fPct > 0.55 ? 0.1 : 0),
    0,
    0.3
  );
  const carbQualityPts = clamp(
    carbQualityMax * smooth01(clamp(fiberSignal - carbPctPenalty, 0, 1)),
    0,
    carbQualityMax
  );

  // Processing score (wholeFoodRatio)
  const processingMax = lerp(8, 14, processingBias); // 8..14 pts
  const wholeFoodRatio =
    input.wholeFoodRatio == null ? 0.55 : clamp(input.wholeFoodRatio, 0, 1);
  const processingPts = processingMax * smooth01(wholeFoodRatio);

  // Plants bonus (veggie/fruit servings)
  const plantsMax = 10;
  const vfs =
    input.veggieFruitServings == null
      ? 0
      : Math.max(0, input.veggieFruitServings);
  const plantsPts = plantsMax * smooth01(clamp(vfs / 3, 0, 1)); // 0..3 servings gets most of the bonus

  // Unsat fat bonus (small but meaningful)
  const fatQualityBonusMax = 4;
  const unsatRatio =
    input.unsatFatRatio == null ? 0.5 : clamp(input.unsatFatRatio, 0, 1);
  const fatQualityBonus = fatQualityBonusMax * smooth01(unsatRatio);

  // Alcohol penalty
  const alcoholMaxPenalty = 10;
  const alcoholCalories = Math.max(0, input.alcoholCalories ?? 0);
  const alcoholPenalty =
    alcoholCalories <= 0
      ? 0
      : penaltyFromThreshold(alcoholCalories, 60, 180, alcoholMaxPenalty);

  // ---- Score composition ----
  // Start from a stable base so missing fields don't create chaos
  let score =
    24 + // base floor
    proteinPts +
    fiberPts +
    calorieFitPtsAdj +
    carbQualityPts +
    processingPts +
    plantsPts +
    fatQualityBonus -
    sugarPenalty -
    satFatPenalty -
    sodiumPenalty -
    alcoholPenalty;

  score = clamp(Math.round(score), 1, 100);

  // ---- Confidence ----
  const missing: string[] = [];
  if (fiberG == null) missing.push("fiberG");
  if (sugarG == null) missing.push("sugarG/addedSugarG");
  if (satFatG == null) missing.push("satFatG");
  if (sodiumMg == null) missing.push("sodiumMg");
  if (input.wholeFoodRatio == null) missing.push("wholeFoodRatio");
  if (input.veggieFruitServings == null) missing.push("veggieFruitServings");
  if (input.unsatFatRatio == null) missing.push("unsatFatRatio");

  // Confidence: macros-only is decent, full nutrition facts is excellent
  const baseConf = 0.62;
  const perMissing = 0.055;
  const confidence = clamp(
    baseConf + (7 - missing.length) * perMissing,
    0.55,
    0.97
  );

  // Tier + color
  let tier: MealHealthResult["tier"] = "Okay";
  let colorKey: MealHealthResult["colorKey"] = "amber";
  if (score >= 85) {
    tier = "Excellent";
    colorKey = "green";
  } else if (score >= 70) {
    tier = "Good";
    colorKey = "mint";
  } else if (score >= 50) {
    tier = "Okay";
    colorKey = "amber";
  } else {
    tier = "Poor";
    colorKey = "red";
  }

  return {
    score,
    confidence,
    tier,
    colorKey,
    breakdown: {
      protein: Math.round(proteinPts),
      fiber: Math.round(fiberPts),
      sugar: -Math.round(sugarPenalty),
      satFat: -Math.round(satFatPenalty),
      sodium: -Math.round(sodiumPenalty),
      calorieFit: Math.round(calorieFitPtsAdj),
      carbQuality: Math.round(carbQualityPts),
      processing: Math.round(processingPts),
      plants: Math.round(plantsPts),
      alcohol: -Math.round(alcoholPenalty),
    },
    debug: {
      proteinPer100kcal: +proteinPer100kcal.toFixed(2),
      fiberPer100kcal: +fiberPer100kcal.toFixed(2),
      addedSugarPer100kcal: +addedSugarPer100kcal.toFixed(2),
      satFatPer100kcal: +satFatPer100kcal.toFixed(2),
      sodiumPer100kcal: +sodiumPer100kcal.toFixed(0),
      mealTargetCalories: Math.round(mealTargetCalories),
      missingKeys: missing,
    },
  };
}
