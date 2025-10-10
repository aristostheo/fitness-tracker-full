/* tools/enrich-media.ts */
/* eslint-disable no-console */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch";
import slugify from "@sindresorhus/slugify";
import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/** Robust admin init */

function loadServiceAccount(): ServiceAccount {
  const path = process.env.FIREBASE_ADMIN_JSON_PATH;
  const inline = process.env.FIREBASE_ADMIN_JSON;

  const raw = path ? fs.readFileSync(path, "utf8") : inline || "";

  if (!raw) {
    throw new Error(
      "Missing credentials. Set FIREBASE_ADMIN_JSON_PATH to your key file path, or FIREBASE_ADMIN_JSON to a compact JSON string."
    );
  }

  const j = JSON.parse(raw);

  // Normalize snake_case -> camelCase and fix private key newlines
  const sa: ServiceAccount = {
    projectId: j.project_id ?? j.projectId,
    clientEmail: j.client_email ?? j.clientEmail,
    privateKey: (j.private_key ?? j.privateKey)?.replace(/\\n/g, "\n"),
  };

  if (!sa.projectId || !sa.clientEmail || !sa.privateKey) {
    throw new Error(
      "Service account is missing projectId/clientEmail/privateKey."
    );
  }
  return sa;
}

const sa = loadServiceAccount();
console.log("[creds] Using project:", sa.projectId);
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);
const bucket = getStorage(app).bucket();

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

const toSlug = (s: string) => slugify(s.trim());

async function loadExerciseDb(): Promise<ExerciseDbItem[]> {
  const url = process.env.EXDB_JSON_URL?.trim();

  // Ignore the placeholder value entirely
  const isPlaceholder = url === "https://your.cdn/exerciseDB.json";

  // 1) Try URL if provided and not placeholder
  if (url && !isPlaceholder) {
    try {
      console.log(`[enrich-media] Loading ExerciseDB from URL: ${url}`);
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as ExerciseDbItem[];
    } catch (e) {
      console.warn(
        `[enrich-media] URL load failed (${String(
          e
        )}). Falling back to local file...`
      );
    }
  }

  // 2) Fallback to local file
  const localPath = path.resolve(__dirname, "exerciseDB.json");
  if (fs.existsSync(localPath)) {
    console.log(`[enrich-media] Loading ExerciseDB from local: ${localPath}`);
    return JSON.parse(fs.readFileSync(localPath, "utf8")) as ExerciseDbItem[];
  }

  throw new Error(
    "No ExerciseDB dataset: set a valid EXDB_JSON_URL or create tools/exerciseDB.json"
  );
}

function scoreMatch(ex: Exercise, cand: ExerciseDbItem): number {
  let s = 0;
  if (cand.equipment && ex.equipment.includes(toSlug(cand.equipment))) s += 2;
  if (
    cand.target &&
    ex.primaryMuscles.some((m) => (cand.target || "").toLowerCase().includes(m))
  )
    s += 1;
  const exName = toSlug(ex.name);
  const cName = toSlug(cand.name);
  if (cName === exName) s += 3;
  else if (cName.includes(exName) || exName.includes(cName)) s += 1;
  return s;
}

(async () => {
  const exdb = await loadExerciseDb();
  const byName: Record<string, ExerciseDbItem[]> = {};
  for (const e of exdb) (byName[toSlug(e.name)] ||= []).push(e);

  const snap = await db.collection("exercises").get();
  console.log(`Scanning ${snap.size} exercises...`);

  let updated = 0;

  for (const doc of snap.docs) {
    const ex = doc.data() as Exercise;
    if (ex.images?.gif) continue;

    const candidates = byName[toSlug(ex.name)] || [];
    if (!candidates.length) continue;

    candidates.sort((a, b) => scoreMatch(ex, b) - scoreMatch(ex, a));
    const best = candidates[0];
    if (!best?.gifUrl) continue;

    const resp = await fetch(best.gifUrl);
    if (!resp.ok) {
      console.warn("GIF fetch failed:", best.gifUrl);
      continue;
    }
    const buf = Buffer.from(await resp.arrayBuffer());

    const file = bucket.file(`exercises/${ex.id}/demo.gif`);
    await file.save(buf, {
      contentType: "image/gif",
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
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
    updated++;
    console.log(`+ GIF for ${ex.id}`);
  }

  console.log(`Done. Updated ${updated} exercises.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
