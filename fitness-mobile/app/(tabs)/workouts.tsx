// app/(tabs)/workouts.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import Card from "@/components/Card";
import {
  addWorkout,
  deleteWorkout,
  subscribeWorkouts,
  updateWorkout,
  type Workout,
} from "@/services/workouts";
import {
  ensureProfile,
  subscribeProfile,
  updateProfile,
  type Profile,
} from "@/services/profile";
import {
  subscribeWorkoutPresets,
  addWorkoutPreset,
  type WorkoutPreset,
} from "@/services/presets";

import {
  addExerciseBurn,
  deleteExerciseBurn,
  type ExerciseBurnEntry,
} from "@/services/exerciseBurn";

import {
  subscribeExerciseBetween,
  type ExerciseEntry,
} from "@/services/nutrition";
import { kgToLb, lbToKg } from "@/utils/units";
import { fmt, startOfMonth, startOfWeek, endOfToday } from "@/utils/date";
import { auth } from "@/lib/firebase";

import { withAlpha } from "@/components/workouts/utils/withAlpha";
import { Field } from "@/components/workouts/ui/Field";
import { EmptyState } from "@/components/workouts/ui/EmptyState";
import { GradientButton } from "@/components/workouts/ui/GradientButton";

import Hero from "@/components/workouts/Hero";
import Filters from "@/components/workouts/Filters";
import AddWorkoutForm from "@/components/workouts/AddWorkoutForm";
import GroupedWorkouts from "@/components/workouts/GroupedWorkouts";
import ExerciseSearchSheet from "@/components/workouts/ExerciseSearchSheet";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import WorkoutGenerator from "@/components/workouts/WorkoutGenerator";

/* 🔰 Badges */
import BadgeCelebrate from "@/components/badges/BadgeCelebrate";
import { evaluateBadges } from "@/services/badges";

/* Firestore helpers for badge counts */
import {
  getFirestore,
  collection,
  getCountFromServer,
} from "firebase/firestore";
import ExerciseCard from "@/components/nutrition/ExerciseCard";

const db = getFirestore();

/* ────────────────────────────────────────────────────────────── */
/* Types & helpers                                                */
/* ────────────────────────────────────────────────────────────── */

type PresetKey = "all" | "week" | "7" | "month" | "30";

type Ex = {
  name: string;
  tags: string[];
  needs?: (
    | "barbell"
    | "dumbbells"
    | "kettlebells"
    | "cable"
    | "machines"
    | "pullupbar"
    | "bands"
  )[];
  avoidIfInjuries?: string[];
  place?: ("home" | "gym")[];
};

const EXERCISES: Ex[] = [
  {
    name: "Back Squat",
    tags: ["barbell", "legs", "compound"],
    needs: ["barbell"],
    avoidIfInjuries: ["knee", "lowback"],
    place: ["gym"],
  },
  {
    name: "Goblet Squat",
    tags: ["dumbbells", "legs", "compound"],
    needs: ["dumbbells"],
    place: ["home", "gym"],
  },
  {
    name: "Romanian Deadlift",
    tags: ["barbell", "hinge", "hamstrings"],
    needs: ["barbell"],
    avoidIfInjuries: ["lowback"],
    place: ["gym"],
  },
  {
    name: "RDL (DB)",
    tags: ["dumbbells", "hinge", "hamstrings"],
    needs: ["dumbbells"],
    place: ["home", "gym"],
  },
  {
    name: "Bench Press",
    tags: ["barbell", "push", "chest"],
    needs: ["barbell"],
    avoidIfInjuries: ["shoulder"],
    place: ["gym"],
  },
  {
    name: "DB Bench Press",
    tags: ["dumbbells", "push", "chest"],
    needs: ["dumbbells"],
    avoidIfInjuries: ["shoulder"],
    place: ["home", "gym"],
  },
  {
    name: "Pull-ups",
    tags: ["pull", "back", "bodyweight"],
    needs: ["pullupbar"],
    place: ["home", "gym"],
  },
  {
    name: "Bent-Over Row (DB)",
    tags: ["dumbbells", "pull", "back"],
    needs: ["dumbbells"],
    avoidIfInjuries: ["lowback"],
    place: ["home", "gym"],
  },
  {
    name: "Overhead Press (DB)",
    tags: ["dumbbells", "push", "shoulders"],
    needs: ["dumbbells"],
    avoidIfInjuries: ["shoulder"],
    place: ["home", "gym"],
  },
  {
    name: "Band Face Pull",
    tags: ["bands", "rear-delts", "shoulders"],
    needs: ["bands"],
    place: ["home", "gym"],
  },
];
// Session cache for exercise estimates (avoid extra network calls)
const exEstimateCache = new Map<string, { name: string; calories: number }>();

