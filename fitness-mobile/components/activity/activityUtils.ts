// components/activity/activityUtils.ts

import type {
  ActivityEntry,
  ActivityIntensity,
  ActivityType,
} from "./activityTypes";

export function clamp(n: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, n));
}

export function startOfLocalDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameLocalDay(a: number, b: number) {
  return startOfLocalDay(a) === startOfLocalDay(b);
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function labelForType(t: ActivityType) {
  switch (t) {
    case "walk":
      return "Walk";
    case "run":
      return "Run";
    case "bike":
      return "Bike";
    case "stairs":
      return "Stairs";
    case "swim":
      return "Swim";
    case "sport":
      return "Sport";
    case "yoga":
      return "Yoga";
    case "stretch":
      return "Stretch";
    default:
      return "Other";
  }
}

export function emojiForType(t: ActivityType) {
  switch (t) {
    case "walk":
      return "🚶";
    case "run":
      return "🏃";
    case "bike":
      return "🚴";
    case "stairs":
      return "⬆️";
    case "swim":
      return "🏊";
    case "sport":
      return "🏀";
    case "yoga":
      return "🧘";
    case "stretch":
      return "🤸";
    default:
      return "✨";
  }
}

export function intensityLabel(i: ActivityIntensity) {
  if (i === "easy") return "Easy";
  if (i === "moderate") return "Moderate";
  return "Hard";
}

export function sumToday(entries: ActivityEntry[], now = Date.now()) {
  const today = entries.filter((e) => isSameLocalDay(e.timestamp, now));
  const minutes = today.reduce((a, e) => a + (e.minutes || 0), 0);
  const calories = today.reduce((a, e) => a + (e.calories || 0), 0);
  const steps = today.reduce((a, e) => a + (e.steps || 0), 0);
  return { today, minutes, calories, steps };
}

export function uid(prefix = "act") {
  return `${prefix}_${Math.random()
    .toString(16)
    .slice(2)}_${Date.now().toString(16)}`;
}
