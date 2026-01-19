// services/friendsSafety.ts
// Drop-in ✅ privacy-first safety controls (block/report)
// Firestore paths:
// - users/{uid}/blocks/{targetUid}   { blocked: true, createdAt, updatedAt }
// - reports/{autoId}                { reporterUid, targetUid, reason, createdAt }
//
// This is intentionally isolated from your existing friends logic.

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";

const DB = () => getFirestore();

export async function upsertBlock(
  reporterUid: string,
  targetUid: string,
  blocked: boolean
) {
  const ref = doc(DB(), "users", reporterUid, "blocks", targetUid);
  await setDoc(
    ref,
    {
      blocked,
      targetUid,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function createReport(
  reporterUid: string,
  targetUid: string,
  reason: string
) {
  const ref = collection(DB(), "reports");
  await addDoc(ref, {
    reporterUid,
    targetUid,
    reason: (reason || "").slice(0, 2000),
    createdAt: serverTimestamp(),
  });
}
