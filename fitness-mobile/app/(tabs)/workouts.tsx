// app/(tabs)/workouts.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

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
import { kgToLb, lbToKg } from "@/utils/units";
import { fmt, startOfMonth, startOfWeek, endOfToday } from "@/utils/date";

import { withAlpha } from "@/components/workouts/utils/withAlpha";
import { Field } from "@/components/workouts/ui/Field";
import { Metric } from "@/components/workouts/ui/Metric";
import { EmptyState } from "@/components/workouts/ui/EmptyState";
import { IconButton } from "@/components/workouts/ui/IconButton";
import { GradientButton } from "@/components/workouts/ui/GradientButton";
import { SoftButton } from "@/components/workouts/ui/SoftButton";
import { Badge } from "@/components/workouts/ui/Badge";

import Hero from "@/components/workouts/Hero";
import Filters from "@/components/workouts/Filters";
import AddWorkoutForm from "@/components/workouts/AddWorkoutForm";
import GroupedWorkouts from "@/components/workouts/GroupedWorkouts";
import ExerciseSearchSheet from "@/components/workouts/ExerciseSearchSheet";

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

export default function WorkoutsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const uid = user?.uid ?? "__demo__";

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

  /* Derived "profile context" */
  const goal = (profile?.goal as "maintain" | "lose" | "gain") ?? "maintain";
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
  useEffect(
    () => subscribeWorkouts(uid, setWorkouts, { from, to }),
    [uid, from, to]
  );

  /* Workout presets (filtered by profile) */
  const [presets, setPresets] = useState<WorkoutPreset[]>([]);
  const [newPreset, setNewPreset] = useState("");
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeWorkoutPresets(user.uid, setPresets);
  }, [user?.uid]);

  const safePresets = useMemo(() => {
    if (!presets?.length) return [];
    const names = new Set(
      profileFriendlyExercises.map((e) => e.name.toLowerCase())
    );
    return presets.filter((p) => names.has(p.name.toLowerCase()));
  }, [presets, profileFriendlyExercises]);

  /* Add form state */
  const todayISO = useMemo(() => fmt(new Date()), []);
  const [date, setDate] = useState(todayISO);
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);

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
  }, [exercise, goal]); // logic unchanged

  // Most recent record for overload hint
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

  // Injury hint
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

  /* Inline edit state & handlers */
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

  /* Grouped list data */
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

  /* Quick metrics + targets */
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
    const volume = isLB ? Math.round(kgToLb(volumeKg)) : Math.round(volumeKg);
    return {
      workouts: workouts.length,
      sets: setsSum,
      volume,
      volumeUnit: unit,
    };
  }, [workouts, isLB, unit]);

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
      // restore exactly what startEdit set originally
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
    setEditId(null); // leave edit mode
  };

  /* ────────────────────────── render ────────────────────────── */

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0} // tweak if you have a custom header
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
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

        <ExerciseSearchSheet
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onPick={(name) => {
            setExercise(name);
            // Optional: auto-suggest sets/reps just like typing:
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
        {nothingToShow ? (
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
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
