// functions/src/describe.ts
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import * as crypto from "crypto"; // ⬅️ add this next to other imports

// Node 18/20 has global fetch
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

/* ───────────────────────────── Types ───────────────────────────── */
type PlanItem = {
  exercise: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  notes?: string;
};
type Plan = { items: PlanItem[]; rationale?: string };

type MealV2 = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
};

type MealItemV1 = {
  name: string;
  serving?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  unit?: string;
  qty?: number;
};
type MealResultV1 = { items: MealItemV1[]; rationale?: string };

/** Suggestion card returned to the client */
type SuggestionCard = {
  icon: string; // Ionicons name (e.g., "barbell-outline")
  title: string;
  body: string;
  ctaLabel: string;
  href: string; // app route (e.g., "/(tabs)/workouts")
  tint: "workout" | "meal" | "recovery" | "ok";
};

/** Cache document shape */
type SuggestionDoc = {
  createdAt?:
    | admin.firestore.FieldValue
    | admin.firestore.Timestamp
    | FirebaseFirestore.FieldValue
    | FirebaseFirestore.Timestamp;
  key: string;
  card: SuggestionCard;
};

type ExerciseEstimate = {
  name: string; // short generated name e.g. "Easy Run"
  calories: number; // estimated kcal burned for the described session
  minutes?: number; // parsed/estimated duration (optional)
  mets?: number; // assumed MET value (optional)
  rationale?: string; // one short sentence (optional)
};
/* ─────────────────────────── HTTPS endpoint ─────────────────────────── */
export const describe = onRequest(
  { cors: true },
  async (req, res): Promise<void> => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "method-not-allowed" });
        return;
      }

      // 🔒 Firebase auth (ID token required)
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) {
        res.status(401).json({ error: "unauthenticated" });
        return;
      }

      let uid = "";
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch {
        res.status(401).json({ error: "unauthenticated" });
        return;
      }

      const body = (req.body ?? {}) as {
        mode?: string;

        // workout generator fields
        today?: string;
        profile?: any;
        recent?: any[];

        // meal describe fields
        query?: string;
        rawText?: string;
        context?: any;

        // suggestion fields (compact, client-provided)
        date?: string; // YYYY-MM-DD (local to client)
        timeOfDay?: number; // 0-23
        isRestDay?: boolean;
        goals?: { calories?: number; protein?: number };
        totals?: {
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          burned?: number; // >0 implies a workout logged
        };

        system?: string;
        regenToken?: string | number;
      };

      const mode = (body.mode || "").trim();

      if (mode === "workout_plan:v1") {
        const prompt = buildWorkoutPrompt({
          today: body.today || "",
          profile: body.profile ?? {},
          recent: body.recent ?? [],
          system: body.system,
          regenToken: body.regenToken,
        });
        const plan = (await callOpenAIForJson(prompt, "workout")) as Plan;
        res.status(200).json(plan);
        return;
      }

      // ───────────── AI suggestion card with gating + caching ─────────────
      if (mode === "suggest:v1") {
        const date = (body.date || new Date().toISOString().slice(0, 10)).slice(
          0,
          10
        );
        const hour =
          typeof body.timeOfDay === "number"
            ? clampInt(body.timeOfDay, 0, 23)
            : new Date().getHours();

        const kcalGoal = num(body.goals?.calories, 2200);
        const proteinGoal = num(body.goals?.protein, 120);
        const calories = num(body.totals?.calories, 0);
        const protein = num(body.totals?.protein, 0);
        const burned = num(body.totals?.burned, 0);
        const isRestDay = !!body.isRestDay;

        const cRem = Math.max(0, Math.round(kcalGoal - calories));
        const pRem = Math.max(0, Math.round(proteinGoal - protein));
        const hasWorkout = burned > 0;

        // A) GATE: only call OpenAI if "interesting"
        const interesting = isRestDay || !hasWorkout || cRem > 200 || pRem > 20;

        // B) Coarse bucket key to maximize cache hits
        const key = buildBucketKey({
          date,
          hour,
          isRestDay,
          hasWorkout,
          cRem,
          pRem,
        });
        const docId = `${date}_${key}`;
        const cacheRef = db
          .collection("aiSuggestions")
          .doc(uid)
          .collection("days")
          .doc(docId);

        // Read cache
        try {
          const snap = await cacheRef.get();
          if (snap.exists) {
            const cached = snap.data() as SuggestionDoc;
            if (cached?.card && typeof cached.card.title === "string") {
              res.status(200).json(cached.card);
              return;
            }
          }
        } catch (e) {
          console.warn("[suggest] cache read error", e);
        }

        // Not interesting? Serve rule-based and cache it
        if (!interesting) {
          const card = ruleBasedSuggestion({
            isRestDay,
            calories,
            protein,
            burned,
            kcalGoal,
            proteinGoal,
            hour,
          });
          try {
            await cacheRef.set({
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              key,
              card,
            });
          } catch (e) {
            console.warn("[suggest] cache write error", e);
          }
          res.status(200).json(card);
          return;
        }

        // C) Trim + compact prompt payload (no logs)
        const sugPrompt = buildSuggestionPrompt({
          date,
          timeOfDay: hour,
          isRestDay,
          goals: { calories: kcalGoal, protein: proteinGoal },
          totals: { calories, protein, burned },
          system: body.system,
        });

        let card: SuggestionCard | null = null;
        try {
          // D) Tight prompt + schema for short output
          card = await callOpenAIForSuggestion(sugPrompt);
        } catch (e) {
          console.warn("[suggest] OpenAI failed, using rule fallback", e);
          card = null;
        }

        if (!card) {
          card = ruleBasedSuggestion({
            isRestDay,
            calories,
            protein,
            burned,
            kcalGoal,
            proteinGoal,
            hour,
          });
        }

        // Cache result
        try {
          await cacheRef.set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            key,
            card,
          });
        } catch (e) {
          console.warn("[suggest] cache write error", e);
        }

        res.status(200).json(card);
        return;
      }

      // ───────────── v2 meal (flat totals) ─────────────
      if (mode === "meal:v2") {
        const prompt = buildMealPromptV2({
          text: body.query || body.rawText || "",
          context: body.context ?? {},
          system: body.system,
        });

        const v2 = (await callOpenAIForMealV2(prompt)) as MealV2;

        // Back-compat mirror for existing clients expecting items[]
        const v1Mirror: MealResultV1 = {
          items: [
            {
              name: v2.name,
              serving: v2.unit,
              unit: v2.unit,
              qty: v2.quantity,
              calories: v2.calories,
              protein: v2.protein,
              carbs: v2.carbs,
              fat: v2.fat,
              sugar: v2.sugar,
              fiber: v2.fiber,
            },
          ],
          rationale: undefined,
        };

        res.status(200).json({ ...v2, ...v1Mirror });
        return;
      }

      // ───────────── exercise describe (name + calories) ─────────────
      // ───────────── exercise describe (name + calories) ─────────────
      if (mode === "exercise:v1") {
        const text = String(body.query || body.rawText || "").trim();
        if (!text) {
          res.status(400).json({ error: "missing-text" });
          return;
        }

        // Try to use provided profile; fallback to server fetch of user doc
        let profileInput = body.profile ?? null;
        if (!profileInput) {
          try {
            const snap = await db.collection("users").doc(uid).get();
            if (snap.exists) profileInput = snap.data();
          } catch (e) {
            console.warn("[exercise:v1] profile fetch failed", e);
          }
        }

        // Normalize to a compact shape for energy estimation
        const p = profileEnergyShape(profileInput);

        // 🔑 Build a bucketed cache key (reduces cardinality → more hits)
        const cachePayload = {
          v: 1,
          text: text.toLowerCase(), // normalize
          sex: p?.sex || "",
          ageB: p?.age ? Math.round(p.age / 5) * 5 : null, // bucket age by 5y
          hB: p?.height_cm ? Math.round(p.height_cm / 5) * 5 : null, // bucket height 5 cm
          wB: p?.weight_kg ? Math.round(p.weight_kg / 2) * 2 : null, // bucket weight 2 kg
        };
        const key = hashKey(cachePayload);
        const cacheRef = db.collection("aiExerciseEstimates").doc(key);

        // 1) Try cache
        try {
          const snap = await cacheRef.get();
          if (snap.exists) {
            res.status(200).json(snap.data());
            return;
          }
        } catch (e) {
          console.warn("[exercise:v1] cache read error", e);
        }

        // 2) (Optional) per-user daily cap to limit spend
        const dayId = new Date().toISOString().slice(0, 10);
        const quotaRef = db.collection("aiQuota").doc(`${uid}_${dayId}`);
        let count = 0;
        try {
          const q = await quotaRef.get();
          count = (q.exists ? q.data()?.count || 0 : 0) as number;
        } catch {}

        if (count >= 10) {
          // Over the cap: return heuristic to avoid a paid call
          const h = heuristicCaloriesEstimate(text, p || undefined);
          res.status(200).json(h);
          return;
        }

        // 3) Call OpenAI once
        const prompt = buildExerciseDescribePrompt({
          text,
          profile: p,
          system: body.system,
        });

        try {
          const est = await callOpenAIForExerciseEstimate(prompt);

          // 3a) If the model somehow returns 0/NaN, use heuristic instead
          const calories = Number(est?.calories);
          const finalEst =
            Number.isFinite(calories) && calories > 0
              ? est
              : heuristicCaloriesEstimate(text, p || undefined);

          // 4) Write-through cache + bump quota
          try {
            await cacheRef.set({
              ...finalEst,
              cachePayload,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await quotaRef.set({ count: count + 1 }, { merge: true });
          } catch (e) {
            console.warn("[exercise:v1] cache/quota write error", e);
          }

          res.status(200).json(finalEst);
          return;
        } catch (e: any) {
          console.warn("[exercise:v1] OpenAI failed", e?.message || e);
          // Final conservative fallback
          const h = heuristicCaloriesEstimate(text, p || undefined);
          res.status(200).json(h);
          return;
        }
      }

      // Old v1
      if (mode === "meal:v1") {
        const prompt = buildMealPromptV1({
          text: body.query || body.rawText || "",
          context: body.context ?? {},
          system: body.system,
        });
        const resultV1 = (await callOpenAIForJson(
          prompt,
          "meal"
        )) as MealResultV1;
        res.status(200).json(resultV1);
        return;
      }

      res.status(400).json({ error: "unknown-mode" });
    } catch (err: any) {
      console.error("describe error", err);
      res
        .status(500)
        .json({ error: "internal", detail: err?.message ?? String(err) });
    }
  }
);

