// services/bodyTwin/types.ts

export type BodyTwinConsent = {
  enabled: boolean; // master toggle
  allowFutureSelf: boolean;
  allowAchievements: boolean;
  hideNumbers: boolean; // emotional safety option
};

export type BodyTwinBaseAvatar = {
  version: 1;
  skinTone: "porcelain" | "light" | "medium" | "tan" | "deep";
  hair: "buzz" | "short" | "medium" | "long" | "bun";
  outfit: "minimal" | "athleisure" | "hoodie";
  outfitColorHex: string;
  aura: "none" | "softGlow" | "sparkle";
  presentation: "neutral" | "athletic" | "soft";
};

export type BodyMetrics = {
  updatedAt: number;

  // Core
  weightKg?: number;
  bodyFatPct?: number; // 0-100

  // Optional measurements (cm)
  waistCm?: number;
  hipsCm?: number;
  chestCm?: number;
  shoulderCm?: number;
  armCm?: number;
  thighCm?: number;

  // Optional: height influences perceived scale (cm)
  heightCm?: number;
};

export type ShapeParams = {
  // 0..1 normalized
  scale: number;
  shoulder: number;
  chest: number;
  waist: number;
  hips: number;

  arm: number;
  thigh: number;

  // subtle posture / vibe
  stance: number; // 0 relaxed, 1 strong
  softness: number; // 0 lean, 1 soft

  // confidence (data completeness) 0..1
  confidence: number;
};

export type BodyTwinState = {
  consent: BodyTwinConsent;
  base: BodyTwinBaseAvatar;
  latestMetrics?: BodyMetrics;

  // Persisted smoothed shape
  smoothedShape?: ShapeParams;

  // Achievements (IDs)
  unlocked: string[];

  // last time we displayed an achievement burst
  lastRewardAt?: number;
};

export type FutureSelfTarget = {
  weightKg?: number;
  bodyFatPct?: number;
  waistCm?: number;
  hipsCm?: number;
  chestCm?: number;
};

export type Achievement = {
  id: string;
  title: string;
  subtitle: string;
  kind: "streak" | "milestone" | "consistency" | "measurement";
};
