// services/exercises/firestore.ts
import {
  collection,
  onSnapshot,
  orderBy,
  query as fsQuery,
  limit as fsLimit,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { ExerciseDoc } from "./types";

export function subscribeExercises(
  onData: (items: ExerciseDoc[]) => void,
  onError?: (e: any) => void,
  opts?: { limit?: number }
): Unsubscribe {
  const col = collection(db, "exercises");
  const q = fsQuery(col, orderBy("name", "asc"), fsLimit(opts?.limit ?? 5000));

  return onSnapshot(
    q,
    (snap) => {
      const items: ExerciseDoc[] = snap.docs.map(
        (d) => d.data() as ExerciseDoc
      );
      onData(items);
    },
    (e) => onError?.(e)
  );
}