function normalizeDesc(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// bucket profile a bit so “close enough” doesn’t miss cache
function profileBucket(p?: Profile | null) {
  if (!p) return "";
  const age = (p as any)?.age;
  const height = (p as any)?.heightCm ?? (p as any)?.height_cm ?? undefined;
  const weight = (p as any)?.weightKg ?? (p as any)?.weight_kg ?? undefined;
  const sex = (p as any)?.sex || (p as any)?.gender || "";

  const ageB = Number.isFinite(Number(age))
    ? Math.round(Number(age) / 5) * 5
    : "";
  const hB = Number.isFinite(Number(height))
    ? Math.round(Number(height) / 5) * 5
    : "";
  const wB = Number.isFinite(Number(weight))
    ? Math.round(Number(weight) / 2) * 2
    : "";

  return `${sex}|${ageB}|${hB}|${wB}`;
}

function isGenericName(s: string) {
  const x = (s || "").trim().toLowerCase();
  return (
    !x ||
    x === "exercise" ||
    x === "session" ||
    x === "exercise session" ||
    x === "workout"
  );
}

function deriveNameFromDesc(rawText: string) {
  // normalize and keep original for casing later
  const raw = rawText || "";
  let s = raw.toLowerCase();

  // strip leading duration like "20 min", "45mins", "1h", "for 30 minutes"
  s = s.replace(
    /^\s*(for\s*)?(\d+(\.\d+)?)\s*(min|mins|minutes|h|hr|hrs|hour|hours)\b\s*/i,
    ""
  );

  // remove trailing qualifiers that aren’t core to the name
  s = s.replace(/\s+at\s+(easy|moderate|hard|tempo|fast|slow)\s+pace\b/i, "");
  s = s.replace(/\s*\b(rpe|intensity)\s*\d+(\.\d+)?\b/i, "");

  // trim punctuation/clutter
  s = s.replace(/^[\s:,\-–—]+|[\s:,\-–—]+$/g, "");
  s = s.replace(/\s{2,}/g, " ").trim();

  // common corrections / pluralizations
  const corrections: Record<string, string> = {
    pilate: "pilates",
    tredmill: "treadmill",
    tredmil: "treadmill",
    streching: "stretching",
  };
  s = s
    .split(" ")
    .map((w) => corrections[w] ?? w)
    .join(" ");

  // Title-case but preserve common fitness acronyms
  const keepUpper = new Set([
    "HIIT",
    "EMOM",
    "AMRAP",
    "LISS",
    "VO2",
    "FTP",
    "RPE",
  ]);
  const titled = s
    .split(" ")
    .map((w) => {
      const ww = w.toUpperCase();
      if (keepUpper.has(ww)) return ww;
      return w.replace(/^\w/, (c) => c.toUpperCase());
    })
    .join(" ");

  // If we ended up with something too short, give a safe fallback
  return titled.length >= 4 ? titled : "Exercise";
}

/* ─────────────────── PR helpers ─────────────────── */
function volumeKgOf(w: Workout) {
  const s = Number(w.sets || 0);
  const r = Number(w.reps || 0);
  const wt = Number(w.weight || 0);
  return s * r * wt;
}

function createdAtMs(x: Workout | { createdAt?: any }) {
  const t = (x as any)?.createdAt;
  if (!t) return 0;
  if (typeof t === "number") return t;
  if (typeof t?.toMillis === "function") return t.toMillis();
  return 0;
}

function computePrFlags(all: Workout[]) {
  const list = all
    .slice()
    .sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        createdAtMs(a) - createdAtMs(b)
    );

  const bestByExercise = new Map<string, { weight: number; volume: number }>();
  const flags: Record<string, { prWeight: boolean; prVolume: boolean }> = {};
  for (const w of list) {
    const ex = (w.exercise || "").trim().toLowerCase();
    const prev = bestByExercise.get(ex) || { weight: 0, volume: 0 };
    const isPRw = Number(w.weight || 0) > prev.weight;
    const vol = volumeKgOf(w);
    const isPRv = vol > prev.volume;
    flags[w.id] = { prWeight: isPRw, prVolume: isPRv };
    bestByExercise.set(ex, {
      weight: Math.max(prev.weight, Number(w.weight || 0)),
      volume: Math.max(prev.volume, vol),
    });
  }
  return flags;
}

/* ───────────── NEW: OpenAI workout generator helpers ───────────── */
function profileContext(profile: Profile | null) {
  if (!profile) return {};
  return {
    goal: (profile as any)?.goal ?? null,
    trainingDaysPerWeek: (profile as any)?.trainingDaysPerWeek ?? null,
    equipment: profile?.equipment ?? [],
    place: (profile as any)?.workoutPlace ?? null,
    injuries: profile?.injuries ?? [],
    weightUnit: profile?.weightUnit ?? "kg",
    dietType: (profile as any)?.dietType ?? null,
    stepsGoal: (profile as any)?.stepsGoal ?? null,
    restDays: (profile as any)?.restDays ?? {},
  };
}

function recentHistory(workouts: Workout[], limit = 12) {
  return workouts
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((w) => ({
      date: w.date,
      exercise: w.exercise,
      sets: w.sets,
      reps: w.reps,
      weight_kg: w.weight,
    }));
}

