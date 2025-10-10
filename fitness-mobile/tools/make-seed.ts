/* tools/make-seed.ts */
/* eslint-disable no-console */
import "dotenv/config";
import fs from "node:fs";
import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const FIELDS = ["id", "name", "primaryMuscles", "equipment"] as const;
const OUT = "assets/exercises.seed.json"; // your app already imports this

(async () => {
  const snap = await db.collection("exercises").get();
  const seed = snap.docs.map((d) => {
    const x = d.data() as any;
    const o: any = {};
    FIELDS.forEach((f) => (o[f] = x[f]));
    return o;
  });
  fs.writeFileSync(OUT, JSON.stringify(seed, null, 2));
  console.log(`Wrote ${seed.length} items → ${OUT}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
