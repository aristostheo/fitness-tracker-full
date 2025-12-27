// app/(tabs)/workouts.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Animated,
  Alert as RNAlert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
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
  updateWorkoutPreset,
  deleteWorkoutPreset,
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
import { useEntitlements } from "@/content/useEntitlements";
import {
  subscribeWorkoutTemplates,
  saveWorkoutTemplate,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
  type WorkoutTemplate,
} from "@/services/templates";

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

const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

const arcadeColors = {
  neonPink: "#ff5ac8",
  neonBlue: "#5ce1ff",
  neonLime: "#8cfb9f",
  amber: "#ffc857",
};

function parseVoiceWorkout(input: string) {
  const raw = (input || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  const setsReps = lower.match(/(\d+)\s*[x×]\s*(\d+)/);
  const sets = setsReps ? Number(setsReps[1]) : undefined;
  const reps = setsReps ? Number(setsReps[2]) : undefined;

  const weightMatch = lower.match(
    /(\d+(?:\.\d+)?)\s*(kg|kilo|kilogram|kilograms|lb|lbs|pound|pounds)?/
  );
  let weightKg: number | undefined;
  if (weightMatch && weightMatch[1]) {
    const val = Number(weightMatch[1]);
    const unit = (weightMatch[2] || "kg").toLowerCase();
    if (["lb", "lbs", "pound", "pounds"].includes(unit)) {
      weightKg = lbToKg(val);
    } else {
      weightKg = val;
    }
  }

  let exercise = lower;
  if (setsReps) exercise = exercise.replace(setsReps[0], "");
  if (weightMatch) exercise = exercise.replace(weightMatch[0], "");
  exercise = exercise.replace(/\bkg\b|\blb\b|\bpounds?\b|\bkilos?\b/gi, "");
  exercise = exercise.replace(/[^a-z0-9\s]/gi, " ").replace(/\s{2,}/g, " ");
  exercise = exercise.trim();
  exercise = exercise
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (
    !exercise &&
    sets === undefined &&
    reps === undefined &&
    weightKg === undefined
  )
    return null;

  return { exercise: exercise || "Exercise", sets, reps, weightKg };
}

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
  const router = useRouter();
  const { colors: baseColors, isDark } = useTheme();
  const [highContrast, setHighContrast] = useState(false);
  const colors = useMemo(
    () =>
      highContrast
        ? {
            ...baseColors,
            background: "#06080f",
            card: "#0d1220",
            border: "rgba(255,255,255,0.22)",
            text: "#f6f8ff",
            muted: "rgba(255,255,255,0.72)",
            primary: "#8cd0ff",
          }
        : baseColors,
    [baseColors, highContrast]
  );
  const scrollY = useRef(new Animated.Value(0)).current;

  const { user } = useAuth();
  const uid = user?.uid ?? "__demo__";
  const { isPro } = useEntitlements();

  const ensurePro = (feature: string) => {
    if (isPro) return true;
    RNAlert.alert(
      "Pro required",
      `${feature} is part of the Pro plan. Unlock to continue.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "See Pro", onPress: () => router.push("/paywall") },
      ]
    );
    return false;
  };

  /* 🎉 celebration modal */
  const [celebrateIds, setCelebrateIds] = useState<string[]>([]);

  /* Active workout draft (Start/Continue) */
  const [hasDraftSession, setHasDraftSession] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`workout:draft:${uid}`);
        if (mounted) setHasDraftSession(!!raw);
      } catch {
        if (mounted) setHasDraftSession(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [uid]);

  /* Profile + units */
  const [profile, setProfile] = useState<Profile | null>(null);
  const unit = profile?.weightUnit === "lb" ? "lb" : "kg";
  const [voiceText, setVoiceText] = useState("");

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

  /* Dates */
  const todayISO = useMemo(() => fmt(new Date()), []);

  /* Workouts stream */
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  useEffect(() => {
    if (!user?.uid) {
      setWorkouts([]);
      return;
    }
    return subscribeWorkouts(user.uid, setWorkouts, { max: 500 });
  }, [user?.uid]);

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
  const [date, setDate] = useState(todayISO);
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

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

  // templates
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeWorkoutTemplates(user.uid, setTemplates);
  }, [user?.uid]);

  async function handleSaveTemplate(name: string) {
    if (!ensurePro("Workout templates")) return;
    if (!user?.uid) return;
    const dayItems = workouts
      .filter((w) => w.date === date)
      .map((w) => ({
        exercise: w.exercise,
        sets: Number(w.sets || 0),
        reps: Number(w.reps || 0),
        weight: Number(w.weight || 0),
        notes: w.notes || "",
      }));
    if (!dayItems.length) {
      alert(
        "Log at least one workout for this day before saving as a template."
      );
      return;
    }
    const items = dayItems.length > 0 ? dayItems : [];
    try {
      await saveWorkoutTemplate(user.uid, {
        name: name || "Template",
        tags: [],
        items,
      });
      alert("Saved day as template.");
    } catch (e: any) {
      alert(e?.message || "Couldn't save template");
    }
  }

  async function handleUpdateTemplate(id: string) {
    if (!ensurePro("Workout templates")) return;
    if (!user?.uid) return;
    const dayItems = workouts
      .filter((w) => w.date === date)
      .map((w) => ({
        exercise: w.exercise,
        sets: Number(w.sets || 0),
        reps: Number(w.reps || 0),
        weight: Number(w.weight || 0),
        notes: w.notes || "",
      }));
    const t = templates.find((x) => x.id === id);
    const name = t?.name || "Template";
    const items = dayItems.length > 0 ? dayItems : [];
    if (!items.length) {
      alert("Log workouts for this day before overwriting the template.");
      return;
    }
    try {
      await updateWorkoutTemplate(user.uid, id, { name, items });
      alert("Template updated.");
    } catch (e: any) {
      alert(e?.message || "Couldn't update template");
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!ensurePro("Workout templates")) return;
    if (!user?.uid) return;
    RNAlert.alert("Delete template?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteWorkoutTemplate(user.uid!, id);
          } catch (e: any) {
            alert(e?.message || "Couldn't delete template");
          }
        },
      },
    ]);
  }

  async function handleUpdatePreset(id: string) {
    if (!user?.uid) return;
    const weightKg =
      unit === "lb" ? lbToKg(Number(weight || 0)) : Number(weight || 0);
    try {
      await updateWorkoutPreset(user.uid, id, {
        name: exercise.trim() || newPreset.trim() || "Preset",
        exercise: exercise.trim(),
        sets: Number(sets || 0),
        reps: Number(reps || 0),
        weight: Number(isFinite(weightKg as number) ? weightKg : 0),
        notes: notes || "",
        createdAt: Date.now(),
      });
      alert("Preset updated");
    } catch (e: any) {
      alert(e?.message || "Couldn't update preset");
    }
  }

  function handleDeletePreset(id: string) {
    if (!user?.uid) return;
    RNAlert.alert("Delete preset?", "This will remove it permanently.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteWorkoutPreset(user.uid!, id);
          } catch (e: any) {
            alert(e?.message || "Couldn't delete preset");
          }
        },
      },
    ]);
  }

  function handleApplyTemplate(id: string) {
    if (!ensurePro("Workout templates")) return;
    RNAlert.alert(
      "Apply template",
      "Add all exercises from this template to today?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply",
          onPress: () => doApplyTemplate(id),
        },
      ]
    );
  }

  function doApplyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t || !t.items?.length) return;
    if (!user?.uid) {
      alert("Sign in to apply templates.");
      return;
    }
    const targetDate = date || todayISO;
    t.items.forEach(async (item, idx) => {
      const entry = {
        date: targetDate,
        exercise: (item.exercise || "").trim(),
        sets: Number(item.sets || 0),
        reps: Number(item.reps || 0),
        weight: Number(item.weight || 0),
        notes: (item.notes || "").trim(),
        createdAt: Date.now() + idx,
      };
      const tempId = `tpl-${Date.now()}-${idx}`;
      setWorkouts((prev) => [{ id: tempId, ...entry }, ...prev]);
      try {
        const ref = await addWorkout(user.uid, {
          ...entry,
          createdAt: undefined,
        });
        setWorkouts((prev) =>
          prev.map((w) => (w.id === tempId ? { ...w, id: ref.id } : w))
        );
      } catch (e) {
        setWorkouts((prev) => prev.filter((w) => w.id !== tempId));
      }
    });
    alert(`Applied template "${t.name}" to ${targetDate}`);
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

  function applyVoiceQuickFill() {
    const parsed = parseVoiceWorkout(voiceText);
    if (!parsed) {
      RNAlert.alert(
        "Need more info",
        "Try: “3 by 10 squats 60 kilos” or “4x12 bench press 135 pounds”."
      );
      return;
    }
    if (parsed.exercise) setExercise(parsed.exercise);
    if (parsed.sets !== undefined) setSets(String(parsed.sets));
    if (parsed.reps !== undefined) setReps(String(parsed.reps));
    if (parsed.weightKg !== undefined) {
      const val =
        unit === "lb"
          ? Math.round(kgToLb(parsed.weightKg))
          : Math.round(parsed.weightKg * 100) / 100;
      setWeight(val ? String(val) : "");
    }
    RNAlert.alert(
      "Voice dictation applied",
      "Review the fields, then tap Add."
    );
  }

  // ───── NEW: "Describe exercise" inputs + stubbed estimator ─────
  const [exDesc, setExDesc] = useState<string>("");
  const [estimating, setEstimating] = useState<boolean>(false);

  // replace the entire function with this:
  async function estimateCaloriesFromDescription() {
    if (!ensurePro("AI exercise calorie estimates")) {
      return;
    }
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
  const todaysWorkouts = useMemo(
    () => workouts.filter((w) => w.date === todayISO),
    [workouts, todayISO]
  );

  const groupedToday = useMemo(() => {
    if (!todaysWorkouts.length) return [];

    const bySession = new Map<
      string,
      { title: string; items: typeof todaysWorkouts }
    >();

    for (const w of todaysWorkouts) {
      const sid = (w as any).sessionId || "quick";
      const title =
        (w as any).sessionTitle || (sid === "quick" ? "Quick logs" : "Workout");
      const curr = bySession.get(sid) || { title, items: [] as any };
      curr.items.push(w);
      bySession.set(sid, curr);
    }

    const sessions = Array.from(bySession.entries())
      .map(([sessionId, v]) => ({
        sessionId,
        title: v.title,
        items: v.items
          .slice()
          .sort((a, b) => (a.exercise || "").localeCompare(b.exercise || "")),
      }))
      // newest session first if we have startedAt
      .sort((a, b) => {
        const aStart =
          (a.items[0] as any)?.sessionStartedAt ??
          (a.items[0] as any)?.createdAt ??
          0;
        const bStart =
          (b.items[0] as any)?.sessionStartedAt ??
          (b.items[0] as any)?.createdAt ??
          0;
        return bStart - aStart;
      });

    return [
      {
        date: todayISO,
        items: sessions,
      },
    ];
  }, [todaysWorkouts, todayISO]);

  /* Metrics */
  const totals = useMemo(() => {
    let setsSum = 0,
      volumeKg = 0;
    for (const w of todaysWorkouts) {
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
      workouts: todaysWorkouts.length,
      sets: setsSum,
      volume,
      volumeUnit: unit,
    };
  }, [todaysWorkouts, unitIsLB, unit]);

  const dailySetTarget = useMemo(() => {
    if (goal === "gain")
      return Math.max(9, Math.round(36 / Math.max(2, trainingDays)));
    if (goal === "lose")
      return Math.max(6, Math.round(24 / Math.max(2, trainingDays)));
    return Math.max(8, Math.round(30 / Math.max(2, trainingDays)));
  }, [goal, trainingDays]);

  const todaySets = useMemo(() => {
    return todaysWorkouts.reduce((s, w) => s + (w.sets || 0), 0);
  }, [todaysWorkouts]);

  const nothingToShow = groupedToday.length === 0;
  const daysStreak = useMemo(
    () =>
      computeDaysStreakFromDates(
        workouts.map((w) => w.date).filter(Boolean) as string[],
        fmt(new Date())
      ),
    [workouts]
  );
  const heroLift = scrollY.interpolate({
    inputRange: [0, 160],
    outputRange: [0, -14],
    extrapolate: "clamp",
  });
  const heroScale = scrollY.interpolate({
    inputRange: [-60, 0, 160],
    outputRange: [1.03, 1, 0.97],
    extrapolate: "clamp",
  });
  const ribbonTilt = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: ["0deg", "-7deg"],
    extrapolate: "clamp",
  });
  const questList = useMemo(
    () => [
      {
        icon: "checkbox-outline" as const,
        label: "Log a workout",
        progress: todaySets > 0 ? 1 : 0.35,
        detail: todaySets > 0 ? "Logged today" : "Add at least one session",
      },
      {
        icon: "barbell-outline" as const,
        label: "Hit your sets",
        progress: Math.min(
          1,
          todaySets /
            Math.max(1, Number.isFinite(dailySetTarget) ? dailySetTarget : 8)
        ),
        detail: `${todaySets}/${dailySetTarget} sets`,
      },
      {
        icon: "stats-chart-outline" as const,
        label: "Volume boost",
        progress: Math.min(
          1,
          totals.volume /
            Math.max(2000, totals.volumeUnit === "lb" ? 6000 : 3000)
        ),
        detail: `${totals.volume.toLocaleString()} ${totals.volumeUnit}`,
      },
    ],
    [dailySetTarget, todaySets, totals.volume, totals.volumeUnit]
  );
  const questXp = Math.round(
    (questList.reduce((s, q) => s + q.progress, 0) /
      Math.max(1, questList.length)) *
      100
  );

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
  const prTotal = useMemo(
    () =>
      Object.values(prFlags).reduce(
        (n, f) => n + (f.prWeight || f.prVolume ? 1 : 0),
        0
      ),
    [prFlags]
  );

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
    if (!ensurePro("Coach Spark workout generator")) return;
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
      <Animated.ScrollView
        style={{
          flex: 1,
          backgroundColor: (colors as any).bg ?? colors.background,
        }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* floating arcade ribbons */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -60,
            right: -50,
            width: 220,
            height: 220,
            opacity: isDark ? 0.18 : 0.25,
            transform: [
              { translateY: Animated.multiply(scrollY, -0.08) },
              { rotate: ribbonTilt },
            ],
          }}
        >
          <LinearGradient
            colors={[arcadeColors.neonBlue, arcadeColors.neonPink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flex: 1,
              borderRadius: 120,
              transform: [{ rotate: "18deg" }],
            }}
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 240,
            left: -70,
            width: 200,
            height: 200,
            opacity: isDark ? 0.14 : 0.22,
            transform: [
              { translateY: Animated.multiply(scrollY, -0.04) },
              { rotate: "-10deg" },
            ],
          }}
        >
          <LinearGradient
            colors={[arcadeColors.neonLime, arcadeColors.amber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flex: 1,
              borderRadius: 120,
              transform: [{ rotate: "-12deg" }],
            }}
          />
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ translateY: heroLift }, { scale: heroScale }],
          }}
        >
          <Hero
            unit={unit}
            totals={totals}
            dailySetTarget={dailySetTarget}
            todaySets={todaySets}
            onToggleUnit={() =>
              user &&
              updateProfile(user.uid, {
                weightUnit: unit === "kg" ? "lb" : "kg",
              })
            }
          />
        </Animated.View>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 480, delay: 40 }}
        >
          <LinearGradient
            colors={[withAlpha(arcadeColors.neonBlue, 0.3), colors.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              padding: 14,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              overflow: "hidden",
              position: "relative",
              ...softShadow,
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                right: -50,
                bottom: -40,
                width: 160,
                height: 160,
                transform: [{ rotate: ribbonTilt }],
                opacity: 0.16,
              }}
            >
              <LinearGradient
                colors={[arcadeColors.neonPink, arcadeColors.neonLime]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, borderRadius: 110 }}
              />
            </Animated.View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 18,
                  }}
                >
                  Training quests
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    marginTop: 2,
                    fontWeight: "600",
                  }}
                >
                  Rack up XP for logging, sets, and volume today.
                </Text>
              </View>

              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: withAlpha(colors.card, 0.94),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.border, 0.9),
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: withAlpha(colors.text, 0.7),
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  XP today
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 20,
                    fontWeight: "900",
                  }}
                >
                  {questXp}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 12, gap: 10 }}>
              {questList.map((q, i) => (
                <QuestChip key={q.label} delay={80 + i * 50} {...q} />
              ))}
            </View>
          </LinearGradient>
        </MotiView>

        {/* Arcade stats strip */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 460, delay: 80 }}
        >
          <LinearGradient
            colors={[withAlpha(arcadeColors.neonPink, 0.18), colors.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 12,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              ...softShadow,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              {[
                {
                  icon: "flame-outline" as const,
                  label: "Total sets",
                  value: totals.sets.toLocaleString(),
                },
                {
                  icon: "ribbon-outline" as const,
                  label: "PRs logged",
                  value: prTotal.toLocaleString(),
                },
                {
                  icon: "sparkles-outline" as const,
                  label: "Streak",
                  value: `${daysStreak} day${daysStreak === 1 ? "" : "s"}`,
                },
                {
                  icon: "barbell-outline" as const,
                  label: "Volume",
                  value: `${totals.volume.toLocaleString()} ${
                    totals.volumeUnit
                  }`,
                },
              ].map((s, i) => (
                <MotiView
                  key={s.label}
                  from={{ opacity: 0, translateY: 6 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    type: "timing",
                    duration: 320,
                    delay: 60 + i * 40,
                  }}
                  style={{
                    flexGrow: 1,
                    minWidth: 150,
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.border, 0.8),
                    backgroundColor: withAlpha(colors.card, 0.96),
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: withAlpha(colors.primary, 0.16),
                        borderWidth: 1,
                        borderColor: withAlpha(colors.primary, 0.35),
                      }}
                    >
                      <Ionicons
                        name={s.icon}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={{ color: colors.text, fontWeight: "800" }}>
                        {s.value}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        {s.label}
                      </Text>
                    </View>
                  </View>
                </MotiView>
              ))}
            </View>
          </LinearGradient>
        </MotiView>

        {/* Accessibility + voice tools */}
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
              gap: 10,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                Accessibility
              </Text>
              <Text style={{ color: colors.muted }}>
                High-contrast palette and larger tap targets.
              </Text>
            </View>
            <Pressable
              onPress={() => setHighContrast((v) => !v)}
              hitSlop={10}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.35),
                backgroundColor: withAlpha(colors.primary, 0.12),
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons
                  name="contrast-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                  {highContrast ? "High" : "Normal"}
                </Text>
                <Switch value={highContrast} onValueChange={setHighContrast} />
              </View>
            </Pressable>
          </View>

          {/* <View style={{ gap: 8 }}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              Voice quick add
            </Text>
            <Field
              icon="mic-outline"
              placeholder='Try: "3x10 squats 60 kilos" (use keyboard mic)'
              value={voiceText}
              onChangeText={setVoiceText}
              multiline
            />
            <GradientButton
              label="Fill workout from voice"
              onPress={applyVoiceQuickFill}
              disabled={!voiceText.trim()}
            />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Tip: tap the mic on your keyboard and speak your set. We’ll fill exercise, sets,
              reps, and weight for you.
            </Text>
          </View> */}
        </Card>

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

        {/* Start / Continue workout */}
        <View style={{ marginBottom: 12 }}>
          <Pressable
            onPress={() => router.push("/workouts/session")}
            style={{
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.32),
              backgroundColor: withAlpha(colors.primary, 0.12),
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(colors.primary, 0.18),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.25),
                }}
              >
                <Ionicons
                  name={hasDraftSession ? "play-forward" : "play"}
                  size={18}
                  color={colors.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 16,
                  }}
                >
                  {hasDraftSession ? "Continue workout" : "Start workout"}
                </Text>
                <Text
                  style={{
                    color: withAlpha(colors.text, 0.7),
                    fontWeight: "700",
                    marginTop: 2,
                  }}
                >
                  Log exercises in a single session — finish when you’re done.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={withAlpha(colors.text, 0.7)}
              />
            </View>
          </Pressable>
        </View>

        {/* View full calendar button */}
        <View style={{ paddingHorizontal: 16 }}>
          <Link href="/(modals)/full-calendar" asChild>
            <Pressable>
              {({ pressed }) => (
                <MotiView
                  animate={{
                    scale: pressed ? 0.96 : 1,
                    translateY: pressed ? 2 : 0,
                  }}
                  transition={{ type: "timing", duration: 140 }}
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
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={colors.text}
                  />
                  <Text style={{ color: colors.text, fontWeight: "700" }}>
                    View full calendar
                  </Text>
                </MotiView>
              )}
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

        <View style={{ paddingHorizontal: 16 }}>
          <Link href="/workouts/history" asChild>
            <Pressable>
              {({ pressed }) => (
                <MotiView
                  animate={{
                    scale: pressed ? 0.96 : 1,
                    translateY: pressed ? 2 : 0,
                  }}
                  transition={{ type: "timing", duration: 140 }}
                  style={{
                    marginTop: 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: withAlpha(colors.primary, 0.12),
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={{ color: colors.primary, fontWeight: "800" }}>
                    Workout history
                  </Text>
                </MotiView>
              )}
            </Pressable>
          </Link>
        </View>

        {groupedToday.length === 0 ? (
          <EmptyState
            title="No workouts today"
            subtitle="Add a workout above or view history."
          />
        ) : (
          <GroupedWorkouts
            grouped={groupedToday}
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
      </Animated.ScrollView>

      {/* 🎉 Badge celebration modal */}
      <BadgeCelebrate
        ids={celebrateIds as any}
        open={celebrateIds.length > 0}
        onClose={() => setCelebrateIds([])}
      />
    </KeyboardAvoidingView>
  );
}

function QuestChip({
  icon,
  label,
  progress,
  detail,
  delay = 0,
}: {
  icon: any;
  label: string;
  progress: number;
  detail: string;
  delay?: number;
}) {
  const { colors } = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 360, delay }}
    >
      <View
        style={{
          borderRadius: 14,
          padding: 12,
          borderWidth: 1,
          borderColor: withAlpha(colors.border, 0.9),
          backgroundColor: withAlpha(colors.card, 0.95),
          ...softShadow,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: withAlpha(colors.primary, 0.18),
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.35),
              }}
            >
              <Ionicons name={icon} size={18} color={colors.primary} />
            </View>
            <View>
              <Text
                style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}
              >
                {label}
              </Text>
              <Text style={{ color: colors.muted }}>{detail}</Text>
            </View>
          </View>

          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: withAlpha(
                pct >= 100 ? arcadeColors.neonLime : colors.primary,
                0.14
              ),
            }}
          >
            <Text
              style={{
                color: pct >= 100 ? arcadeColors.neonLime : colors.primary,
                fontWeight: "800",
              }}
            >
              {pct}%
            </Text>
          </View>
        </View>
        <View
          style={{
            height: 10,
            borderRadius: 999,
            backgroundColor: withAlpha(colors.border, 0.9),
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              backgroundColor:
                pct >= 100 ? arcadeColors.neonLime : colors.primary,
              opacity: 0.9,
            }}
          />
        </View>
      </View>
    </MotiView>
  );
}

// // app/(tabs)/workouts.tsx
// // Drop-in Workouts page (React Native / Expo Router friendly)
// // Requires: expo-blur, expo-linear-gradient, react-native-reanimated, @expo/vector-icons
// // Optional (recommended): react-native-gesture-handler

// import React, { useMemo, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   Pressable,
//   FlatList,
//   ScrollView,
//   Platform,
//   StatusBar,
//   AccessibilityInfo,
//   useWindowDimensions,
// } from "react-native";
// import { BlurView } from "expo-blur";
// import { LinearGradient } from "expo-linear-gradient";
// import { Ionicons } from "@expo/vector-icons";
// import Animated, {
//   Easing,
//   FadeInDown,
//   FadeIn,
//   interpolate,
//   useAnimatedStyle,
//   useSharedValue,
//   withTiming,
// } from "react-native-reanimated";
// // If you're using Expo Router, uncomment:
// // import { useRouter } from "expo-router";

// type WorkoutSummary = {
//   id: string;
//   title: string;
//   subtitle?: string; // e.g., "Push • Strength"
//   dateLabel: string; // e.g., "Yesterday • 6:41 PM"
//   durationMin: number;
//   sets: number;
//   volumeKg: number;
//   pr?: { label: string; value?: string }; // e.g., "Bench PR", "225 x 5"
//   highlight?: string; // e.g., "Best set: Bench 100kg x 5"
// };

// type Template = {
//   id: string;
//   name: string;
//   emoji?: string;
//   tag?: string; // e.g., "Upper", "Strength"
// };

// type ActiveSession = {
//   title: string;
//   elapsedMin: number;
//   lastAction: string; // e.g., "Last: Incline DB Press • Set 3"
// };

// const withAlpha = (hex: string, a: number) => {
//   // supports #RRGGBB
//   const h = hex.replace("#", "");
//   if (h.length !== 6) return hex;
//   const r = parseInt(h.slice(0, 2), 16);
//   const g = parseInt(h.slice(2, 4), 16);
//   const b = parseInt(h.slice(4, 6), 16);
//   const alpha = Math.max(0, Math.min(1, a));
//   return `rgba(${r},${g},${b},${alpha})`;
// };

// const clamp = (v: number, min: number, max: number) =>
//   Math.max(min, Math.min(max, v));

// /** Small, “Apple-ish” pressable that scales smoothly */
// function ScalePressable({
//   children,
//   onPress,
//   style,
//   accessibilityLabel,
//   accessibilityHint,
// }: {
//   children: React.ReactNode;
//   onPress?: () => void;
//   style?: any;
//   accessibilityLabel?: string;
//   accessibilityHint?: string;
// }) {
//   const down = useSharedValue(0);

//   const aStyle = useAnimatedStyle(() => {
//     const s = interpolate(down.value, [0, 1], [1, 0.985]);
//     return {
//       transform: [{ scale: s }],
//     };
//   });

//   return (
//     <Animated.View style={[aStyle, style]}>
//       <Pressable
//         accessibilityRole="button"
//         accessibilityLabel={accessibilityLabel}
//         accessibilityHint={accessibilityHint}
//         onPress={onPress}
//         onPressIn={() =>
//           (down.value = withTiming(1, {
//             duration: 90,
//             easing: Easing.out(Easing.quad),
//           }))
//         }
//         onPressOut={() =>
//           (down.value = withTiming(0, {
//             duration: 140,
//             easing: Easing.out(Easing.quad),
//           }))
//         }
//         style={({ pressed }) => [pressed && { opacity: 0.98 }]}
//       >
//         {children}
//       </Pressable>
//     </Animated.View>
//   );
// }

// function GlassCard({
//   children,
//   style,
//   intensity = 34,
// }: {
//   children: React.ReactNode;
//   style?: any;
//   intensity?: number;
// }) {
//   return (
//     <View style={[styles.cardWrap, style]}>
//       {/* Border */}
//       <View style={styles.cardBorder} pointerEvents="none" />
//       {/* Blur */}
//       <BlurView intensity={intensity} tint="dark" style={styles.cardBlur}>
//         {/* Inner gradient for glossy depth */}
//         <LinearGradient
//           colors={[
//             withAlpha("#FFFFFF", 0.1),
//             withAlpha("#FFFFFF", 0.06),
//             withAlpha("#000000", 0.06),
//           ]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 1 }}
//           style={styles.cardInner}
//         >
//           {children}
//         </LinearGradient>
//       </BlurView>
//     </View>
//   );
// }

// function Pill({
//   label,
//   icon,
//   onPress,
// }: {
//   label: string;
//   icon: keyof typeof Ionicons.glyphMap;
//   onPress?: () => void;
// }) {
//   return (
//     <ScalePressable
//       onPress={onPress}
//       accessibilityLabel={label}
//       accessibilityHint="Activates quick workout action"
//       style={{ marginRight: 10 }}
//     >
//       <View style={styles.pill}>
//         <Ionicons name={icon} size={16} color={withAlpha("#FFFFFF", 0.92)} />
//         <Text style={styles.pillText}>{label}</Text>
//       </View>
//     </ScalePressable>
//   );
// }

// function Ring({
//   label,
//   value,
//   sub,
//   accent = "#68D7FF",
//   onPress,
// }: {
//   label: string;
//   value: string;
//   sub: string;
//   accent?: string;
//   onPress?: () => void;
// }) {
//   return (
//     <ScalePressable
//       onPress={onPress}
//       accessibilityLabel={`${label}. ${value}. ${sub}.`}
//       accessibilityHint="Opens weekly summary"
//       style={{ flex: 1 }}
//     >
//       <GlassCard style={styles.ringCard} intensity={26}>
//         <View style={styles.ringTop}>
//           <View
//             style={[
//               styles.ringDot,
//               { backgroundColor: withAlpha(accent, 0.9) },
//             ]}
//           />
//           <Text style={styles.ringLabel}>{label}</Text>
//         </View>
//         <Text style={styles.ringValue}>{value}</Text>
//         <Text style={styles.ringSub}>{sub}</Text>
//       </GlassCard>
//     </ScalePressable>
//   );
// }

// function SectionHeader({
//   title,
//   actionLabel,
//   onAction,
// }: {
//   title: string;
//   actionLabel?: string;
//   onAction?: () => void;
// }) {
//   return (
//     <View style={styles.sectionHeader}>
//       <Text style={styles.sectionTitle}>{title}</Text>
//       {actionLabel ? (
//         <Pressable
//           onPress={onAction}
//           accessibilityRole="button"
//           accessibilityLabel={actionLabel}
//           style={({ pressed }) => [
//             styles.sectionAction,
//             pressed && { opacity: 0.75 },
//           ]}
//         >
//           <Text style={styles.sectionActionText}>{actionLabel}</Text>
//           <Ionicons
//             name="chevron-forward"
//             size={14}
//             color={withAlpha("#FFFFFF", 0.75)}
//           />
//         </Pressable>
//       ) : null}
//     </View>
//   );
// }

// function WorkoutCard({
//   w,
//   onPress,
//   onDuplicate,
//   onDelete,
// }: {
//   w: WorkoutSummary;
//   onPress?: () => void;
//   onDuplicate?: () => void;
//   onDelete?: () => void;
// }) {
//   return (
//     <Animated.View
//       entering={FadeInDown.duration(380).springify().damping(18).stiffness(160)}
//     >
//       <ScalePressable
//         onPress={onPress}
//         accessibilityLabel={`${w.title}. ${w.dateLabel}. ${
//           w.durationMin
//         } minutes. ${w.sets} sets. ${w.pr ? `New PR: ${w.pr.label}.` : ""}`}
//         accessibilityHint="Opens workout details"
//         style={{ marginBottom: 12 }}
//       >
//         <GlassCard intensity={30} style={styles.workoutCard}>
//           <View style={styles.workoutHeaderRow}>
//             <View style={{ flex: 1, paddingRight: 10 }}>
//               <Text style={styles.workoutTitle} numberOfLines={1}>
//                 {w.title}
//               </Text>
//               <Text style={styles.workoutMeta} numberOfLines={1}>
//                 {w.subtitle ? `${w.subtitle} • ` : ""}
//                 {w.dateLabel}
//               </Text>
//             </View>

//             {w.pr ? (
//               <View style={styles.prBadge} accessibilityLabel="Personal record">
//                 <Ionicons
//                   name="trophy"
//                   size={14}
//                   color={withAlpha("#111", 0.9)}
//                 />
//                 <Text style={styles.prText}>PR</Text>
//               </View>
//             ) : (
//               <Ionicons
//                 name="chevron-forward"
//                 size={18}
//                 color={withAlpha("#FFFFFF", 0.55)}
//               />
//             )}
//           </View>

//           <View style={styles.statsRow}>
//             <StatChip icon="time-outline" label={`${w.durationMin}m`} />
//             <StatChip icon="layers-outline" label={`${w.sets} sets`} />
//             <StatChip
//               icon="barbell-outline"
//               label={`${Math.round(w.volumeKg)} kg`}
//             />
//           </View>

//           {w.highlight ? (
//             <Text style={styles.highlight} numberOfLines={1}>
//               {w.highlight}
//             </Text>
//           ) : null}
//           {w.pr ? (
//             <Text style={styles.prLine} numberOfLines={1}>
//               {w.pr.label}
//               {w.pr.value ? ` • ${w.pr.value}` : ""}
//             </Text>
//           ) : null}

//           {/* Quick actions (subtle) */}
//           <View style={styles.cardActions}>
//             <Pressable
//               onPress={onDuplicate}
//               accessibilityRole="button"
//               accessibilityLabel="Duplicate workout"
//               style={({ pressed }) => [
//                 styles.actionBtn,
//                 pressed && { opacity: 0.75 },
//               ]}
//             >
//               <Ionicons
//                 name="copy-outline"
//                 size={16}
//                 color={withAlpha("#FFFFFF", 0.82)}
//               />
//               <Text style={styles.actionBtnText}>Duplicate</Text>
//             </Pressable>

//             <Pressable
//               onPress={onDelete}
//               accessibilityRole="button"
//               accessibilityLabel="Delete workout"
//               style={({ pressed }) => [
//                 styles.actionBtn,
//                 pressed && { opacity: 0.75 },
//               ]}
//             >
//               <Ionicons
//                 name="trash-outline"
//                 size={16}
//                 color={withAlpha("#FFFFFF", 0.82)}
//               />
//               <Text style={styles.actionBtnText}>Delete</Text>
//             </Pressable>
//           </View>
//         </GlassCard>
//       </ScalePressable>
//     </Animated.View>
//   );
// }

// function StatChip({
//   icon,
//   label,
// }: {
//   icon: keyof typeof Ionicons.glyphMap;
//   label: string;
// }) {
//   return (
//     <View style={styles.statChip}>
//       <Ionicons name={icon} size={14} color={withAlpha("#FFFFFF", 0.82)} />
//       <Text style={styles.statChipText}>{label}</Text>
//     </View>
//   );
// }

// function TemplateChip({ t, onPress }: { t: Template; onPress?: () => void }) {
//   return (
//     <ScalePressable
//       onPress={onPress}
//       accessibilityLabel={`Template: ${t.name}`}
//       accessibilityHint="Starts a workout from this template"
//       style={{ marginRight: 10 }}
//     >
//       <View style={styles.templateChip}>
//         <Text style={styles.templateEmoji}>{t.emoji ?? "🏋️"}</Text>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.templateName} numberOfLines={1}>
//             {t.name}
//           </Text>
//           {t.tag ? <Text style={styles.templateTag}>{t.tag}</Text> : null}
//         </View>
//         <Ionicons name="play" size={16} color={withAlpha("#FFFFFF", 0.72)} />
//       </View>
//     </ScalePressable>
//   );
// }

// export default function WorkoutsPage() {
//   // const router = useRouter();
//   const { width } = useWindowDimensions();

//   const [activeSession, setActiveSession] = useState<ActiveSession | null>({
//     title: "Strength • Sat",
//     elapsedMin: 18,
//     lastAction: "Last: Incline DB Press • Set 3",
//   });

//   const accent = "#68D7FF";
//   const accent2 = "#8B7CFF";

//   const recents = useMemo<WorkoutSummary[]>(
//     () => [
//       {
//         id: "w1",
//         title: "Push Day",
//         subtitle: "Strength",
//         dateLabel: "Yesterday • 6:41 PM",
//         durationMin: 52,
//         sets: 18,
//         volumeKg: 7420,
//         pr: { label: "Bench PR", value: "100kg × 5" },
//         highlight: "Best set: Bench 100kg × 5",
//       },
//       {
//         id: "w2",
//         title: "Zone 2 Run",
//         subtitle: "Cardio",
//         dateLabel: "Thu • 7:10 PM",
//         durationMin: 34,
//         sets: 0,
//         volumeKg: 0,
//         highlight: "5.1 km • Easy pace",
//       },
//       {
//         id: "w3",
//         title: "Pull Day",
//         subtitle: "Strength",
//         dateLabel: "Tue • 8:02 PM",
//         durationMin: 49,
//         sets: 16,
//         volumeKg: 6890,
//         highlight: "Lat pulldown felt strong",
//       },
//     ],
//     []
//   );

//   const templates = useMemo<Template[]>(
//     () => [
//       { id: "t1", name: "Push", emoji: "🔥", tag: "Upper • Strength" },
//       { id: "t2", name: "Pull", emoji: "🧲", tag: "Upper • Strength" },
//       { id: "t3", name: "Legs", emoji: "🦵", tag: "Lower • Strength" },
//       { id: "t4", name: "Full Body", emoji: "⚡️", tag: "Balanced" },
//       { id: "t5", name: "Mobility", emoji: "🧘", tag: "Recovery" },
//     ],
//     []
//   );

//   const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
//   const contentMax = Math.min(980, width);
//   const sidePad = clamp((width - contentMax) / 2, 16, 28);

//   const onStart = async () => {
//     // router.push("/workouts/session");
//     // If you want “rewarding” feel, announce for screen readers:
//     const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(
//       () => false
//     );
//     if (!reduceMotion) {
//       // Light UX cue: create an "active session"
//       setActiveSession({
//         title: "Workout",
//         elapsedMin: 0,
//         lastAction: "Add your first exercise",
//       });
//     }
//   };

//   const onContinue = () => {
//     // router.push("/workouts/session");
//   };

//   const onFinish = () => {
//     setActiveSession(null);
//   };

//   return (
//     <View style={styles.root}>
//       {/* Background (deep, calm, glossy) */}
//       <LinearGradient
//         colors={["#070A12", "#050711", "#03040A"]}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 0.8, y: 1 }}
//         style={StyleSheet.absoluteFill}
//       />
//       {/* Ambient glow blobs */}
//       <View
//         pointerEvents="none"
//         style={[
//           styles.glow,
//           { top: -120, left: -80, backgroundColor: withAlpha(accent, 0.18) },
//         ]}
//       />
//       <View
//         pointerEvents="none"
//         style={[
//           styles.glow,
//           { top: 120, right: -90, backgroundColor: withAlpha(accent2, 0.16) },
//         ]}
//       />

//       {/* Sticky header */}
//       <View style={{ paddingTop: topInset }}>
//         <BlurView intensity={28} tint="dark" style={styles.headerBlur}>
//           <View style={[styles.headerRow, { paddingHorizontal: sidePad }]}>
//             <View style={{ flex: 1 }}>
//               <Text style={styles.title}>Workouts</Text>
//               <Text style={styles.subtitle}>
//                 This week: 3 workouts • 2h 18m • +1% volume
//               </Text>
//             </View>

//             <ScalePressable
//               onPress={onStart}
//               accessibilityLabel="Start workout"
//               accessibilityHint="Opens workout start options"
//             >
//               <LinearGradient
//                 colors={[withAlpha(accent, 0.35), withAlpha("#FFFFFF", 0.1)]}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.startBtn}
//               >
//                 <Ionicons
//                   name="add"
//                   size={18}
//                   color={withAlpha("#FFFFFF", 0.95)}
//                 />
//                 <Text style={styles.startBtnText}>Start</Text>
//               </LinearGradient>
//             </ScalePressable>
//           </View>
//         </BlurView>
//       </View>

//       <FlatList
//         data={recents}
//         keyExtractor={(i) => i.id}
//         contentContainerStyle={{
//           paddingBottom: 28,
//           paddingTop: 14,
//           paddingHorizontal: sidePad,
//         }}
//         ListHeaderComponent={
//           <View>
//             {/* Continue card */}
//             {activeSession ? (
//               <Animated.View entering={FadeIn.duration(240)}>
//                 <ScalePressable
//                   onPress={onContinue}
//                   accessibilityLabel={`Continue workout. ${activeSession.title}. ${activeSession.elapsedMin} minutes.`}
//                   accessibilityHint="Returns to your active workout session"
//                   style={{ marginBottom: 14 }}
//                 >
//                   <GlassCard intensity={32} style={styles.continueCard}>
//                     <View style={styles.continueTopRow}>
//                       <View style={{ flex: 1 }}>
//                         <Text style={styles.continueTitle}>
//                           Continue Workout
//                         </Text>
//                         <Text style={styles.continueName} numberOfLines={1}>
//                           {activeSession.title}
//                         </Text>
//                         <Text style={styles.continueMeta} numberOfLines={1}>
//                           {activeSession.elapsedMin}m •{" "}
//                           {activeSession.lastAction}
//                         </Text>
//                       </View>

//                       <View style={{ alignItems: "flex-end", gap: 10 }}>
//                         <View style={styles.pulseDot} />
//                         <Pressable
//                           onPress={onFinish}
//                           accessibilityRole="button"
//                           accessibilityLabel="Finish and close active workout"
//                           style={({ pressed }) => [
//                             styles.finishBtn,
//                             pressed && { opacity: 0.75 },
//                           ]}
//                         >
//                           <Ionicons
//                             name="checkmark"
//                             size={16}
//                             color={withAlpha("#111", 0.95)}
//                           />
//                           <Text style={styles.finishBtnText}>Finish</Text>
//                         </Pressable>
//                       </View>
//                     </View>

//                     <View style={styles.continueCTA}>
//                       <Ionicons
//                         name="arrow-forward"
//                         size={16}
//                         color={withAlpha("#FFFFFF", 0.85)}
//                       />
//                       <Text style={styles.continueCTAText}>Open session</Text>
//                     </View>
//                   </GlassCard>
//                 </ScalePressable>
//               </Animated.View>
//             ) : (
//               <Animated.View
//                 entering={FadeInDown.duration(420).springify().damping(16)}
//               >
//                 <ScalePressable
//                   onPress={onStart}
//                   accessibilityLabel="Start a workout"
//                   accessibilityHint="Opens workout start options"
//                   style={{ marginBottom: 14 }}
//                 >
//                   <GlassCard intensity={28} style={styles.emptyStateCard}>
//                     <Text style={styles.emptyTitle}>Start a workout</Text>
//                     <Text style={styles.emptyText}>
//                       Quick start, templates, or repeat your last session —
//                       smooth and fast.
//                     </Text>
//                     <View style={styles.emptyCTA}>
//                       <Text style={styles.emptyCTAtext}>
//                         Choose how to start
//                       </Text>
//                       <Ionicons
//                         name="chevron-forward"
//                         size={16}
//                         color={withAlpha("#FFFFFF", 0.7)}
//                       />
//                     </View>
//                   </GlassCard>
//                 </ScalePressable>
//               </Animated.View>
//             )}

//             {/* Rings */}
//             <View style={styles.ringsRow}>
//               <Ring
//                 label="Workouts"
//                 value="3/4"
//                 sub="On track"
//                 accent={accent}
//               />
//               <View style={{ width: 10 }} />
//               <Ring
//                 label="Minutes"
//                 value="138"
//                 sub="+12 vs last week"
//                 accent={accent2}
//               />
//               <View style={{ width: 10 }} />
//               <Ring
//                 label="Strength"
//                 value="+1%"
//                 sub="Volume trend"
//                 accent={"#7CFFB5"}
//               />
//             </View>

//             {/* Quick actions */}
//             <View style={{ marginTop: 16 }}>
//               <SectionHeader title="Quick actions" />
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{ paddingVertical: 10 }}
//               >
//                 <Pill
//                   label="Log Strength"
//                   icon="barbell-outline"
//                   onPress={onStart}
//                 />
//                 <Pill
//                   label="Log Cardio"
//                   icon="pulse-outline"
//                   onPress={onStart}
//                 />
//                 <Pill label="Mobility" icon="body-outline" onPress={onStart} />
//                 <Pill
//                   label="From Template"
//                   icon="albums-outline"
//                   onPress={() => {}}
//                 />
//                 <Pill
//                   label="Create Template"
//                   icon="sparkles-outline"
//                   onPress={() => {}}
//                 />
//               </ScrollView>
//             </View>

//             {/* Templates */}
//             <View style={{ marginTop: 8 }}>
//               <SectionHeader
//                 title="Templates"
//                 actionLabel="View all"
//                 onAction={() => {}}
//               />
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{ paddingVertical: 10 }}
//               >
//                 {templates.map((t) => (
//                   <TemplateChip key={t.id} t={t} onPress={onStart} />
//                 ))}
//               </ScrollView>
//             </View>

//             {/* Recent header */}
//             <View style={{ marginTop: 10 }}>
//               <SectionHeader
//                 title="Recent"
//                 actionLabel="See more"
//                 onAction={() => {}}
//               />
//               <Text style={styles.helperText}>
//                 Tap a workout for details. Duplicate to repeat fast.
//               </Text>
//             </View>

//             <View style={{ height: 10 }} />
//           </View>
//         }
//         renderItem={({ item }) => (
//           <WorkoutCard
//             w={item}
//             onPress={() => {
//               // router.push(`/workouts/${item.id}`);
//             }}
//             onDuplicate={() => {
//               // duplicate logic
//             }}
//             onDelete={() => {
//               // delete logic (confirm + undo toast recommended)
//             }}
//           />
//         )}
//         showsVerticalScrollIndicator={false}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: {
//     flex: 1,
//     backgroundColor: "#05060C",
//   },

//   glow: {
//     position: "absolute",
//     width: 260,
//     height: 260,
//     borderRadius: 260,
//     filter: undefined as any, // no-op for RN
//   },

//   headerBlur: {
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: withAlpha("#FFFFFF", 0.12),
//   },
//   headerRow: {
//     paddingTop: 14,
//     paddingBottom: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 12,
//   },

//   title: {
//     color: withAlpha("#FFFFFF", 0.94),
//     fontSize: 28,
//     fontWeight: "800",
//     letterSpacing: -0.2,
//   },
//   subtitle: {
//     marginTop: 2,
//     color: withAlpha("#FFFFFF", 0.58),
//     fontSize: 13,
//     fontWeight: "600",
//   },

//   startBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 7,
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     borderRadius: 999,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: withAlpha("#FFFFFF", 0.2),
//     overflow: "hidden",
//   },
//   startBtnText: {
//     color: withAlpha("#FFFFFF", 0.92),
//     fontSize: 14,
//     fontWeight: "800",
//     letterSpacing: 0.2,
//   },

//   cardWrap: {
//     borderRadius: 18,
//     overflow: "hidden",
//   },
//   cardBorder: {
//     ...StyleSheet.absoluteFillObject,
//     borderRadius: 18,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: withAlpha("#FFFFFF", 0.14),
//     zIndex: 2,
//   },
//   cardBlur: {
//     borderRadius: 18,
//     overflow: "hidden",
//   },
//   cardInner: {
//     padding: 14,
//   },

//   continueCard: {
//     borderRadius: 22,
//   },
//   continueTopRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     gap: 12,
//   },
//   continueTitle: {
//     color: withAlpha("#FFFFFF", 0.7),
//     fontSize: 12,
//     fontWeight: "900",
//     letterSpacing: 0.8,
//     textTransform: "uppercase",
//   },
//   continueName: {
//     marginTop: 6,
//     color: withAlpha("#FFFFFF", 0.94),
//     fontSize: 18,
//     fontWeight: "900",
//     letterSpacing: -0.2,
//   },
//   continueMeta: {
//     marginTop: 5,
//     color: withAlpha("#FFFFFF", 0.62),
//     fontSize: 13,
//     fontWeight: "600",
//   },
//   pulseDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 10,
//     backgroundColor: withAlpha("#68D7FF", 0.95),
//     shadowColor: "#68D7FF",
//     shadowOpacity: 0.8,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 0 },
//   },
//   finishBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     paddingHorizontal: 10,
//     paddingVertical: 8,
//     borderRadius: 999,
//     backgroundColor: withAlpha("#FFFFFF", 0.92),
//   },
//   finishBtnText: {
//     color: withAlpha("#111", 0.92),
//     fontSize: 12,
//     fontWeight: "900",
//   },
//   continueCTA: {
//     marginTop: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     alignSelf: "flex-start",
//     paddingHorizontal: 12,
//     paddingVertical: 9,
//     borderRadius: 999,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: withAlpha("#FFFFFF", 0.16),
//     backgroundColor: withAlpha("#FFFFFF", 0.04),
//   },
//   continueCTAText: {
//     color: withAlpha("#FFFFFF", 0.86),
//     fontSize: 13,
//     fontWeight: "800",
//   },

//   emptyStateCard: {
//     borderRadius: 22,
//   },
//   emptyTitle: {
//     color: withAlpha("#FFFFFF", 0.92),
//     fontSize: 18,
//     fontWeight: "900",
//     letterSpacing: -0.2,
//   },
//   emptyText: {
//     marginTop: 6,
//     color: withAlpha("#FFFFFF", 0.62),
//     fontSize: 13,
//     fontWeight: "600",
//     lineHeight: 18,
//   },
//   emptyCTA: {
//     marginTop: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//   },
//   emptyCTAtext: {
//     color: withAlpha("#FFFFFF", 0.78),
//     fontSize: 13,
//     fontWeight: "800",
//   },

//   ringsRow: {
//     flexDirection: "row",
//     marginTop: 2,
//   },
//   ringCard: {
//     borderRadius: 18,
//   },
//   ringTop: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     marginBottom: 6,
//   },
//   ringDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 8,
//   },
//   ringLabel: {
//     color: withAlpha("#FFFFFF", 0.66),
//     fontSize: 12,
//     fontWeight: "900",
//     letterSpacing: 0.6,
//     textTransform: "uppercase",
//   },
//   ringValue: {
//     color: withAlpha("#FFFFFF", 0.94),
//     fontSize: 18,
//     fontWeight: "900",
//     letterSpacing: -0.2,
//     fontVariant: ["tabular-nums"],
//   },
//   ringSub: {
//     marginTop: 2,
//     color: withAlpha("#FFFFFF", 0.56),
//     fontSize: 12,
//     fontWeight: "600",
//   },

//   sectionHeader: {
//     marginTop: 6,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   sectionTitle: {
//     color: withAlpha("#FFFFFF", 0.88),
//     fontSize: 14,
//     fontWeight: "900",
//     letterSpacing: 0.4,
//   },
//   sectionAction: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 4,
//     paddingVertical: 6,
//     paddingHorizontal: 8,
//   },
//   sectionActionText: {
//     color: withAlpha("#FFFFFF", 0.72),
//     fontSize: 13,
//     fontWeight: "800",
//   },
//   helperText: {
//     marginTop: 6,
//     color: withAlpha("#FFFFFF", 0.52),
//     fontSize: 12,
//     fontWeight: "600",
//   },

//   pill: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderRadius: 999,
//     backgroundColor: withAlpha("#FFFFFF", 0.06),
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: withAlpha("#FFFFFF", 0.14),
//   },
//   pillText: {
//     color: withAlpha("#FFFFFF", 0.88),
//     fontSize: 13,
//     fontWeight: "800",
//   },

//   templateChip: {
//     width: 200,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//     borderRadius: 18,
//     backgroundColor: withAlpha("#FFFFFF", 0.06),
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: withAlpha("#FFFFFF", 0.14),
//   },
//   templateEmoji: {
//     fontSize: 18,
//   },
//   templateName: {
//     color: withAlpha("#FFFFFF", 0.92),
//     fontSize: 14,
//     fontWeight: "900",
//     letterSpacing: -0.1,
//   },
//   templateTag: {
//     marginTop: 2,
//     color: withAlpha("#FFFFFF", 0.58),
//     fontSize: 12,
//     fontWeight: "700",
//   },

//   workoutCard: {
//     borderRadius: 22,
//   },
//   workoutHeaderRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//   },
//   workoutTitle: {
//     color: withAlpha("#FFFFFF", 0.94),
//     fontSize: 16,
//     fontWeight: "900",
//     letterSpacing: -0.15,
//   },
//   workoutMeta: {
//     marginTop: 4,
//     color: withAlpha("#FFFFFF", 0.58),
//     fontSize: 12,
//     fontWeight: "700",
//   },
//   prBadge: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     paddingHorizontal: 10,
//     paddingVertical: 7,
//     borderRadius: 999,
//     backgroundColor: withAlpha("#FFD66B", 0.92),
//   },
//   prText: {
//     color: withAlpha("#111", 0.9),
//     fontSize: 12,
//     fontWeight: "900",
//   },

//   statsRow: {
//     marginTop: 12,
//     flexDirection: "row",
//     gap: 8,
//     flexWrap: "wrap",
//   },
//   statChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     paddingHorizontal: 10,
//     paddingVertical: 7,
//     borderRadius: 999,
//     backgroundColor: withAlpha("#FFFFFF", 0.05),
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: withAlpha("#FFFFFF", 0.12),
//   },
//   statChipText: {
//     color: withAlpha("#FFFFFF", 0.82),
//     fontSize: 12,
//     fontWeight: "800",
//     fontVariant: ["tabular-nums"],
//   },

//   highlight: {
//     marginTop: 10,
//     color: withAlpha("#FFFFFF", 0.66),
//     fontSize: 12,
//     fontWeight: "700",
//   },
//   prLine: {
//     marginTop: 6,
//     color: withAlpha("#FFFFFF", 0.78),
//     fontSize: 12,
//     fontWeight: "800",
//   },

//   cardActions: {
//     marginTop: 12,
//     flexDirection: "row",
//     gap: 10,
//   },
//   actionBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     paddingHorizontal: 10,
//     paddingVertical: 8,
//     borderRadius: 12,
//     backgroundColor: withAlpha("#FFFFFF", 0.05),
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: withAlpha("#FFFFFF", 0.12),
//   },
//   actionBtnText: {
//     color: withAlpha("#FFFFFF", 0.82),
//     fontSize: 12,
//     fontWeight: "800",
//   },
// });