/* ───────────────────── Prompt builders ───────────────────── */

function buildWorkoutPrompt(args: {
  today: string;
  profile: any;
  recent: any[];
  system?: string;
  regenToken?: string | number;
}) {
  const sys =
    args.system ||
    [
      "You are a concise strength coach.",
      "Return ONLY JSON with keys:",
      " - items: array of {exercise, sets, reps, weight_kg?, notes?}",
      " - rationale: short string (optional).",
      "Rules:",
      "• 4–7 exercises; prefer compounds first, then accessories.",
      "• Tailor to goal.",
      "• Respect equipment and injuries.",
      "• Add a brief progressive overload note.",
      "• If rest day, return recovery, not lifting.",
      "• Keep rationale one sentence.",
    ].join(" ");

  const recentCompressed = (args.recent || []).map((r) => ({
    d: r.date,
    e: r.exercise,
    s: r.sets,
    r: r.reps,
    w: r.weight_kg,
  }));

  const user = [
    `Today: ${args.today}`,
    `Profile: ${JSON.stringify(args.profile ?? {})}`,
    `Recent (last 12): ${JSON.stringify(recentCompressed)}`,
    args.regenToken ? `Regenerate token: ${args.regenToken}` : "",
    "Output JSON only.",
  ].join("\n");

  return { system: sys, user };
}

