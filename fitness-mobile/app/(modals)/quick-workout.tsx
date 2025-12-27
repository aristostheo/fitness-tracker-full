import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/content/AuthContext";
import { subscribeProfile, type Profile } from "@/services/profile";
import {
  subscribeWorkoutPresets,
  type WorkoutPreset,
} from "@/services/presets";
import {
  subscribeWorkoutTemplates,
  type WorkoutTemplate,
} from "@/services/templates";
import { addWorkout } from "@/services/workouts";
import { fmt } from "@/utils/date";
import { kgToLb, lbToKg } from "@/utils/units";

// ---------- Types ----------
type SetEntry = { reps: number; weight: number; done?: boolean };
type ExerciseEntry = {
  id: string;
  name: string;
  sets: SetEntry[];
  note?: string;
};

// ---------- Helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10);
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

// ---------- Quick pills defaults ----------
const REPS_PILLS = [6, 8, 10, 12, 15];
const SETS_PILLS = [1, 2, 3, 4, 5];
const WEIGHT_PILLS = [25, 35, 45, 55, 65, 75]; // adjust to lbs/kg

// ---------- Example presets (fallback if user has none) ----------
const DEFAULT_EXERCISE_PRESETS = [
  "Bench Press",
  "Incline DB Press",
  "Lat Pulldown",
  "Barbell Row",
  "Shoulder Press",
  "Lateral Raise",
  "Bicep Curl",
  "Tricep Pushdown",
  "Squat",
  "Leg Press",
  "RDL",
  "Hip Thrust",
];

