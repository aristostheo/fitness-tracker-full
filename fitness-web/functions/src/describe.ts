// functions/src/describe.ts
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";

// Node 18/20 provides global fetch. No need for node-fetch.
if (!admin.apps.length) admin.initializeApp();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

/** ---------------- Types ---------------- */
type PlanItem = {
  exercise: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  notes?: string;
};
type Plan = { items: PlanItem[]; rationale?: string };

type MealItem = {
  name: string;
  serving?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
};
type MealResult = { items: MealItem[]; rationale?: string };

/** ---------------- HTTPS endpoint ---------------- */
export const describe = onRequest(
  { cors: true },
  async (req, res): Promise<void> => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "method-not-allowed" });
        return;
      }

      // 🔒 Firebase auth
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) {
        res.status(401).json({ error: "unauthenticated" });
        return;
      }
      try {
        await admin.auth().verifyIdToken(token);
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

        system?: string;
      };

      const mode = body.mode || "";

      if (mode === "workout_plan:v1") {
        const prompt = buildWorkoutPrompt({
          today: body.today || "",
          profile: body.profile ?? {},
          recent: body.recent ?? [],
          system: body.system,
        });

        const plan = (await callOpenAIForJson(prompt, "workout")) as Plan;
        res.status(200).json(plan);
        return;
      }

      if (mode === "meal:v1") {
        const prompt = buildMealPrompt({
          query: body.query ?? "",
          rawText: body.rawText ?? "",
          context: body.context ?? {},
          system: body.system,
        });

        const parsed = (await callOpenAIForJson(prompt, "meal")) as MealResult;
        res.status(200).json(parsed);
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

/** ---------------- Prompt builders ---------------- */
function buildWorkoutPrompt(args: {
  today: string;
  profile: any;
  recent: any[];
  system?: string;
}) {
  const sys =
    args.system ||
    "You are a concise strength coach. Return ONLY JSON with keys: items (array of {exercise, sets, reps, weight_kg?, notes?}) and rationale (string, optional). Keep items 4–7. Prefer available equipment. Avoid injuries. Omit weight_kg if unknown. Use short exercise names.";
  const user =
    `Today is: ${args.today}\n` +
    `Profile: ${JSON.stringify(args.profile ?? {})}\n` +
    `Recent: ${JSON.stringify(args.recent ?? [])}\n` +
    `Return JSON only.`;
  return { system: sys, user };
}

function buildMealPrompt(args: {
  query: string;
  rawText: string;
  context: any;
  system?: string;
}) {
  const sys =
    args.system ||
    [
      "You are a nutrition assistant.",
      "Return ONLY JSON matching the provided schema.",
      "Units: grams for macros, calories for energy.",
      'If a value is unknown, omit that property (do NOT write null or "unknown").',
      'Keep names short and human-readable (e.g., "Chicken wrap").',
    ].join(" ");
  const user =
    `Meal description: ${args.query || args.rawText}\n` +
    `Context: ${JSON.stringify(args.context ?? {})}`;
  return { system: sys, user };
}

/** ---------------- OpenAI call (shared) ---------------- */
async function callOpenAIForJson(
  prompt: { system: string; user: string },
  kind: "workout" | "meal"
): Promise<Plan | MealResult> {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const base = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: 0.5,
  } as any;

  // For meals, enforce a strict schema so the app gets the exact keys it expects.
  const body =
    kind === "meal"
      ? {
          ...base,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "MealItems",
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
    const parsed = JSON.parse(typeof text === "string" ? text : String(text));
    if (kind === "workout") {
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      const out: Plan = {
        items: items.map((it: any) => ({
          exercise: String(it.exercise || "").trim(),
          sets: it.sets != null ? Number(it.sets) : undefined,
          reps: it.reps != null ? Number(it.reps) : undefined,
          weight_kg: it.weight_kg != null ? Number(it.weight_kg) : undefined,
          notes: it.notes ? String(it.notes) : undefined,
        })),
        rationale: parsed?.rationale ? String(parsed.rationale) : undefined,
      };
      return out;
    } else {
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      const out: MealResult = {
        items: items.map(normalizeMeal),
        rationale: parsed?.rationale ? String(parsed.rationale) : undefined,
      };
      return out;
    }
  } catch {
    // return safe defaults
    return kind === "workout"
      ? ({ items: [], rationale: "" } as Plan)
      : ({ items: [], rationale: "" } as MealResult);
  }
}

/** ---------------- Helpers ---------------- */
function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeMeal(raw: any): MealItem {
  // Also tolerate older/variant shapes from model responses
  const m = raw?.macros && typeof raw.macros === "object" ? raw.macros : raw;

  const pick = (obj: any, keys: string[]) => {
    for (const k of keys) {
      if (obj?.[k] != null) return obj[k];
    }
    return undefined;
  };

  const name = String(
    raw?.name ??
      raw?.food ??
      raw?.title ??
      (typeof raw === "string" ? raw : "") ??
      ""
  ).trim();

  const serving = pick(raw, ["serving", "portion", "unit", "size"]);

  const calories = numOrUndef(
    pick(m, ["calories", "kcal", "energy", "energy_kcal", "calories_kcal"])
  );
  const protein = numOrUndef(
    pick(m, ["protein", "protein_g", "proteins", "prot"])
  );
  const carbs = numOrUndef(
    pick(m, ["carbs", "carbohydrates", "carbs_g", "carbohydrate_g"])
  );
  const fat = numOrUndef(pick(m, ["fat", "fats", "fat_g", "lipids"]));
  const sugar = numOrUndef(pick(m, ["sugar", "sugars", "sugar_g"]));
  const fiber = numOrUndef(pick(m, ["fiber", "fibre", "fiber_g"]));

  return { name, serving, calories, protein, carbs, fat, sugar, fiber };
}

async function safeText(r: Response): Promise<string> {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