/** Strict v1 (items[]) — preserved for legacy clients */
function buildMealPromptV1(args: {
  text: string;
  context: any;
  system?: string;
}) {
  const sys =
    args.system ||
    [
      "You are a nutrition assistant.",
      "Return ONLY JSON with key 'items' as an array of objects.",
      "Each item can include: name, serving, calories, protein, carbs, fat, sugar, fiber.",
      "If a value is unknown, omit that property.",
    ].join(" ");
  const user = `Meal description: ${args.text}\nContext: ${JSON.stringify(
    args.context ?? {}
  )}`;
  return { system: sys, user };
}

/** v2 prompt — one flat, *totalled* meal object (+ few-shots) */
function buildMealPromptV2(args: {
  text: string;
  context: any;
  system?: string;
}) {
  const sys =
    args.system ||
    [
      "You are a meticulous nutrition analyst.",
      "Goal: output TOTAL macros for the entire described meal with a realistic, conservative estimate.",
      "Return ONLY JSON matching the schema exactly.",
      "Rules:",
      "- Provide a concise meal name representing the whole description.",
      "- quantity is a number; unit describes ONE unit plainly.",
      "- calories/protein/carbs/fat/sugar/fiber are totals for the WHOLE meal.",
      "- Sum components; include sauces/oils/cheese.",
      "- No null/undefined/strings for numbers.",
      "- If serving size is ambiguous, assume a common portion and set quantity=1.",
    ].join(" ");

  const examples = [
    {
      user: "Meal description: Chipotle-style bowl with double chicken, white rice, black beans, mild salsa, lettuce, and a small side of guacamole.",
      assistant: JSON.stringify({
        name: "Chipotle-style bowl (double chicken, rice, beans, salsa, lettuce) + small guacamole",
        quantity: 1,
        unit: "bowl",
        calories: 920,
        protein: 70,
        carbs: 85,
        fat: 32,
        sugar: 10,
        fiber: 17,
      }),
    },
    {
      user: "Meal description: Two pancakes with maple syrup and a glass of 2% milk (250 ml).",
      assistant: JSON.stringify({
        name: "Two pancakes with maple syrup + 2% milk",
        quantity: 1,
        unit: "plate",
        calories: 740,
        protein: 18,
        carbs: 108,
        fat: 25,
        sugar: 56,
        fiber: 2,
      }),
    },
  ];

  const user = `Meal description: ${args.text}\nContext: ${JSON.stringify(
    args.context ?? {}
  )}`;

  const messages = [
    { role: "system", content: sys },
    ...examples.flatMap((ex) => [
      { role: "user" as const, content: ex.user },
      { role: "assistant" as const, content: ex.assistant },
    ]),
    { role: "user", content: user },
  ];

  return { system: sys, user, _messages: messages as any };
}

