// app/workouts/session.tsx
// Sleek “Apple-ish” log workout page (fast during real workouts)
// - Uses add-exercise.tsx modal for Browse + Presets
// - Stores each set as ONE draft item (sets=1) to enable per-set editing
// - Draft persisted via sessionDraft utils
// - Finish writes to DB via addWorkout() with session grouping fields

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Platform,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Alert as RNAlert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { fmt } from "@/utils/date";
import { lbToKg, kgToLb } from "@/utils/units";
import { withAlpha } from "@/components/workouts/utils/withAlpha";

import { addWorkout, type Workout } from "@/services/workouts";
import {
  subscribeWorkoutPresets,
  addWorkoutPreset,
  deleteWorkoutPreset,
  type WorkoutPreset,
} from "@/services/presets";
import {
  ensureProfile,
  subscribeProfile,
  type Profile,
} from "@/services/profile";

import {
  loadSessionDraft,
  saveSessionDraft,
  clearSessionDraft,
  newSessionDraft,
  type WorkoutSessionDraft,
  type WorkoutSessionDraftItem,
} from "../../components/workouts/sessionDraft";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Each set is one item => per-set editing works naturally.
type SetDraftItem = WorkoutSessionDraftItem & {
  id?: string;
  done?: boolean;
  note?: string;
};

