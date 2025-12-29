// components/alerts/adapters.ts
import { AlertItem, AlertPriority, AlertSource, AlertKind } from "./types";
import type { AppNotification } from "@/services/notifications";

/**
 * Convert backend notifications to the UI model used by the premium Alerts page.
 * Assumptions based on your old UI:
 * - unread if !readAt
 * - fields: id, type, title, body, createdAt (or similar)
 *
 * If your AppNotification uses different names (e.g., `createdAtMs`), adjust in one place here.
 */
export function adaptNotificationsToAlertItems(
  items: AppNotification[]
): AlertItem[] {
  return items.map((n) => {
    const createdAt = pickCreatedAt(n);
    const read = !!(n as any).readAt;

    const source = inferSource(n);
    const kind = inferKind(n);
    const priority = inferPriority(n);
    const entity = inferEntity(n);

    // optional friend actor if you have it in backend payload
    const actor = inferActor(n);

    return {
      id: (n as any).id,
      source,
      kind,
      priority,
      title: (n as any).title ?? "Notification",
      body: (n as any).body ?? undefined,
      actor,
      entity,
      createdAt,
      read,
      pinned: !!(n as any).pinned, // if you later support it
      actionable: true,
    };
  });
}

export function defaultPressRouteForAlert(
  item: AlertItem
): "friends" | "workouts" | "nutrition" | "goals" | "profile" {
  if (item.source === "friend") return "friends";

  switch (item.entity?.type) {
    case "workout":
      return "workouts";
    case "nutrition":
      return "nutrition";
    case "goal":
      return "goals";
    case "challenge":
      return "friends";
    default:
      return "profile";
  }
}

/* ------------------------ inference helpers ------------------------ */

function pickCreatedAt(n: AppNotification): number {
  // Try common shapes:
  const anyN: any = n;

  // Firestore Timestamp?
  const ts = anyN.createdAt;
  if (ts && typeof ts === "object") {
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
  }

  // numeric millis
  if (typeof anyN.createdAt === "number") return anyN.createdAt;
  if (typeof anyN.createdAtMs === "number") return anyN.createdAtMs;
  if (typeof anyN.timestamp === "number") return anyN.timestamp;

  // fallback: now
  return Date.now();
}

function inferSource(n: AppNotification): AlertSource {
  const t = String((n as any).type ?? "");
  if (t.startsWith("friend:")) return "friend";
  // old page also had "ping" as app
  return "app";
}

function inferKind(n: AppNotification): AlertKind {
  const t = String((n as any).type ?? "");

  // friend:
  if (t === "friend:request") return "friend_follow";
  if (t === "friend:accepted") return "friend_follow";

  // app:
  if (t === "ping") return "system";

  // fallback: attempt to infer from title keywords
  const title = String((n as any).title ?? "").toLowerCase();
  if (title.includes("streak")) return "streak_milestone";
  if (
    title.includes("protein") ||
    title.includes("meal") ||
    title.includes("nutrition")
  )
    return "nutrition_nudge";
  if (title.includes("workout") || title.includes("training"))
    return "workout_reminder";
  if (title.includes("goal") || title.includes("progress"))
    return "goal_progress";

  return "system";
}

function inferPriority(n: AppNotification): AlertPriority {
  // If backend provides priority, honor it:
  const p = (n as any).priority;
  if (p === 1 || p === 2 || p === 3 || p === 4) return p;

  // Otherwise infer from type
  const t = String((n as any).type ?? "");
  if (t === "friend:request") return 1; // requests should surface
  if (t === "ping") return 2;

  // Subtle nudges lower
  const title = String((n as any).title ?? "").toLowerCase();
  if (title.includes("reminder")) return 2;
  if (title.includes("nudge") || title.includes("tip")) return 3;

  return 3;
}

function inferEntity(n: AppNotification): AlertItem["entity"] {
  // If your backend sends a deep link payload, use it:
  const anyN: any = n;
  const e = anyN.entity;

  if (e && typeof e === "object" && typeof e.type === "string") {
    return e;
  }

  // Otherwise infer from text/type
  const t = String(anyN.type ?? "");
  const title = String(anyN.title ?? "").toLowerCase();

  if (t.startsWith("friend:")) return { type: "profile" };
  if (title.includes("workout") || title.includes("training"))
    return { type: "workout" };
  if (
    title.includes("nutrition") ||
    title.includes("protein") ||
    title.includes("meal")
  )
    return { type: "nutrition" };
  if (title.includes("goal") || title.includes("progress"))
    return { type: "goal" };

  return { type: "profile" };
}

function inferActor(n: AppNotification): AlertItem["actor"] {
  // If backend provides actor fields, map them:
  const anyN: any = n;
  const actor = anyN.actor;

  if (actor && typeof actor === "object") {
    const id = actor.id ?? actor.uid ?? actor.userId;
    const name = actor.name ?? actor.displayName;
    if (id && name) return { id: String(id), name: String(name) };
  }

  // Some systems store it flat:
  if (anyN.actorId && anyN.actorName) {
    return { id: String(anyN.actorId), name: String(anyN.actorName) };
  }

  return undefined;
}
