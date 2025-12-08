// services/notifications.ts
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type NotificationType =
  | "friend:request"
  | "friend:accepted"
  | "ping"
  | "reminder"
  | "info";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, any> | null;
  readAt?: any;
  createdAt?: any;
};

const col = (uid: string) =>
  collection(getFirestore() ?? db, "users", uid, "notifications");

export async function addNotification(
  uid: string,
  payload: Omit<AppNotification, "id" | "readAt" | "createdAt">
) {
  const ref = await addDoc(col(uid), {
    type: payload.type,
    title: payload.title,
    body: payload.body ?? "",
    data: payload.data ?? null,
    readAt: null,
    createdAt: serverTimestamp(),
  });
  return ref;
}

export function subscribeNotifications(
  uid: string,
  cb: (rows: AppNotification[]) => void,
  opts: { unreadOnly?: boolean; max?: number } = {}
) {
  if (!uid || uid === "__demo__") {
    cb([]);
    return () => {};
  }

  const filters = [];
  if (opts.unreadOnly) filters.push(where("readAt", "==", null));

  const qy = query(
    col(uid),
    ...filters,
    orderBy("createdAt", "desc"),
    limit(opts.max ?? 50)
  );

  return onSnapshot(
    qy,
    (snap) => {
      const rows: AppNotification[] = [];
      snap.forEach((d) => {
        const x = d.data() as any;
        rows.push({
          id: d.id,
          type: x.type ?? "info",
          title: x.title ?? "",
          body: x.body ?? "",
          data: x.data ?? null,
          readAt: x.readAt ?? null,
          createdAt: x.createdAt ?? null,
        });
      });
      cb(rows);
    },
    (err) => {
      console.warn("[subscribeNotifications]", err);
      cb([]);
    }
  );
}

// Lightweight unread count stream for badge usage
export function subscribeUnreadCount(
  uid: string,
  cb: (count: number) => void
) {
  if (!uid || uid === "__demo__") {
    cb(0);
    return () => {};
  }
  const qy = query(col(uid), where("readAt", "==", null), limit(200));
  return onSnapshot(
    qy,
    (snap) => cb(snap.size),
    (err) => {
      console.warn("[subscribeUnreadCount]", err);
      cb(0);
    }
  );
}

export async function markNotificationRead(uid: string, id: string) {
  await updateDoc(doc(col(uid), id), { readAt: serverTimestamp() });
}

export async function markAllNotificationsRead(uid: string) {
  const ref = getFirestore() ?? db;
  const unread = await getDocs(
    query(col(uid), where("readAt", "==", null), limit(400))
  );
  const batch = writeBatch(ref);
  unread.forEach((d) => {
    batch.update(d.ref, { readAt: serverTimestamp() });
  });
  if (!unread.empty) {
    await batch.commit();
  }
}

// Convenience helpers for common friend flows
export async function notifyFriendRequest(
  toUid: string,
  from: { uid: string; email?: string | null; displayName?: string | null }
) {
  await addNotification(toUid, {
    type: "friend:request",
    title: `${from.displayName || "New friend"} request`,
    body: from.email ? `${from.email} wants to connect` : undefined,
    data: { fromUid: from.uid, email: from.email ?? null },
  });
}

export async function notifyFriendAccepted(
  toUid: string,
  friend: { uid: string; displayName?: string | null }
) {
  await addNotification(toUid, {
    type: "friend:accepted",
    title: friend.displayName
      ? `${friend.displayName} accepted your request`
      : "Friend request accepted",
    data: { friendUid: friend.uid },
  });
}

export async function notifyPing(
  toUid: string,
  from: { uid: string; displayName?: string | null }
) {
  await addNotification(toUid, {
    type: "ping",
    title: from.displayName ? `${from.displayName} pinged you` : "You were pinged",
    body: "Log a meal to keep your streak alive.",
    data: { fromUid: from.uid },
  });
}
