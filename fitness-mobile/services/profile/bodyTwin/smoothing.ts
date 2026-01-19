// services/bodyTwin/smoothing.ts
import type { ShapeParams } from "./types";

/**
 * EWMA smoothing with per-update rate limiting.
 * - Prevents jumpy avatar when metrics fluctuate.
 * - Keeps changes emotionally safe and "gentle".
 */

export type SmoothingConfig = {
  alpha: number; // 0..1 (higher = faster)
  maxDeltaPerUpdate: number; // 0..1 clamp per field
};

export const DEFAULT_SMOOTHING: SmoothingConfig = {
  alpha: 0.18,
  maxDeltaPerUpdate: 0.06,
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function approach(prev: number, next: number, cfg: SmoothingConfig) {
  const ewma = prev + cfg.alpha * (next - prev);
  const delta = ewma - prev;
  const limited = Math.max(
    -cfg.maxDeltaPerUpdate,
    Math.min(cfg.maxDeltaPerUpdate, delta)
  );
  return clamp01(prev + limited);
}

export function smoothShape(
  prev: ShapeParams | undefined,
  next: ShapeParams,
  cfg: SmoothingConfig = DEFAULT_SMOOTHING
): ShapeParams {
  if (!prev) return next;

  return {
    scale: approach(prev.scale, next.scale, cfg),
    shoulder: approach(prev.shoulder, next.shoulder, cfg),
    chest: approach(prev.chest, next.chest, cfg),
    waist: approach(prev.waist, next.waist, cfg),
    hips: approach(prev.hips, next.hips, cfg),
    arm: approach(prev.arm, next.arm, cfg),
    thigh: approach(prev.thigh, next.thigh, cfg),
    stance: approach(prev.stance, next.stance, cfg),
    softness: approach(prev.softness, next.softness, cfg),
    confidence: approach(prev.confidence, next.confidence, {
      ...cfg,
      maxDeltaPerUpdate: 0.12,
    }),
  };
}