// ---------- Screen ----------
export default function QuickWorkoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const unit = profile?.weightUnit === "lb" ? "lb" : "kg";

  // quick meta
  const [workoutName, setWorkoutName] = useState("Quick Workout");
  const [timerOn, setTimerOn] = useState(false); // placeholder toggle
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [presets, setPresets] = useState<WorkoutPreset[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  // adding exercise
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [selectedExerciseName, setSelectedExerciseName] = useState<
    string | null
  >(null);

  // fast defaults for next set creation
  const [quickSets, setQuickSets] = useState(3);
  const [quickReps, setQuickReps] = useState(10);
  const [quickWeight, setQuickWeight] = useState(45);

  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubProfile = subscribeProfile(user.uid, setProfile);
    const unsubPresets = subscribeWorkoutPresets(user.uid, setPresets);
    const unsubTemplates = subscribeWorkoutTemplates(user.uid, setTemplates);
    return () => {
      try {
        unsubProfile();
        unsubPresets();
        unsubTemplates();
      } catch {}
    };
  }, [user?.uid]);

  const suggestions = useMemo(() => {
    const base =
      presets.length > 0
        ? presets.map((p) => p.exercise || p.name).filter(Boolean)
        : DEFAULT_EXERCISE_PRESETS;
    const unique = Array.from(new Set(base));
    const q = exerciseQuery.trim().toLowerCase();
    if (!q) return unique.slice(0, 6);
    return unique.filter((x) => x.toLowerCase().includes(q)).slice(0, 6);
  }, [exerciseQuery, presets]);

  const presetByName = useMemo(() => {
    const map = new Map<string, WorkoutPreset>();
    presets.forEach((p) => {
      if (p.exercise) map.set(p.exercise, p);
      map.set(p.name, p);
    });
    return map;
  }, [presets]);

  const canAddExercise = useMemo(() => {
    const name = (selectedExerciseName ?? exerciseQuery).trim();
    return name.length >= 2;
  }, [selectedExerciseName, exerciseQuery]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templateId, templates]
  );

  const applyTemplate = (t: WorkoutTemplate) => {
    setTemplateId(t.id);
    setWorkoutName(t.name);
    const next: ExerciseEntry[] = t.items.map((it) => {
      const setsCount = it.sets ?? 3;
      const reps = it.reps ?? 10;
      const weight = unit === "lb" ? Math.round(kgToLb(it.weight ?? 45)) : it.weight ?? 45;
      return {
        id: uid(),
        name: it.exercise,
        sets: Array.from({ length: setsCount }).map(() => ({
          reps,
          weight,
          done: true,
        })),
      };
    });
    setExercises(next);
  };

  const addExercise = () => {
    const name = (selectedExerciseName ?? exerciseQuery).trim();
    if (!name) return;

    const sets: SetEntry[] = Array.from({ length: quickSets }).map(() => ({
      reps: quickReps,
      weight: quickWeight,
      done: true,
    }));

    setExercises((prev) => [...prev, { id: uid(), name, sets, note: "" }]);

    setExerciseQuery("");
    setSelectedExerciseName(null);
    inputRef.current?.blur();
  };

  const addOneSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  reps: ex.sets.at(-1)?.reps ?? quickReps,
                  weight: ex.sets.at(-1)?.weight ?? quickWeight,
                  done: true,
                },
              ],
            }
          : ex
      )
    );
  };

  const updateSet = (
    exerciseId: string,
    setIndex: number,
    patch: Partial<SetEntry>
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const nextSets = ex.sets.map((s, i) =>
          i === setIndex ? { ...s, ...patch } : s
        );
        return { ...ex, sets: nextSets };
      })
    );
  };

  const removeExercise = (exerciseId: string) => {
    setExercises((prev) => prev.filter((x) => x.id !== exerciseId));
  };

  const saveWorkout = async () => {
    if (!user?.uid) {
      Alert.alert("Sign in required", "Please sign in to save workouts.");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert(
        "Add at least one exercise",
        "Quick workouts still need something logged 🙂"
      );
      return;
    }

    const todayISO = fmt(new Date());

    try {
      for (const ex of exercises) {
        const first = ex.sets[0] ?? { reps: 0, weight: 0 };
        const reps = Number(first.reps || 0);
        const weightRaw = Number(first.weight || 0);
        const weightKg = unit === "lb" ? lbToKg(weightRaw) : weightRaw;

        const uniqueSets = new Set(
          ex.sets.map((s) => `${s.reps}x${s.weight}`)
        );
        const extraNote =
          uniqueSets.size > 1
            ? `Sets: ${Array.from(uniqueSets).join(", ")}`
            : "";
        const notes = [ex.note?.trim(), extraNote].filter(Boolean).join(" • ");

        await addWorkout(user.uid, {
          date: todayISO,
          exercise: ex.name,
          sets: ex.sets.length,
          reps,
          weight: weightKg,
          notes,
        });
      }

      Alert.alert("Saved", "Workout logged.");
      router.back();
    } catch (e: any) {
      console.warn("[quick-workout] save failed", e);
      Alert.alert("Couldn't save", e?.message || "Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0B0F17" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Quick Workout</Text>
          <Text style={styles.title}>Log fast. Move on.</Text>
        </View>

        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/workouts"))}
          style={styles.headerBtn}
        >
          <Text style={styles.headerBtnTxt}>Close</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Meta row */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workout</Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={workoutName}
                onChangeText={setWorkoutName}
                placeholder="e.g. Upper quick"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.input}
              />
            </View>

            <Pressable
              onPress={() => setTimerOn((v) => !v)}
              style={[styles.pillToggle, timerOn && styles.pillToggleOn]}
            >
              <Text style={styles.pillToggleTxt}>
                {timerOn ? "⏱️ On" : "⏱️ Off"}
              </Text>
              <Text style={styles.pillToggleSub}>Rest timer</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Templates</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
          >
            <TemplateChip
              label="None"
              active={!templateId}
              onPress={() => {
                setTemplateId(null);
                setWorkoutName("Quick Workout");
                setExercises([]);
              }}
            />
            {templates.map((t) => (
              <TemplateChip
                key={t.id}
                label={t.name}
                active={templateId === t.id}
                onPress={() => applyTemplate(t)}
              />
            ))}
          </ScrollView>

          {selectedTemplate && (
            <Text style={styles.hint}>
              Loaded template:{" "}
              <Text
                style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800" }}
              >
                {selectedTemplate.name}
              </Text>
            </Text>
          )}
        </View>

        {/* Add Exercise */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add exercise (fast)</Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Exercise</Text>
              <TextInput
                ref={inputRef}
                value={exerciseQuery}
                onChangeText={(t) => {
                  setExerciseQuery(t);
                  setSelectedExerciseName(null);
                }}
                placeholder="Type or tap a preset…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.input}
              />

              {/* Suggestions */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {suggestions.map((s, i) => {
                  const active = selectedExerciseName === s;
                  return (
                    <Pressable
                      key={`${s}-${i}`}
                      onPress={() => {
                        setSelectedExerciseName(s);
                        setExerciseQuery(s);
                        const preset = presetByName.get(s);
                        if (preset) {
                          if (preset.sets) setQuickSets(Number(preset.sets));
                          if (preset.reps) setQuickReps(Number(preset.reps));
                          if (preset.weight != null) {
                            const w =
                              unit === "lb"
                                ? Math.round(kgToLb(Number(preset.weight)))
                                : Number(preset.weight);
                            setQuickWeight(w);
                          }
                        }
                      }}
                      style={[
                        styles.suggestChip,
                        active && styles.suggestChipOn,
                      ]}
                    >
                      <Text style={styles.suggestTxt}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              onPress={addExercise}
              disabled={!canAddExercise}
              style={[styles.primaryBtn, !canAddExercise && { opacity: 0.45 }]}
            >
              <Text style={styles.primaryBtnTxt}>Add</Text>
              <Text style={styles.primaryBtnSub}>exercise</Text>
            </Pressable>
          </View>

          {/* Quick defaults */}
          <Text style={[styles.label, { marginTop: 14 }]}>
            Defaults for new exercise
          </Text>

          <View style={styles.quickRow}>
            <QuickPills
              title="Sets"
              value={quickSets}
              pills={SETS_PILLS}
              onPick={setQuickSets}
            />
            <QuickPills
              title="Reps"
              value={quickReps}
              pills={REPS_PILLS}
              onPick={setQuickReps}
            />
            <QuickPills
              title="Weight"
              value={quickWeight}
              pills={WEIGHT_PILLS}
              onPick={(v) => setQuickWeight(v)}
              suffix="lb"
            />
          </View>

          <Text style={styles.hint}>
            Tip: tap a set below to edit reps/weight, or “+ Set” to duplicate
            the last set.
          </Text>
        </View>

        {/* Exercises list */}
        <View style={[styles.card, { paddingBottom: 10 }]}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.cardTitle}>Logged</Text>
            <Text style={styles.smallStat}>{exercises.length} exercises</Text>
          </View>

          {exercises.length === 0 ? (
            <Text style={[styles.hint, { marginTop: 12 }]}>
              No exercises yet. Add one above or load a template.
            </Text>
          ) : (
            <View style={{ marginTop: 12, gap: 12 }}>
              {exercises.map((ex) => (
                <View key={ex.id} style={styles.exerciseBox}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => addOneSet(ex.id)}
                        style={styles.miniBtn}
                      >
                        <Text style={styles.miniBtnTxt}>+ Set</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert("Remove exercise?", ex.name, [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Remove",
                              style: "destructive",
                              onPress: () => removeExercise(ex.id),
                            },
                          ])
                        }
                        style={[
                          styles.miniBtn,
                          { borderColor: "rgba(255,120,120,0.35)" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniBtnTxt,
                            { color: "rgba(255,170,170,0.95)" },
                          ]}
                        >
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ marginTop: 10, gap: 8 }}>
                    {ex.sets.map((s, i) => (
                      <View key={i} style={styles.setRow}>
                        <Text style={styles.setIndex}>Set {i + 1}</Text>

                        <Pressable
                          onPress={() =>
                            updateSet(ex.id, i, {
                              reps: s.reps === 1 ? 1 : s.reps - 1,
                            })
                          }
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperTxt}>−</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            updateSet(ex.id, i, { reps: s.reps + 1 })
                          }
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperTxt}>+</Text>
                        </Pressable>
                        <Text style={styles.setValue}>{s.reps} reps</Text>

                        <View style={{ width: 10 }} />

                        <Pressable
                          onPress={() =>
                            updateSet(ex.id, i, {
                              weight: Math.max(0, roundTo(s.weight - 5, 5)),
                            })
                          }
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperTxt}>−</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            updateSet(ex.id, i, {
                              weight: roundTo(s.weight + 5, 5),
                            })
                          }
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperTxt}>+</Text>
                        </Pressable>
                        <Text style={styles.setValue}>{s.weight} lb</Text>
                      </View>
                    ))}
                  </View>

                  <TextInput
                    value={ex.note ?? ""}
                    onChangeText={(t) =>
                      setExercises((prev) =>
                        prev.map((p) =>
                          p.id === ex.id ? { ...p, note: t } : p
                        )
                      )
                    }
                    placeholder="Note (optional)…"
                    placeholderTextColor="rgba(255,255,255,0.32)"
                    style={[styles.input, { marginTop: 10 }]}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() =>
            Alert.alert("Discard?", "This will clear your quick workout.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => setExercises([]),
              },
            ])
          }
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryTxt}>Discard</Text>
        </Pressable>

        <Pressable onPress={saveWorkout} style={styles.saveBtn}>
          <Text style={styles.saveTxt}>Save Workout</Text>
          <Text style={styles.saveSub}>
            {exercises.length
              ? `${exercises.length} exercises`
              : "Add something first"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------- Small components ----------
function TemplateChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipTxt, active && styles.chipTxtOn]}>{label}</Text>
    </Pressable>
  );
}

