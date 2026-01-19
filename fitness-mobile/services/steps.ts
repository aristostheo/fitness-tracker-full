// // services/steps.ts
// // Minimal steps writer compatible with your existing profile.steps map.
// // Assumes you already have firebase initialized in your services layer.
// // If you already export db from "@/services/firebase", update the import accordingly.

// import { doc, updateDoc, setDoc } from "firebase/firestore";
// import { db } from "@/lib/firebase"; // <-- change path if needed

// export async function setStepsForDate(
//   uid: string,
//   ymdDate: string,
//   steps: number
// ) {
//   const safe = Math.max(0, Math.floor(Number(steps) || 0));
//   const ref = doc(db, "profiles", uid); // ✅ MUST match subscribeProfile/ensureProfile path

//   // ensure doc exists (merge)
//   await setDoc(ref, { steps: { [ymdDate]: safe } }, { merge: true });

//   // also write direct dot-path for consistency if you want:
//   await updateDoc(ref, {
//     [`steps.${ymdDate}`]: safe,
//     stepsUpdatedAt: Date.now(),
//   } as any);
// }

// export async function addStepsForDate(
//   uid: string,
//   ymdDate: string,
//   delta: number
// ) {
//   const add = Math.max(0, Math.floor(Number(delta) || 0));
//   if (!add) return;

//   const ref = doc(db, "profiles", uid);

//   // ✅ atomic update (no stale reads)
//   await setDoc(ref, {}, { merge: true });
//   await updateDoc(ref, {
//     [`steps.${ymdDate}`]: increment(add),
//     stepsUpdatedAt: Date.now(),
//   } as any);
// }
