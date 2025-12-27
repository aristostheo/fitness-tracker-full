import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type ReactionKind = "like" | "fire" | "clap";

export type Reaction = {
  id: string;
  targetId: string;
  kind: ReactionKind;
  createdByUid: string;
  createdByName?: string | null;
  createdAt?: any;
};

export type Comment = {
  id: string;
  targetId: string;
  text: string;
  createdByUid: string;
  createdByName?: string | null;
  createdAt?: any;
};

const reactionsCol = (uid: string) =>
  collection(getFirestore() ?? db, "users", uid, "reactions");
const commentsCol = (uid: string) =>
  collection(getFirestore() ?? db, "users", uid, "comments");

/* ─────────── Reactions ─────────── */
export function subscribeReactions(
  targetUid: string,
  targetId: string,
  cb: (rows: Reaction[]) => void
) {
  if (!targetUid || !targetId || targetUid === "__demo__") {
    cb([]);
    return () => {};
  }
  const qy = query(
    reactionsCol(targetUid),
    where("targetId", "==", targetId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    qy,
    (snap) => {
      const rows: Reaction[] = [];
      snap.forEach((d) => {
        const x = d.data() as any;
        rows.push({
          id: d.id,
          targetId: x.targetId,
          kind: x.kind,
          createdByUid: x.createdByUid,
          createdByName: x.createdByName ?? null,
          createdAt: x.createdAt ?? null,
        });
      });
      cb(rows);
    },
    (err) => {
      console.warn("[subscribeReactions]", err);
      cb([]);
    }
  );
}

export async function toggleReaction(
  targetUid: string,
  targetId: string,
  kind: ReactionKind,
  actor: { uid: string; displayName?: string | null }
) {
  if (!targetUid || !targetId || !actor?.uid) return;
  const docId = `${targetId}_${actor.uid}`;
  const ref = doc(reactionsCol(targetUid), docId);
  await setDoc(ref, {
    targetId,
    kind,
    createdByUid: actor.uid,
    createdByName: actor.displayName ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function removeReaction(targetUid: string, targetId: string, actorUid: string) {
  if (!targetUid || !targetId || !actorUid) return;
  const docId = `${targetId}_${actorUid}`;
  await deleteDoc(doc(reactionsCol(targetUid), docId));
}

/* ─────────── Comments ─────────── */
export function subscribeComments(
  targetUid: string,
  targetId: string,
  cb: (rows: Comment[]) => void
) {
  if (!targetUid || !targetId || targetUid === "__demo__") {
    cb([]);
    return () => {};
  }
  const qy = query(
    commentsCol(targetUid),
    where("targetId", "==", targetId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    qy,
    (snap) => {
      const rows: Comment[] = [];
      snap.forEach((d) => {
        const x = d.data() as any;
        rows.push({
          id: d.id,
          targetId: x.targetId,
          text: x.text,
          createdByUid: x.createdByUid,
          createdByName: x.createdByName ?? null,
          createdAt: x.createdAt ?? null,
        });
      });
      cb(rows);
    },
    (err) => {
      console.warn("[subscribeComments]", err);
      cb([]);
    }
  );
}

export async function addComment(
  targetUid: string,
  targetId: string,
  text: string,
  actor: { uid: string; displayName?: string | null }
) {
  if (!targetUid || !targetId || !actor?.uid) return;
  const body = text.trim();
  if (!body) return;
  await addDoc(commentsCol(targetUid), {
    targetId,
    text: body.slice(0, 400),
    createdByUid: actor.uid,
    createdByName: actor.displayName ?? null,
    createdAt: serverTimestamp(),
  });
}
