import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type EarnedBadge = {
  id: string;
  earnedAt: number;
  tier?: number;
  progress?: number;
};

export function useBadges(uid?: string | null) {
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  useEffect(() => {
    if (!uid) return;
    const ref = collection(db, "users", uid, "badges");
    const unsub = onSnapshot(
      query(ref, orderBy("earnedAt", "desc")),
      (snap) => {
        const arr: EarnedBadge[] = [];
        snap.forEach((d) => arr.push(d.data() as EarnedBadge));
        setBadges(arr);
      }
    );
    return unsub;
  }, [uid]);
  return badges;
}
