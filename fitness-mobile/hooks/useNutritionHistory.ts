// src/hooks/useNutritionHistory.ts
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

export type DayTotals = {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
  count: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
export function isoAddDays(iso: string, delta: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function useNutritionHistory(
  uid?: string,
  endDateISO?: string,
  days = 30
) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DayTotals[]>([]);

  const startISO = useMemo(() => {
    if (!endDateISO) return "";
    return isoAddDays(endDateISO, -(days - 1));
  }, [endDateISO, days]);

  useEffect(() => {
    if (!uid || !endDateISO) return;

    const db = getFirestore(app);
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        // Query a bounded date range (date is stored as YYYY-MM-DD string in your entries)
        const q = query(
          collection(db, "users", uid, "nutritionEntries"),
          where("date", ">=", startISO),
          where("date", "<=", endDateISO),
          orderBy("date", "desc"),
          limit(1200)
        );

        const snap = await getDocs(q);

        const map = new Map<string, DayTotals>();

        snap.forEach((docu) => {
          const d: any = docu.data() || {};
          const date = String(d.date || "");
          if (!date) return;

          const cur =
            map.get(date) ||
            ({
              date,
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              sugar: 0,
              fiber: 0,
              count: 0,
            } as DayTotals);

          cur.calories += Number(d.calories || 0);
          cur.protein += Number(d.protein || 0);
          cur.carbs += Number(d.carbs || 0);
          cur.fat += Number(d.fat || 0);
          cur.sugar += Number(d.sugar || 0);
          cur.fiber += Number(d.fiber || 0);
          cur.count += 1;

          map.set(date, cur);
        });

        // Fill missing days with zeros for a clean chart/strip
        const filled: DayTotals[] = [];
        for (let i = 0; i < days; i++) {
          const d = isoAddDays(startISO, i);
          filled.push(
            map.get(d) ||
              ({
                date: d,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                sugar: 0,
                fiber: 0,
                count: 0,
              } as DayTotals)
          );
        }

        if (alive) setRows(filled);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [uid, endDateISO, startISO, days]);

  return { loading, days: rows };
}
