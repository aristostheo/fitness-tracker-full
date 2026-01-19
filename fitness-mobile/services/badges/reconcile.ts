// services/badges/reconcile.ts
import type { BadgeStatsSnapshot } from "./types";
import { evaluateBadges } from "./engine";
import {
  loadUnlocksLocal,
  loadProgressLocal,
  saveUnlocksLocal,
  saveProgressLocal,
} from "./store";

export async function reconcileBadgesFromSnapshot(stats: BadgeStatsSnapshot) {
  const unlocks = await loadUnlocksLocal();
  const progress = await loadProgressLocal();

  const res = evaluateBadges({
    event: { type: "SNAPSHOT", timestamp: Date.now(), payload: {} },
    stats,
    unlocks,
    progress,
  });

  await saveUnlocksLocal(res.unlocks);
  await saveProgressLocal(res.progress);

  return res;
}
