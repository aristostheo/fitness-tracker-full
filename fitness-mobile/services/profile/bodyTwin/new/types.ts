// services/bodyTwin/types.ts

export type BodyMetrics = {
  weightKg?: number; // optional
  bodyFatPct?: number; // optional (0-60)
  waistCm?: number; // optional
  heightCm?: number; // optional
  updatedAt?: number; // epoch ms
};

export type BodyTwinStyle = {
  skinTone: "porcelain" | "light" | "medium" | "tan" | "deep";
  hair: "buzz" | "short" | "medium" | "long" | "curly";
  outfit: "tee" | "hoodie" | "tank" | "athleisure";
  vibe: "calm" | "sport" | "sleek";
};

export type ShapeParams = {
  // Normalized, 0..1 – not “judgmental”, just visual.
  mass: number; // overall size
  waist: number; // torso taper
  shoulders: number; // upper width
  posture: number; // slight uprightness
};

export type BodyTwinState = {
  uid: string;
  createdAt: number;
  updatedAt: number;

  style: BodyTwinStyle;

  // “Smoothed” representation that changes slowly.
  currentShape: ShapeParams;

  // Derived from latest user metrics, but NOT directly shown as critique.
  targetShape: ShapeParams;

  // For smoothing math
  lastEvolveAt: number;

  // Snapshots for timeline
  snapshots: BodyTwinSnapshot[];

  // Privacy / settings
  privacy: {
    enabled: boolean; // master toggle
    storeOnDeviceOnly: boolean; // if true, no cloud sync (your app can enforce)
    allowScreenshots: boolean; // informational
    showOnProfileCard: boolean;
  };
};

export type BodyTwinSnapshot = {
  id: string;
  at: number; // epoch ms
  label?: string; // “Week 3”, “After travel”, etc.
  metrics?: BodyMetrics; // stored for then/now compare
  shape: ShapeParams;
  style: BodyTwinStyle;
};

export type FutureSelfTarget = {
  targetWeightKg?: number;
  targetBodyFatPct?: number;
  targetWaistCm?: number;
};

export type Accomplishment = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string; // Ionicons name
  at: number;
};