type EditSetState = {
  open: boolean;
  itemId: string | null;
  exercise: string;
  reps: string;
  weight: string;
  note: string;
  done: boolean;
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
  return `${m}:${pad2(sec)}`;
}
function fmtCompact(n: number) {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`;
  if (abs >= 1_000) return `${Math.round((n / 1_000) * 10) / 10}k`;
  return String(Math.round(n));
}
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function GlassCard({
  children,
  style,
  intensity = 30,
}: {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
}) {
  return (
    <View style={[styles.cardWrap, style]}>
      <View style={styles.cardBorder} pointerEvents="none" />
      <BlurView intensity={intensity} tint="dark" style={styles.cardBlur}>
        <LinearGradient
          colors={[
            withAlpha("#FFFFFF", 0.1),
            withAlpha("#FFFFFF", 0.06),
            withAlpha("#000000", 0.06),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardInner}
        >
          {children}
        </LinearGradient>
      </BlurView>
    </View>
  );
}

function Chip({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={14} color={withAlpha("#FFFFFF", 0.82)} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function MiniBtn({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.miniBtn,
        danger && { borderColor: withAlpha("#FF5C6A", 0.25) },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={danger ? withAlpha("#FF5C6A", 0.9) : withAlpha("#FFFFFF", 0.82)}
      />
      <Text
        style={[
          styles.miniBtnText,
          danger && { color: withAlpha("#FF5C6A", 0.9) },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const uidUser = user?.uid;

  const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
  const todayISO = useMemo(() => fmt(new Date()), []);

  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---- persisted draft ----
  const [draft, setDraft] = useState<WorkoutSessionDraft | null>(null);
  const [titleOpen, setTitleOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // ---- profile + unit ----
  const [profile, setProfile] = useState<Profile | null>(null);
  const unit: "kg" | "lb" = profile?.weightUnit === "lb" ? "lb" : "kg";

  // ---- presets ----
  const [presets, setPresets] = useState<WorkoutPreset[]>([]);
  const safePresets = useMemo(
    () =>
      (presets || [])
        .filter((p) => p?.name)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sets: p.sets,
          reps: p.reps,
          weightKg: p.weight, // stored as kg in your service
          notes: p.notes,
          exercise: (p as any).exercise,
        })),
    [presets]
  );

  // ---- UI states ----
  const [savedToast, setSavedToast] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pickedConsumed = useRef<string | null>(null);

  const [quickExercise, setQuickExercise] = useState("");
  const [quickReps, setQuickReps] = useState("10");
  const [quickWeight, setQuickWeight] = useState("");

  const [edit, setEdit] = useState<EditSetState>({
    open: false,
    itemId: null,
    exercise: "",
    reps: "10",
    weight: "",
    note: "",
    done: false,
  });

  // ---- persist debounce ----
  const savingRef = useRef(false);
  const saveTimerRef = useRef<any>(null);
  const pendingRef = useRef<WorkoutSessionDraft | null>(null);

  async function flushSave() {
    if (!uidUser) return;
    if (savingRef.current) return;
    const next = pendingRef.current;
    if (!next) return;

    savingRef.current = true;
    try {
      await saveSessionDraft(uidUser, next);
    } finally {
      savingRef.current = false;
      if (
        pendingRef.current &&
        pendingRef.current.updatedAt !== next.updatedAt
      ) {
        flushSave();
      }
    }
  }

  function persist(next: WorkoutSessionDraft) {
    setDraft(next);
    pendingRef.current = next;
    if (!uidUser) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => flushSave(), 220);
  }

  // ---- subscribe: profile ----
  useEffect(() => {
    if (!uidUser) return;
    ensureProfile(uidUser).catch(() => {});
    const unsub = subscribeProfile(uidUser, (p) => setProfile(p || null));
    return () => unsub?.();
  }, [uidUser]);

  // ---- subscribe: presets ----
  useEffect(() => {
    if (!uidUser) return;
    const unsub = subscribeWorkoutPresets(uidUser, (rows) =>
      setPresets(rows || [])
    );
    return () => unsub?.();
  }, [uidUser]);

  // ---- load draft ----
  useEffect(() => {
    if (!uidUser) {
      setDraft(null);
      return;
    }
    (async () => {
      const existing = await loadSessionDraft(uidUser);
      if (existing) {
        setDraft(existing);
        setTitleDraft(existing.title || "Workout");
        return;
      }
      const fresh = newSessionDraft({ dateISO: todayISO, title: "Workout" });
      setDraft(fresh);
      setTitleDraft(fresh.title);
      await saveSessionDraft(uidUser, fresh);
    })();
  }, [uidUser, todayISO]);

  // ---- consume template seed (from Workouts page) ----
  useEffect(() => {
    if (!uidUser || !draft) return;

    (async () => {
      const key = `workout:templateSeed:${uidUser}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return;

      await AsyncStorage.removeItem(key);

      const seed = JSON.parse(raw) as {
        title?: string;
        exercises: {
          name: string;
          sets: number;
          reps?: number;
          weightKg?: number;
          note?: string;
        }[];
      };

      let nextItems: SetDraftItem[] = [];

      for (const ex of seed.exercises || []) {
        const sets = Math.max(1, ex.sets || 1);
        for (let i = 0; i < sets; i++) {
          nextItems.push({
            id: uid(),
            exercise: ex.name,
            sets: 1,
            reps: ex.reps ?? 10,
            weightKg: ex.weightKg ?? 0,
            note: ex.note ?? "",
            notes: ex.note ?? "",
            done: false,
            createdAt: Date.now() + i,
          });
        }
      }

      const next: WorkoutSessionDraft = {
        ...draft,
        title: seed.title || draft.title,
        updatedAt: Date.now(),
        items: [...nextItems, ...draft.items],
      };

      persist(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    })();
  }, [uidUser, draft?.id]);

  // ---- handle selection coming back from /(modals)/add-exercise ----
  useEffect(() => {
    const picked = (params?.pickedExercise || "").toString().trim();
    if (!picked || !draft) return;
    if (pickedConsumed.current === picked) return;

    pickedConsumed.current = picked;

    const from = String(params?.pickedFrom || "");
    const run = async () => {
      if (from === "preset") {
        const nSets = Math.max(1, Number(params?.presetSets || 1) || 1);
        const reps = Number(params?.presetReps || 10) || 10;
        const weightKg = Number(params?.presetWeightKg || 0) || 0;
        for (let i = 0; i < nSets; i++) {
          await addSet(picked, { reps, weightKg });
        }
      } else {
        await addSet(picked);
      }

      setSavedToast("Added ✓");
      setTimeout(() => setSavedToast(""), 1000);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.pickedExercise, draft?.id]);

  // ---- stats + grouping ----
  const items = (draft?.items || []) as SetDraftItem[];

  const stats = useMemo(() => {
    const totalSets = items.reduce((a, it) => a + Number(it.sets || 0), 0);
    const totalReps = items.reduce(
      (a, it) => a + Number(it.reps || 0) * Number(it.sets || 0),
      0
    );
    const totalVolumeKg = items.reduce(
      (a, it) =>
        a +
        Number(it.weightKg || 0) * Number(it.reps || 0) * Number(it.sets || 0),
      0
    );

    const startedAt = draft?.startedAt || Date.now();
    const durationMs = Math.max(0, nowTick - startedAt);

    const exCount = new Set(
      items.map((x) => (x.exercise || "").trim()).filter(Boolean)
    ).size;

    return {
      exCount,
      totalSets,
      totalReps,
      totalVolumeKg,
      startedAt,
      durationMs,
    };
  }, [items, draft?.startedAt, nowTick]);

  const elapsedLabel = useMemo(() => {
    if (!draft?.startedAt) return "0:00";
    return formatDuration(nowTick - draft.startedAt);
  }, [draft?.startedAt, nowTick]);

  const volumeDisplay = useMemo(() => {
    const v = unit === "lb" ? kgToLb(stats.totalVolumeKg) : stats.totalVolumeKg;
    return fmtCompact(Math.round(v));
  }, [stats.totalVolumeKg, unit]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; items: SetDraftItem[]; lastAt: number }
    >();
    for (const it of items) {
      const key = (it.exercise || "").trim() || "Exercise";
      const prev = map.get(key);
      if (!prev) map.set(key, { name: key, items: [it], lastAt: it.createdAt });
      else {
        prev.items.push(it);
        prev.lastAt = Math.max(prev.lastAt, it.createdAt);
      }
    }
    return [...map.values()]
      .map((g) => ({
        ...g,
        items: g.items.sort((a, b) => b.createdAt - a.createdAt), // newest set on top
      }))
      .sort((a, b) => b.lastAt - a.lastAt);
  }, [items]);

  function toggleExpanded(exName: string, defaultOpen: boolean) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((cur) => ({ ...cur, [exName]: !(cur[exName] ?? defaultOpen) }));
  }

  function lastUsedFor(exerciseName: string) {
    const found = items.find(
      (it) =>
        (it.exercise || "").trim().toLowerCase() ===
        exerciseName.trim().toLowerCase()
    );
    if (!found) return { reps: 10, weightKg: 0 };
    return {
      reps: Number(found.reps || 10),
      weightKg: Number(found.weightKg || 0),
    };
  }

  async function addSet(
    exerciseName: string,
    opts?: { weightKg?: number; reps?: number }
  ) {
    if (!draft) return;

    if (!uidUser) {
      RNAlert.alert("Sign in required", "Please sign in to start a workout.");
      return;
    }

    const ex = (exerciseName || "").trim();
    if (!ex) return;

    const last = lastUsedFor(ex);
    const reps = Number(opts?.reps ?? last.reps ?? 10) || 10;
    const weightKg = Number(opts?.weightKg ?? last.weightKg ?? 0) || 0;

    const item: SetDraftItem = {
      id: uid(),
      exercise: ex,
      sets: 1,
      reps,
      weightKg,
      notes: "", // keep compatibility with your existing item schema
      note: "",
      done: false,
      createdAt: Date.now(),
    };

    const next: WorkoutSessionDraft = {
      ...draft,
      updatedAt: Date.now(),
      items: [item as any, ...(draft.items as any)],
    };

    persist(next);
    setExpanded((cur) => ({ ...cur, [ex]: true }));

    try {
      await Haptics.selectionAsync();
    } catch {}
  }

  function removeItem(itemId: string) {
    if (!draft) return;
    const next: WorkoutSessionDraft = {
      ...draft,
      updatedAt: Date.now(),
      items: items.filter((it) => String(it.id) !== itemId) as any,
    };
    persist(next);
  }

  function openEdit(it: SetDraftItem) {
    const w =
      unit === "lb"
        ? kgToLb(Number(it.weightKg || 0))
        : Number(it.weightKg || 0);
    setEdit({
      open: true,
      itemId: String(it.id || ""),
      exercise: (it.exercise || "").toString(),
      reps: String(it.reps ?? 10),
      weight: w ? String(Math.round(w * 100) / 100) : "",
      note: String((it.note ?? it.notes ?? "") || ""),
      done: !!it.done,
    });
    Haptics.selectionAsync().catch(() => {});
  }

  function applyEdit() {
    if (!draft || !edit.itemId) return;

    const repsN = Math.max(0, Number(edit.reps || 0) || 0);

    const weightN = Number(edit.weight || 0) || 0;
    const weightKg = unit === "lb" ? lbToKg(weightN) : weightN;

    const nextItems = items.map((it) => {
      if (String(it.id) !== edit.itemId) return it;
      const updated: SetDraftItem = {
        ...it,
        reps: repsN,
        weightKg: Number(isFinite(weightKg) ? weightKg : 0),
        done: !!edit.done,
        note: (edit.note || "").trim(),
        notes: (edit.note || "").trim(), // keep legacy in sync
      };
      return updated;
    });

    const next: WorkoutSessionDraft = {
      ...draft,
      updatedAt: Date.now(),
      items: nextItems as any,
    };

    persist(next);
    setEdit((s) => ({ ...s, open: false }));
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function toggleDone(itemId: string) {
    if (!draft) return;
    const nextItems = items.map((it) =>
      String(it.id) === itemId ? { ...it, done: !it.done } : it
    );
    const next: WorkoutSessionDraft = {
      ...draft,
      updatedAt: Date.now(),
      items: nextItems as any,
    };
    persist(next);
    Haptics.selectionAsync().catch(() => {});
  }

  function saveTitle() {
    if (!draft) return;
    const next: WorkoutSessionDraft = {
      ...draft,
      title: (titleDraft || "Workout").trim() || "Workout",
      updatedAt: Date.now(),
    };
    persist(next);
    setTitleOpen(false);
  }

  async function savePresetForExercise(exName: string) {
    if (!uidUser) return;
    const ex = exName.trim();
    if (!ex) return;

    const last = items.find(
      (it) => (it.exercise || "").trim().toLowerCase() === ex.toLowerCase()
    );
    if (!last) {
      RNAlert.alert("Nothing to save", "Log at least one set first.");
      return;
    }

    await addWorkoutPreset(uidUser, {
      name: ex,
      exercise: ex,
      sets: 1,
      reps: Number(last.reps || 10),
      weight: Number(last.weightKg || 0),
      notes: (last.note || last.notes || "").trim(),
    } as any);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    RNAlert.alert("Saved", `Preset created for “${ex}”.`);
  }

  async function deletePresetByName(exName: string) {
    if (!uidUser) return;
    const lower = exName.trim().toLowerCase();
    const found = presets.find(
      (p: any) =>
        String(p?.name || "")
          .trim()
          .toLowerCase() === lower ||
        String((p as any)?.exercise || "")
          .trim()
          .toLowerCase() === lower
    );

    if (!found) {
      RNAlert.alert("No preset found", "Create a preset first.");
      return;
    }

    RNAlert.alert("Delete preset?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteWorkoutPreset(uidUser, found.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => {}
          );
        },
      },
    ]);
  }

  async function finishWorkout() {
    if (!uidUser || !draft) return;

    if (!items.length) {
      RNAlert.alert("Nothing logged", "Add at least one set first.");
      return;
    }

    // Ensure we use the latest typed title, even if the modal is still open.
    const normalizedTitle =
      (titleDraft || draft.title || "Workout").trim() || "Workout";
    if (normalizedTitle !== draft.title) {
      persist({ ...draft, title: normalizedTitle, updatedAt: Date.now() });
    }

    RNAlert.alert(
      "Finish workout?",
      "This will save it to your workout history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          onPress: async () => {
            // Oldest -> newest so history reads in real order
            const ordered = [...items].sort(
              (a, b) => a.createdAt - b.createdAt
            );

            for (const it of ordered) {
              const entry: Partial<Workout> & any = {
                date: draft.dateISO,
                exercise: it.exercise,
                sets: 1,
                reps: it.reps,
                weight: it.weightKg,
                notes: (it.note || it.notes || "").trim(),
                // grouping fields
                sessionId: draft.id,
                sessionTitle: normalizedTitle,
                sessionStartedAt: draft.startedAt,
                // optional
                done: !!it.done,
                setId: it.id,
                setCreatedAt: it.createdAt,
              };

              await addWorkout(uidUser, {
                ...entry,
                createdAt: undefined, // match workouts.tsx behavior
              } as any);
            }

            await clearSessionDraft(uidUser);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
              () => {}
            );

            const vol =
              unit === "lb" ? kgToLb(stats.totalVolumeKg) : stats.totalVolumeKg;

            RNAlert.alert(
              "Nice work",
              `You logged ${fmtCompact(stats.totalSets)} sets • ${fmtCompact(
                stats.totalReps
              )} reps • ${fmtCompact(Math.round(vol))} ${unit} volume`
            );

            router.back();
          },
        },
      ]
    );
  }

  function confirmExit() {
    if (!draft || !(items.length)) {
      router.back();
      return;
    }

    RNAlert.alert(
      "Leave workout?",
      "Save it to continue later, or cancel to discard everything.",
      [
        {
          text: "Save & come back",
          onPress: () => router.back(),
        },
        {
          text: "Cancel workout",
          style: "destructive",
          onPress: async () => {
            if (uidUser) {
              await clearSessionDraft(uidUser);
            }
            setDraft(null);
            setExpanded({});
            router.back();
          },
        },
        { text: "Keep logging", style: "cancel" },
      ]
    );
  }

  // ---- quick add (manual, no browse) ----
  async function quickAdd() {
    const ex = quickExercise.trim();
    if (!ex) {
      RNAlert.alert(
        "Exercise required",
        "Type an exercise name or use Browse."
      );
      return;
    }
    const reps = Number(quickReps || 0) || 10;

    const w = Number(quickWeight || 0) || 0;
    const weightKg = unit === "lb" ? lbToKg(w) : w;

    await addSet(ex, { reps, weightKg });
    setQuickExercise(ex); // keep name for speed
  }

  if (!draft) {
    return (
      <View style={[styles.loadingWrap]}>
        <Text style={{ color: withAlpha("#FFFFFF", 0.7), fontWeight: "800" }}>
          Loading…
        </Text>
      </View>
    );
  }

  const contentMax = 980;
  const sidePad = 16;

  return (
    <View style={styles.root}>
      {/* Background */}
      <LinearGradient
        colors={["#070A12", "#050711", "#03040A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Toast */}
      {savedToast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toast}>
            <Text style={styles.toastText}>{savedToast}</Text>
          </View>
        </View>
      ) : null}

      {/* Sticky top bar */}
      <View style={{ paddingTop: topInset }}>
        <BlurView intensity={26} tint="dark" style={styles.headerBlur}>
          <View style={[styles.headerRow, { paddingHorizontal: sidePad }]}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                confirmExit();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={withAlpha("#FFFFFF", 0.9)}
              />
            </Pressable>

            <Pressable
              onPress={() => {
                setTitleDraft(draft.title || "Workout");
                setTitleOpen(true);
              }}
              style={{ flex: 1, alignItems: "center", gap: 4 }}
            >
              <Text style={styles.inProgress}>IN PROGRESS</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {draft.title || "Workout"}
                </Text>
                <Ionicons
                  name="pencil"
                  size={14}
                  color={withAlpha("#FFFFFF", 0.55)}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Chip icon="list-outline" label={`${stats.exCount} ex`} />
                <Chip icon="time-outline" label={elapsedLabel} />
              </View>
            </Pressable>

            <Pressable
              onPress={finishWorkout}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.finishBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons
                name="checkmark"
                size={20}
                color={withAlpha("#111", 0.95)}
              />
            </Pressable>
          </View>
        </BlurView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: sidePad,
            paddingTop: 14,
            paddingBottom: 110,
            maxWidth: contentMax,
            alignSelf: "center",
            width: "100%",
            gap: 12,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Stats */}
          <Animated.View entering={FadeInDown.duration(380)}>
            <GlassCard intensity={26}>
              <Text style={styles.sectionTitle}>Session stats</Text>
              <Text style={styles.sectionSub}>
                Sets, reps, and total volume (updates live)
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={styles.statPill}>
                  <Text style={styles.statLabel}>SETS</Text>
                  <Text style={styles.statValue}>
                    {String(stats.totalSets)}
                  </Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statLabel}>REPS</Text>
                  <Text style={styles.statValue}>
                    {String(stats.totalReps)}
                  </Text>
                </View>
                <View style={styles.statPill}>
                  <Text
                    style={styles.statLabel}
                  >{`VOL (${unit.toUpperCase()})`}</Text>
                  <Text style={styles.statValue}>{volumeDisplay}</Text>
                </View>
              </View>

              <Text style={styles.tip}>
                Tip: tap a set to edit it. Mark sets done for a satisfying flow.
              </Text>
            </GlassCard>
          </Animated.View>

          {/* Quick add + Browse */}
          <Animated.View entering={FadeInDown.duration(420)}>
            <GlassCard>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Log a set</Text>
                  <Text style={styles.sectionSub}>
                    Fast entry + Browse (presets + exercises)
                  </Text>
                </View>

                <Pressable
                  onPress={() => router.push("/(modals)/add-exercise")}
                  style={({ pressed }) => [
                    styles.browseBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons
                    name="search-outline"
                    size={16}
                    color={withAlpha("#FFFFFF", 0.9)}
                  />
                  <Text style={styles.browseText}>Browse</Text>
                </Pressable>
              </View>

              <View style={{ height: 10 }} />

              <View style={styles.quickRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Exercise</Text>
                  <TextInput
                    value={quickExercise}
                    onChangeText={setQuickExercise}
                    placeholder="e.g., Bench Press"
                    placeholderTextColor={withAlpha("#FFFFFF", 0.35)}
                    style={styles.input}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Reps</Text>
                  <TextInput
                    value={quickReps}
                    onChangeText={setQuickReps}
                    keyboardType="number-pad"
                    placeholder="10"
                    placeholderTextColor={withAlpha("#FFFFFF", 0.35)}
                    style={styles.input}
                    returnKeyType="done"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{`Weight (${unit})`}</Text>
                  <TextInput
                    value={quickWeight}
                    onChangeText={setQuickWeight}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={withAlpha("#FFFFFF", 0.35)}
                    style={styles.input}
                    returnKeyType="done"
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={quickAdd}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={withAlpha("#FFFFFF", 0.95)}
                  />
                  <Text style={styles.primaryBtnText}>Add set</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setQuickExercise("");
                    setQuickReps("10");
                    setQuickWeight("");
                    Keyboard.dismiss();
                  }}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.secondaryBtnText}>Clear</Text>
                </Pressable>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Exercise blocks (sets in one place) */}
          {groups.length === 0 ? (
            <Animated.View entering={FadeIn.duration(220)}>
              <GlassCard>
                <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>
                  Your workout is empty
                </Text>
                <Text style={styles.sectionSub}>
                  Add your first set above — or use Browse to pick from presets.
                </Text>
              </GlassCard>
            </Animated.View>
          ) : (
            <View style={{ gap: 12 }}>
              {groups.map((g) => {
                const isOpen = expanded[g.name] ?? g.items.length <= 2;
                const totalSets = g.items.length;

                const last = g.items[0];
                const lastW =
                  unit === "lb"
                    ? kgToLb(Number(last.weightKg || 0))
                    : Number(last.weightKg || 0);

                const lastLine = `${Math.round(lastW * 100) / 100} ${unit} × ${
                  last.reps
                } reps`;

                const doneCount = g.items.filter((x) => x.done).length;

                return (
                  <Animated.View
                    key={g.name}
                    entering={FadeInDown.duration(360)}
                  >
                    <View style={styles.exerciseCard}>
                      <LinearGradient
                        colors={[
                          withAlpha("#68D7FF", 0.14),
                          withAlpha("#FFFFFF", 0.04),
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <BlurView
                        intensity={18}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                      />

                      {/* Header */}
                      <Pressable
                        onPress={() =>
                          toggleExpanded(g.name, g.items.length <= 2)
                        }
                        style={({ pressed }) => [
                          styles.exerciseHeader,
                          pressed && { opacity: 0.92 },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.exerciseName} numberOfLines={1}>
                            {g.name}
                          </Text>
                          <Text style={styles.exerciseMeta} numberOfLines={1}>
                            {doneCount}/{totalSets} done • Last: {lastLine}
                          </Text>
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <MiniBtn
                            icon="add"
                            label="Set"
                            onPress={() => addSet(g.name)}
                          />
                          <Ionicons
                            name={isOpen ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={withAlpha("#FFFFFF", 0.6)}
                          />
                        </View>
                      </Pressable>

                      {/* Actions */}
                      <View style={styles.exerciseActions}>
                        <MiniBtn
                          icon="bookmark-outline"
                          label="Save preset"
                          onPress={() => savePresetForExercise(g.name)}
                        />
                        <MiniBtn
                          icon="trash-outline"
                          label="Delete preset"
                          danger
                          onPress={() => deletePresetByName(g.name)}
                        />
                      </View>

                      {/* Sets list */}
                      {isOpen ? (
                        <View style={{ padding: 12, paddingTop: 6, gap: 10 }}>
                          {g.items.map((it, idx) => {
                            const w =
                              unit === "lb"
                                ? kgToLb(Number(it.weightKg || 0))
                                : Number(it.weightKg || 0);

                            const setNo = totalSets - idx; // because newest on top
                            return (
                              <Pressable
                                key={String(it.id || it.createdAt)}
                                onPress={() => openEdit(it)}
                                style={({ pressed }) => [
                                  styles.setRow,
                                  it.done && {
                                    borderColor: withAlpha("#7CFFB5", 0.25),
                                  },
                                  pressed && { opacity: 0.9 },
                                ]}
                              >
                                <Pressable
                                  onPress={() => toggleDone(String(it.id))}
                                  hitSlop={10}
                                  style={({ pressed }) => [
                                    styles.donePill,
                                    it.done && {
                                      backgroundColor: withAlpha(
                                        "#7CFFB5",
                                        0.18
                                      ),
                                    },
                                    pressed && { opacity: 0.85 },
                                  ]}
                                >
                                  <Ionicons
                                    name={
                                      it.done ? "checkmark" : "ellipse-outline"
                                    }
                                    size={16}
                                    color={
                                      it.done
                                        ? withAlpha("#7CFFB5", 0.95)
                                        : withAlpha("#FFFFFF", 0.55)
                                    }
                                  />
                                </Pressable>

                                <View style={{ flex: 1 }}>
                                  <Text style={styles.setTitle}>
                                    Set {setNo} • {Math.round(w * 100) / 100}{" "}
                                    {unit} × {it.reps} reps
                                  </Text>
                                  {it.note || it.notes ? (
                                    <Text
                                      style={styles.setNote}
                                      numberOfLines={1}
                                    >
                                      {String(it.note || it.notes)}
                                    </Text>
                                  ) : (
                                    <Text
                                      style={styles.setNoteMuted}
                                      numberOfLines={1}
                                    >
                                      Tap to add a note
                                    </Text>
                                  )}
                                </View>

                                <Pressable
                                  onPress={() =>
                                    RNAlert.alert(
                                      "Remove set?",
                                      "This can't be undone.",
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                          text: "Remove",
                                          style: "destructive",
                                          onPress: () =>
                                            removeItem(String(it.id)),
                                        },
                                      ]
                                    )
                                  }
                                  hitSlop={10}
                                  style={({ pressed }) => [
                                    styles.trashBtn,
                                    pressed && { opacity: 0.8 },
                                  ]}
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={18}
                                    color={withAlpha("#FFFFFF", 0.7)}
                                  />
                                </Pressable>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Sticky footer */}
        <View style={styles.footer}>
          <Pressable
            onPress={finishWorkout}
            style={({ pressed }) => [
              styles.footerBtn,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={withAlpha("#111", 0.95)}
            />
            <Text style={styles.footerBtnText}>Finish workout</Text>
          </Pressable>
        </View>

        {/* Edit Set Modal */}
        <Modal visible={edit.open} animationType="fade" transparent>
          <Pressable
            onPress={() => setEdit((s) => ({ ...s, open: false }))}
            style={styles.modalBackdrop}
          >
            <Pressable onPress={() => {}} style={styles.modalCard}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {edit.exercise}
              </Text>
              <Text style={styles.modalSub}>Edit this set</Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Reps</Text>
                  <TextInput
                    value={edit.reps}
                    onChangeText={(t) => setEdit((s) => ({ ...s, reps: t }))}
                    keyboardType="number-pad"
                    placeholder="10"
                    placeholderTextColor={withAlpha("#FFFFFF", 0.35)}
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{`Weight (${unit})`}</Text>
                  <TextInput
                    value={edit.weight}
                    onChangeText={(t) => setEdit((s) => ({ ...s, weight: t }))}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={withAlpha("#FFFFFF", 0.35)}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.inputLabel}>Note</Text>
                <TextInput
                  value={edit.note}
                  onChangeText={(t) => setEdit((s) => ({ ...s, note: t }))}
                  placeholder="Optional (form cues, RPE, PR, etc.)"
                  placeholderTextColor={withAlpha("#FFFFFF", 0.35)}
                  style={[styles.input, { minHeight: 44 }]}
                />
              </View>

              <Pressable
                onPress={() => setEdit((s) => ({ ...s, done: !s.done }))}
                style={({ pressed }) => [
                  styles.doneToggle,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons
                  name={edit.done ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={
                    edit.done
                      ? withAlpha("#7CFFB5", 0.95)
                      : withAlpha("#FFFFFF", 0.55)
                  }
                />
                <Text style={styles.doneToggleText}>
                  {edit.done ? "Marked done" : "Mark as done"}
                </Text>
              </Pressable>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <Pressable
                  onPress={() => setEdit((s) => ({ ...s, open: false }))}
                  style={({ pressed }) => [
                    styles.modalSecondary,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={applyEdit}
                  style={({ pressed }) => [
                    styles.modalPrimary,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Text style={styles.modalPrimaryText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Title Modal */}
        <Modal visible={titleOpen} animationType="fade" transparent>
          <Pressable
            onPress={() => setTitleOpen(false)}
            style={styles.modalBackdrop}
          >
            <Pressable onPress={() => {}} style={styles.modalCard}>
              <Text style={styles.modalTitle}>Workout title</Text>
              <Text style={styles.modalSub}>
                This appears in your Recents list.
              </Text>

              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder="e.g., Push Day, Legs, Upper"
                placeholderTextColor={withAlpha("#FFFFFF", 0.35)}
                style={[styles.input, { marginTop: 12 }]}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveTitle}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <Pressable
                  onPress={() => setTitleOpen(false)}
                  style={({ pressed }) => [
                    styles.modalSecondary,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={saveTitle}
                  style={({ pressed }) => [
                    styles.modalPrimary,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Text style={styles.modalPrimaryText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05060C" },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05060C",
  },

  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha("#FFFFFF", 0.12),
  },
  headerRow: {
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  finishBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.92),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.2),
  },
  inProgress: {
    color: withAlpha("#FFFFFF", 0.6),
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  headerTitle: {
    color: withAlpha("#FFFFFF", 0.94),
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
    maxWidth: 240,
  },

  cardWrap: { borderRadius: 18, overflow: "hidden" },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    zIndex: 2,
  },
  cardBlur: { borderRadius: 18, overflow: "hidden" },
  cardInner: { padding: 14 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  chipText: {
    color: withAlpha("#FFFFFF", 0.72),
    fontWeight: "800",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },

  sectionTitle: {
    color: withAlpha("#FFFFFF", 0.92),
    fontWeight: "900",
    fontSize: 14,
  },
  sectionSub: {
    marginTop: 4,
    color: withAlpha("#FFFFFF", 0.58),
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
  },

  statPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
    backgroundColor: withAlpha("#FFFFFF", 0.05),
  },
  statLabel: {
    color: withAlpha("#FFFFFF", 0.55),
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  statValue: {
    marginTop: 6,
    color: withAlpha("#FFFFFF", 0.92),
    fontWeight: "900",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  tip: {
    marginTop: 10,
    color: withAlpha("#FFFFFF", 0.5),
    fontWeight: "700",
    fontSize: 12,
  },

  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  browseText: {
    color: withAlpha("#FFFFFF", 0.9),
    fontWeight: "900",
    fontSize: 13,
  },

  inputLabel: {
    color: withAlpha("#FFFFFF", 0.6),
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    color: withAlpha("#FFFFFF", 0.92),
    fontWeight: "800",
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: withAlpha("#68D7FF", 0.22),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#68D7FF", 0.35),
  },
  primaryBtnText: {
    color: withAlpha("#FFFFFF", 0.92),
    fontWeight: "900",
    fontSize: 14,
  },
  secondaryBtn: {
    width: 110,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  secondaryBtnText: { color: withAlpha("#FFFFFF", 0.8), fontWeight: "900" },

  exerciseCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    backgroundColor: withAlpha("#FFFFFF", 0.04),
  },
  exerciseHeader: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseName: {
    color: withAlpha("#FFFFFF", 0.94),
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: -0.1,
  },
  exerciseMeta: {
    marginTop: 4,
    color: withAlpha("#FFFFFF", 0.58),
    fontWeight: "700",
    fontSize: 12,
  },
  exerciseActions: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    gap: 10,
  },

  miniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  miniBtnText: {
    color: withAlpha("#FFFFFF", 0.82),
    fontWeight: "900",
    fontSize: 12,
  },

  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  donePill: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
    backgroundColor: withAlpha("#FFFFFF", 0.04),
  },
  setTitle: {
    color: withAlpha("#FFFFFF", 0.92),
    fontWeight: "900",
    fontSize: 13,
  },
  setNote: {
    marginTop: 4,
    color: withAlpha("#FFFFFF", 0.65),
    fontWeight: "700",
    fontSize: 12,
  },
  setNoteMuted: {
    marginTop: 4,
    color: withAlpha("#FFFFFF", 0.45),
    fontWeight: "700",
    fontSize: 12,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.04),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: withAlpha("#FFFFFF", 0.12),
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  footerBtn: {
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: withAlpha("#FFFFFF", 0.92),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.2),
  },
  footerBtnText: {
    color: withAlpha("#111", 0.95),
    fontWeight: "1000" as any,
    fontSize: 16,
  },

  toastWrap: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  toast: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: withAlpha("#68D7FF", 0.2),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#68D7FF", 0.35),
  },
  toastText: { color: withAlpha("#FFFFFF", 0.92), fontWeight: "900" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 18,
    justifyContent: "center",
  },
  modalCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: withAlpha("#0B0F1A", 0.98),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  modalTitle: {
    color: withAlpha("#FFFFFF", 0.94),
    fontWeight: "900",
    fontSize: 16,
  },
  modalSub: {
    marginTop: 6,
    color: withAlpha("#FFFFFF", 0.6),
    fontWeight: "700",
    fontSize: 12,
  },

  doneToggle: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
    backgroundColor: withAlpha("#FFFFFF", 0.05),
  },
  doneToggleText: { color: withAlpha("#FFFFFF", 0.86), fontWeight: "900" },

  modalSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    backgroundColor: withAlpha("#FFFFFF", 0.04),
  },
  modalSecondaryText: { color: withAlpha("#FFFFFF", 0.86), fontWeight: "900" },
  modalPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: withAlpha("#68D7FF", 0.22),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#68D7FF", 0.35),
  },
  modalPrimaryText: { color: withAlpha("#FFFFFF", 0.92), fontWeight: "900" },
});

// // app/workouts/session.tsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   View,
//   Text,
//   Pressable,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   Modal,
//   TextInput,
//   StyleSheet,
//   LayoutAnimation,
//   UIManager,
//   Alert as RNAlert,
//   useWindowDimensions,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useRouter } from "expo-router";
// import { LinearGradient } from "expo-linear-gradient";
// import { BlurView } from "expo-blur";
// import * as Haptics from "expo-haptics";

// import { useTheme } from "@/content/ThemeProvider";
// import { useAuth } from "@/content/AuthContext";
// import { fmt } from "@/utils/date";
// import { lbToKg, kgToLb } from "@/utils/units";
// import { withAlpha } from "@/components/workouts/utils/withAlpha";

// import ExerciseSearchSheet from "@/components/workouts/ExerciseSearchSheet";
// import WeightPlateStacker from "@/components/workouts/WeightPlateStacker";

// import { addWorkout, type Workout } from "@/services/workouts";
// import {
//   subscribeWorkoutPresets,
//   addWorkoutPreset,
//   updateWorkoutPreset,
//   deleteWorkoutPreset,
//   type WorkoutPreset,
// } from "@/services/presets";
// import {
//   ensureProfile,
//   subscribeProfile,
//   type Profile,
// } from "@/services/profile";

// import {
//   loadSessionDraft,
//   saveSessionDraft,
//   clearSessionDraft,
//   newSessionDraft,
//   type WorkoutSessionDraft,
//   type WorkoutSessionDraftItem,
// } from "../../components/workouts/sessionDraft";
// import { useLocalSearchParams } from "expo-router";

// /**
//  * IMPORTANT:
//  * We keep your draft storage + services.
//  * To support set-by-set logging, each set row is stored as ONE draft item with sets=1.
//  *
//  * If your WorkoutSessionDraftItem type doesn't include these optional fields, this local alias
//  * lets us safely use them without changing your service types.
//  */
// type SetDraftItem = WorkoutSessionDraftItem & {
//   // internal: per-set row identity
//   id?: string;
//   done?: boolean;
//   // optional per-set note
//   note?: string;
// };

// if (
//   Platform.OS === "android" &&
//   UIManager.setLayoutAnimationEnabledExperimental
// ) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }

// function pad2(n: number) {
//   return String(n).padStart(2, "0");
// }

// function formatDuration(ms: number) {
//   const s = Math.max(0, Math.floor(ms / 1000));
//   const h = Math.floor(s / 3600);
//   const m = Math.floor((s % 3600) / 60);
//   const sec = s % 60;
//   if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
//   return `${m}:${pad2(sec)}`;
// }

// function fmtCompact(n: number) {
//   if (!isFinite(n)) return "0";
//   const abs = Math.abs(n);
//   if (abs >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`;
//   if (abs >= 1_000) return `${Math.round((n / 1_000) * 10) / 10}k`;
//   return String(Math.round(n));
// }

// function uid() {
//   return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
// }

// export default function WorkoutSessionScreen() {
//   const router = useRouter();
//   const { colors, isDark } = useTheme();
//   const { user } = useAuth();

//   const todayISO = useMemo(() => fmt(new Date()), []);
//   const [nowTick, setNowTick] = useState(Date.now());

//   // ---- persisted in-progress draft ----
//   const [draft, setDraft] = useState<WorkoutSessionDraft | null>(null);

//   // ---- profile + unit ----
//   const [profile, setProfile] = useState<Profile | null>(null);
//   const unit: "kg" | "lb" = profile?.weightUnit === "lb" ? "lb" : "kg";

//   // ---- presets ----
//   const [presets, setPresets] = useState<WorkoutPreset[]>([]);
//   const safePresets = useMemo(
//     () =>
//       (presets || [])
//         .filter((p) => p?.name)
//         .map((p) => ({
//           id: p.id,
//           name: p.name,
//           sets: p.sets,
//           reps: p.reps,
//           weight: p.weight, // kg in your service
//           notes: p.notes,
//           exercise: (p as any).exercise, // your service stores exercise too
//         })),
//     [presets]
//   );

//   const [lastAddedTs, setLastAddedTs] = useState<number | null>(null);
//   const [savedToast, setSavedToast] = useState("");

//   const params = useLocalSearchParams<any>();
//   const pickedConsumed = useRef<string | null>(null);

//   useEffect(() => {
//     const picked = (params?.pickedExercise || "").toString().trim();
//     if (!picked || !draft) return;
//     if (pickedConsumed.current === picked) return;

//     // if it came from a preset, we can also prefill N sets at once
//     const from = String(params?.pickedFrom || "");
//     const run = async () => {
//       pickedConsumed.current = picked;
//       if (from === "preset") {
//         const sets = Math.max(1, Number(params?.presetSets || 1) || 1);
//         const reps = Number(params?.presetReps || 10) || 10;
//         const weightKg = Number(params?.presetWeightKg || 0) || 0;
//         for (let i = 0; i < sets; i++) {
//           await addExerciseFirstSet(picked, { reps, weightKg });
//         }
//       } else {
//         await addExerciseFirstSet(picked);
//       }
//       setSavedToast("Added ✓");
//       setTimeout(() => setSavedToast(""), 1200);
//     };
//     run();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [params?.pickedExercise, draft?.id]);

//   // ---- title edit modal ----
//   const [titleOpen, setTitleOpen] = useState(false);
//   const [titleDraft, setTitleDraft] = useState("");

//   // ---- sheets ----
//   const [searchOpen, setSearchOpen] = useState(false);
//   const [presetsOpen, setPresetsOpen] = useState(false);

//   // ---- expanded exercises ----
//   const [expanded, setExpanded] = useState<Record<string, boolean>>({});

//   // ---- rest timer ----
//   const [rest, setRest] = useState<null | {
//     running: boolean;
//     startedAt: number;
//     durationSec: number;
//   }>(null);

//   // ---- persist: debounce so we never drop the last update ----
//   const savingRef = useRef(false);
//   const saveTimerRef = useRef<any>(null);
//   const pendingRef = useRef<WorkoutSessionDraft | null>(null);

//   // ---------- tick for timer/rest ----------
//   useEffect(() => {
//     const t = setInterval(() => setNowTick(Date.now()), 1000);
//     return () => clearInterval(t);
//   }, []);

//   // ---------- subscribe: profile ----------
//   useEffect(() => {
//     if (!user?.uid) return;
//     ensureProfile(user.uid).catch(() => {});
//     const unsub = subscribeProfile(user.uid, (p) => setProfile(p || null));
//     return () => unsub?.();
//   }, [user?.uid]);

//   // ---------- subscribe: presets ----------
//   useEffect(() => {
//     if (!user?.uid) return;
//     const unsub = subscribeWorkoutPresets(user.uid, (rows) =>
//       setPresets(rows || [])
//     );
//     return () => unsub?.();
//   }, [user?.uid]);

//   // ---------- load or create draft ----------
//   useEffect(() => {
//     if (!user?.uid) {
//       setDraft(null);
//       return;
//     }
//     (async () => {
//       const existing = await loadSessionDraft(user.uid);
//       if (existing) {
//         setDraft(existing);
//         setTitleDraft(existing.title || "Workout");
//         return;
//       }
//       const fresh = newSessionDraft({ dateISO: todayISO, title: "Workout" });
//       setDraft(fresh);
//       setTitleDraft(fresh.title);
//       await saveSessionDraft(user.uid, fresh);
//     })();
//   }, [user?.uid, todayISO]);

//   async function flushSave() {
//     if (!user?.uid) return;
//     if (savingRef.current) return;
//     const next = pendingRef.current;
//     if (!next) return;

//     savingRef.current = true;
//     try {
//       await saveSessionDraft(user.uid, next);
//     } finally {
//       savingRef.current = false;
//       if (
//         pendingRef.current &&
//         pendingRef.current.updatedAt !== next.updatedAt
//       ) {
//         flushSave();
//       }
//     }
//   }

//   function persist(next: WorkoutSessionDraft) {
//     setDraft(next);
//     pendingRef.current = next;
//     if (!user?.uid) return;

//     if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
//     saveTimerRef.current = setTimeout(() => {
//       flushSave();
//     }, 220);
//   }

//   // ---------- derived stats (live) ----------
//   const stats = useMemo(() => {
//     const items = (draft?.items || []) as SetDraftItem[];

//     // each item is one set row (sets=1), but keep it robust
//     const totalSets = items.reduce((a, it) => a + Number(it.sets || 0), 0);
//     const totalReps = items.reduce(
//       (a, it) => a + Number(it.reps || 0) * Number(it.sets || 0),
//       0
//     );
//     const totalVolumeKg = items.reduce(
//       (a, it) =>
//         a +
//         Number(it.weightKg || 0) * Number(it.reps || 0) * Number(it.sets || 0),
//       0
//     );

//     const startedAt = draft?.startedAt || Date.now();
//     const durationMs = Math.max(0, nowTick - startedAt);

//     // exercise count: unique exercise names
//     const exCount = new Set(
//       items.map((x) => (x.exercise || "").trim()).filter(Boolean)
//     ).size;

//     return {
//       exCount,
//       totalSets,
//       totalReps,
//       totalVolumeKg,
//       startedAt,
//       durationMs,
//     };
//   }, [draft, nowTick]);

//   const elapsedLabel = useMemo(() => {
//     if (!draft?.startedAt) return "0:00";
//     return formatDuration(nowTick - draft.startedAt);
//   }, [draft?.startedAt, draft?.updatedAt, nowTick]);

//   const volumeDisplay = useMemo(() => {
//     const v = unit === "lb" ? kgToLb(stats.totalVolumeKg) : stats.totalVolumeKg;
//     return fmtCompact(Math.round(v));
//   }, [stats.totalVolumeKg, unit]);

//   // ---------- group into exercise blocks (timeline of sets) ----------
//   const groups = useMemo(() => {
//     const items = ((draft?.items || []) as SetDraftItem[]).slice();

//     // group by exercise name
//     const map = new Map<
//       string,
//       { name: string; items: SetDraftItem[]; lastAt: number }
//     >();
//     for (const it of items) {
//       const key = (it.exercise || "").trim() || "Exercise";
//       const prev = map.get(key);
//       if (!prev) {
//         map.set(key, { name: key, items: [it], lastAt: it.createdAt });
//       } else {
//         prev.items.push(it);
//         prev.lastAt = Math.max(prev.lastAt, it.createdAt);
//       }
//     }

//     // newest exercise activity first
//     return [...map.values()]
//       .map((g) => ({
//         ...g,
//         items: g.items.sort((a, b) => b.createdAt - a.createdAt), // newest sets on top (thumb-friendly)
//       }))
//       .sort((a, b) => b.lastAt - a.lastAt);
//   }, [draft?.items]);

//   // ---------- helpers: find last used values for an exercise ----------
//   function lastUsedFor(exerciseName: string) {
//     const items = (draft?.items || []) as SetDraftItem[];
//     const found = items.find(
//       (it) =>
//         (it.exercise || "").trim().toLowerCase() ===
//         exerciseName.trim().toLowerCase()
//     );
//     if (!found) return { reps: 10, weightKg: 0 };
//     return {
//       reps: Number(found.reps || 10),
//       weightKg: Number(found.weightKg || 0),
//     };
//   }

//   // ---------- UI steps/values ----------
//   const weightStep = unit === "lb" ? 5 : 2.5;
//   const weightBigStep = unit === "lb" ? 10 : 5;
//   const repsStep = 1;
//   const repsBigStep = 5;

//   // ---------- rest timer ----------
//   const restRemaining = useMemo(() => {
//     if (!rest?.running) return 0;
//     const elapsed = Math.floor((nowTick - rest.startedAt) / 1000);
//     return Math.max(0, rest.durationSec - elapsed);
//   }, [rest, nowTick]);

//   useEffect(() => {
//     if (!rest?.running) return;
//     if (restRemaining === 0) {
//       setRest((r) => (r ? { ...r, running: false } : r));
//       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
//     }
//   }, [restRemaining, rest?.running]);

//   // ────────────────────────────────────────────────────────────────────────────
//   // Actions

//   function toggleExpanded(exName: string, defaultOpen: boolean) {
//     LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//     setExpanded((cur) => ({ ...cur, [exName]: !(cur[exName] ?? defaultOpen) }));
//   }

//   async function addExerciseFirstSet(
//     exerciseName: string,
//     opts?: { weightKg?: number; reps?: number }
//   ) {
//     if (!draft) return;

//     if (!user?.uid) {
//       RNAlert.alert("Sign in required", "Please sign in to start a workout.");
//       return;
//     }
//     const ex = (exerciseName || "").trim();
//     if (!ex) return;

//     const last = lastUsedFor(ex);
//     const reps = Number(opts?.reps ?? last.reps ?? 10) || 10;
//     const weightKg = Number(opts?.weightKg ?? last.weightKg ?? 0) || 0;

//     const item: SetDraftItem = {
//       id: uid(),
//       exercise: ex,
//       sets: 1,
//       reps,
//       weightKg,
//       notes: "", // keep for compatibility
//       createdAt: Date.now(),
//       done: false,
//     };

//     const next: WorkoutSessionDraft = {
//       ...draft,
//       updatedAt: Date.now(),
//       items: [item as any, ...(draft.items as any)],
//     };

//     persist(next);

//     // auto-open the exercise block (rewarding “it landed”)
//     setExpanded((cur) => ({ ...cur, [ex]: true }));

//     try {
//       await Haptics.selectionAsync();
//     } catch {}
//     setLastAddedTs(item.createdAt);
//   }

//   async function addSetDuplicate(exerciseName: string) {
//     if (!draft) return;
//     const ex = exerciseName.trim();
//     const block = groups.find((g) => g.name === ex);
//     const top = block?.items?.[0];

//     const reps = Number(top?.reps ?? 10) || 10;
//     const weightKg = Number(top?.weightKg ?? 0) || 0;

//     const item: SetDraftItem = {
//       id: uid(),
//       exercise: ex,
//       sets: 1,
//       reps,
//       weightKg,
//       notes: "",
//       createdAt: Date.now(),
//       done: false,
//     };

//     persist({
//       ...draft,
//       updatedAt: Date.now(),
//       items: [item as any, ...(draft.items as any)],
//     });

//     try {
//       await Haptics.selectionAsync();
//     } catch {}
//   }

//   function patchSet(
//     createdAt: number,
//     patch: Partial<Pick<SetDraftItem, "reps" | "weightKg" | "done">>
//   ) {
//     if (!draft) return;

//     const nextItems = ((draft.items || []) as SetDraftItem[]).map((it) => {
//       if (it.createdAt !== createdAt) return it;
//       return { ...it, ...patch };
//     });

//     persist({ ...draft, updatedAt: Date.now(), items: nextItems as any });
//   }

//   function removeSet(createdAt: number) {
//     if (!draft) return;
//     persist({
//       ...draft,
//       updatedAt: Date.now(),
//       items: (draft.items || []).filter(
//         (it: any) => it.createdAt !== createdAt
//       ),
//     });
//   }

//   async function onSavePreset(payload: {
//     name: string;
//     exercise: string;
//     sets: number;
//     reps: number;
//     weight: number; // in CURRENT unit in UI, but we will convert to kg
//     notes: string;
//   }) {
//     if (!user?.uid) return;
//     if (!payload?.name?.trim() || !payload?.exercise?.trim()) return;

//     const weightKg =
//       unit === "lb"
//         ? lbToKg(Number(payload.weight || 0))
//         : Number(payload.weight || 0);

//     await addWorkoutPreset(user.uid, {
//       name: payload.name.trim(),
//       exercise: payload.exercise.trim(),
//       sets: Number(payload.sets || 0),
//       reps: Number(payload.reps || 0),
//       weight: Number(isFinite(weightKg as number) ? weightKg : 0),
//       notes: (payload.notes || "").trim(),
//     } as any);

//     try {
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//     } catch {}
//   }

//   async function onUpdatePreset(id: string) {
//     if (!user?.uid) return;
//     const found = presets.find((p) => p.id === id);
//     if (!found) return;
//     await updateWorkoutPreset(user.uid, id, found as any);
//   }

//   async function onDeletePreset(id: string) {
//     if (!user?.uid) return;
//     RNAlert.alert("Delete preset?", "This can't be undone.", [
//       { text: "Cancel", style: "cancel" },
//       {
//         text: "Delete",
//         style: "destructive",
//         onPress: async () => {
//           await deleteWorkoutPreset(user.uid, id);
//         },
//       },
//     ]);
//   }

//   function saveTitle() {
//     if (!draft) return;
//     persist({
//       ...draft,
//       title: (titleDraft || "Workout").trim() || "Workout",
//       updatedAt: Date.now(),
//     });
//     setTitleOpen(false);
//   }

//   async function finishWorkout() {
//     if (!user?.uid || !draft) return;

//     if (!(draft.items || []).length) {
//       RNAlert.alert("Nothing logged", "Add at least one exercise first.");
//       return;
//     }

//     RNAlert.alert(
//       "Finish workout?",
//       "This will save it to your workout history.",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Finish",
//           onPress: async () => {
//             // Save each SET as a workout entry (sets: 1) — uses same addWorkout() service as before
//             const items = ([...(draft.items as any[])] as SetDraftItem[])
//               .slice()
//               .reverse();

//             for (const it of items) {
//               const entry: Partial<Workout> & any = {
//                 date: draft.dateISO,
//                 exercise: it.exercise,
//                 sets: Number(it.sets || 1), // should be 1 per set row
//                 reps: Number(it.reps || 0),
//                 weight: Number(it.weightKg || 0), // ALWAYS kg in backend (matches your old code)
//                 notes: (it as any).note || it.notes || "",
//                 sessionId: draft.id,
//                 sessionTitle: draft.title,
//                 sessionStartedAt: draft.startedAt,
//               };

//               await addWorkout(user.uid, {
//                 ...entry,
//                 createdAt: undefined,
//               } as any);
//             }

//             await clearSessionDraft(user.uid);

//             try {
//               await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
//             } catch {}

//             const vol =
//               unit === "lb" ? kgToLb(stats.totalVolumeKg) : stats.totalVolumeKg;
//             RNAlert.alert(
//               "Nice work",
//               `You logged ${fmtCompact(stats.totalSets)} sets • ${fmtCompact(
//                 stats.totalReps
//               )} reps • ${fmtCompact(Math.round(vol))} ${unit} volume`
//             );
//             router.back();
//           },
//         },
//       ]
//     );
//   }

//   // ────────────────────────────────────────────────────────────────────────────
//   // UI

//   const softShadow = {
//     shadowColor: "#000",
//     shadowOpacity: isDark ? 0.22 : 0.12,
//     shadowRadius: 14,
//     shadowOffset: { width: 0, height: 8 },
//     elevation: 8,
//   };

//   if (!draft) {
//     return (
//       <View
//         style={{
//           flex: 1,
//           alignItems: "center",
//           justifyContent: "center",
//           backgroundColor: colors.background,
//         }}
//       >
//         <Text style={{ color: colors.muted }}>Loading…</Text>
//       </View>
//     );
//   }

//   const restLabel = rest
//     ? rest.running
//       ? `Rest ${Math.floor(restRemaining / 60)}:${pad2(restRemaining % 60)}`
//       : "Rest done"
//     : null;

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1, backgroundColor: colors.background }}
//       behavior={Platform.OS === "ios" ? "padding" : undefined}
//     >
//       <ScrollView
//         contentContainerStyle={{ padding: 14, paddingBottom: 130, gap: 14 }}
//         keyboardShouldPersistTaps="handled"
//         keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Sticky-ish header card */}
//         <GlassCard>
//           <Row between>
//             <Pressable
//               onPress={() => router.back()}
//               style={{
//                 width: 44,
//                 height: 44,
//                 borderRadius: 22,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 backgroundColor: colors.card,
//                 borderWidth: 1,
//                 borderColor: colors.border,
//                 ...softShadow,
//               }}
//             >
//               <Ionicons name="chevron-back" size={20} color={colors.text} />
//             </Pressable>

//             <Pressable
//               onPress={() => {
//                 setTitleDraft(draft.title || "Workout");
//                 setTitleOpen(true);
//               }}
//               style={{ alignItems: "center", gap: 4, flex: 1 }}
//             >
//               <Text
//                 style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}
//               >
//                 IN PROGRESS
//               </Text>

//               <Row gap={8}>
//                 <Text
//                   style={{
//                     color: colors.text,
//                     fontWeight: "1000" as any,
//                     fontSize: 16,
//                   }}
//                 >
//                   {draft.title || "Workout"}
//                 </Text>
//                 <Ionicons name="pencil" size={14} color={colors.muted} />
//               </Row>

//               <Row
//                 gap={8}
//                 style={{
//                   marginTop: 2,
//                   flexWrap: "wrap",
//                   justifyContent: "center",
//                 }}
//               >
//                 <Chip
//                   label={`${stats.exCount} exercise${
//                     stats.exCount === 1 ? "" : "s"
//                   }`}
//                   icon="barbell"
//                 />
//                 <Chip label={elapsedLabel} icon="time" />
//                 <Chip
//                   label={`${fmtCompact(stats.totalSets)} sets`}
//                   icon="layers"
//                 />
//               </Row>
//             </Pressable>

//             <Pressable
//               onPress={finishWorkout}
//               style={{
//                 width: 44,
//                 height: 44,
//                 borderRadius: 22,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 backgroundColor: colors.primary,
//                 borderWidth: 1,
//                 borderColor: withAlpha(colors.primary, 0.6),
//                 ...softShadow,
//               }}
//             >
//               <Ionicons name="checkmark" size={20} color="#fff" />
//             </Pressable>
//           </Row>

//           {/* Session stats */}
//           <View style={{ marginTop: 14 }}>
//             <Row gap={10}>
//               <StatTile label="Sets" value={String(stats.totalSets)} />
//               <StatTile label="Reps" value={String(stats.totalReps)} />
//               <StatTile label={`Vol (${unit})`} value={volumeDisplay} />
//             </Row>

//             <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>
//               A workout is a timeline of sets — log between sets with one hand.
//             </Text>
//           </View>
//         </GlassCard>

//         {/* Quick Add (exercise + presets) */}
//         <GlassCard>
//           <Row between>
//             <Row gap={10}>
//               <View
//                 style={{
//                   width: 34,
//                   height: 34,
//                   borderRadius: 12,
//                   alignItems: "center",
//                   justifyContent: "center",
//                   backgroundColor: withAlpha(colors.primary, 0.14),
//                   borderWidth: 1,
//                   borderColor: withAlpha(colors.primary, 0.25),
//                 }}
//               >
//                 <Ionicons
//                   name="flash-outline"
//                   size={18}
//                   color={colors.primary}
//                 />
//               </View>
//               <View>
//                 <Text
//                   style={{
//                     color: colors.text,
//                     fontWeight: "1000" as any,
//                     fontSize: 14,
//                   }}
//                 >
//                   Quick add
//                 </Text>
//                 <Text
//                   style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}
//                 >
//                   Search an exercise or insert a preset.
//                 </Text>
//               </View>
//             </Row>

//             <Row gap={10}>
//               <Pressable
//                 onPress={() => setPresetsOpen(true)}
//                 style={({ pressed }) => ({
//                   paddingHorizontal: 12,
//                   paddingVertical: 10,
//                   borderRadius: 999,
//                   borderWidth: 1,
//                   borderColor: withAlpha(colors.primary, 0.35),
//                   backgroundColor: withAlpha(colors.primary, 0.12),
//                   opacity: pressed ? 0.9 : 1,
//                 })}
//               >
//                 <Row gap={8}>
//                   <Ionicons
//                     name="bookmark-outline"
//                     size={14}
//                     color={colors.primary}
//                   />
//                   <Text style={{ color: colors.text, fontWeight: "900" }}>
//                     Presets
//                   </Text>
//                 </Row>
//               </Pressable>

//               <Pressable
//                 onPress={() => setSearchOpen(true)}
//                 style={({ pressed }) => ({
//                   width: 44,
//                   height: 44,
//                   borderRadius: 16,
//                   borderWidth: 1,
//                   borderColor: colors.border,
//                   backgroundColor: withAlpha(colors.text, 0.06),
//                   alignItems: "center",
//                   justifyContent: "center",
//                   opacity: pressed ? 0.9 : 1,
//                 })}
//               >
//                 <Ionicons name="search-outline" size={18} color={colors.text} />
//               </Pressable>
//             </Row>
//           </Row>

//           <Pressable
//             onPress={() => router.push("/(modals)/add-exercise")}
//             style={({ pressed }) => ({
//               marginTop: 12,
//               paddingVertical: 12,
//               paddingHorizontal: 12,
//               borderRadius: 16,
//               borderWidth: 1,
//               borderColor: withAlpha(colors.primary, 0.25),
//               backgroundColor: withAlpha(colors.text, 0.06),
//               opacity: pressed ? 0.92 : 1,
//             })}
//           >
//             <Row between>
//               <Row gap={10}>
//                 <Ionicons
//                   name="barbell-outline"
//                   size={18}
//                   color={colors.muted}
//                 />
//                 <Text style={{ color: colors.text, fontWeight: "900" }}>
//                   Add exercise…
//                 </Text>
//               </Row>
//               <Ionicons
//                 name="arrow-forward-outline"
//                 size={18}
//                 color={colors.muted}
//               />
//             </Row>
//           </Pressable>
//         </GlassCard>

//         {/* Timeline */}
//         {groups.length === 0 ? (
//           <GlassCard>
//             <Text
//               style={{
//                 color: colors.text,
//                 fontWeight: "1000" as any,
//                 fontSize: 14,
//               }}
//             >
//               Your workout is empty
//             </Text>
//             <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 18 }}>
//               Add an exercise above. Each set becomes a row — tap ✓ to complete
//               and start rest.
//             </Text>
//           </GlassCard>
//         ) : (
//           <View style={{ gap: 12 }}>
//             {groups.map((g) => (
//               <ExerciseTimelineCard
//                 key={g.name}
//                 exercise={g.name}
//                 items={g.items}
//                 unit={unit}
//                 expanded={expanded[g.name] ?? true}
//                 onToggle={() => toggleExpanded(g.name, true)}
//                 onAddSet={() => addSetDuplicate(g.name)}
//                 onRemove={(createdAt) => removeSet(createdAt)}
//                 onPatch={(createdAt, patch) => patchSet(createdAt, patch)}
//                 weightStep={weightStep}
//                 weightBigStep={weightBigStep}
//                 repsStep={repsStep}
//                 repsBigStep={repsBigStep}
//                 lastAddedTs={lastAddedTs}
//                 onCompleteSet={async (createdAt) => {
//                   patchSet(createdAt, { done: true });
//                   setRest({
//                     running: true,
//                     startedAt: Date.now(),
//                     durationSec: 90,
//                   });
//                   try {
//                     await Haptics.notificationAsync(
//                       Haptics.NotificationFeedbackType.Success
//                     );
//                   } catch {}
//                 }}
//                 onSavePresetFromBlock={async () => {
//                   // auto-suggest preset from this block:
//                   // use most recent set values + number of sets in block
//                   const top = g.items[0];
//                   const setCount = g.items.length;
//                   const reps = Number(top?.reps || 0);
//                   const weightKg = Number(top?.weightKg || 0);

//                   const weightUnitVal =
//                     unit === "lb" ? kgToLb(weightKg) : weightKg;
//                   const suggestedName = `${g.name} – ${setCount}×${reps}`;

//                   await onSavePreset({
//                     name: suggestedName,
//                     exercise: g.name,
//                     sets: setCount,
//                     reps,
//                     weight: Math.round(weightUnitVal * 100) / 100, // pass in current unit; onSavePreset converts
//                     notes: "",
//                   });
//                 }}
//               />
//             ))}
//           </View>
//         )}
//       </ScrollView>

//       {/* Rest timer overlay (subtle) */}
//       {restLabel ? (
//         <View
//           style={{
//             position: "absolute",
//             left: 14,
//             right: 14,
//             bottom: 86,
//             zIndex: 6,
//           }}
//         >
//           <View
//             style={{
//               borderRadius: 18,
//               borderWidth: 1,
//               borderColor: withAlpha(colors.primary, 0.28),
//               backgroundColor: withAlpha(colors.card, isDark ? 0.92 : 0.98),
//               overflow: "hidden",
//             }}
//           >
//             <LinearGradient
//               colors={[
//                 withAlpha(colors.primary, isDark ? 0.16 : 0.12),
//                 withAlpha(colors.text, 0.03),
//               ]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 1 }}
//               style={StyleSheet.absoluteFillObject}
//             />
//             <BlurView
//               tint={isDark ? "dark" : "light"}
//               intensity={isDark ? 16 : 12}
//               style={StyleSheet.absoluteFillObject}
//             />
//             <View style={{ padding: 12 }}>
//               <Row between>
//                 <Row gap={10}>
//                   <View
//                     style={{
//                       width: 34,
//                       height: 34,
//                       borderRadius: 12,
//                       alignItems: "center",
//                       justifyContent: "center",
//                       backgroundColor: withAlpha(colors.primary, 0.14),
//                       borderWidth: 1,
//                       borderColor: withAlpha(colors.primary, 0.25),
//                     }}
//                   >
//                     <Ionicons
//                       name="timer-outline"
//                       size={18}
//                       color={colors.primary}
//                     />
//                   </View>
//                   <View>
//                     <Text
//                       style={{ color: colors.text, fontWeight: "1000" as any }}
//                     >
//                       {restLabel}
//                     </Text>
//                     <Text
//                       style={{
//                         color: colors.muted,
//                         marginTop: 2,
//                         fontSize: 12,
//                       }}
//                     >
//                       Auto-started after ✓ • tap to adjust
//                     </Text>
//                   </View>
//                 </Row>

//                 <Row gap={10}>
//                   <Pressable
//                     onPress={() =>
//                       setRest({
//                         running: true,
//                         startedAt: Date.now(),
//                         durationSec: 60,
//                       })
//                     }
//                     style={({ pressed }) => ({
//                       paddingHorizontal: 12,
//                       paddingVertical: 8,
//                       borderRadius: 999,
//                       borderWidth: 1,
//                       borderColor: colors.border,
//                       backgroundColor: withAlpha(colors.text, 0.06),
//                       opacity: pressed ? 0.9 : 1,
//                     })}
//                   >
//                     <Text style={{ color: colors.text, fontWeight: "900" }}>
//                       1:00
//                     </Text>
//                   </Pressable>

//                   <Pressable
//                     onPress={() =>
//                       setRest({
//                         running: true,
//                         startedAt: Date.now(),
//                         durationSec: 90,
//                       })
//                     }
//                     style={({ pressed }) => ({
//                       paddingHorizontal: 12,
//                       paddingVertical: 8,
//                       borderRadius: 999,
//                       borderWidth: 1,
//                       borderColor: withAlpha(colors.primary, 0.35),
//                       backgroundColor: withAlpha(colors.primary, 0.12),
//                       opacity: pressed ? 0.9 : 1,
//                     })}
//                   >
//                     <Text style={{ color: colors.text, fontWeight: "900" }}>
//                       1:30
//                     </Text>
//                   </Pressable>

//                   <Pressable
//                     onPress={() => setRest(null)}
//                     style={({ pressed }) => ({
//                       width: 40,
//                       height: 40,
//                       borderRadius: 14,
//                       borderWidth: 1,
//                       borderColor: colors.border,
//                       backgroundColor: withAlpha(colors.text, 0.06),
//                       alignItems: "center",
//                       justifyContent: "center",
//                       opacity: pressed ? 0.9 : 1,
//                     })}
//                   >
//                     <Ionicons
//                       name="close-outline"
//                       size={18}
//                       color={colors.muted}
//                     />
//                   </Pressable>
//                 </Row>
//               </Row>
//             </View>
//           </View>
//         </View>
//       ) : null}

//       {/* Sticky footer: Finish */}
//       <View
//         style={{
//           position: "absolute",
//           left: 0,
//           right: 0,
//           bottom: 0,
//           paddingHorizontal: 14,
//           paddingBottom: 14,
//           paddingTop: 10,
//           backgroundColor: isDark
//             ? "rgba(0,0,0,0.35)"
//             : "rgba(255,255,255,0.55)",
//           borderTopWidth: 1,
//           borderTopColor: colors.border,
//         }}
//       >
//         <Pressable
//           onPress={finishWorkout}
//           style={({ pressed }) => ({
//             height: 54,
//             borderRadius: 18,
//             alignItems: "center",
//             justifyContent: "center",
//             backgroundColor: colors.primary,
//             borderWidth: 1,
//             borderColor: withAlpha(colors.primary, 0.65),
//             opacity: pressed ? 0.9 : 1,
//           })}
//         >
//           <Row gap={10}>
//             <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
//             <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
//               Finish workout
//             </Text>
//           </Row>
//         </Pressable>
//       </View>

//       {/* Search sheet */}
//       <ExerciseSearchSheet
//         open={searchOpen}
//         onClose={() => setSearchOpen(false)}
//         suggested={safePresets.map((p) => p.name)}
//         onPick={(name) => {
//           setSearchOpen(false);
//           addExerciseFirstSet(name);
//         }}
//       />

//       {/* Presets sheet (simple modal) */}
//       <Modal visible={presetsOpen} transparent animationType="fade">
//         <Pressable
//           onPress={() => setPresetsOpen(false)}
//           style={{
//             flex: 1,
//             backgroundColor: "rgba(0,0,0,0.45)",
//             padding: 18,
//             justifyContent: "flex-end",
//           }}
//         >
//           <Pressable
//             onPress={() => {}}
//             style={{
//               backgroundColor: colors.card,
//               borderRadius: 18,
//               padding: 14,
//               borderWidth: 1,
//               borderColor: colors.border,
//               overflow: "hidden",
//             }}
//           >
//             <Text
//               style={{
//                 color: colors.text,
//                 fontWeight: "1000" as any,
//                 fontSize: 16,
//               }}
//             >
//               Presets
//             </Text>
//             <Text style={{ color: colors.muted, marginTop: 6 }}>
//               Tap to insert • long-press delete
//             </Text>

//             <View style={{ marginTop: 12, gap: 10 }}>
//               {safePresets.map((p) => {
//                 const displayWeight =
//                   unit === "lb"
//                     ? kgToLb(Number(p.weight || 0))
//                     : Number(p.weight || 0);
//                 const w = Math.round(displayWeight * 100) / 100;

//                 return (
//                   <Pressable
//                     key={p.id}
//                     onPress={() => {
//                       setPresetsOpen(false);

//                       // Insert preset as multiple set rows (sets=1 each)
//                       const ex = (p.exercise || p.name || "").trim();
//                       const reps = Number(p.reps || 10) || 10;
//                       const weightKg = Number(p.weight || 0) || 0;
//                       const count = Math.max(1, Number(p.sets || 1) || 1);

//                       // add N rows
//                       (async () => {
//                         for (let i = 0; i < count; i++) {
//                           await addExerciseFirstSet(ex, { reps, weightKg });
//                         }
//                         // collapse the N “exercise blocks” duplication issue:
//                         // addExerciseFirstSet always adds a new set row, but groups are by exercise,
//                         // so it becomes one block with many rows (perfect).
//                       })();
//                     }}
//                     onLongPress={() => onDeletePreset(p.id)}
//                     style={({ pressed }) => ({
//                       padding: 12,
//                       borderRadius: 16,
//                       borderWidth: 1,
//                       borderColor: withAlpha(colors.primary, 0.22),
//                       backgroundColor: withAlpha(
//                         colors.text,
//                         isDark ? 0.08 : 0.06
//                       ),
//                       opacity: pressed ? 0.9 : 1,
//                     })}
//                   >
//                     <Row between>
//                       <View style={{ flex: 1, paddingRight: 10 }}>
//                         <Text style={{ color: colors.text, fontWeight: "900" }}>
//                           {p.name}
//                         </Text>
//                         <Text style={{ color: colors.muted, marginTop: 4 }}>
//                           {p.sets}×{p.reps} • {w} {unit}
//                         </Text>
//                       </View>

//                       <Pressable
//                         onPress={() => onUpdatePreset(p.id)}
//                         hitSlop={8}
//                         style={({ pressed }) => ({
//                           width: 36,
//                           height: 36,
//                           borderRadius: 14,
//                           borderWidth: 1,
//                           borderColor: colors.border,
//                           alignItems: "center",
//                           justifyContent: "center",
//                           backgroundColor: withAlpha(colors.text, 0.06),
//                           opacity: pressed ? 0.9 : 1,
//                         })}
//                       >
//                         <Ionicons
//                           name="refresh-outline"
//                           size={18}
//                           color={colors.muted}
//                         />
//                       </Pressable>
//                     </Row>
//                   </Pressable>
//                 );
//               })}
//             </View>

//             <Pressable
//               onPress={() => setPresetsOpen(false)}
//               style={({ pressed }) => ({
//                 marginTop: 12,
//                 paddingVertical: 12,
//                 borderRadius: 16,
//                 borderWidth: 1,
//                 borderColor: colors.border,
//                 alignItems: "center",
//                 backgroundColor: withAlpha(colors.text, 0.05),
//                 opacity: pressed ? 0.9 : 1,
//               })}
//             >
//               <Text style={{ color: colors.text, fontWeight: "900" }}>
//                 Close
//               </Text>
//             </Pressable>
//           </Pressable>
//         </Pressable>
//       </Modal>

//       {/* Title modal */}
//       <Modal visible={titleOpen} animationType="fade" transparent>
//         <Pressable
//           onPress={() => setTitleOpen(false)}
//           style={{
//             flex: 1,
//             backgroundColor: "rgba(0,0,0,0.45)",
//             padding: 18,
//             justifyContent: "center",
//           }}
//         >
//           <Pressable
//             onPress={() => {}}
//             style={{
//               backgroundColor: colors.card,
//               borderRadius: 18,
//               padding: 14,
//               borderWidth: 1,
//               borderColor: colors.border,
//             }}
//           >
//             <Text
//               style={{
//                 color: colors.text,
//                 fontWeight: "1000" as any,
//                 fontSize: 16,
//               }}
//             >
//               Workout title
//             </Text>
//             <Text style={{ color: colors.muted, marginTop: 6 }}>
//               This becomes the headline on your Workouts page.
//             </Text>

//             <TextInput
//               value={titleDraft}
//               onChangeText={setTitleDraft}
//               placeholder="e.g., Push Day, Legs, Upper Body"
//               placeholderTextColor={colors.muted}
//               style={{
//                 marginTop: 12,
//                 paddingHorizontal: 12,
//                 paddingVertical: 10,
//                 borderRadius: 14,
//                 borderWidth: 1,
//                 borderColor: colors.border,
//                 color: colors.text,
//                 backgroundColor: isDark
//                   ? "rgba(255,255,255,0.06)"
//                   : "rgba(0,0,0,0.03)",
//               }}
//               autoFocus
//               returnKeyType="done"
//               onSubmitEditing={saveTitle}
//             />

//             <View
//               style={{
//                 flexDirection: "row",
//                 justifyContent: "flex-end",
//                 gap: 10,
//                 marginTop: 14,
//               }}
//             >
//               <Pressable
//                 onPress={() => setTitleOpen(false)}
//                 style={{
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   borderRadius: 14,
//                   borderWidth: 1,
//                   borderColor: colors.border,
//                 }}
//               >
//                 <Text style={{ color: colors.text, fontWeight: "900" }}>
//                   Cancel
//                 </Text>
//               </Pressable>

//               <Pressable
//                 onPress={saveTitle}
//                 style={{
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   borderRadius: 14,
//                   backgroundColor: colors.primary,
//                 }}
//               >
//                 <Text style={{ color: "#fff", fontWeight: "900" }}>Save</Text>
//               </Pressable>
//             </View>
//           </Pressable>
//         </Pressable>
//       </Modal>
//     </KeyboardAvoidingView>
//   );
// }

// /* ───────────────────────── Components ───────────────────────── */

// function Row({
//   children,
//   gap = 0,
//   between = false,
//   style,
// }: React.PropsWithChildren<{ gap?: number; between?: boolean; style?: any }>) {
//   return (
//     <View
//       style={[
//         { flexDirection: "row", alignItems: "center", gap },
//         between && { justifyContent: "space-between" },
//         style,
//       ]}
//     >
//       {children}
//     </View>
//   );
// }

// function GlassCard({ children }: React.PropsWithChildren) {
//   const { colors, isDark } = useTheme();
//   return (
//     <View
//       style={{
//         borderRadius: 18,
//         overflow: "hidden",
//         borderWidth: 1,
//         borderColor: withAlpha(colors.border, 0.9),
//         backgroundColor: colors.card,
//         shadowColor: "#000",
//         shadowOpacity: isDark ? 0.18 : 0.12,
//         shadowRadius: 14,
//         shadowOffset: { width: 0, height: 8 },
//       }}
//     >
//       <LinearGradient
//         colors={[
//           withAlpha(colors.primary, isDark ? 0.14 : 0.1),
//           withAlpha(colors.text, 0.02),
//         ]}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={StyleSheet.absoluteFillObject}
//       />
//       <BlurView
//         tint={isDark ? "dark" : "light"}
//         intensity={isDark ? 22 : 16}
//         style={StyleSheet.absoluteFillObject}
//       />
//       <View style={{ padding: 14 }}>{children}</View>
//     </View>
//   );
// }

// function Chip({
//   label,
//   icon,
// }: {
//   label: string;
//   icon: "time" | "layers" | "barbell";
// }) {
//   const { colors, isDark } = useTheme();
//   const iconName =
//     icon === "time"
//       ? "time-outline"
//       : icon === "layers"
//       ? "layers-outline"
//       : "barbell-outline";
//   return (
//     <View
//       style={{
//         flexDirection: "row",
//         alignItems: "center",
//         gap: 6,
//         paddingHorizontal: 10,
//         paddingVertical: 6,
//         borderRadius: 999,
//         borderWidth: 1,
//         borderColor: colors.border,
//         backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
//       }}
//     >
//       <Ionicons name={iconName as any} size={14} color={colors.muted} />
//       <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}>
//         {label}
//       </Text>
//     </View>
//   );
// }

// function StatTile({ label, value }: { label: string; value: string }) {
//   const { colors, isDark } = useTheme();
//   return (
//     <View
//       style={{
//         flex: 1,
//         paddingVertical: 10,
//         paddingHorizontal: 12,
//         borderRadius: 16,
//         borderWidth: 1,
//         borderColor: colors.border,
//         backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
//       }}
//     >
//       <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}>
//         {label.toUpperCase()}
//       </Text>
//       <Text
//         style={{
//           color: colors.text,
//           fontWeight: "1000" as any,
//           fontSize: 18,
//           marginTop: 6,
//         }}
//       >
//         {value}
//       </Text>
//     </View>
//   );
// }

// function ExerciseTimelineCard({
//   exercise,
//   items,
//   unit,
//   expanded,
//   onToggle,
//   onAddSet,
//   onRemove,
//   onPatch,
//   weightStep,
//   weightBigStep,
//   repsStep,
//   repsBigStep,
//   onCompleteSet,
//   onSavePresetFromBlock,
//   lastAddedTs,
// }: {
//   exercise: string;
//   items: SetDraftItem[];
//   unit: "kg" | "lb";
//   expanded: boolean;
//   onToggle: () => void;
//   onAddSet: () => void;
//   onRemove: (createdAt: number) => void;
//   onPatch: (
//     createdAt: number,
//     patch: Partial<Pick<SetDraftItem, "reps" | "weightKg" | "done">>
//   ) => void;
//   weightStep: number;
//   weightBigStep: number;
//   repsStep: number;
//   repsBigStep: number;
//   onCompleteSet: (createdAt: number) => void;
//   onSavePresetFromBlock: () => void;
//   lastAddedTs: number | null;
// }) {
//   const { colors, isDark } = useTheme();
//   const { width } = useWindowDimensions();
//   const isCompact = width < 420;

//   // block totals
//   const totalSets = items.reduce((a, it) => a + Number(it.sets || 0), 0);
//   const totalVolKg = items.reduce(
//     (a, it) =>
//       a +
//       Number(it.weightKg || 0) * Number(it.reps || 0) * Number(it.sets || 0),
//     0
//   );
//   const volDisp = unit === "lb" ? kgToLb(totalVolKg) : totalVolKg;

//   const last = items[0];
//   const lastWeightDisp =
//     unit === "lb"
//       ? kgToLb(Number(last?.weightKg || 0))
//       : Number(last?.weightKg || 0);
//   const lastWeightRounded = Math.round(lastWeightDisp * 100) / 100;

//   return (
//     <View
//       style={{
//         borderRadius: 18,
//         borderWidth: 1,
//         borderColor: withAlpha(colors.primary, 0.22),
//         backgroundColor: withAlpha(colors.card, isDark ? 0.9 : 0.98),
//         overflow: "hidden",
//         shadowColor: colors.primary,
//         shadowOpacity: isDark ? 0.12 : 0.14,
//         shadowRadius: 16,
//         shadowOffset: { width: 0, height: 8 },
//         elevation: 8,
//       }}
//     >
//       <LinearGradient
//         colors={[
//           withAlpha(colors.primary, isDark ? 0.16 : 0.12),
//           withAlpha(colors.text, 0.03),
//         ]}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={StyleSheet.absoluteFillObject}
//       />
//       <BlurView
//         tint={isDark ? "dark" : "light"}
//         intensity={isDark ? 16 : 12}
//         style={StyleSheet.absoluteFillObject}
//       />

//       {/* Header */}
//       <Pressable
//         onPress={onToggle}
//         style={({ pressed }) => ({
//           paddingHorizontal: 14,
//           paddingVertical: 12,
//           opacity: pressed ? 0.92 : 1,
//           backgroundColor: withAlpha(colors.card, isDark ? 0.76 : 0.92),
//         })}
//       >
//         <Row between>
//           <View style={{ flex: 1, paddingRight: 10 }}>
//             <Text
//               style={{
//                 color: colors.text,
//                 fontWeight: "1000" as any,
//                 fontSize: 15,
//               }}
//               numberOfLines={2}
//             >
//               {exercise}
//             </Text>
//             <Text
//               style={{ color: colors.muted, fontWeight: "800", marginTop: 6 }}
//             >
//               {totalSets} sets • last {lastWeightRounded} {unit} •{" "}
//               {fmtCompact(Math.round(volDisp))} {unit} vol
//             </Text>

//             <Row gap={8} style={{ marginTop: 10, flexWrap: "wrap" }}>
//               <Pressable
//                 onPress={onAddSet}
//                 style={({ pressed }) => ({
//                   paddingHorizontal: 12,
//                   paddingVertical: 8,
//                   borderRadius: 999,
//                   borderWidth: 1,
//                   borderColor: withAlpha(colors.primary, 0.35),
//                   backgroundColor: withAlpha(colors.primary, 0.12),
//                   opacity: pressed ? 0.9 : 1,
//                 })}
//               >
//                 <Row gap={8}>
//                   <Ionicons
//                     name="duplicate-outline"
//                     size={14}
//                     color={colors.primary}
//                   />
//                   <Text style={{ color: colors.text, fontWeight: "900" }}>
//                     + Set
//                   </Text>
//                 </Row>
//               </Pressable>

//               <Pressable
//                 onPress={onSavePresetFromBlock}
//                 style={({ pressed }) => ({
//                   paddingHorizontal: 12,
//                   paddingVertical: 8,
//                   borderRadius: 999,
//                   borderWidth: 1,
//                   borderColor: colors.border,
//                   backgroundColor: withAlpha(colors.text, 0.06),
//                   opacity: pressed ? 0.9 : 1,
//                 })}
//               >
//                 <Row gap={8}>
//                   <Ionicons
//                     name="bookmark-outline"
//                     size={14}
//                     color={colors.muted}
//                   />
//                   <Text style={{ color: colors.text, fontWeight: "900" }}>
//                     Save preset
//                   </Text>
//                 </Row>
//               </Pressable>
//             </Row>
//           </View>

//           <Ionicons
//             name={expanded ? "chevron-up" : "chevron-down"}
//             size={18}
//             color={colors.muted}
//           />
//         </Row>
//       </Pressable>

//       {/* Set rows */}
//       {expanded && (
//         <View style={{ padding: 12, paddingTop: 8, gap: 10 }}>
//           {items.map((it, idx) => {
//             const done = !!(it as any).done;
//             const wDisp =
//               unit === "lb"
//                 ? kgToLb(Number(it.weightKg || 0))
//                 : Number(it.weightKg || 0);
//             const wRounded = Math.round(wDisp * 100) / 100;

//             return (
//               <View
//                 key={it.createdAt}
//                 style={{
//                   padding: 12,
//                   borderRadius: 16,
//                   borderWidth: 1,
//                   borderColor: withAlpha(colors.primary, 0.22),
//                   backgroundColor: withAlpha(colors.text, isDark ? 0.08 : 0.06),
//                   opacity: done ? 0.75 : 1,
//                 }}
//               >
//                 <View
//                   style={{
//                     flexDirection: isCompact ? "column" : "row",
//                     alignItems: isCompact ? "stretch" : "center",
//                     gap: isCompact ? 12 : 10,
//                   }}
//                 >
//                   <WeightPlateStacker
//                     value={wRounded}
//                     unit={unit}
//                     step={weightStep}
//                     appearance={isDark ? "dark" : "light"}
//                     style={{
//                       width: isCompact ? "100%" : 180,
//                       alignSelf: "stretch",
//                     }}
//                     scale={isCompact ? 0.94 : 1}
//                     onChange={(nextVal) => {
//                       const nextKg = unit === "lb" ? lbToKg(nextVal) : nextVal;
//                       onPatch(it.createdAt, { weightKg: nextKg });
//                     }}
//                   />

//                   <View style={{ flex: 1, gap: 10 }}>
//                     <View
//                       style={{
//                         flexDirection: "row",
//                         gap: 10,
//                         flexWrap: isCompact ? "wrap" : "nowrap",
//                       }}
//                     >
//                       <View style={{ flex: 1, minWidth: isCompact ? 0 : 120 }}>
//                         <ValuePill
//                           label={`Weight (${unit})`}
//                           value={String(wRounded)}
//                           onDec={() => {
//                             const nextDisp = Math.max(0, wDisp - weightStep);
//                             const nextKg =
//                               unit === "lb" ? lbToKg(nextDisp) : nextDisp;
//                             onPatch(it.createdAt, { weightKg: nextKg });
//                           }}
//                           onInc={() => {
//                             const nextDisp = wDisp + weightStep;
//                             const nextKg =
//                               unit === "lb" ? lbToKg(nextDisp) : nextDisp;
//                             onPatch(it.createdAt, { weightKg: nextKg });
//                           }}
//                           onDecBig={() => {
//                             const nextDisp = Math.max(0, wDisp - weightBigStep);
//                             const nextKg =
//                               unit === "lb" ? lbToKg(nextDisp) : nextDisp;
//                             onPatch(it.createdAt, { weightKg: nextKg });
//                           }}
//                           onIncBig={() => {
//                             const nextDisp = wDisp + weightBigStep;
//                             const nextKg =
//                               unit === "lb" ? lbToKg(nextDisp) : nextDisp;
//                             onPatch(it.createdAt, { weightKg: nextKg });
//                           }}
//                         />
//                       </View>

//                       <View style={{ flex: 1, minWidth: isCompact ? 0 : 120 }}>
//                         <ValuePill
//                           label="Reps"
//                           value={String(Number(it.reps || 0))}
//                           onDec={() =>
//                             onPatch(it.createdAt, {
//                               reps: Math.max(0, Number(it.reps || 0) - repsStep),
//                             })
//                           }
//                           onInc={() =>
//                             onPatch(it.createdAt, {
//                               reps: Number(it.reps || 0) + repsStep,
//                             })
//                           }
//                           onDecBig={() =>
//                             onPatch(it.createdAt, {
//                               reps: Math.max(0, Number(it.reps || 0) - repsBigStep),
//                             })
//                           }
//                           onIncBig={() =>
//                             onPatch(it.createdAt, {
//                               reps: Number(it.reps || 0) + repsBigStep,
//                             })
//                           }
//                         />
//                       </View>
//                     </View>

//                     <Row
//                       gap={10}
//                       style={{
//                         justifyContent: isCompact ? "flex-start" : "flex-end",
//                         flexWrap: "wrap",
//                       }}
//                     >
//                       <Pressable
//                         onPress={() => {
//                           if (!done) onCompleteSet(it.createdAt);
//                           else onPatch(it.createdAt, { done: false });
//                         }}
//                         hitSlop={8}
//                         style={({ pressed }) => ({
//                           width: 40,
//                           height: 40,
//                           borderRadius: 14,
//                           borderWidth: 1,
//                           borderColor: done
//                             ? withAlpha(colors.primary, 0.45)
//                             : colors.border,
//                           backgroundColor: done
//                             ? withAlpha(colors.primary, 0.16)
//                             : withAlpha(colors.text, 0.06),
//                           alignItems: "center",
//                           justifyContent: "center",
//                           opacity: pressed ? 0.9 : 1,
//                         })}
//                       >
//                         <Ionicons
//                           name={
//                             done ? "checkmark-circle" : "checkmark-circle-outline"
//                           }
//                           size={20}
//                           color={done ? colors.primary : colors.muted}
//                         />
//                       </Pressable>

//                       <Pressable
//                         onPress={() => onRemove(it.createdAt)}
//                         hitSlop={8}
//                         style={({ pressed }) => ({
//                           width: 40,
//                           height: 40,
//                           borderRadius: 14,
//                           borderWidth: 1,
//                           borderColor: colors.border,
//                           alignItems: "center",
//                           justifyContent: "center",
//                           backgroundColor: withAlpha(colors.text, 0.06),
//                           opacity: pressed ? 0.9 : 1,
//                         })}
//                       >
//                         <Ionicons
//                           name="trash-outline"
//                           size={18}
//                           color={colors.muted}
//                         />
//                       </Pressable>
//                     </Row>
//                   </View>
//                 </View>
//               </View>
//             );
//           })}
//         </View>
//       )}
//     </View>
//   );
// }

// function ValuePill({
//   label,
//   value,
//   onDec,
//   onInc,
//   onDecBig,
//   onIncBig,
// }: {
//   label: string;
//   value: string;
//   onDec: () => void;
//   onInc: () => void;
//   onDecBig: () => void;
//   onIncBig: () => void;
// }) {
//   const { colors, isDark } = useTheme();
//   return (
//     <View style={{ flex: 1 }}>
//       <Text
//         style={{
//           color: colors.muted,
//           fontWeight: "900",
//           fontSize: 10,
//           marginBottom: 4,
//         }}
//       >
//         {label.toUpperCase()}
//       </Text>

//       <View
//         style={{
//           borderRadius: 14,
//           borderWidth: 1,
//           borderColor: colors.border,
//           backgroundColor: isDark
//             ? "rgba(255,255,255,0.06)"
//             : "rgba(0,0,0,0.03)",
//           padding: 8,
//         }}
//       >
//         <Row between>
//           <Pressable
//             onPress={onDec}
//             onLongPress={onDecBig}
//             hitSlop={10}
//             style={({ pressed }) => ({
//               width: 28,
//               height: 28,
//               borderRadius: 10,
//               borderWidth: 1,
//               borderColor: colors.border,
//               backgroundColor: withAlpha(colors.text, 0.05),
//               alignItems: "center",
//               justifyContent: "center",
//               opacity: pressed ? 0.85 : 1,
//             })}
//           >
//             <Ionicons name="remove-outline" size={16} color={colors.text} />
//           </Pressable>

//           <Text
//             style={{
//               color: colors.text,
//               fontWeight: "1000" as any,
//               fontSize: 14,
//             }}
//           >
//             {value}
//           </Text>

//           <Pressable
//             onPress={onInc}
//             onLongPress={onIncBig}
//             hitSlop={10}
//             style={({ pressed }) => ({
//               width: 28,
//               height: 28,
//               borderRadius: 10,
//               borderWidth: 1,
//               borderColor: colors.border,
//               backgroundColor: withAlpha(colors.text, 0.05),
//               alignItems: "center",
//               justifyContent: "center",
//               opacity: pressed ? 0.85 : 1,
//             })}
//           >
//             <Ionicons name="add-outline" size={16} color={colors.text} />
//           </Pressable>
//         </Row>
//       </View>
//     </View>
//   );
// }
