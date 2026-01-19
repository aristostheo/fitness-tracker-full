import { useCallback, useEffect, useState } from "react";
import { loadFeaturedLocal, loadUnlocksLocal } from "@/services/badges/store";
import type { UnlockMap } from "@/services/badges/types";

export function useBadgesLocal(auto = true) {
  const [badgeUnlocks, setBadgeUnlocks] = useState<UnlockMap>({});
  const [featuredBadges, setFeaturedBadges] = useState<string[]>([]);

  const refreshBadgesLocal = useCallback(async () => {
    try {
      const u = await loadUnlocksLocal();
      const f = await loadFeaturedLocal();
      setBadgeUnlocks(u || {});
      setFeaturedBadges(f || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (auto) refreshBadgesLocal();
  }, [auto, refreshBadgesLocal]);

  return { badgeUnlocks, featuredBadges, refreshBadgesLocal };
}