/** prompt for suggest:v1 (compact, bucketed) */
function buildSuggestionPrompt(args: {
  date: string;
  timeOfDay: number; // 0-23
  isRestDay: boolean;
  goals: { calories?: number; protein?: number };
  totals: { calories?: number; protein?: number; burned?: number };
  system?: string;
}) {
  const sys =
    args.system ||
    [
      "You are a health coach who writes SHORT, actionable daily suggestions.",
      "Return ONLY JSON with keys: {icon, title, body, ctaLabel, href, tint}.",
      "Icons: Ionicons names like 'barbell-outline', 'fast-food-outline', 'leaf-outline', 'thumbs-up-outline'.",
      "href: app route string like '/(tabs)/workouts' or '/(tabs)/nutrition'.",
      "tint: 'workout' | 'meal' | 'recovery' | 'ok'.",
      "STRICT OUTPUT LENGTHS:",
      "- title: <= 40 chars.",
      "- body: <= 120 chars. No emojis. Actionable, specific.",
      "Rules: prefer recovery if rest day; else if no workout yet suggest 20–35 min full-body or 20 min zone-2; else if calories/protein notably below targets, propose a meal idea for the next meal slot; else positive reinforcement.",
    ].join(" ");

  // Compact, integers only
  const payload = {
    d: args.date,
    tod: clampInt(args.timeOfDay, 0, 23),
    rest: !!args.isRestDay,
    g: {
      k: num(args.goals?.calories, 2200),
      p: num(args.goals?.protein, 120),
    },
    t: {
      k: num(args.totals?.calories, 0),
      p: num(args.totals?.protein, 0),
      b: num(args.totals?.burned, 0),
    },
  };

  const user = `Context: ${JSON.stringify(payload)}\nReturn JSON only.`;

  return { system: sys, user };
}

// ⬇️ Put alongside buildMealPromptV2 / buildSuggestionPrompt
function buildExerciseDescribePrompt(args: {
  text: string;
  profile?: {
    sex?: string;
    age?: number;
    height_cm?: number;
    weight_kg?: number;
    fitnessLevel?: string;
  } | null;
  system?: string;
}) {
  const sys =
    args.system ||
    [
      "You are an exercise physiologist.",
      "Task: Parse the user's description of an exercise session and estimate total calories burned.",
      "Return ONLY JSON matching the schema exactly.",
      "Guidelines:",
      "- Infer duration from the text if given (e.g., '20 min jog' -> minutes=20).",
      "- If duration is not explicit, infer a reasonable typical duration from context; keep it conservative.",
      "- Use profile (sex/age/height_cm/weight_kg/fitnessLevel) to adjust energy cost.",
      "- If intensity is unclear, assume moderate.",
      "- Provide a concise short name as the session description (≤30 chars).",
      "- No null/undefined/strings for numbers.",
      "- When uncertain, prefer UNDER-estimating calories.",
    ].join(" ");

  const payload = {
    text: args.text,
    profile: args.profile || null,
  };

  const user = `Session: ${JSON.stringify(payload)}\nReturn JSON only.`;

  return { system: sys, user };
}

