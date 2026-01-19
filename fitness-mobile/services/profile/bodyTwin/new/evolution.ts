// services/bodyTwin/evolution.ts
import type { BodyMetrics, ShapeParams, FutureSelfTarget } from "./types";

/**
 * Emotionally-safe mapping:
 * Convert metrics -> normalized visual params.
 * Nothing here implies “good/bad”; it’s just a gentle visual companion.
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function metricsToTargetShape(m: BodyMetrics | undefined): ShapeParams {
  // Defaults are neutral + calm.
  const weight = m?.weightKg ?? 80;
  const bf = m?.bodyFatPct ?? 20;
  const waist = m?.waistCm ?? 85;
  const height = m?.heightCm ?? 175;

  // Normalize based on typical ranges (not prescriptive)
  const wNorm = clamp01((weight - 45) / (140 - 45));
  const bfNorm = clamp01((bf - 6) / (45 - 6));
  const waistNorm = clamp01((waist - 60) / (140 - 60));
  const hNorm = clamp01((height - 150) / (205 - 150));

  // Visual params:
  const mass = clamp01(lerp(wNorm, wNorm * 0.85 + bfNorm * 0.15, 0.35));
  const waistP = clamp01(waistNorm * 0.8 + bfNorm * 0.2);

  // Shoulders: slightly influenced by height + inverse waist
  const shoulders = clamp01(0.55 + (hNorm - 0.5) * 0.25 + (0.5 - waistP) * 0.2);

  // Posture: tiny “upright” tilt with consistent updates (we keep it neutral here)
  const posture = 0.55;

  return {
    mass,
    waist: waistP,
    shoulders,
    posture,
  };
}

/**
 * Exponential smoothing with half-life.
 * - Bigger halfLifeDays => slower evolution (more “emotionally safe”)
 * - Uses real time delta to stay stable across sessions.
 */
export function evolveShapeEMA(args: {
  current: ShapeParams;
  target: ShapeParams;
  now: number;
  lastAt: number;
  halfLifeDays?: number; // default: 14
  maxDailyChange?: number; // safety clamp
}): { next: ShapeParams; t: number } {
  const {
    current,
    target,
    now,
    lastAt,
    halfLifeDays = 14,
    maxDailyChange = 0.06,
  } = args;

  const dtMs = Math.max(0, now - lastAt);
  const dtDays = dtMs / (1000 * 60 * 60 * 24);

  // EMA step factor based on half-life
  const lambda = Math.log(2) / halfLifeDays;
  let t = 1 - Math.exp(-lambda * dtDays);
  t = clamp01(t);

  // Apply and clamp per-day change to avoid big jumps if user returns after long time.
  const perDayT = clamp01(t / Math.max(1e-6, dtDays || 1));
  const cappedT = clamp01(
    perDayT * Math.min(dtDays, 1) + (dtDays > 1 ? maxDailyChange : 0)
  );
  // If dtDays is large, instead of jumping, we cap the effective step.
  const step = dtDays > 1 ? maxDailyChange : t;

  const next: ShapeParams = {
    mass: clamp01(lerp(current.mass, target.mass, step)),
    waist: clamp01(lerp(current.waist, target.waist, step)),
    shoulders: clamp01(lerp(current.shoulders, target.shoulders, step)),
    posture: clamp01(lerp(current.posture, target.posture, step)),
  };

  return { next, t: step };
}

export function shapeDistance(a: ShapeParams, b: ShapeParams): number {
  const dx = a.mass - b.mass;
  const dy = a.waist - b.waist;
  const dz = a.shoulders - b.shoulders;
  const dp = a.posture - b.posture;
  return Math.sqrt(dx * dx + dy * dy + dz * dz + dp * dp);
}

/**
 * “Evolves %”:
 * progress between baseline and target, based on current distance.
 */
export function evolvesPercent(args: {
  baseline: ShapeParams;
  current: ShapeParams;
  target: ShapeParams;
}): number {
  const { baseline, current, target } = args;
  const total = shapeDistance(baseline, target);
  if (total < 1e-6) return 1;
  const remaining = shapeDistance(current, target);
  const p = 1 - remaining / total;
  return clamp01(p);
}

/**
 * Future Self preview:
 * We blend towards a target “future metrics” and recompute target shape.
 * This is preview-only; you choose whether to persist it.
 */
export function computeFutureTargetShape(args: {
  currentMetrics?: BodyMetrics;
  future?: FutureSelfTarget;
}): ShapeParams {
  const m = args.currentMetrics ?? {};
  const f = args.future ?? {};

  const blended: BodyMetrics = {
    ...m,
    weightKg: f.targetWeightKg ?? m.weightKg,
    bodyFatPct: f.targetBodyFatPct ?? m.bodyFatPct,
    waistCm: f.targetWaistCm ?? m.waistCm,
  };

  return metricsToTargetShape(blended);
}
