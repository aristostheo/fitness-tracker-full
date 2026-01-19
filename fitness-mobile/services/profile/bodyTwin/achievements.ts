// services/bodyTwin/achievements.ts
import type { Achievement, BodyMetrics } from "./types";

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "bt_first_log",
    title: "Body Twin Awakened",
    subtitle: "You started visual progress.",
    kind: "milestone",
  },
  {
    id: "bt_7_days",
    title: "A Week of Momentum",
    subtitle: "7 days of showing up.",
    kind: "streak",
  },
  {
    id: "bt_30_days",
    title: "Consistency Looks Good",
    subtitle: "30 days of progress.",
    kind: "streak",
  },
  {
    id: "bt_waist_minus_5",
    title: "Waistline Win",
    subtitle: "−5 cm waist change.",
    kind: "measurement",
  },
  {
    id: "bt_weight_minus_2",
    title: "Shift Happening",
    subtitle: "−2 kg change.",
    kind: "milestone",
  },
];

function exists(v: any) {
  return typeof v === "number" && !Number.isNaN(v);
}

/**
 * Compute new unlocks based on:
 * - first metrics
 * - simple deltas from baseline
 * NOTE: for streaks you’ll likely hook into your existing logging system.
 * Here we include a minimal “days with metrics updates” heuristic.
 */
export function computeUnlocks(params: {
  unlocked: string[];
  baseline?: BodyMetrics;
  latest?: BodyMetrics;
  history?: BodyMetrics[]; // optional
}): string[] {
  const { unlocked, baseline, latest, history } = params;
  const already = new Set(unlocked);
  const newly: string[] = [];

  if (latest && !already.has("bt_first_log")) newly.push("bt_first_log");

  if (history && history.length >= 7 && !already.has("bt_7_days"))
    newly.push("bt_7_days");
  if (history && history.length >= 30 && !already.has("bt_30_days"))
    newly.push("bt_30_days");

  if (baseline && latest) {
    if (exists(baseline.waistCm) && exists(latest.waistCm)) {
      const delta = (latest.waistCm as number) - (baseline.waistCm as number);
      if (delta <= -5 && !already.has("bt_waist_minus_5"))
        newly.push("bt_waist_minus_5");
    }

    if (exists(baseline.weightKg) && exists(latest.weightKg)) {
      const delta = (latest.weightKg as number) - (baseline.weightKg as number);
      if (delta <= -2 && !already.has("bt_weight_minus_2"))
        newly.push("bt_weight_minus_2");
    }
  }

  return newly;
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