async function generatePlanWithOpenAI(args: {
  dayText: string;
  profile: any;
  recent: any[];
  regenToken?: string | number;
}) {
  const url = process.env.EXPO_PUBLIC_AI_DESCRIBE_URL;
  if (!url) throw new Error("Missing EXPO_PUBLIC_AI_DESCRIBE_URL");

  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error("Not signed in (no ID token)");

  const payload = {
    mode: "workout_plan:v1",
    today: args.dayText,
    profile: args.profile ?? {},
    recent: args.recent ?? [],
    regenToken: args.regenToken ?? Date.now(),
    system: undefined,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Describe API error ${res.status}: ${t}`);
  }

  const ct = res.headers.get("content-type") || "";
  let raw: any = ct.includes("application/json")
    ? await res.json()
    : await res.text();
  let plan: any = null;

  if (raw && raw.items && Array.isArray(raw.items)) plan = raw;
  else if (raw && raw.data && raw.data.items) plan = raw.data;
  else if (typeof raw === "string") {
    const m = raw.match(/\{[\s\S]*\}$/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        if (parsed && Array.isArray(parsed.items)) plan = parsed;
      } catch {}
    }
  }
  return plan ?? { items: [], rationale: "" };
}

/* ──────────────── Badge helpers (counts & streak) ──────────────── */
async function getWorkoutsAllTime(uid: string): Promise<number> {
  const collRef = collection(db, "users", uid, "workouts"); // ✅ correct collection
  const snap = await getCountFromServer(collRef);
  return Number(snap.data().count || 0);
}

function computeDaysStreakFromDates(dates: string[], refISO: string): number {
  const set = new Set(dates.filter(Boolean));
  let streak = 0;
  let cur = new Date(refISO);
  // Normalize to YYYY-MM-DD just in case
  const iso = (d: Date) => fmt(d);
  while (true) {
    const key = iso(cur);
    if (!set.has(key)) break;
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

/* ────────────────────────── screen ────────────────────────── */
export default function WorkoutsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const { user } = useAuth();
  const uid = user?.uid ?? "__demo__";

  /* 🎉 celebration modal */
  const [celebrateIds, setCelebrateIds] = useState<string[]>([]);

  /* Profile + units */
  const [profile, setProfile] = useState<Profile | null>(null);
  const unit = profile?.weightUnit === "lb" ? "lb" : "kg";

  useEffect(() => {
    if (!user?.uid) return;
    let unsub: undefined | (() => void);
    (async () => {
      await ensureProfile(user.uid, user?.email ? { email: user.email } : {});
      unsub = subscribeProfile(user.uid, setProfile);
    })();
    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, [user?.uid]);

  /* Rest-day flag */
  const todayStr = useMemo(() => fmt(new Date()), []);
  const restDays = (profile as any)?.restDays || {};
  const isRestToday = !!restDays?.[todayStr];

  async function toggleRestToday(v: boolean) {
    if (!user?.uid) return;
    try {
      await updateProfile(user.uid, { [`restDays.${todayStr}`]: v });
    } catch (e) {
      console.warn("toggle rest day", e);
    }
  }

  const goal = (profile?.goal as "maintain" | "lose" | "gain") ?? "maintain";
  const trainingDays = Number((profile as any)?.trainingDaysPerWeek ?? 3);
  const equipmentOwned = (profile?.equipment ?? []) as string[];
  const place = (profile?.workoutPlace as "home" | "gym") ?? "home";
  const injuries = (profile?.injuries ?? []) as string[];
  const isLB = unit === "lb";

  /* Filter exercise pool by profile */
  const profileFriendlyExercises = useMemo(() => {
    const owns = new Set(equipmentOwned);
    const inj = (injuries || []).map((s) => s.toLowerCase());

    return EXERCISES.filter((ex) => {
      if (ex.place && !ex.place.includes(place)) return false;
      if (ex.needs && ex.needs.some((req) => !owns.has(req))) return false;
      if (
        ex.avoidIfInjuries &&
        ex.avoidIfInjuries.some((flag) => inj.some((x) => x.includes(flag)))
      )
        return false;
      return true;
    });
  }, [equipmentOwned, injuries, place]);

  /* Suggested */
  const suggested = useMemo(() => {
    const pick = (tag: string) =>
      profileFriendlyExercises.find((e) => e.tags.includes(tag));
    const wantPush = ["gain", "maintain"].includes(goal);
    const list = [
      pick("legs") ?? pick("compound"),
      wantPush ? pick("push") ?? pick("chest") : null,
      pick("hinge") ?? pick("back"),
      pick("pull"),
    ].filter(Boolean) as Ex[];
    return Array.from(new Map(list.map((e) => [e.name, e])).values()).slice(
      0,
      4
    );
  }, [profileFriendlyExercises, goal]);

  /* Preset date filters */
  const [preset, setPreset] = useState<PresetKey>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    const today = endOfToday(new Date());
    if (preset === "all") {
      setFrom("");
      setTo("");
      return;
    }
    if (preset === "week") {
      setFrom(fmt(startOfWeek(today)));
      setTo(fmt(today));
      return;
    }
    if (preset === "7") {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      setFrom(fmt(s));
      setTo(fmt(today));
      return;
    }
    if (preset === "month") {
      setFrom(fmt(startOfMonth(today)));
      setTo(fmt(today));
      return;
    }
    if (preset === "30") {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      setFrom(fmt(s));
      setTo(fmt(today));
      return;
    }
  }, [preset]);

  useEffect(() => {
    if (from && to && from > to) setTo("");
  }, [from, to]);

  /* Workouts stream */
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  useEffect(() => {
    if (!user?.uid) {
      setWorkouts([]);
      return;
    }
    return subscribeWorkouts(user.uid, setWorkouts, { from, to });
  }, [user?.uid, from, to]);

  /* Workout presets */
  const [presets, setPresets] = useState<WorkoutPreset[]>([]);
  const [newPreset, setNewPreset] = useState("");
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeWorkoutPresets(user.uid, setPresets);
  }, [user?.uid]);

  const safePresets = useMemo(() => {
    return (presets ?? [])
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [presets]);

  /* Add form state */
  const todayISO = useMemo(() => fmt(new Date()), []);
  const [date, setDate] = useState(todayISO);
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);

  // ───── Exercise burn card state (moved from Nutrition screen) ─────
  type ExerciseBurn = {
    id: string;
    name: string;
    calories: number;
    persistedId?: string;
  };
  const [exItems, setExItems] = useState<ExerciseBurn[]>([]);
  const [exName, setExName] = useState<string>("");
  const [exCalories, setExCalories] = useState<string>("");

  useEffect(() => {
    if (!user?.uid || !date) return;

    // use the range API with from==to (works with createdAt too)
    return subscribeExerciseBetween(
      user.uid,
      date,
      date,
      (arr: ExerciseEntry[]) => {
        setExItems(
          (arr || []).map((e: any) => ({
            id: e.id, // Firestore doc id
            persistedId: e.id,
            name: e.name || e.title || "Exercise",
            calories: Number(e.calories || 0),
          }))
        );
      }
    );
  }, [user?.uid, date]);
  // replace the whole function
  async function addExerciseSubmit() {
    const rawName = (exName || "").trim();
    const finalName = isGenericName(rawName)
      ? deriveNameFromDesc(exDesc || rawName)
      : rawName;

    const calsRaw = Number(exCalories);
    const cals = Math.max(
      0,
      Math.round(Number.isFinite(calsRaw) ? calsRaw : 0)
    );

    if (!finalName || cals <= 0) {
      alert("Add a descriptive name and positive calories.");
      return;
    }
    if (!user?.uid) {
      alert("Sign in required");
      return;
    }

    // optimistic local insert
    const tempId = `ex-${Date.now()}`;
    const optimistic: {
      id: string;
      name: string;
      calories: number;
      persistedId?: string;
    } = {
      id: tempId,
      name: finalName,
      calories: cals,
    };
    setExItems((prev) => [optimistic, ...prev]);

    try {
      const ref = await addExerciseBurn(user.uid, {
        date, // same date as your workout form
        name: finalName, // normalized / descriptive
        calories: cals, // integer kcal
        createdAt: Date.now(),
      });

      // swap temp with persisted id
      setExItems((prev) =>
        prev.map((it) =>
          it.id === tempId ? { ...it, id: ref.id, persistedId: ref.id } : it
        )
      );

      // clear inputs
      setExName("");
      setExCalories("");
    } catch (e: any) {
      // revert optimistic insert if write failed
      setExItems((prev) => prev.filter((it) => it.id !== tempId));
      alert(e?.message || "Couldn't save exercise");
    }
  }

  async function deleteExerciseItem(id: string) {
    const item = exItems.find((x) => x.id === id);
    setExItems((prev) => prev.filter((it) => it.id !== id));
    try {
      if (item?.persistedId && user?.uid) {
        await deleteExerciseBurn(user.uid, item.persistedId);
      }
    } catch (e) {
      // If delete fails, we won't restore locally to avoid duping,
      // but you can optionally re-add item to state.
      console.warn("delete exercise burn failed", e);
    }
  }

  // ───── NEW: "Describe exercise" inputs + stubbed estimator ─────
  const [exDesc, setExDesc] = useState<string>("");
  const [estimating, setEstimating] = useState<boolean>(false);

  // replace the entire function with this:
  async function estimateCaloriesFromDescription() {
    const raw = exDesc || "";
    const norm = normalizeDesc(raw);
    if (!norm) return;

    // 0) Check in-memory cache first
    const cacheKey = `${norm}|${profileBucket(profile)}`;
    const cached = exEstimateCache.get(cacheKey);
    if (cached) {
      setExName(cached.name);
      setExCalories(String(Math.round(cached.calories)));
      return;
    }

    const url = process.env.EXPO_PUBLIC_AI_DESCRIBE_URL;
    if (!url) {
      alert("Missing EXPO_PUBLIC_AI_DESCRIBE_URL");
      return;
    }

    // tiny helpers
    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const pick = <T extends unknown>(...vals: T[]) =>
      vals.find((v) => v !== undefined && v !== null);

    try {
      setEstimating(true);
      const idToken = await auth.currentUser?.getIdToken(true);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          mode: "exercise:v1",
          query: raw, // send original text (server normalizes too)
          // optional: pass light profile; server also looks it up
          profile: profile
            ? {
                sex:
                  (profile as any)?.sex ||
                  (profile as any)?.gender ||
                  undefined,
                age: (profile as any)?.age,
                heightCm:
                  (profile as any)?.heightCm ??
                  (profile as any)?.height_cm ??
                  undefined,
                weightKg:
                  (profile as any)?.weightKg ??
                  (profile as any)?.weight_kg ??
                  undefined,
                fitnessLevel:
                  (profile as any)?.fitnessLevel ||
                  (profile as any)?.activityLevel ||
                  undefined,
              }
            : undefined,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      const rawOut = ct.includes("application/json")
        ? await res.json()
        : await res.text();
      const data =
        typeof rawOut === "string"
          ? (() => {
              try {
                return JSON.parse(rawOut);
              } catch {
                return {};
              }
            })()
          : rawOut ?? {};

      // Name candidates
      const nameCand = pick<string>(
        data?.name,
        data?.shortName,
        data?.title,
        data?.exercise,
        data?.label
      );

      // Calories candidates
      const calCand = pick<any>(
        data?.calories,
        data?.calories_burned,
        data?.caloriesBurned,
        data?.kcal,
        data?.burn,
        data?.estimate?.calories,
        data?.data?.calories
      );
      const cals = toNum(calCand);

      // Fallback name if model didn’t give one
      // prefer server name if it's non-generic; otherwise derive from description
      let finalName =
        (typeof nameCand === "string" ? nameCand.trim() : "") || "";
      if (isGenericName(finalName)) {
        finalName = deriveNameFromDesc(raw);
      }

      if (cals !== null && cals > 0) {
        // write to UI
        setExName(finalName);
        setExCalories(String(Math.round(cals)));

        // write to session cache
        exEstimateCache.set(cacheKey, { name: finalName, calories: cals });
      } else {
        console.warn("[exercise:v1] could not parse calories from", data);
        // still set name to help the user, but ask them to enter kcal manually
        setExName(finalName);
        alert(
          "I couldn’t read the calories from the response. You can type them manually."
        );
      }
    } catch (e: any) {
      console.warn(e);
      alert(e?.message || "Could not estimate calories");
    } finally {
      setEstimating(false);
    }
  }

  function suggestScheme(g: "maintain" | "lose" | "gain") {
    switch (g) {
      case "gain":
        return { sets: 4, reps: 8 };
      case "lose":
        return { sets: 3, reps: 12 };
      default:
        return { sets: 3, reps: 8 };
    }
  }
  useEffect(() => {
    if (!exercise.trim()) return;
    const scheme = suggestScheme(goal);
    if (!sets) setSets(String(scheme.sets));
    if (!reps) setReps(String(scheme.reps));
  }, [exercise, goal]);

  const lastRecord = useMemo(() => {
    const name = exercise.trim().toLowerCase();
    if (!name) return null;
    let latest: Workout | null = null;
    for (const w of workouts) {
      if ((w.exercise || "").toLowerCase() !== name) continue;
      if (!latest) {
        latest = w;
        continue;
      }
      const a = createdAtMs(w);
      const b = createdAtMs(latest);
      if (a > b) latest = w;
      else if (a === 0 && b === 0) {
        if ((w.date || "") > (latest.date || "")) latest = w;
      }
    }
    return latest;
  }, [workouts, exercise]);

  const unitIsLB = unit === "lb";
  const nextWeightSuggestion = useMemo(() => {
    if (!lastRecord) return null;
    const lastKg = Number(lastRecord.weight || 0);
    const incKg = unitIsLB ? lbToKg(5) : 2.5;
    const target = Number(sets || 0) * Number(reps || 0);
    const completed =
      Number(lastRecord.sets || 0) * Number(lastRecord.reps || 0);
    const proposedKg = completed >= target ? lastKg + incKg : lastKg;
    const val = unitIsLB
      ? Math.round(kgToLb(proposedKg))
      : Math.round(proposedKg);
    const prev = unitIsLB
      ? Math.round(kgToLb(Number(lastRecord.weight || 0)))
      : Math.round(Number(lastRecord.weight || 0));
    return { next: val, prev };
  }, [lastRecord, sets, reps, unitIsLB]);

  const conflictWarning = useMemo(() => {
    if (!exercise.trim() || !injuries?.length) return null;
    const ex = EXERCISES.find(
      (e) => e.name.toLowerCase() === exercise.trim().toLowerCase()
    );
    if (!ex?.avoidIfInjuries?.length) return null;
    const inj = injuries.map((s) => s.toLowerCase());
    const conflicts = ex.avoidIfInjuries.some((flag) =>
      inj.some((x) => x.includes(flag))
    );
    if (!conflicts) return null;
    const alt = profileFriendlyExercises.find(
      (e) => e.tags.some((t) => ex.tags.includes(t)) && e.name !== ex.name
    );
    return { alt: alt?.name };
  }, [exercise, injuries, profileFriendlyExercises]);

  const addDisabled =
    !exercise.trim() ||
    Number.isNaN(Number(sets)) ||
    Number.isNaN(Number(reps)) ||
    Number.isNaN(Number(weight || 0));

  async function onAdd() {
    if (!user?.uid) {
      alert("Sign in required");
      return;
    }
    if (!exercise.trim()) {
      alert("Enter an exercise name.");
      return;
    }
    const weightKg =
      unit === "lb" ? lbToKg(Number(weight || 0)) : Number(weight || 0);
    const entry = {
      date,
      exercise: exercise.trim(),
      sets: Number(sets || 0),
      reps: Number(reps || 0),
      weight: Number(isFinite(weightKg as number) ? weightKg : 0),
      notes: (notes || "").trim(),
      createdAt: Date.now(),
    };
    const tempId = `temp-${Date.now()}`;
    setWorkouts((prev) => [{ id: tempId, ...entry }, ...prev]);
    try {
      const ref = await addWorkout(user.uid, {
        ...entry,
        createdAt: undefined,
      });

      // replace temp id
      setWorkouts((prev) =>
        prev.map((w) => (w.id === tempId ? { ...w, id: ref.id } : w))
      );

      // clear form
      setExercise("");
      setSets("");
      setReps("");
      setWeight("");
      setNotes("");
      setDate(todayISO);

      /* ────────────── BADGES: evaluate after add ────────────── */
      try {
        // Array including the brand-new doc (with final id)
        const updated = [{ id: ref.id, ...entry }, ...workouts];

        // PR calculation: did this entry set any PR?
        const flags = computePrFlags(updated);
        const newFlags = flags[ref.id] || { prWeight: false, prVolume: false };
        const prGained = !!(newFlags.prWeight || newFlags.prVolume);

        // Total number of PR entries (weight OR volume)
        const prTotal = Object.values(flags).reduce(
          (n, f) => n + (f.prWeight || f.prVolume ? 1 : 0),
          0
        );

        // Lifetime workout count
        const workoutsAllTime = await getWorkoutsAllTime(user.uid);

        // Streak: consecutive days including today (based on local + new)
        const dates = updated.map((w) => w.date).filter(Boolean) as string[];
        const daysStreak = computeDaysStreakFromDates(dates, fmt(new Date()));

        const newly = await evaluateBadges(user.uid, {
          type: "workout:add",
          counts: { workoutsAllTime, daysStreak },
          prGained,
          prTotal,
        });

        if (newly.length) {
          setCelebrateIds((prev) => {
            const s = new Set(prev);
            newly.forEach((id) => s.add(id));
            return Array.from(s);
          });
        }
      } catch (err) {
        console.warn("badge eval failed", err);
      }
    } catch (e) {
      console.warn(e);
      setWorkouts((prev) => prev.filter((w) => w.id !== tempId));
      alert((e as any)?.message || "Couldn't add workout");
    }
  }

  /* Inline edit */
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    date: "",
    exercise: "",
    sets: "",
    reps: "",
    weight: "",
    notes: "",
  });

  const startEdit = (w: Workout) => {
    setEditId(w.id);
    setEdit({
      date: w.date || todayISO,
      exercise: w.exercise || "",
      sets: String(w.sets ?? ""),
      reps: String(w.reps ?? ""),
      weight:
        unit === "lb"
          ? String(Math.round(kgToLb(w.weight || 0) * 100) / 100)
          : String(w.weight ?? ""),
      notes: w.notes || "",
    });
  };

  async function saveEdit() {
    if (!user?.uid || !editId || editId.startsWith("temp-")) {
      setEditId(null);
      return;
    }
    const weightKg =
      unit === "lb"
        ? lbToKg(Number(edit.weight || 0))
        : Number(edit.weight || 0);
    const patch = {
      date: edit.date,
      exercise: edit.exercise.trim(),
      sets: Number(edit.sets || 0),
      reps: Number(edit.reps || 0),
      weight: Number(isFinite(weightKg as number) ? weightKg : 0),
      notes: (edit.notes || "").trim(),
    };
    const prev = workouts;
    setWorkouts((curr) =>
      curr.map((w) => (w.id === editId ? { ...w, ...patch } : w))
    );
    setEditId(null);
    try {
      await updateWorkout(user.uid, editId, patch);
    } catch (e) {
      console.warn(e);
      setWorkouts(prev);
    }
  }

  async function removeWorkout(id: string) {
    if (id.startsWith("temp-")) {
      setWorkouts((curr) => curr.filter((w) => w.id !== id));
      return;
    }
    const prev = workouts;
    setWorkouts((curr) => curr.filter((w) => w.id !== id));
    try {
      await deleteWorkout(user!.uid, id);
    } catch (e) {
      console.warn(e);
      setWorkouts(prev);
    }
  }

  /* Grouped list */
  const grouped = useMemo(() => {
    const byDate: Record<string, Workout[]> = {};
    for (const w of workouts) (byDate[w.date] ??= []).push(w);
    const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
    const top5 = dates.slice(0, 5);
    return top5.map((d) => ({
      date: d,
      items: byDate[d]
        .slice()
        .sort((a, b) => (a.exercise || "").localeCompare(b.exercise || "")),
    }));
  }, [workouts]);

  /* Metrics */
  const totals = useMemo(() => {
    let setsSum = 0,
      volumeKg = 0;
    for (const w of workouts) {
      const s = Number(w.sets || 0),
        r = Number(w.reps || 0),
        wt = Number(w.weight || 0);
      setsSum += s;
      volumeKg += s * r * wt;
    }
    const volume = unitIsLB
      ? Math.round(kgToLb(volumeKg))
      : Math.round(volumeKg);
    return {
      workouts: workouts.length,
      sets: setsSum,
      volume,
      volumeUnit: unit,
    };
  }, [workouts, unitIsLB, unit]);

  const dailySetTarget = useMemo(() => {
    if (goal === "gain")
      return Math.max(9, Math.round(36 / Math.max(2, trainingDays)));
    if (goal === "lose")
      return Math.max(6, Math.round(24 / Math.max(2, trainingDays)));
    return Math.max(8, Math.round(30 / Math.max(2, trainingDays)));
  }, [goal, trainingDays]);

  const todaySets = useMemo(() => {
    const t = fmt(new Date());
    return workouts
      .filter((w) => w.date === t)
      .reduce((s, w) => s + (w.sets || 0), 0);
  }, [workouts]);

  const nothingToShow = grouped.length === 0;

  const cancelEdit = () => {
    if (!editId) return;
    const w = workouts.find((x) => x.id === editId);
    if (w) {
      setEdit({
        date: w.date || todayISO,
        exercise: w.exercise || "",
        sets: String(w.sets ?? ""),
        reps: String(w.reps ?? ""),
        weight:
          unit === "lb"
            ? String(Math.round(kgToLb(w.weight || 0) * 100) / 100)
            : String(w.weight ?? ""),
        notes: w.notes || "",
      });
    }
    setEditId(null);
  };

  const prFlags = useMemo(() => computePrFlags(workouts), [workouts]);

  /* ─────────────── Coach Spark generator state ─────────────── */
  const [genDay, setGenDay] = useState<string>("");
  const [genLoading, setGenLoading] = useState<boolean>(false);
  const [genPlan, setGenPlan] = useState<null | {
    items: {
      exercise: string;
      sets?: number;
      reps?: number;
      weight_kg?: number;
      notes?: string;
    }[];
    rationale?: string;
  }>(null);

  async function handleGenerate() {
    if (!genDay.trim()) return;
    try {
      setGenLoading(true);
      const plan = await generatePlanWithOpenAI({
        dayText: genDay.trim(),
        profile: profileContext(profile),
        recent: recentHistory(workouts, 12),
        regenToken: Date.now(),
      });
      setGenPlan(plan);
    } catch (e) {
      console.warn(e);
      alert((e as any)?.message || "Could not generate workout");
    } finally {
      setGenLoading(false);
    }
  }

  function handleRegenerate() {
    void handleGenerate();
  }

  function handleClear() {
    setGenPlan(null);
  }

  function insertItemToForm(it: {
    exercise: string;
    sets?: number;
    reps?: number;
    weight_kg?: number;
    notes?: string;
  }) {
    setExercise(it.exercise || "");
    setSets(String(it.sets ?? ""));
    setReps(String(it.reps ?? ""));
    const wKg = Number(it.weight_kg || 0);
    const wVal = unitIsLB ? Math.round(kgToLb(wKg)) : Math.round(wKg);
    setWeight(wVal ? String(wVal) : "");
    setNotes(it.notes || "");
    setDate(todayISO);
  }

  /* ────────────────────────── render ────────────────────────── */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={{
          flex: 1,
          backgroundColor: (colors as any).bg ?? colors.background,
        }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <Hero
          unit={unit}
          totals={totals}
          dailySetTarget={dailySetTarget}
          todaySets={todaySets}
          onToggleUnit={() =>
            user &&
            updateProfile(user.uid, { weightUnit: unit === "kg" ? "lb" : "kg" })
          }
        />

        {/* Rest-day switch + soft banner */}
        <Card
          style={{
            padding: 12,
            gap: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(colors.chartSecondary, 0.15),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.chartSecondary, 0.35),
                }}
              >
                <Ionicons
                  name="bed-outline"
                  size={16}
                  color={colors.chartSecondary}
                />
              </View>
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                Today is a rest day
              </Text>
            </View>
            <Switch value={isRestToday} onValueChange={toggleRestToday} />
          </View>

          {isRestToday && (
            <View
              style={{
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: withAlpha(colors.chartSecondary, 0.35),
                backgroundColor: withAlpha(colors.chartSecondary, 0.12),
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Recovery tips
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                Try 10–15 min of mobility, 6–8k easy steps, and 30–40g protein
                spread across meals.
              </Text>
            </View>
          )}
        </Card>

        {/* Coach Spark */}
        <WorkoutGenerator
          dayText={genDay}
          setDayText={(v: string) => setGenDay(v)}
          loading={genLoading}
          plan={genPlan}
          onPickPreset={(v: string) => setGenDay(v)}
          onGenerate={handleGenerate}
          onRegenerate={handleRegenerate}
          onClear={handleClear}
          onInsertItem={insertItemToForm}
        />

        <AddWorkoutForm
          unit={unit}
          todayISO={todayISO}
          suggested={suggested.map((s) => s.name)}
          safePresets={safePresets}
          conflictWarning={conflictWarning}
          nextWeightSuggestion={nextWeightSuggestion}
          addDisabled={addDisabled}
          date={date}
          setDate={setDate}
          exercise={exercise}
          setExercise={setExercise}
          sets={sets}
          setSets={(v) => setSets(v.replace(/[^0-9]/g, ""))}
          reps={reps}
          setReps={(v) => setReps(v.replace(/[^0-9]/g, ""))}
          weight={weight}
          setWeight={(v) => setWeight(v.replace(/[^0-9.]/g, ""))}
          notes={notes}
          setNotes={setNotes}
          onAdd={onAdd}
          newPreset={newPreset}
          setNewPreset={setNewPreset}
          onSavePreset={async () => {
            const name = newPreset.trim();
            if (!name || !user?.uid) return;
            await addWorkoutPreset(user.uid, {
              name,
              exercise: name,
              createdAt: Date.now(),
            } as Omit<WorkoutPreset, "id">);
            setNewPreset("");
          }}
          onClear={() => {
            setExercise("");
            setSets("");
            setReps("");
            setWeight("");
            setNotes("");
            setDate(todayISO);
          }}
          onOpenSearch={() => setSearchOpen(true)}
        />
        {/* View full calendar button */}
        <View style={{ paddingHorizontal: 16 }}>
          <Link href="/(modals)/full-calendar" asChild>
            <Pressable
              style={{
                marginTop: 8,
                alignSelf: "flex-start",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: withAlpha(colors.text, 0.05),
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                View full calendar
              </Text>
            </Pressable>
          </Link>
        </View>
        <ExerciseSearchSheet
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onPick={(name) => {
            setExercise(name);
            const scheme = suggestScheme(goal);
            if (!sets) setSets(String(scheme.sets));
            if (!reps) setReps(String(scheme.reps));
          }}
        />

        <Filters
          preset={preset}
          setPreset={setPreset}
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
        />

        {grouped.length === 0 ? (
          <EmptyState
            title="No workouts in this range"
            subtitle="Try changing filters or add a new workout above."
          />
        ) : (
          <GroupedWorkouts
            grouped={grouped}
            unit={unit}
            colors={colors}
            editId={editId}
            edit={edit}
            setEdit={setEdit}
            startEdit={startEdit}
            saveEdit={saveEdit}
            removeWorkout={removeWorkout}
            onCancelEdit={cancelEdit}
            prFlags={prFlags}
          />
        )}
        {/* Exercise */}
        <View
          style={{
            borderRadius: 18,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)",
            borderWidth: 1,
            borderColor: colors.border,
            padding: 6,
            paddingTop: 10,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 8,
              paddingBottom: 6,
            }}
          >
            <Ionicons
              name="flame-outline"
              size={14}
              color={colors.text + "99"}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: colors.text + "99",
              }}
            >
              Exercise
            </Text>
          </View>

          {/* NEW: Describe + estimate row */}
          <View style={{ paddingHorizontal: 8, gap: 8, marginBottom: 8 }}>
            {/* Small label above the input since Field doesn't support a label prop */}
            <Text style={{ fontWeight: "700", color: colors.text }}>
              Describe your activity
            </Text>

            <Field
              icon="create-outline"
              placeholder='e.g., "30 min jog at easy pace" or "45 min strength: squats, bench, rows"'
              value={exDesc}
              onChangeText={setExDesc}
              multiline
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                justifyContent: "flex-start",
              }}
            >
              <GradientButton
                label={estimating ? "Estimating..." : "Estimate calories"}
                onPress={estimateCaloriesFromDescription}
                disabled={!exDesc.trim() || estimating}
              />
              <Text style={{ color: colors.muted }}>
                or enter calories manually below
              </Text>
            </View>
          </View>

          {/* Existing card (manual entry still works) */}
          <ExerciseCard
            items={exItems}
            exName={exName}
            setExName={setExName}
            exCalories={exCalories}
            setExCalories={setExCalories}
            onAdd={addExerciseSubmit}
            onDelete={deleteExerciseItem}
          />
        </View>

        <BottomTabSpacer extra={16} />
      </ScrollView>

      {/* 🎉 Badge celebration modal */}
      <BadgeCelebrate
        ids={celebrateIds as any}
        open={celebrateIds.length > 0}
        onClose={() => setCelebrateIds([])}
      />
    </KeyboardAvoidingView>
  );
}