function QuickPills({
  title,
  value,
  pills,
  onPick,
  suffix,
}: {
  title: string;
  value: number;
  pills: number[];
  onPick: (v: number) => void;
  suffix?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{title}</Text>
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}
      >
        {pills.map((p) => {
          const active = p === value;
          return (
            <Pressable
              key={p}
              onPress={() => onPick(p)}
              style={[styles.pill, active && styles.pillOn]}
            >
              <Text style={[styles.pillTxt, active && styles.pillTxtOn]}>
                {p}
                {suffix ? ` ${suffix}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    backgroundColor: "#0B0F17",
  },
  kicker: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "800" },
  title: { color: "white", fontSize: 18, fontWeight: "900", marginTop: 4 },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerBtnTxt: { color: "rgba(255,255,255,0.9)", fontWeight: "900" },

  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 14,
  },
  cardTitle: { color: "white", fontSize: 14, fontWeight: "900" },
  pillToggle: {
    width: 120,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  pillToggleOn: {
    backgroundColor: "rgba(120,255,180,0.14)",
    borderColor: "rgba(120,255,180,0.35)",
  },
  pillToggleTxt: { color: "white", fontWeight: "900", fontSize: 14 },
  pillToggleSub: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "700",
    fontSize: 11,
    marginTop: 2,
  },
  label: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  hint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },

  input: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: "800",
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  chipOn: {
    backgroundColor: "rgba(160,140,255,0.16)",
    borderColor: "rgba(160,140,255,0.35)",
  },
  chipTxt: { color: "rgba(255,255,255,0.82)", fontWeight: "900", fontSize: 12 },
  chipTxtOn: { color: "white" },

  suggestChip: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  suggestChipOn: {
    backgroundColor: "rgba(120,200,255,0.14)",
    borderColor: "rgba(120,200,255,0.35)",
  },
  suggestTxt: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "900",
    fontSize: 12,
  },

  primaryBtn: {
    width: 88,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(160,140,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(160,140,255,0.35)",
  },
  primaryBtnTxt: { color: "white", fontWeight: "900", fontSize: 14 },
  primaryBtnSub: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "800",
    fontSize: 11,
    marginTop: 2,
  },

  quickRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillOn: {
    backgroundColor: "rgba(120,255,180,0.14)",
    borderColor: "rgba(120,255,180,0.35)",
  },
  pillTxt: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 12 },
  pillTxtOn: { color: "white" },

  smallStat: { color: "rgba(255,255,255,0.55)", fontWeight: "800" },

  exerciseBox: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  exerciseName: { color: "white", fontWeight: "900", fontSize: 14 },

  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  miniBtnTxt: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "900",
    fontSize: 12,
  },

  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  setIndex: { color: "rgba(255,255,255,0.72)", fontWeight: "900", width: 56 },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginRight: 6,
  },
  stepperTxt: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
    marginTop: -1,
  },
  setValue: { color: "white", fontWeight: "900", minWidth: 72 },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingBottom: 18,
    backgroundColor: "rgba(11,15,23,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    width: 96,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  secondaryTxt: { color: "rgba(255,255,255,0.85)", fontWeight: "900" },

  saveBtn: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(160,140,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(160,140,255,0.38)",
    paddingVertical: 12,
  },
  saveTxt: { color: "white", fontWeight: "900", fontSize: 14 },
  saveSub: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "800",
    fontSize: 11,
    marginTop: 3,
  },
});
