// services/bodyTwin/shape.ts
import type { BodyMetrics, ShapeParams, FutureSelfTarget } from "./types";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function norm(v: number, min: number, max: number) {
  if (max === min) return 0.5;
  return clamp01((v - min) / (max - min));
}

/**
 * Convert metrics into normalized shape parameters.
 * Important:
 * - This is an *illustrative* avatar. It should not claim body accuracy.
 * - Use gentle ranges; avoid extreme distortions.
 */
export function metricsToShape(
  metrics?: BodyMetrics,
  fallbackHeightCm = 178
): ShapeParams {
  const m = metrics;

  // Confidence: how many useful fields exist?
  const fields: (keyof BodyMetrics)[] = [
    "weightKg",
    "bodyFatPct",
    "waistCm",
    "hipsCm",
    "chestCm",
    "shoulderCm",
    "armCm",
    "thighCm",
  ];
  const present = fields.filter((k) => typeof m?.[k] === "number").length;
  const confidence = clamp01(present / fields.length);

  const height = m?.heightCm ?? fallbackHeightCm;

  // Weight scale (gentle)
  // Common range: 55kg - 125kg (adjustable)
  const weightN = m?.weightKg ? norm(m.weightKg, 55, 125) : 0.5;

  // BF softness (gentle mapping)
  const bfN = m?.bodyFatPct ? norm(m.bodyFatPct, 8, 35) : 0.45;

  // Measurements: use cm ranges
  const waistN = m?.waistCm ? norm(m.waistCm, 60, 120) : 0.52;
  const hipsN = m?.hipsCm ? norm(m.hipsCm, 75, 130) : 0.52;
  const chestN = m?.chestCm ? norm(m.chestCm, 75, 130) : 0.52;
  const shoulderN = m?.shoulderCm ? norm(m.shoulderCm, 35, 60) : 0.52;
  const armN = m?.armCm ? norm(m.armCm, 22, 45) : 0.48;
  const thighN = m?.thighCm ? norm(m.thighCm, 40, 80) : 0.5;

  // Height slightly affects perceived scale (taller = slightly slimmer look)
  const heightN = norm(height, 150, 200); // 0..1
  const heightSlimBias = (heightN - 0.5) * 0.06; // tiny

  // Derived:
  // - scale: combine weight with slight inverse height
  const scale = clamp01(0.35 + weightN * 0.5 - heightSlimBias);

  // - stance: athletic vibe = lower BF and moderate shoulders
  const stance = clamp01(0.35 + (1 - bfN) * 0.4 + shoulderN * 0.15);

  // - softness: influenced by bf + waist
  const softness = clamp01(0.2 + bfN * 0.6 + waistN * 0.2);

  // Core proportions
  // Keep them in a "pleasant avatar range"
  const shoulder = clamp01(0.35 + shoulderN * 0.5 + (1 - bfN) * 0.06);
  const chest = clamp01(0.35 + chestN * 0.5 + (1 - bfN) * 0.04);
  const waist = clamp01(0.3 + waistN * 0.55 + bfN * 0.06);
  const hips = clamp01(0.33 + hipsN * 0.52 + bfN * 0.03);

  const arm = clamp01(0.3 + armN * 0.55 + (1 - bfN) * 0.04);
  const thigh = clamp01(0.3 + thighN * 0.55 + bfN * 0.03);

  return {
    scale,
    shoulder,
    chest,
    waist,
    hips,
    arm,
    thigh,
    stance,
    softness,
    confidence,
  };
}

export function applyFutureTarget(
  base: BodyMetrics | undefined,
  target: FutureSelfTarget
): BodyMetrics {
  const now: BodyMetrics = {
    updatedAt: Date.now(),
    ...base,
  };

  return {
    ...now,
    weightKg: target.weightKg ?? now.weightKg,
    bodyFatPct: target.bodyFatPct ?? now.bodyFatPct,
    waistCm: target.waistCm ?? now.waistCm,
    hipsCm: target.hipsCm ?? now.hipsCm,
    chestCm: target.chestCm ?? now.chestCm,
  };
}
