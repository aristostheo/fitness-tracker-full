import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const app = initializeApp();
const db = getFirestore(app);
const bucket = getStorage(app).bucket();

export async function makeSeedToStorage() {
  const FIELDS = ["id", "name", "primaryMuscles", "equipment"] as const;
  const snap = await db.collection("exercises").get();
  const seed = snap.docs.map((d) => {
    const x = d.data() as any;
    const o: any = {};
    FIELDS.forEach((f) => (o[f] = x[f]));
    return o;
  });
  await bucket
    .file("public/exercises.seed.json")
    .save(Buffer.from(JSON.stringify(seed)), {
      contentType: "application/json",
      resumable: false,
      metadata: { cacheControl: "public,max-age=86400" },
    });
}
