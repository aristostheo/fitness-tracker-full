// components/calendar/utils/calendar.ts
export type ActivityKey = "meals" | "workouts" | "water" | "steps" | "sleep";

export type ActivitySummary = {
  count: number; // e.g. meals logged, workouts, water logs, etc.
  note?: string; // optional small note for the day
};

export type DaySummary = {
  date: string; // YYYY-MM-DD
  activities: Partial<Record<ActivityKey, ActivitySummary>>;
  note?: string;
};

// Map keyed by YYYY-MM-DD
export type MonthSummaryMap = Record<string, DaySummary>;

export const ACTIVITY_META: Record<
  ActivityKey,
  { key: ActivityKey; label: string; emoji: string; color: string }
> = {
  meals: { key: "meals", label: "Meals", emoji: "🍽️", color: "#FF8A3D" },
  workouts: {
    key: "workouts",
    label: "Workouts",
    emoji: "🏋️",
    color: "#7C5CFF",
  },
  water: { key: "water", label: "Hydration", emoji: "💧", color: "#3DAEFF" },
  steps: { key: "steps", label: "Steps", emoji: "👟", color: "#34D399" },
  sleep: { key: "sleep", label: "Sleep", emoji: "🌙", color: "#60A5FA" },
};

export function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatISODate(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

export function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export function formatMonthTitle(d: Date) {
  const month = d.toLocaleString(undefined, { month: "long" });
  return `${month} ${d.getFullYear()}`;
}

export function formatReadableDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatA11yDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Calendar grid:
 * - Monday-first (Apple-ish in many regions)
 * - 6 rows x 7 columns (stable layout)
 */
export function getMonthGrid(
  cursor: Date
): { date: Date; inMonth: boolean }[][] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const first = new Date(year, month, 1);
  const dow = first.getDay(); // 0 Sun..6 Sat
  // shift so Monday=0 .. Sunday=6
  const mondayIndex = (dow + 6) % 7;

  // start date = first day minus mondayIndex
  const start = new Date(year, month, 1 - mondayIndex);

  const weeks: { date: Date; inMonth: boolean }[][] = [];
  let cur = new Date(start);

  for (let w = 0; w < 6; w++) {
    const week: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        date: new Date(cur),
        inMonth: cur.getMonth() === month,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * Display chips (multi-activity day representation):
 * - show up to 3 activity emojis
 * - if more, show +N
 */
export function getDayDisplayChips(summary?: DaySummary) {
  const acts = summary?.activities ?? {};
  const present = Object.values(ACTIVITY_META)
    .map((m) => {
      const c = acts[m.key]?.count ?? 0;
      return {
        key: m.key,
        label: m.label,
        emoji: m.emoji,
        color: m.color,
        count: c,
      };
    })
    .filter((x) => x.count > 0);

  // Sort: most “meaningful” first (workout, meals, steps, water, sleep)
  const order: ActivityKey[] = ["workouts", "meals", "steps", "water", "sleep"];
  present.sort(
    (a, b) =>
      order.indexOf(a.key as ActivityKey) - order.indexOf(b.key as ActivityKey)
  );

  const chips = present.slice(0, 3);
  const extraCount = Math.max(0, present.length - chips.length);

  return {
    chips: chips.map((c) => ({
      key: c.key,
      label: c.label,
      emoji: c.emoji,
      color: c.color,
    })),
    extraCount,
    totalCount: present.length,
  };
}

/**
 * Streak logic:
 * - "logged day" = any activity count > 0
 * - Computes:
 *   - current streak (ending today if today is logged, otherwise ends last logged day)
 *   - best streak in the currently loaded map
 */
export type Streaks = { current: number; best: number };

export function computeStreaks(map: MonthSummaryMap): Streaks {
  const keys = Object.keys(map).sort(); // YYYY-MM-DD sorts lexicographically
  if (keys.length === 0) return { current: 0, best: 0 };

  const isLoggedKey = (k: string) => {
    const s = map[k];
    const acts = s?.activities ?? {};
    return Object.values(acts).some((a) => (a?.count ?? 0) > 0);
  };

  // best streak across keys (only considers days present in map; good enough for month view)
  let best = 0;
  let run = 0;
  let prevDate: Date | null = null;

  for (const k of keys) {
    const d = new Date(k + "T00:00:00");
    const logged = isLoggedKey(k);
    if (!logged) {
      run = 0;
      prevDate = d;
      continue;
    }

    if (!prevDate) {
      run = 1;
    } else {
      const diff = daysBetween(prevDate, d);
      if (diff === 1) run += 1;
      else run = 1;
    }
    best = Math.max(best, run);
    prevDate = d;
  }

  // current streak: walk backwards from today until non-logged
  const today = new Date();
  let current = 0;
  for (let i = 0; i < 370; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = formatISODate(d);
    if (!map[k] || !isLoggedKey(k)) break;
    current += 1;
  }

  return { current, best };
}

/**
 * Month consistency:
 * - percent of days logged (so far, up to today if month is current)
 */
export type MonthConsistency = {
  daysSoFar: number;
  loggedDays: number;
  percent: number;
};

export function computeMonthConsistency(
  cursor: Date,
  map: MonthSummaryMap
): MonthConsistency {
  const now = new Date();
  const isCurrentMonth =
    cursor.getFullYear() === now.getFullYear() &&
    cursor.getMonth() === now.getMonth();
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0
  ).getDate();
  const daysSoFar = isCurrentMonth ? now.getDate() : daysInMonth;

  let loggedDays = 0;
  for (let day = 1; day <= daysSoFar; day++) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    const k = formatISODate(d);
    const s = map[k];
    if (!s) continue;
    const acts = s.activities ?? {};
    const any = Object.values(acts).some((a) => (a?.count ?? 0) > 0);
    if (any) loggedDays += 1;
  }

  return {
    daysSoFar,
    loggedDays,
    percent: daysSoFar === 0 ? 0 : loggedDays / daysSoFar,
  };
}

function daysBetween(a: Date, b: Date) {
  const ms =
    Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
