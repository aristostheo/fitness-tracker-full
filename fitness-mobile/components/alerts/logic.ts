import { AlertItem, AlertKind } from "./types";

type Section = {
  id: string;
  title: string;
  subtitle?: string;
  items: AlertItem[];
};

/**
 * Prioritization goals:
 * - Respect attention: only a few “high priority” items float up.
 * - Friend updates feel personal; app alerts feel quiet + actionable.
 * - Time matters: Today > Yesterday > Earlier, but pinned/urgent override.
 */
export function buildSectionsFromAlerts(items: AlertItem[]): Section[] {
  const now = Date.now();

  const sorted = [...items].sort((a, b) => {
    // pinned always first
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;

    // unread slightly ahead, but not above pinned/urgent
    const au = a.read ? 0 : 1;
    const bu = b.read ? 0 : 1;
    if (au !== bu) return bu - au;

    // priority (1 highest)
    if (a.priority !== b.priority) return a.priority - b.priority;

    // recency
    return b.createdAt - a.createdAt;
  });

  const pinned = sorted.filter((a) => !!a.pinned);
  const rest = sorted.filter((a) => !a.pinned);

  const urgent = rest.filter(
    (a) => a.priority === 1 && isToday(a.createdAt, now)
  );
  const today = rest.filter(
    (a) => !urgent.includes(a) && isToday(a.createdAt, now)
  );
  const yesterday = rest.filter((a) => isYesterday(a.createdAt, now));
  const earlier = rest.filter(
    (a) => !isToday(a.createdAt, now) && !isYesterday(a.createdAt, now)
  );

  const sections: Section[] = [];
  if (pinned.length)
    sections.push({
      id: "pinned",
      title: "Pinned",
      subtitle: "Always visible",
      items: pinned,
    });
  if (urgent.length)
    sections.push({
      id: "urgent",
      title: "Needs attention",
      subtitle: "Time-sensitive",
      items: urgent,
    });
  if (today.length)
    sections.push({ id: "today", title: "Today", items: today });
  if (yesterday.length)
    sections.push({ id: "yesterday", title: "Yesterday", items: yesterday });
  if (earlier.length)
    sections.push({ id: "earlier", title: "Earlier", items: earlier });

  return sections;
}

/** Calm relative time: “Just now”, “12m ago”, “3h ago”, or a date label. */
export function formatTime(createdAt: number, now = Date.now()): string {
  const diff = Math.max(0, now - createdAt);
  const sec = Math.floor(diff / 1000);
  if (sec < 20) return "Just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  // date-ish fallback
  const d = new Date(createdAt);
  const nowD = new Date(now);
  const sameYear = d.getFullYear() === nowD.getFullYear();
  const month = d.toLocaleString(undefined, { month: "short" });
  const day = d.getDate();
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`;
}

export function isToday(ts: number, now = Date.now()) {
  const a = new Date(ts);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isYesterday(ts: number, now = Date.now()) {
  const a = new Date(ts);
  const b = new Date(now);
  const y = new Date(b);
  y.setDate(b.getDate() - 1);
  return (
    a.getFullYear() === y.getFullYear() &&
    a.getMonth() === y.getMonth() &&
    a.getDate() === y.getDate()
  );
}

/** Demo data so the UI looks premium immediately. Replace with Firestore later. */
export function seedAlerts(): AlertItem[] {
  const now = Date.now();
  return [
    {
      id: "a1",
      source: "friend",
      kind: "friend_cheer",
      priority: 2,
      pinned: true,
      read: false,
      createdAt: now - 18 * 60 * 1000,
      title: "Maya cheered your workout",
      body: "“That pace was insane — keep it up.”",
      actor: { id: "u1", name: "Maya" },
      entity: { type: "workout", id: "w1", title: "Upper Body" },
      actionable: true,
    },
    {
      id: "a2",
      source: "app",
      kind: "streak_milestone",
      priority: 2,
      read: false,
      createdAt: now - 75 * 60 * 1000,
      title: "7-day streak",
      body: "You’ve logged something every day this week. Small wins add up.",
      entity: { type: "goal", id: "g1", title: "Consistency" },
      actionable: true,
    },
    {
      id: "a3",
      source: "app",
      kind: "workout_reminder",
      priority: 1,
      read: false,
      createdAt: now - 2 * 60 * 60 * 1000,
      title: "Workout window",
      body: "If you train today, aim for 35–45 minutes. Keep it light and clean.",
      entity: { type: "workout" },
      actionable: true,
    },
    {
      id: "a4",
      source: "friend",
      kind: "challenge_invite",
      priority: 1,
      read: true,
      createdAt: now - 6 * 60 * 60 * 1000,
      title: "Invite: Steps challenge",
      body: "Nick invited you to a 5-day steps challenge.",
      actor: { id: "u2", name: "Nick" },
      entity: { type: "challenge", id: "c1", title: "5-Day Steps" },
      actionable: true,
    },
    {
      id: "a5",
      source: "app",
      kind: "nutrition_nudge",
      priority: 3,
      read: true,
      createdAt: now - 28 * 60 * 60 * 1000,
      title: "Protein check",
      body: "Yesterday was slightly low. A shake or Greek yogurt would balance it.",
      entity: { type: "nutrition" },
      actionable: false,
    },
  ];
}
