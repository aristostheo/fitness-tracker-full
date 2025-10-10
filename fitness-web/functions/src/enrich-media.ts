import fetch from "node-fetch";
import slugify from "@sindresorhus/slugify";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const app = initializeApp();
const db = getFirestore(app);
const bucket = getStorage(app).bucket(); // default bucket

type Exercise = {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string[];
  images?: { gif?: string } | null;
  sources?: { exerciseDbId?: string } | null;
};
type ExerciseDbItem = {
  id: string;
  name: string;
  target?: string;
  equipment?: string;
  gifUrl: string;
};

const EXDB_JSON_URL = process.env.EXDB_JSON_URL!; // set in Functions env or hardcode

const toSlug = (s: string) => slugify(s.trim());
const score = (ex: Exercise, c: ExerciseDbItem) =>
  (c.equipment && ex.equipment.includes(toSlug(c.equipment)) ? 2 : 0) +
  (c.target &&
  ex.primaryMuscles.some((m) => (c.target || "").toLowerCase().includes(m))
    ? 1
    : 0) +
  (toSlug(c.name) === toSlug(ex.name) ? 3 : 0);

export async function enrichMedia() {
  const r = await fetch(EXDB_JSON_URL);
  const exdb = (await r.json()) as ExerciseDbItem[];
  const byName: Record<string, ExerciseDbItem[]> = {};
  for (const e of exdb) (byName[toSlug(e.name)] ||= []).push(e);

  const snap = await db.collection("exercises").get();
  for (const doc of snap.docs) {
    const ex = doc.data() as Exercise;
    if (ex.images?.gif) continue;

    const cands = byName[toSlug(ex.name)] || [];
    if (!cands.length) continue;
    cands.sort((a, b) => score(ex, b) - score(ex, a));
    const best = cands[0];
    if (!best?.gifUrl) continue;

    const gif = await fetch(best.gifUrl);
    if (!gif.ok) continue;
    const buf = Buffer.from(await gif.arrayBuffer());

    const file = bucket.file(`exercises/${ex.id}/demo.gif`);
    await file.save(buf, {
      contentType: "image/gif",
      resumable: false,
      metadata: { cacheControl: "public,max-age=31536000,immutable" },
    });
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "2100-01-01",
    });

    await doc.ref.update({
      images: { ...(ex.images || {}), gif: url },
      sources: { ...(ex.sources || {}), exerciseDbId: best.id },
      updatedAt: Date.now(),
    });
  }
}