/* ───────────────────── OpenAI callers ───────────────────── */

async function callOpenAIForJson(
  prompt: { system: string; user: string },
  kind: "workout" | "meal"
): Promise<Plan | MealResultV1> {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const base: any = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: 0.3,
  };

  const body =
    kind === "meal"
      ? {
          ...base,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "MealItemsV1",
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["items"],
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["name"],
                      properties: {
                        name: { type: "string" },
                        serving: { type: "string" },
                        calories: { type: "number" },
                        protein: { type: "number" },
                        carbs: { type: "number" },
                        fat: { type: "number" },
                        sugar: { type: "number" },
                        fiber: { type: "number" },
                      },
                    },
                  },
                  rationale: { type: "string" },
                },
              },
            },
          },
        }
      : {
          ...base,
          response_format: { type: "json_object" },
        };

  const rsp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!rsp.ok) {
    const t = await safeText(rsp);
    throw new Error(`OpenAI ${rsp.status}: ${t}`);
  }

  const data: any = await rsp.json();
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.message ??
    data?.choices?.[0]?.text ??
    "{}";

  try {
    return JSON.parse(typeof text === "string" ? text : String(text));
  } catch {
    return kind === "meal"
      ? ({ items: [] } as MealResultV1)
      : ({ items: [] } as any);
  }
}

async function callOpenAIForMealV2(prompt: {
  system: string;
  user: string;
  _messages?: any[];
}): Promise<MealV2> {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const messages = prompt._messages ?? [
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user },
  ];

  const body = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "MealV2Totals",
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "quantity",
            "unit",
            "calories",
            "protein",
            "carbs",
            "fat",
            "sugar",
            "fiber",
          ],
          properties: {
            name: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string" },
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fat: { type: "number" },
            sugar: { type: "number" },
            fiber: { type: "number" },
          },
        },
        strict: true,
      },
    },
  };

  const rsp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!rsp.ok) {
    const t = await safeText(rsp);
    throw new Error(`OpenAI ${rsp.status}: ${t}`);
  }

  const data: any = await rsp.json();
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.message ??
    data?.choices?.[0]?.text ??
    "{}";

  let out: MealV2 = {
    name: "Meal",
    quantity: 1,
    unit: "serving",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    fiber: 0,
  };

  try {
    const parsed = JSON.parse(typeof text === "string" ? text : String(text));
    out = {
      name: String(parsed?.name ?? out.name),
      quantity: num(parsed?.quantity, 1),
      unit: String(parsed?.unit ?? out.unit),
      calories: num(parsed?.calories, 0),
      protein: num(parsed?.protein, 0),
      carbs: num(parsed?.carbs, 0),
      fat: num(parsed?.fat, 0),
      sugar: num(parsed?.sugar, 0),
      fiber: num(parsed?.fiber, 0),
    };
  } catch {
    // keep defaults
  }

  return out;
}

/** OpenAI caller for suggest:v1 (tight schema) */
async function callOpenAIForSuggestion(prompt: {
  system: string;
  user: string;
}): Promise<SuggestionCard> {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const body = {
    model: "gpt-4o-mini",
    temperature: 0.35,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "SuggestionCard",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["icon", "title", "body", "ctaLabel", "href", "tint"],
          properties: {
            icon: { type: "string" },
            title: { type: "string", maxLength: 40 },
            body: { type: "string", maxLength: 140 },
            ctaLabel: { type: "string", maxLength: 30 },
            href: { type: "string" },
            tint: {
              type: "string",
              enum: ["workout", "meal", "recovery", "ok"],
            },
          },
        },
        strict: true,
      },
    },
  };

  const rsp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!rsp.ok) {
    const t = await safeText(rsp);
    throw new Error(`OpenAI ${rsp.status}: ${t}`);
  }

  const data: any = await rsp.json();
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.message ??
    data?.choices?.[0]?.text ??
    "{}";

  try {
    const parsed = JSON.parse(typeof text === "string" ? text : String(text));
    if (
      parsed &&
      typeof parsed.title === "string" &&
      typeof parsed.ctaLabel === "string" &&
      typeof parsed.href === "string" &&
      typeof parsed.tint === "string"
    ) {
      return parsed as SuggestionCard;
    }
  } catch {}
  throw new Error("bad-suggestion-json");
}

