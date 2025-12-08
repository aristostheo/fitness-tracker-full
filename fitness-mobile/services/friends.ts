// services/friends.ts
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FriendStatus = "pending" | "accepted" | "declined" | "blocked";
export type FriendDirection = "incoming" | "outgoing" | "mutual";

export type FriendEdge = {
  id: string; // friendUid for convenience
  friendUid: string;
  friendEmail?: string | null;
  friendDisplayName?: string | null;
  status: FriendStatus;
  direction: FriendDirection;
  requestedAt?: any;
  respondedAt?: any;
  lastPingAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

const col = (uid: string) =>
  collection(getFirestore() ?? db, "users", uid, "friends");

const docRef = (uid: string, friendUid: string) => doc(col(uid), friendUid);

export function subscribeFriends(
  uid: string,
  cb: (rows: FriendEdge[]) => void,
  statuses: FriendStatus[] = ["accepted"]
) {
  if (!uid || uid === "__demo__") {
    cb([]);
    return () => {};
  }

  const filters = statuses && statuses.length
    ? [where("status", "in", statuses.slice(0, 10))]
    : [];

  const qy = query(col(uid), ...filters);

  return onSnapshot(
    qy,
    (snap) => {
      const rows: FriendEdge[] = [];
      snap.forEach((d) => {
        const x = d.data() as any;
        rows.push({
          id: d.id,
          friendUid: x.friendUid ?? d.id,
          friendEmail: x.friendEmail ?? null,
          friendDisplayName: x.friendDisplayName ?? null,
          status: x.status ?? "pending",
          direction: x.direction ?? "incoming",
          requestedAt: x.requestedAt ?? null,
          respondedAt: x.respondedAt ?? null,
          lastPingAt: x.lastPingAt ?? null,
          createdAt: x.createdAt ?? null,
          updatedAt: x.updatedAt ?? null,
        });
      });
      // client-side sort to avoid index requirement
      rows.sort((a, b) => {
        const toMillis = (t: any) =>
          t && typeof t.toMillis === "function"
            ? t.toMillis()
            : typeof t === "number"
            ? t
            : 0;
        return toMillis(b.updatedAt) - toMillis(a.updatedAt);
      });
      cb(rows);
    },
    (err) => {
      console.warn("[subscribeFriends]", err);
      cb([]);
    }
  );
}

export function subscribeFriendRequests(
  uid: string,
  cb: (rows: FriendEdge[]) => void
) {
  if (!uid || uid === "__demo__") {
    cb([]);
    return () => {};
  }

  const qy = query(
    col(uid),
    where("direction", "==", "incoming"),
    where("status", "==", "pending")
  );

  return onSnapshot(
    qy,
    (snap) => {
      const rows: FriendEdge[] = [];
      snap.forEach((d) => {
        const x = d.data() as any;
        rows.push({
          id: d.id,
          friendUid: x.friendUid ?? d.id,
          friendEmail: x.friendEmail ?? null,
          friendDisplayName: x.friendDisplayName ?? null,
          status: x.status ?? "pending",
          direction: x.direction ?? "incoming",
          requestedAt: x.requestedAt ?? null,
          respondedAt: x.respondedAt ?? null,
          lastPingAt: x.lastPingAt ?? null,
          createdAt: x.createdAt ?? null,
          updatedAt: x.updatedAt ?? null,
        });
      });
      // client-side sort newest first to avoid index requirement
      rows.sort((a, b) => {
        const toMillis = (t: any) =>
          t && typeof t.toMillis === "function"
            ? t.toMillis()
            : typeof t === "number"
            ? t
            : 0;
        return toMillis(b.requestedAt) - toMillis(a.requestedAt);
      });
      cb(rows);
    },
    (err) => {
      console.warn("[subscribeFriendRequests]", err);
      cb([]);
    }
  );
}

type FriendSeed = {
  friendUid: string;
  friendEmail?: string | null;
  friendDisplayName?: string | null;
};

export async function sendFriendRequest(
  fromUid: string,
  to: FriendSeed,
  fromMeta?: { email?: string | null; displayName?: string | null }
) {
  const ref = getFirestore() ?? db;
  const batch = writeBatch(ref);
  const now = serverTimestamp();

  batch.set(
    docRef(fromUid, to.friendUid),
    {
      friendUid: to.friendUid,
      friendEmail: to.friendEmail ?? null,
      friendDisplayName: to.friendDisplayName ?? null,
      status: "pending",
      direction: "outgoing",
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  batch.set(
    docRef(to.friendUid, fromUid),
    {
      friendUid: fromUid,
      friendEmail: fromMeta?.email ?? null,
      friendDisplayName: fromMeta?.displayName ?? null,
      status: "pending",
      direction: "incoming",
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function respondToFriendRequest(
  uid: string,
  requesterUid: string,
  accept: boolean
) {
  const ref = getFirestore() ?? db;
  const batch = writeBatch(ref);
  const now = serverTimestamp();
  const status: FriendStatus = accept ? "accepted" : "declined";

  batch.set(
    docRef(uid, requesterUid),
    {
      status,
      direction: "incoming",
      respondedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  batch.set(
    docRef(requesterUid, uid),
    {
      status,
      direction: "outgoing",
      respondedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function removeFriendship(uid: string, friendUid: string) {
  const ref = getFirestore() ?? db;
  const batch = writeBatch(ref);

  batch.delete(docRef(uid, friendUid));
  batch.delete(docRef(friendUid, uid));

  await batch.commit();
}

export async function pingFriend(uid: string, friendUid: string) {
  const ref = getFirestore() ?? db;
  const batch = writeBatch(ref);
  const now = serverTimestamp();

  batch.set(
    docRef(uid, friendUid),
    { lastPingAt: now, updatedAt: now },
    { merge: true }
  );
  batch.set(
    docRef(friendUid, uid),
    { lastPingAt: now, updatedAt: now },
    { merge: true }
  );

  await batch.commit();
}
