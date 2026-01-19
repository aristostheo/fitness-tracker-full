// services/activity.ts
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ActivityType =
  | "walk"
  | "run"
  | "bike"
  | "stairs"
  | "swim"
  | "sport"
  | "yoga"
  | "stretch"
  | "other";

export type ActivityIntensity = "easy" | "moderate" | "hard";

export type ActivityEntry = {
  id: string;
  type: ActivityType;
  minutes: number;
  intensity: ActivityIntensity;

  calories?: number;
  steps?: number;
  note?: string;

  // unix ms
  timestamp: number;
};

function ymdToStartEndMs(dateStr: string) {
  // dateStr: YYYY-MM-DD (local time)
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0).getTime();
  const end = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999).getTime();
  return { start, end };
}

function rangeToMs(startYmd: string, endYmd: string) {
  const a = ymdToStartEndMs(startYmd).start;
  const b = ymdToStartEndMs(endYmd).end;
  return { startMs: a, endMs: b };
}

function cleanEntry(e: ActivityEntry) {
  return {
    id: e.id,
    type: e.type,
    minutes: Number(e.minutes || 0),
    intensity: e.intensity,
    calories: e.calories ?? null,
    steps: e.steps ?? null,
    note: e.note ?? null,
    timestamp: Number(e.timestamp || Date.now()),
    // helpful for debugging / indexing (optional)
    createdAt: Timestamp.fromMillis(Number(e.timestamp || Date.now())),
  };
}

export function subscribeActivityBetween(
  uid: string,
  startYmd: string,
  endYmd: string,
  cb: (arr: ActivityEntry[]) => void
) {
  const { startMs, endMs } = rangeToMs(startYmd, endYmd);
  const ref = collection(db, "users", uid, "activity");

  const q = query(
    ref,
    where("timestamp", ">=", startMs),
    where("timestamp", "<=", endMs),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const out: ActivityEntry[] = [];
      snap.forEach((d) => {
        const x: any = d.data();
        out.push({
          id: d.id,
          type: x.type,
          minutes: Number(x.minutes || 0),
          intensity: x.intensity,
          calories: x.calories ?? undefined,
          steps: x.steps ?? undefined,
          note: x.note ?? undefined,
          timestamp: Number(x.timestamp || 0),
        });
      });
      cb(out);
    },
    () => cb([])
  );
}

export async function addActivity(uid: string, entry: ActivityEntry) {
  const ref = doc(db, "users", uid, "activity", entry.id);
  await setDoc(ref, cleanEntry(entry), { merge: true });
}

export async function updateActivity(uid: string, entry: ActivityEntry) {
  const ref = doc(db, "users", uid, "activity", entry.id);
  await updateDoc(ref, cleanEntry(entry) as any);
}

export async function deleteActivity(uid: string, id: string) {
  const ref = doc(db, "users", uid, "activity", id);
  await deleteDoc(ref);
}
