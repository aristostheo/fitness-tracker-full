import { Platform } from "react-native";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Local dateKey "YYYY-MM-DD" */
export function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map((v) => Number(v));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(key: string, delta: number) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

export function formatPrettyDate(key: string) {
  const d = parseDateKey(key);
  // Apple-ish: "Mon, Dec 22"
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTimeFromISO(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isReduceMotionSupported() {
  // in case you want platform gating later
  return Platform.OS !== "web";
}

export function sumMacros(
  list: {
    macros: { calories: number; protein: number; carbs: number; fat: number };
  }[]
) {
  return list.reduce(
    (acc, it) => {
      acc.calories += it.macros.calories || 0;
      acc.protein += it.macros.protein || 0;
      acc.carbs += it.macros.carbs || 0;
      acc.fat += it.macros.fat || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function alpha(hex: string, a: number) {
  // expects #RRGGBB
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp(a, 0, 1)})`;
}