// ⬇️ Put after callOpenAIForMealV2 / callOpenAIForSuggestion
async function callOpenAIForExerciseEstimate(prompt: {
  system: string;
  user: string;
}): Promise<ExerciseEstimate> {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const body = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 120, // keep output tiny/cheap
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ExerciseEstimate",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["name", "calories"],
          properties: {
            name: { type: "string", maxLength: 30 },
            calories: { type: "number", minimum: 0 },
            minutes: { type: "number", minimum: 0 },
            mets: { type: "number", minimum: 0 },
            rationale: { type: "string", maxLength: 160 },
          },
        },
        strict: true,
      },
    },
  };

  const rsp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!rsp.ok) {
    const t = await safeText(rsp);
    throw new Error(`OpenAI ${rsp.status}: ${t}`);
  }

  const data: any = await rsp.json();
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.message ??
    data?.choices?.[0]?.text ??
    "{}";

  let out: ExerciseEstimate = { name: "Exercise", calories: 0 };
  try {
    const parsed = JSON.parse(typeof text === "string" ? text : String(text));
    out = {
      name: String(parsed?.name ?? out.name),
      calories: num(parsed?.calories, 0),
      minutes: parsed?.minutes != null ? num(parsed?.minutes, 0) : undefined,
      mets: parsed?.mets != null ? num(parsed?.mets, 0) : undefined,
      rationale:
        typeof parsed?.rationale === "string" ? parsed.rationale : undefined,
    };
  } catch {
    // keep defaults
  }
  return out;
}

/* ───────────────────────── Helpers ───────────────────────── */

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clampInt(n: number, lo: number, hi: number) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}
function bucket(val: number, stops: number[]): string {
  // returns index bucket label "b0","b1",...,"bN"
  let i = 0;
  while (i < stops.length && val > stops[i]) i++;
  return `b${i}`;
}
function todBucket(h: number): string {
  if (h < 11) return "morning";
  if (h < 15) return "afternoon";
  if (h < 19) return "evening";
  return "night";
}
function buildBucketKey(args: {
  date: string;
  hour: number;
  isRestDay: boolean;
  hasWorkout: boolean;
  cRem: number;
  pRem: number;
}): string {
  // Coarse buckets to maximize cache hits
  const t = todBucket(args.hour);
  const cB = bucket(args.cRem, [200, 500]); // ≤200, 201–500, >500
  const pB = bucket(args.pRem, [20, 40]); // ≤20, 21–40, >40
  const r = args.isRestDay ? "R1" : "R0";
  const w = args.hasWorkout ? "W1" : "W0";
  return `${args.date}|${t}|${r}|${w}|C${cB}|P${pB}`;
}

async function safeText(r: Response): Promise<string> {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
function hashKey(payload: any) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);
}

/** Tiny, conservative heuristic as last-ditch fallback */
function heuristicCaloriesEstimate(
  text: string,
  p?: { weight_kg?: number }
): { name: string; calories: number; rationale: string } {
  const t = text.toLowerCase();
  let basePer30 = 120; // very light
  if (/\b(run|jog|sprint|treadmill)\b/.test(t)) basePer30 = 350;
  else if (/\b(hiit|interval|burpee|metcon|circuit)\b/.test(t)) basePer30 = 320;
  else if (/\b(cycle|bike|spin)\b/.test(t)) basePer30 = 280;
  else if (/\b(swim|laps)\b/.test(t)) basePer30 = 300;
  else if (/\b(walk|steps|hike)\b/.test(t)) basePer30 = 180;
  else if (/\b(row|erg)\b/.test(t)) basePer30 = 260;
  else if (/\b(yoga|pilates|mobility|stretch)\b/.test(t)) basePer30 = 140;
  else if (
    /\b(strength|weights|lifting|barbell|dumbbell|bench|squat|deadlift)\b/.test(
      t
    )
  )
    basePer30 = 220;

  // duration
  const minMatch = t.match(/(\d{1,3})\s?(min|mins|minutes)/);
  const hrMatch = t.match(/(\d(?:\.\d)?)\s?(h|hr|hrs|hour|hours)/);
  let mins = 30;
  if (minMatch) mins = Math.max(5, Math.min(180, Number(minMatch[1])));
  else if (hrMatch)
    mins = Math.max(10, Math.min(180, Math.round(Number(hrMatch[1]) * 60)));

  // light scaling by body mass if present
  const w = Number(p?.weight_kg || 0);
  const massScale = w ? Math.min(1.3, Math.max(0.7, w / 70)) : 1;

  const cals = Math.round((basePer30 / 30) * mins * massScale);
  return {
    name: "Exercise session",
    calories: Math.max(0, cals),
    rationale: "Heuristic fallback used (model unavailable).",
  };
}

