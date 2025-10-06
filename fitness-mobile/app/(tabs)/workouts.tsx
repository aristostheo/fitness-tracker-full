import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import Card from "../../components/Card";
import { useAuth } from "@/content/AuthContext";
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
import { kgToLb, lbToKg } from "@/utils/units";
import { fmt, startOfMonth, startOfWeek, endOfToday } from "@/utils/date";
import { useTheme } from "@/content/ThemeProvider";

/* ────────────────────────────────────────────────────────────────────────── */
/* Types & helpers                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

type PresetKey = "all" | "week" | "7" | "month" | "30";

function withAlpha(hex: string, a = 0.18) {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, Number(x) || 0));

/* ────────────────────────────────────────────────────────────────────────── */
/* Minimal exercise catalog (profile-filtered suggestions)                     */
/* ────────────────────────────────────────────────────────────────────────── */

type Ex = {
  name: string;
  tags: string[]; // e.g., ["barbell","legs","compound"]
  needs?: (
    | "barbell"
    | "dumbbells"
    | "kettlebells"
    | "cable"
    | "machines"
    | "pullupbar"
    | "bands"
  )[];
  avoidIfInjuries?: string[]; // substrings: "shoulder","knee","lowback"
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

/* ────────────────────────────────────────────────────────────────────────── */
/* Screen                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export default function WorkoutsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const uid = user?.uid ?? "__demo__";

  /* Themed chip style */
  const chip = useMemo(
    () =>
      ({
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
      } as const),
    [colors.border]
  );

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

  /* ── derived "profile context" we’ll use everywhere ─────────────── */
  const goal = (profile?.goal as "maintain" | "lose" | "gain") ?? "maintain";
  const activity =
    (profile?.activityLevel as
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "athlete") ?? "moderate";
  const trainingDays = Number((profile as any)?.trainingDaysPerWeek ?? 3);
  const equipmentOwned = (profile?.equipment ?? []) as string[];
  const place = (profile?.workoutPlace as "home" | "gym") ?? "home";
  const injuries = (profile?.injuries ?? []) as string[];
  const isLB = unit === "lb";

  /* Profile-friendly exercise pool */
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

  /* Suggest a few exercises tailored by goal/equipment */
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

    // dedupe & limit
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
    const unsub = subscribeWorkouts(uid, setWorkouts, { from, to });
    return unsub;
  }, [uid, from, to]);

  /* Workout presets (filtered by profile) */
  const [presets, setPresets] = useState<WorkoutPreset[]>([]);
  const [newPreset, setNewPreset] = useState("");
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeWorkoutPresets(user.uid, setPresets);
    return unsub;
  }, [user?.uid]);

  const safePresets = useMemo(() => {
    if (!presets?.length) return [];
    const names = new Set(
      profileFriendlyExercises.map((e) => e.name.toLowerCase())
    );
    return presets.filter((p) => names.has(p.name.toLowerCase()));
  }, [presets, profileFriendlyExercises]);

  /* Add form */
  const todayISO = useMemo(() => fmt(new Date()), []);
  const [date, setDate] = useState(todayISO);
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState(""); // in current unit
  const [notes, setNotes] = useState("");

  // Goal-aware default scheme (autofill when exercise chosen)
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
  }, [exercise, goal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pull most recent record for the selected exercise (for overload hint)
  const lastRecord = useMemo(() => {
    const name = exercise.trim().toLowerCase();
    if (!name) return null;

    // pick most recent by createdAt if present else by date desc
    let latest: Workout | null = null;
    for (const w of workouts) {
      if ((w.exercise || "").toLowerCase() !== name) continue;
      if (!latest) {
        latest = w;
        continue;
      }
      const a = (w.createdAt as number | undefined) ?? 0;
      const b = (latest.createdAt as number | undefined) ?? 0;
      if (a > b) latest = w;
      else if (a === 0 && b === 0) {
        if ((w.date || "") > (latest.date || "")) latest = w;
      }
    }
    return latest;
  }, [workouts, exercise]);

  const nextWeightSuggestion = useMemo(() => {
    if (!lastRecord) return null;
    const lastKg = Number(lastRecord.weight || 0);
    const incKg = isLB ? lbToKg(5) : 2.5;
    const target = Number(sets || 0) * Number(reps || 0);
    const completed =
      Number(lastRecord.sets || 0) * Number(lastRecord.reps || 0);
    const proposedKg = completed >= target ? lastKg + incKg : lastKg;
    const val = isLB ? Math.round(kgToLb(proposedKg)) : Math.round(proposedKg);
    const prev = isLB
      ? Math.round(kgToLb(Number(lastRecord.weight || 0)))
      : Math.round(Number(lastRecord.weight || 0));
    return { next: val, prev };
  }, [lastRecord, sets, reps, isLB]);

  // Injury hint for chosen exercise
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
      createdAt: Date.now(), // optimistic
    };

    const tempId = `temp-${Date.now()}`;
    setWorkouts((prev) => [{ id: tempId, ...entry }, ...prev]);
    try {
      const ref = await addWorkout(user.uid, {
        ...entry,
        createdAt: undefined,
      });
      setWorkouts((prev) =>
        prev.map((w) => (w.id === tempId ? { ...w, id: ref.id } : w))
      );
      // reset
      setExercise("");
      setSets("");
      setReps("");
      setWeight("");
      setNotes("");
      setDate(todayISO);
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

  /* Group by date (newest → oldest) */
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

  /* Quick metrics + daily target sets based on training frequency */
  const totals = useMemo(() => {
    let setsSum = 0;
    let volumeKg = 0;
    for (const w of workouts) {
      const s = Number(w.sets || 0);
      const r = Number(w.reps || 0);
      const wt = Number(w.weight || 0);
      setsSum += s;
      volumeKg += s * r * wt;
    }
    const volume =
      unit === "lb" ? Math.round(kgToLb(volumeKg)) : Math.round(volumeKg);
    return {
      workouts: workouts.length,
      sets: setsSum,
      volume,
      volumeUnit: unit,
    };
  }, [workouts, unit]);

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

  /* ────────────────────────────────────────────────────────────────── */

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* HERO */}
      <LinearGradient
        colors={
          isDark
            ? (["#0D1221", "#0D1221", withAlpha(colors.primary, 0.22)] as const)
            : (["#F6FAFF", "#EEF4FF", withAlpha(colors.primary, 0.18)] as const)
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        <BlurView
          intensity={isDark ? 20 : 10}
          tint={isDark ? "dark" : "light"}
          style={{ padding: 14 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center" as const,
              justifyContent: "space-between" as const,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center" as const,
                gap: 10,
              }}
            >
              <View
                style={{
                  padding: 8,
                  borderRadius: 12,
                  backgroundColor: withAlpha(colors.primary, 0.15),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.35),
                }}
              >
                <Ionicons
                  name="barbell-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Dashboard
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 22,
                    fontWeight: "800",
                  }}
                >
                  Workouts
                </Text>
              </View>
            </View>

            {/* Persisted unit toggle */}
            <Pressable
              onPress={() =>
                user &&
                updateProfile(user.uid, {
                  weightUnit: unit === "kg" ? "lb" : "kg",
                })
              }
              hitSlop={8}
              style={({ pressed }) => [
                {
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed
                    ? withAlpha(colors.primary, 0.1)
                    : "transparent",
                },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Unit: {unit.toUpperCase()}
              </Text>
            </Pressable>
          </View>

          {/* quick metrics */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Metric value={totals.workouts} label="Workouts" />
            <Metric value={totals.sets} label="Sets" />
            <Metric
              value={totals.volume}
              label={`Volume (${totals.volumeUnit})`}
            />
          </View>

          {/* target sets/day */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Metric
              value={dailySetTarget}
              label={
                todaySets >= dailySetTarget ? "Target ✅" : "Target sets/day"
              }
            />
            <Metric value={todaySets} label="Sets today" />
          </View>
        </BlurView>
      </LinearGradient>

      {/* FILTERS */}
      <Card style={{ gap: 12 }}>
        <Text
          style={{ fontWeight: "800", color: colors.text, letterSpacing: 0.2 }}
        >
          Filter
        </Text>

        {/* Segmented presets */}
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 999,
            padding: 4,
            flexDirection: "row",
            gap: 6,
            backgroundColor: colors.card,
          }}
        >
          {(
            [
              ["all", "infinite-outline", "All time"],
              ["week", "calendar-outline", "This week"],
              ["7", "time-outline", "Last 7"],
              ["month", "calendar-number-outline", "This month"],
              ["30", "hourglass-outline", "Last 30"],
            ] as Array<[PresetKey, keyof typeof Ionicons.glyphMap, string]>
          ).map(([p, icon, label]) => {
            const active = preset === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPreset(p)}
                hitSlop={6}
                style={{
                  flexDirection: "row",
                  alignItems: "center" as const,
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: active
                    ? withAlpha(colors.primary, 0.18)
                    : "transparent",
                  borderWidth: active ? 1 : 0,
                  borderColor: active
                    ? withAlpha(colors.primary, 0.35)
                    : "transparent",
                }}
              >
                <Ionicons
                  name={icon}
                  size={14}
                  color={active ? colors.primary : colors.muted}
                />
                <Text
                  style={{
                    color: active ? colors.primary : colors.text,
                    fontWeight: active ? "800" : "600",
                    fontSize: 13,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Manual range */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="calendar-outline"
            placeholder="From YYYY-MM-DD"
            value={from}
            onChangeText={setFrom}
            autoCapitalize="none"
          />
          <Field
            icon="calendar-clear-outline"
            placeholder="To YYYY-MM-DD"
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
          />
        </View>
      </Card>

      {/* ADD WORKOUT */}
      <Card style={{ gap: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center" as const,
            justifyContent: "space-between" as const,
          }}
        >
          <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>
            Add workout
          </Text>

          {/* quick clear form */}
          <Pressable
            onPress={() => {
              setExercise("");
              setSets("");
              setReps("");
              setWeight("");
              setNotes("");
              setDate(todayISO);
            }}
            hitSlop={8}
            style={({ pressed }) => [
              {
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed
                  ? withAlpha(colors.primary, 0.08)
                  : "transparent",
              },
            ]}
          >
            <Text style={{ color: colors.muted, fontWeight: "600" }}>
              Clear
            </Text>
          </Pressable>
        </View>

        {/* Suggested for you (profile-aware) */}
        {!!suggested.length && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {suggested.map((s) => (
              <Pressable
                key={s.name}
                style={[
                  chip,
                  {
                    backgroundColor: withAlpha(colors.primary, 0.12),
                    borderColor: withAlpha(colors.primary, 0.3),
                  },
                ]}
                onPress={() => setExercise(s.name)}
              >
                <Text style={{ color: colors.text }}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Presets (filtered via equipment/place/injury) */}
        {!!safePresets.length && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {safePresets.map((p) => (
              <Pressable
                key={p.id}
                style={[
                  chip,
                  {
                    backgroundColor: withAlpha(colors.primary, 0.12),
                    borderColor: withAlpha(colors.primary, 0.3),
                  },
                ]}
                onPress={() => setExercise(p.name)}
              >
                <Text style={{ color: colors.text }}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="today-outline"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            autoCapitalize="none"
          />
          <Field
            icon="barbell-outline"
            placeholder="Exercise"
            value={exercise}
            onChangeText={setExercise}
            autoCapitalize="words"
          />
        </View>

        {/* Injury warning for selected exercise */}
        {conflictWarning && (
          <Text style={{ color: "#ef4444", fontSize: 12 }}>
            This may aggravate an injury. Try:{" "}
            {conflictWarning.alt ?? "a machine/band alternative"}.
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="layers-outline"
            placeholder="Sets"
            value={sets}
            onChangeText={(v) => setSets(v.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
          />
          <Field
            icon="repeat-outline"
            placeholder="Reps"
            value={reps}
            onChangeText={(v) => setReps(v.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
          />
          <Field
            icon="speedometer-outline"
            placeholder={`Weight (${unit})`}
            value={weight}
            onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
          />
        </View>

        {/* Progressive overload hint */}
        {!!exercise.trim() && nextWeightSuggestion && (
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Suggested: {nextWeightSuggestion.next} {unit} (prev{" "}
            {nextWeightSuggestion.prev} {unit})
          </Text>
        )}

        <Field
          icon="document-text-outline"
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
        />

        {/* CTA row */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center" as const,
              marginTop: 6,
            }}
          >
            <Pressable
              onPress={!addDisabled ? onAdd : undefined}
              style={{ flex: 0 }}
              disabled={addDisabled}
            >
              <LinearGradient
                colors={
                  addDisabled
                    ? [
                        withAlpha(colors.muted, 0.3),
                        withAlpha(colors.muted, 0.3),
                      ]
                    : [colors.primary, "#16a34a"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 44,
                  paddingHorizontal: 18,
                  borderRadius: 12,
                  alignItems: "center" as const,
                  justifyContent: "center" as const,
                  opacity: addDisabled ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Add</Text>
              </LinearGradient>
            </Pressable>

            {/* Save preset */}
            {user?.uid && (
              <>
                <Field
                  icon="bookmark-outline"
                  placeholder="Save exercise as preset (name)"
                  value={newPreset}
                  onChangeText={setNewPreset}
                />
                <Pressable
                  hitSlop={6}
                  style={({ pressed }) => [
                    {
                      height: 44,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center" as const,
                      justifyContent: "center" as const,
                      backgroundColor: pressed
                        ? withAlpha(colors.primary, 0.1)
                        : "transparent",
                    },
                  ]}
                  onPress={async () => {
                    const name = newPreset.trim();
                    if (!name || !user?.uid) return;
                    await addWorkoutPreset(user.uid, {
                      name,
                      exercise: name,
                      createdAt: Date.now(),
                    } as Omit<WorkoutPreset, "id">);
                    setNewPreset("");
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "700" }}>
                    Save
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Card>

      {/* LIST (recent grouped) */}
      {nothingToShow ? (
        <EmptyState
          title="No workouts in this range"
          subtitle="Try changing filters or add a new workout above."
        />
      ) : (
        grouped.map(({ date, items }) => (
          <Card key={date} style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between" as const,
                alignItems: "center" as const,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center" as const,
                  gap: 8,
                }}
              >
                <Badge
                  tint={withAlpha(colors.primary, 0.18)}
                  border={withAlpha(colors.primary, 0.35)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: "700",
                      marginLeft: 4,
                    }}
                  >
                    {date}
                  </Text>
                </Badge>
              </View>
              <Text style={{ color: colors.muted }}>
                {items.reduce((s, it) => s + (it.sets || 0), 0)} sets •{" "}
                {items.length} exercises
              </Text>
            </View>

            {items.map((w, idx) => {
              const isTemp = w.id.startsWith?.("temp-");
              const isEditing = editId === w.id;
              const showDivider = idx !== items.length - 1 && !isEditing;

              return (
                <View key={w.id} style={{ paddingTop: 6 }}>
                  {isEditing ? (
                    <>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Field
                          icon="today-outline"
                          value={edit.date}
                          onChangeText={(v) =>
                            setEdit((e) => ({ ...e, date: v }))
                          }
                        />
                        <Field
                          icon="barbell-outline"
                          value={edit.exercise}
                          onChangeText={(v) =>
                            setEdit((e) => ({ ...e, exercise: v }))
                          }
                        />
                      </View>
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 8 }}
                      >
                        <Field
                          icon="layers-outline"
                          placeholder="Sets"
                          value={edit.sets}
                          onChangeText={(v) =>
                            setEdit((e) => ({
                              ...e,
                              sets: v.replace(/[^0-9]/g, ""),
                            }))
                          }
                          inputMode="numeric"
                        />
                        <Field
                          icon="repeat-outline"
                          placeholder="Reps"
                          value={edit.reps}
                          onChangeText={(v) =>
                            setEdit((e) => ({
                              ...e,
                              reps: v.replace(/[^0-9]/g, ""),
                            }))
                          }
                          inputMode="numeric"
                        />
                        <Field
                          icon="speedometer-outline"
                          placeholder={`Weight (${unit})`}
                          value={edit.weight}
                          onChangeText={(v) =>
                            setEdit((e) => ({
                              ...e,
                              weight: v.replace(/[^0-9.]/g, ""),
                            }))
                          }
                          inputMode="decimal"
                        />
                      </View>
                      <Field
                        icon="document-text-outline"
                        placeholder="Notes"
                        value={edit.notes}
                        onChangeText={(v) =>
                          setEdit((e) => ({ ...e, notes: v }))
                        }
                      />
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 8 }}
                      >
                        <SoftButton
                          label="Cancel"
                          onPress={() => setEditId(null)}
                        />
                        <GradientButton label="Save" onPress={saveEdit} />
                      </View>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => startEdit(w)}
                      android_ripple={{
                        color: withAlpha(colors.primary, 0.12),
                      }}
                      style={({ pressed }) => [
                        {
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                          borderRadius: 12,
                          flexDirection: "row",
                          alignItems: "center" as const,
                          justifyContent: "space-between" as const,
                          backgroundColor: pressed
                            ? withAlpha(colors.primary, 0.06)
                            : "transparent",
                        },
                      ]}
                    >
                      {/* left */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center" as const,
                          gap: 10,
                          flex: 1,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: "100%",
                            backgroundColor: withAlpha(colors.primary, 0.6),
                            borderRadius: 3,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontWeight: "700", color: colors.text }}
                            numberOfLines={1}
                          >
                            {w.exercise} — {w.sets ?? 0}×{w.reps ?? 0} @{" "}
                            {unit === "lb"
                              ? Math.round(kgToLb(w.weight || 0))
                              : Math.round(w.weight || 0)}{" "}
                            {unit}
                            {isTemp && (
                              <Text style={{ color: colors.muted }}>
                                {"  "}(saving…)
                              </Text>
                            )}
                          </Text>
                          <Text
                            style={{ color: colors.muted }}
                            numberOfLines={1}
                          >
                            {w.notes ? w.notes : "Tap to edit"}
                          </Text>
                        </View>
                      </View>

                      {/* actions */}
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <IconButton
                          icon="create-outline"
                          onPress={() => !isTemp && startEdit(w)}
                          disabled={isTemp}
                        />
                        <IconButton
                          icon="trash-outline"
                          onPress={() => removeWorkout(w.id)}
                          danger
                        />
                      </View>
                    </Pressable>
                  )}

                  {showDivider && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.border,
                        marginLeft: 16,
                        marginTop: 8,
                      }}
                    />
                  )}
                </View>
              );
            })}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Reusable bits                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function Field(
  props: {
    icon: keyof typeof Ionicons.glyphMap;
  } & React.ComponentProps<typeof TextInput>
) {
  const { colors } = useTheme();
  const { icon, style, ...rest } = props;
  return (
    <View
      style={[
        {
          flex: 1,
          height: 44,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: colors.inputBg,
          flexDirection: "row" as const,
          alignItems: "center" as const,
        },
        style as any,
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        placeholderTextColor={colors.placeholder}
        style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 16 }}
        {...rest}
      />
    </View>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}

function Badge({
  children,
  tint,
  border,
}: {
  children: React.ReactNode;
  tint: string;
  border: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center" as const,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: tint,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      {children}
    </View>
  );
}

function IconButton({
  icon,
  onPress,
  disabled,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        {
          height: 38,
          width: 38,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: danger ? withAlpha("#ef4444", 0.5) : colors.border,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          backgroundColor: pressed
            ? withAlpha(colors.primary, 0.06)
            : "transparent",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={danger ? "#ef4444" : colors.text}
      />
    </Pressable>
  );
}

function GradientButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flex: 0 }}>
      <LinearGradient
        colors={[colors.primary, "#16a34a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 42,
          paddingHorizontal: 18,
          borderRadius: 12,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function SoftButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          height: 42,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          backgroundColor: pressed
            ? withAlpha(colors.primary, 0.08)
            : "transparent",
        },
      ]}
    >
      <Text style={{ color: colors.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <Card
      style={{ alignItems: "center" as const, gap: 6, paddingVertical: 28 }}
    >
      <Text style={{ fontSize: 36 }}>🗓️</Text>
      <Text style={{ color: colors.text, fontWeight: "800" }}>{title}</Text>
      {!!subtitle && <Text style={{ color: colors.muted }}>{subtitle}</Text>}
    </Card>
  );
}
