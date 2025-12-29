// components/calendar/utils/calendarData.ts
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

import {
  type MonthSummaryMap,
  type DaySummary,
  type ActivityKey,
  pad2,
} from "@/services/calendar";

/**
 * MonthSummaryMap: YYYY-MM-DD -> { activities: { workouts/meals/steps... } }
 *
 * This file now uses your OLD calendar Firestore logic (backend only).
 */

const db = getFirestore();

export type { MonthSummaryMap };

/** Unsubscribe signature stays the same (we do fetch-on-month change like your old page). */
export function subscribeMonthSummaries(
  monthKey: string, // "YYYY-MM"
  uid: string,
  onChange: (map: MonthSummaryMap) => void
) {
  let cancelled = false;

  // ✅ avoid useless reads
  if (!uid || uid === "__demo__") {
    onChange({});
    return () => {};
  }

  (async () => {
    try {
      const { fromISO, toISO } = monthRange(monthKey);
      const map = await fetchCalendarSummary(uid, fromISO, toISO);
      if (!cancelled) onChange(map);
    } catch {
      if (!cancelled) onChange({});
    }
  })();

  return () => {
    cancelled = true;
  };
}

/* ────────────────────────────────────────────── */
/* Old logic adapted to new data shape            */
/* ────────────────────────────────────────────── */

type DayFlags = {
  workouts: number;
  exercises: number;
  meals: number;
};

async function fetchCalendarSummary(
  uid: string,
  fromISO: string,
  toISO: string
): Promise<MonthSummaryMap> {
  const out = new Map<string, DayFlags>();

  const bump = (iso: string, key: keyof DayFlags) => {
    const cur = out.get(iso) || { workouts: 0, exercises: 0, meals: 0 };
    cur[key] += 1;
    out.set(iso, cur);
  };

  const scan = async (subpath: string, key: keyof DayFlags) => {
    try {
      const coll = collection(db, "users", uid, subpath);
      const qy = query(
        coll,
        where("date", ">=", fromISO),
        where("date", "<=", toISO),
        orderBy("date", "asc")
      );
      const snap = await getDocs(qy);
      snap.forEach((doc) => {
        const iso = String((doc.data() as any)?.date || "");
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) bump(iso, key);
      });
    } catch {
      // ignore optional/unknown subcollections
    }
  };

  // ✅ exact same scanning paths as your old calendar
  await scan("workouts", "workouts");
  await scan("exerciseEntries", "exercises");
  await scan("exerciseBurnEntries", "exercises");
  await scan("activityEntries", "exercises");
  await scan("exercises", "exercises");
  await scan("stepsDaily", "exercises"); // old behavior: steps count as exercise bucket
  await scan("foodEntries", "meals");
  await scan("nutritionEntries", "meals");
  await scan("meals", "meals");

  // Convert old DayFlags -> new DaySummary activities
  const map: MonthSummaryMap = {};

  out.forEach((flags, iso) => {
    const activities: Partial<
      Record<ActivityKey, { count: number; note?: string }>
    > = {};

    if (flags.workouts > 0) activities.workouts = { count: flags.workouts };
    if (flags.meals > 0) activities.meals = { count: flags.meals };

    // 🔁 Map old "exercises" bucket into the new page’s "steps" activity key
    // (backend-only wiring; UI stays unchanged)
    if (flags.exercises > 0) activities.steps = { count: flags.exercises };

    map[iso] = {
      date: iso,
      activities,
    } satisfies DaySummary;
  });

  return map;
}

/* ────────────────────────────────────────────── */
/* Helpers                                        */
/* ────────────────────────────────────────────── */

function monthRange(monthKey: string) {
  // monthKey = "YYYY-MM"
  const [yStr, mStr] = monthKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr) - 1;

  const fromISO = `${y}-${pad2(m + 1)}-01`;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const toISO = `${y}-${pad2(m + 1)}-${pad2(daysInMonth)}`;

  return { fromISO, toISO };
}
