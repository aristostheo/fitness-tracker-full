import fetch from "node-fetch";
import slugify from "@sindresorhus/slugify";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp();
const db = getFirestore(app);

const WGER = "https://wger.de/api/v2";
const LANG_EN = 2;

type WgerExercise = {
  id: number;
  name: string;
  description: string;
  muscles: number[];
  muscles_secondary: number[];
  equipment: number[];
  language: number;
};
type WgerNamed = { id: number; name: string };

async function fetchAll<T>(path: string): Promise<T[]> {
  let next: string | null = `${WGER}/${path}`;
  const out: T[] = [];
  while (next) {
    const r = await fetch(next);
    const j = (await r.json()) as any; // <— cast from unknown
    out.push(...(j.results as T[]));
    next = (j.next as string | null) || null;
  }
  return out;
}

export async function importWger() {
  const [muscles, equipment] = await Promise.all([
    fetchAll<WgerNamed>("muscle/?limit=500"),
    fetchAll<WgerNamed>("equipment/?limit=500"),
  ]);
  const mById = Object.fromEntries(muscles.map((m) => [m.id, m.name]));
  const eById = Object.fromEntries(equipment.map((e) => [e.id, e.name]));

  const exs = await fetchAll<WgerExercise>("exercise/?language=2&limit=5000");

  const BATCH = 400;
  for (let i = 0; i < exs.length; i += BATCH) {
    const batch = db.batch();
    for (const ex of exs.slice(i, i + BATCH)) {
      if (ex.language !== LANG_EN) continue;
      const id = slugify(ex.name);
      const instructions =
        ex.description
          ?.replace(/<[^>]+>/g, " ")
          .split(/[\.\n]/)
          .map((s) => s.trim())
          .filter(Boolean) || [];
      batch.set(
        db.collection("exercises").doc(id),
        {
          id,
          name: ex.name,
          instructions,
          primaryMuscles: ex.muscles.map((id) =>
            slugify(mById[id] || String(id))
          ),
          secondaryMuscles: ex.muscles_secondary.map((id) =>
            slugify(mById[id] || String(id))
          ),
          equipment: ex.equipment.map((id) => slugify(eById[id] || String(id))),
          mechanics: null,
          force: null,
          stabilization: [],
          level: null,
          images: null,
          sources: { wgerId: ex.id },
          lang: "en",
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
}
