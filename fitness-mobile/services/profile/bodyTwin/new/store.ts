// services/bodyTwin/store.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  BodyTwinState,
  BodyMetrics,
  BodyTwinSnapshot,
  ShapeParams,
  BodyTwinStyle,
} from "./types";
import { metricsToTargetShape, evolveShapeEMA } from "./evolution";

const KEY = (uid: string) => `@body_twin_v1:${uid}`;

const now = () => Date.now();

function defaultStyle(): BodyTwinStyle {
  return {
    skinTone: "medium",
    hair: "short",
    outfit: "athleisure",
    vibe: "sleek",
  };
}

function defaultShape(): ShapeParams {
  return { mass: 0.55, waist: 0.52, shoulders: 0.58, posture: 0.55 };
}

function makeSnapshot(args: {
  shape: ShapeParams;
  style: BodyTwinStyle;
  metrics?: BodyMetrics;
  label?: string;
}): BodyTwinSnapshot {
  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    at: now(),
    label: args.label,
    metrics: args.metrics,
    shape: args.shape,
    style: args.style,
  };
}

export async function loadBodyTwinState(uid: string): Promise<BodyTwinState> {
  const raw = await AsyncStorage.getItem(KEY(uid));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as BodyTwinState;
      return parsed;
    } catch {
      // fallthrough
    }
  }

  const createdAt = now();
  const state: BodyTwinState = {
    uid,
    createdAt,
    updatedAt: createdAt,
    style: defaultStyle(),
    currentShape: defaultShape(),
    targetShape: defaultShape(),
    lastEvolveAt: createdAt,
    snapshots: [
      makeSnapshot({
        shape: defaultShape(),
        style: defaultStyle(),
        label: "Start",
      }),
    ],
    privacy: {
      enabled: true,
      storeOnDeviceOnly: true,
      allowScreenshots: true,
      showOnProfileCard: true,
    },
  };

  await AsyncStorage.setItem(KEY(uid), JSON.stringify(state));
  return state;
}

export async function saveBodyTwinState(state: BodyTwinState): Promise<void> {
  await AsyncStorage.setItem(KEY(state.uid), JSON.stringify(state));
}

export async function updateBodyTwinStyle(
  uid: string,
  style: Partial<BodyTwinStyle>
) {
  const s = await loadBodyTwinState(uid);
  const next = { ...s, style: { ...s.style, ...style }, updatedAt: now() };
  // add a snapshot when user changes style (optional but nice)
  next.snapshots = [
    ...next.snapshots,
    makeSnapshot({
      shape: next.currentShape,
      style: next.style,
      label: "Style",
    }),
  ].slice(-60);
  await saveBodyTwinState(next);
  return next;
}

/**
 * Feed latest metrics into target shape, then evolve current shape slowly.
 * Snapshot logic:
 * - Create a snapshot if >= 7 days since last snapshot OR shape moved enough.
 */
export async function ingestMetricsAndEvolve(args: {
  uid: string;
  metrics?: BodyMetrics;
  halfLifeDays?: number; // slower = safer
}): Promise<BodyTwinState> {
  const { uid, metrics, halfLifeDays = 14 } = args;
  const s = await loadBodyTwinState(uid);

  const targetShape = metricsToTargetShape(metrics);
  const { next: evolved } = evolveShapeEMA({
    current: s.currentShape,
    target: targetShape,
    now: now(),
    lastAt: s.lastEvolveAt || s.updatedAt,
    halfLifeDays,
    maxDailyChange: 0.05,
  });

  const next: BodyTwinState = {
    ...s,
    updatedAt: now(),
    lastEvolveAt: now(),
    targetShape,
    currentShape: evolved,
  };

  // Snapshot decision
  const lastSnap = next.snapshots[next.snapshots.length - 1];
  const daysSinceLast = lastSnap
    ? (now() - lastSnap.at) / (1000 * 60 * 60 * 24)
    : 999;

  const shapeMove =
    Math.abs(lastSnap?.shape.mass ?? 0 - evolved.mass) +
    Math.abs(lastSnap?.shape.waist ?? 0 - evolved.waist) +
    Math.abs(lastSnap?.shape.shoulders ?? 0 - evolved.shoulders);

  const shouldSnapshot = daysSinceLast >= 7 || shapeMove >= 0.12;

  if (shouldSnapshot) {
    next.snapshots = [
      ...next.snapshots,
      makeSnapshot({
        shape: evolved,
        style: next.style,
        metrics,
        label: daysSinceLast >= 7 ? "Week" : "Update",
      }),
    ].slice(-60);
  }

  await saveBodyTwinState(next);
  return next;
}

export async function updateBodyTwinPrivacy(
  uid: string,
  patch: Partial<BodyTwinState["privacy"]>
) {
  const s = await loadBodyTwinState(uid);
  const next = { ...s, privacy: { ...s.privacy, ...patch }, updatedAt: now() };
  await saveBodyTwinState(next);
  return next;
}
