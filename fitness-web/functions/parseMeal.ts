// functions/src/parseMeal.ts
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { getAuth } from "firebase-admin/auth";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// policy
const MAX_TEXT_LEN = 600;
const DAILY_LIMIT = 20;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
function cacheKey(uid: string, text: string, qty: any, unit: any) {
  const payload = JSON.stringify({ uid, text, qty, unit });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export const parseMeal = onRequest(
  { cors: true, region: "us-central1", secrets: [OPENAI_API_KEY] },
  async (req, res) => {
    try {
      // Method guard
      if (req.method !== "POST") {
        res.status(405).json({ error: "POST only" });
        return;
      }

      // 🔐 Auth guard (require Firebase ID token)
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "unauthenticated" });
        return;
      }

      let uid = "";
      try {
        const idToken = authHeader.slice(7);
        const decoded = await getAuth().verifyIdToken(idToken);
        uid = decoded.uid;
        if (!uid) throw new Error("no uid");
      } catch (e) {
        console.error("Token verification failed:", e);
        res.status(401).json({ error: "invalid_token" });
        return;
      }

      // Body validation
      const { text } = req.body || {};
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Missing text" });
        return;
      }
      if (text.length > MAX_TEXT_LEN) {
        res.status(400).json({ error: "Text too long" });
        return;
      }

      // Optional client-provided portion
      const clientQty = Number.isFinite(Number(req.body?.qty))
        ? Number(req.body.qty)
        : null;
      const clientUnit =
        typeof req.body?.unit === "string" && req.body.unit.trim()
          ? String(req.body.unit).trim()
          : null;

      // --- Rate limit per uid/day ---
      const today = dayKey();
      const rlRef = db.collection("aiRateLimits").doc(`${uid}_${today}`);
      const rlSnap = await rlRef.get();
      const count = rlSnap.exists ? Number(rlSnap.data()?.count || 0) : 0;
      if (count >= DAILY_LIMIT) {
        res.status(429).json({ error: "rate_limit_exceeded" });
        return;
      }

      // --- Cache (24h) ---
      const ck = cacheKey(uid, text, clientQty, clientUnit);
      const cacheRef = db.collection("aiMealCache").doc(ck);
      const cacheSnap = await cacheRef.get();
      if (cacheSnap.exists) {
        const c = cacheSnap.data()!;
        if (Date.now() - (c.ts || 0) < CACHE_TTL_MS) {
          // count toward rate limit and return cached
          await rlRef.set(
            { count: count + 1, ts: Date.now() },
            { merge: true }
          );
          res.json(c.result);
          return;
        }
      }

      // OpenAI
      const apiKey = process.env.OPENAI_API_KEY || OPENAI_API_KEY.value();
      const client = new OpenAI({ apiKey });

      const prompt = `
You are estimating nutrition for a described meal.

1) Return ONLY strict JSON (no extra text).
2) Fields:
   - "suggestedName": short human-friendly title for the meal (e.g., "Salami & Cheese Sandwiches (2)")
   - "qty": number | null  (portion count or mass/volume number if obvious)
   - "unit": string | null (e.g., "sandwich", "g", "cup", "ml", "serving")
   - "calories": number
   - "protein": number
   - "carbs": number
   - "fat": number
   - "sugar": number
   - "fiber": number
3) Base the estimation on the user's description. If client also passes qty/unit, use that portion.

User input:
- description: ${JSON.stringify(text)}
- clientQty: ${clientQty === null ? "null" : clientQty}
- clientUnit: ${clientUnit === null ? "null" : JSON.stringify(clientUnit)}

Example JSON:
{"suggestedName":"Turkey & Cheese Sandwiches","qty":2,"unit":"sandwich","calories":650,"protein":35,"carbs":60,"fat":28,"sugar":8,"fiber":6}
      `.trim();

      let parsed: any = {};
      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });
        const raw = completion.choices?.[0]?.message?.content ?? "{}";
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("OpenAI failure:", e);
        res.status(502).json({ error: "upstream_failure" });
        return;
      }

      const toNum = (v: any) =>
        Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0;
      const toMaybeNum = (v: any) =>
        Number.isFinite(Number(v)) ? Number(v) : null;
      const toMaybeStr = (v: any) =>
        typeof v === "string" && v.trim() ? v.trim() : null;

      const result = {
        suggestedName: toMaybeStr(parsed.suggestedName) || null,
        qty: toMaybeNum(parsed.qty),
        unit: toMaybeStr(parsed.unit),
        totals: {
          calories: toNum(parsed.calories),
          protein: toNum(parsed.protein),
          carbs: toNum(parsed.carbs),
          fat: toNum(parsed.fat),
          sugar: toNum(parsed.sugar),
          fiber: toNum(parsed.fiber),
        },
      };

      // increment rate limit + write cache
      await Promise.all([
        rlRef.set({ count: count + 1, ts: Date.now() }, { merge: true }),
        cacheRef.set({
          result,
          ts: Date.now(),
          uid,
          text,
          qty: clientQty,
          unit: clientUnit,
        }),
      ]);

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server_error" });
    }
  }
);