// ⬇️ Put near other small helpers
function profileEnergyShape(src: any | null) {
  if (!src) return null;

  const toNum = (v: any) =>
    Number.isFinite(Number(v)) ? Number(v) : undefined;

  // Try multiple common key names to be resilient to schema variations
  const heightCm =
    toNum(src?.heightCm) ??
    toNum(src?.height_cm) ??
    (toNum(src?.heightIn)
      ? Math.round(Number(src.heightIn) * 2.54)
      : undefined);

  const weightKg =
    toNum(src?.weightKg) ??
    toNum(src?.weight_kg) ??
    (toNum(src?.weightLb)
      ? Math.round(Number(src.weightLb) * 0.453592)
      : undefined);

  const sex =
    (src?.sex || src?.gender || "").toString().toLowerCase() || undefined;

  let age = toNum(src?.age);
  if (!age && src?.birthYear && Number.isFinite(Number(src.birthYear))) {
    const y = new Date().getFullYear() - Number(src.birthYear);
    if (y > 0 && y < 120) age = y;
  }

  const fitnessLevel = src?.fitnessLevel || src?.activityLevel || undefined;

  return {
    sex, // "male" | "female" | etc (freeform; model will handle)
    age, // years
    height_cm: heightCm,
    weight_kg: weightKg,
    fitnessLevel, // optional hint
  };
}

/** Server-side rule fallback (mirrors client behavior) */
function ruleBasedSuggestion(args: {
  isRestDay: boolean;
  calories: number;
  protein: number;
  burned: number;
  kcalGoal: number;
  proteinGoal: number;
  hour: number;
}): SuggestionCard {
  const mealSlot =
    args.hour < 11
      ? "breakfast"
      : args.hour < 15
      ? "lunch"
      : args.hour < 19
      ? "dinner"
      : "snacks";
  const cRemaining = Math.max(0, Math.round(args.kcalGoal - args.calories));
  const pRemaining = Math.max(0, Math.round(args.proteinGoal - args.protein));
  const noWorkout = args.burned <= 0;

  if (args.isRestDay) {
    return {
      icon: "leaf-outline",
      title: "Recovery day focus",
      body:
        pRemaining > 0
          ? `Keep it light; aim for ${pRemaining}g protein left. Add a 20–30 min walk and 5–10 min mobility. Hydrate!`
          : "Keep it light: whole foods, 20–30 min walk, 5–10 min mobility. Hydrate!",
      ctaLabel: "Log mobility / walk",
      href: "/(tabs)/workouts",
      tint: "recovery",
    };
  }
  if (noWorkout) {
    return {
      icon: "barbell-outline",
      title: args.hour < 15 ? "Morning boost" : "Evening boost",
      body: "Try 25–35 min full-body (3 rounds, 6–10 reps) or 20 min zone-2 cardio. Keep RPE ~6–7.",
      ctaLabel: "Start a workout",
      href: "/(tabs)/workouts",
      tint: "workout",
    };
  }
  if (cRemaining > 120 || pRemaining > 15) {
    return {
      icon: "fast-food-outline",
      title: `Dial in your ${mealSlot}`,
      body: `~${Math.min(cRemaining, 650)} kcal and ≥${Math.min(
        pRemaining || 25,
        55
      )}g protein. E.g., chicken bowl or Greek yogurt + fruit + granola.`,
      ctaLabel: "Add a meal",
      href: "/(tabs)/nutrition",
      tint: "meal",
    };
  }
  return {
    icon: "thumbs-up-outline",
    title: "Nice pace today",
    body: "On track. Keep meals balanced, hydrate, and cap the day with a short walk.",
    ctaLabel: "Review nutrition",
    href: "/(tabs)/nutrition",
    tint: "ok",
  };
}
