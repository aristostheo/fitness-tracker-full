/* tools/import-wger.ts */
/* eslint-disable no-console */

import "dotenv/config";
import fs from "node:fs";
import fetch from "node-fetch";
import slugify from "@sindresorhus/slugify";
import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/** ---------- Robust admin init (supports PATH or inline JSON) ---------- */
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
  const sa: ServiceAccount = {
    projectId: j.project_id ?? j.projectId,
    clientEmail: j.client_email ?? j.clientEmail,
    privateKey: (j.private_key ?? j.privateKey)?.replace(/\\n/g, "\n"),
  };
  if (!sa.projectId || !sa.clientEmail || !sa.privateKey) {
    throw new Error(
      "Service account missing projectId/clientEmail/privateKey."
    );
  }
  return sa;
}
const sa = loadServiceAccount();
console.log("[import-wger] Using project:", sa.projectId);
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);
/** --------------------------------------------------------------------- */

/** Small helpers */
const WGER = "https://wger.de/api/v2";
const BATCH = 400;

// Fetches all pages for a wger endpoint
async function fetchAll(path: string) {
  let next: string | null = `${WGER}/${path}`;
  const out: any[] = [];
  while (next) {
    const r = await fetch(next);
    if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
    const j: any = await r.json();
    out.push(...(j.results || []));
    next = j.next;
  }
  return out;
}

// Pick an English translation (falls back to any usable translation)
function pickTranslation(ex: any) {
  const tr = Array.isArray(ex.translations) ? ex.translations : [];
  return (
    tr.find((t: any) => t?.language === 2) || // language id 2
    tr.find((t: any) => t?.language?.short_name === "en") ||
    tr.find(
      (t: any) => typeof t?.name === "string" && t.name.trim().length > 0
    ) ||
    null
  );
}

// Slugify array of objects by key/name
function toSlugArr(arr: any[], key: string) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => slugify(String(x?.[key] ?? x?.name ?? "").trim()))
    .filter(Boolean);
}

// Safety: surface hidden crashes
process.on("unhandledRejection", (e) => {
  console.error("UNHANDLED REJECTION", e);
  process.exit(1);
});
process.on("uncaughtException", (e) => {
  console.error("UNCAUGHT EXCEPTION", e);
  process.exit(1);
});

/** ------------------------------- Main --------------------------------- */
(async () => {
  // Tip: append &status=2 to only import verified exercises
  // const exs = await fetchAll("exerciseinfo/?status=2&limit=5000");
  const exs = await fetchAll("exerciseinfo/?limit=5000");
  console.log(`[import-wger] Fetched ${exs.length} from exerciseinfo`);

  for (let i = 0; i < exs.length; i += BATCH) {
    const batch = db.batch();

    for (const raw of exs.slice(i, i + BATCH)) {
      const tr = pickTranslation(raw);
      if (!tr?.name) continue; // skip if no usable name

      const name: string = tr.name;
      const id = slugify(name);

      const description: string = tr.description || ""; // often HTML
      const instructions =
        description
          .replace(/<[^>]+>/g, " ")
          .split(/[\.\n]/)
          .map((s) => s.trim())
          .filter(Boolean) || [];

      const primaryMuscles = toSlugArr(raw.muscles, "name");
      const secondaryMuscles = toSlugArr(raw.muscles_secondary, "name");
      const equipment = toSlugArr(raw.equipment, "name");

      batch.set(
        db.collection("exercises").doc(id),
        {
          id,
          name,
          instructions,
          primaryMuscles,
          secondaryMuscles,
          equipment,
          mechanics: null,
          force: null,
          stabilization: [],
          level: null,
          images: null, // enriched later
          sources: { wgerId: raw.id },
          lang: "en",
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(
      `[import-wger] Imported: ${Math.min(i + BATCH, exs.length)}/${exs.length}`
    );
  }

  console.log("[import-wger] Done.");
})();
