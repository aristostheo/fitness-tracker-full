// app/(modals)/coach-spark.tsx
// Drop-in ✅ Premium full-screen Coach Spark — Generate Workout
//
// Depends on: expo-blur, expo-linear-gradient, expo-haptics, react-native-reanimated, @expo/vector-icons
// Uses: your existing backend logic (generatePlanWithOpenAI + recentHistory + seed to session)
//
// Route: / (modals) / coach-spark

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/content/AuthContext";
import { subscribeWorkouts, type Workout } from "@/services/workouts";
import { auth } from "@/lib/firebase";

// -----------------------------
// Types (kept from your old backend)
// -----------------------------
type PlanItem = {
  exercise: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  notes?: string;
};

type Plan = null | { items: PlanItem[]; rationale?: string };

// -----------------------------
// Small utils
// -----------------------------
const withAlpha = (hex: string, a: number) => {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
};

function createdAtMs(r: any) {
  const c = r?.createdAt;
  if (!c) return 0;
  if (typeof c === "number") return c;
  if (typeof c?.toMillis === "function") return c.toMillis();
  if (typeof c?.seconds === "number") return c.seconds * 1000;
  return 0;
}

function recentHistory(workouts: any[], n = 12) {
  const rows = (workouts || []).slice().sort((a, b) => {
    const ad = String((a as any).date || "");
    const bd = String((b as any).date || "");
    if (ad !== bd) return bd.localeCompare(ad);
    return createdAtMs(b) - createdAtMs(a);
  });
  return rows.slice(0, Math.max(0, n));
}

function profileContext(profile: any) {
  return profile ?? {};
}

// ✅ Your existing backend call (kept)
async function generatePlanWithOpenAI(args: {
  dayText: string;
  profile: any;
  recent: any[];
  regenToken?: string | number;
}) {
  const url = process.env.AI_DESCRIBE_URL;
  if (!url) throw new Error("Missing AI_DESCRIBE_URL");

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

// Optional: keep your pro gate if you want (safe default)
function ensurePro(_reason: string) {
  return true;
}

// -----------------------------
// Page-specific model
// -----------------------------
type Focus =
  | "Push"
  | "Pull"
  | "Legs"
  | "Full body"
  | "Upper"
  | "Lower"
  | "Cardio";

type DurationBand = "15–30" | "30–45" | "45–60" | "60+";

type StyleMode =
  | "Strength"
  | "Hypertrophy"
  | "Endurance"
  | "Athletic"
  | "Recovery";

type Equipment = "Gym" | "Home" | "Dumbbells only" | "No equipment";

const FOCUS: Focus[] = [
  "Push",
  "Pull",
  "Legs",
  "Full body",
  "Upper",
  "Lower",
  "Cardio",
];
const DURATION: DurationBand[] = ["15–30", "30–45", "45–60", "60+"];
const STYLE: StyleMode[] = [
  "Strength",
  "Hypertrophy",
  "Endurance",
  "Athletic",
  "Recovery",
];
const EQUIP: Equipment[] = ["Gym", "Home", "Dumbbells only", "No equipment"];

const SORE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
] as const;
const INJURY_GROUPS = [
  "Knee",
  "Shoulder",
  "Lower back",
  "Wrist",
  "Ankle",
  "Hip",
  "Neck",
] as const;

function intensityLabel(v01: number) {
  if (v01 < 0.28) return "Clean";
  if (v01 < 0.55) return "Building";
  if (v01 < 0.78) return "Peaking";
  return "Hard";
}

function buildPrompt(args: {
  focus: Focus;
  duration: DurationBand;
  style: StyleMode;
  equipment: Equipment;
  intensity01: number;
  sore: string[];
  injuries: string[];
  preferred: string;
  notes: string;
}) {
  const intensity = intensityLabel(args.intensity01);
  const prefer = args.preferred.trim();
  const notes = args.notes.trim();

  // Calm, constrained, “trustworthy” prompt format
  // (You can tune this later; this is intentionally deterministic and structured.)
  const lines = [
    `Generate a ${args.duration} minute workout.`,
    `Focus: ${args.focus}. Style: ${args.style}. Intensity: ${intensity}.`,
    `Equipment: ${args.equipment}.`,
    args.sore.length
      ? `Sore muscles to avoid overloading: ${args.sore.join(", ")}.`
      : `Soreness: none specified.`,
    args.injuries.length
      ? `Injuries/limitations: ${args.injuries.join(
          ", "
        )}. Avoid aggravating movements.`
      : `Injuries: none specified.`,
    prefer
      ? `Preferred exercises (include if appropriate): ${prefer}.`
      : `Preferred exercises: none.`,
    notes ? `Other constraints: ${notes}.` : `Other constraints: none.`,
    `Output JSON with items: exercise, sets, reps, weight_kg (optional), notes (optional). Include a short rationale.`,
    `Keep it safe, realistic, and structured: warm-up, main work, optional finisher, cool-down if recovery-focused.`,
  ];

  return lines.join(" ");
}

export default function CoachSparkGenerateWorkout() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    focus?: string;
    duration?: string;
    style?: string;
  }>();

  const { user } = useAuth();
  const uid = user?.uid;

  const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

  // Theme tokens (dark-first premium)
  const accent = "#68D7FF";
  const accent2 = "#8B7CFF";

  // Selections (seed from params if you pass them from card)
  const [focus, setFocus] = useState<Focus>(() => {
    const f = (params.focus || "").toLowerCase();
    const map: Record<string, Focus> = {
      push: "Push",
      pull: "Pull",
      legs: "Legs",
      "full body": "Full body",
      full: "Full body",
      upper: "Upper",
      lower: "Lower",
      cardio: "Cardio",
    };
    return map[f] ?? "Upper";
  });

  const [duration, setDuration] = useState<DurationBand>(() => {
    const d = String(params.duration || "");
    if (d.includes("15")) return "15–30";
    if (d.includes("30") && d.includes("45")) return "30–45";
    if (d.includes("45") || d.includes("60")) return "45–60";
    return "45–60";
  });

  const [style, setStyle] = useState<StyleMode>(() => {
    const s = (params.style || "").toLowerCase();
    const map: Record<string, StyleMode> = {
      strength: "Strength",
      hypertrophy: "Hypertrophy",
      endurance: "Endurance",
      athletic: "Athletic",
      recovery: "Recovery",
    };
    return map[s] ?? "Hypertrophy";
  });

  const [equipment, setEquipment] = useState<Equipment>("Gym");
  const [intensity01, setIntensity01] = useState(0.52);

  // Progressive disclosure
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advH = useSharedValue(0);

  useEffect(() => {
    advH.value = withSpring(advancedOpen ? 1 : 0, {
      damping: 18,
      stiffness: 240,
    });
  }, [advancedOpen, advH]);

  const advStyle = useAnimatedStyle(() => ({
    opacity: withTiming(advancedOpen ? 1 : 0, { duration: 140 }),
    transform: [
      { translateY: withTiming(advancedOpen ? 0 : -6, { duration: 160 }) },
    ],
  }));

  // Constraints
  const [sore, setSore] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [preferred, setPreferred] = useState("");
  const [notes, setNotes] = useState("");

  // Data for “trust”
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [profile, setProfile] = useState<any>(null); // optional if you already store snapshot; keep null safe.

  useEffect(() => {
    if (!uid) {
      setWorkouts([]);
      return;
    }
    return subscribeWorkouts(
      uid,
      (rows: Workout[]) => setWorkouts(rows || []),
      { max: 200 }
    );
  }, [uid]);

  // Subtle breathing glow
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [breathe]);

  const breatheGlow = useAnimatedStyle(() => ({
    opacity: 0.1 + breathe.value * 0.1,
  }));

  // Plan state
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Selection inside result (optional)
  const [selectedIdx, setSelectedIdx] = useState<Record<number, boolean>>({});

  const preview = useMemo(() => {
    const hintCount =
      style === "Recovery"
        ? "4–6 exercises"
        : focus === "Cardio"
        ? "3–5 blocks"
        : "5–7 exercises";
    return {
      line1: `Preview: ${focus} • ${duration} • ${style} • ${equipment}`,
      line2: `Warm-up + ${hintCount} • editable before starting`,
    };
  }, [focus, duration, style, equipment]);

  const trustLine = useMemo(() => {
    const n = Math.min(12, recentHistory(workouts, 12).length);
    return n > 0
      ? `Uses your last ${n} sessions for structure.`
      : `Uses safe defaults (no history yet).`;
  }, [workouts]);

  const hSelect = () => Haptics.selectionAsync().catch(() => {});
  const hMed = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  const hLight = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  const seedKey = (u: string) => `workout:templateSeed:${u}`;

  async function handleGenerate(regen = false) {
    if (!ensurePro("Coach Spark workout generator")) return;
    if (!uid) {
      Alert.alert("Sign in required", "Please sign in to generate a workout.");
      return;
    }

    setErrorText(null);
    setPlan(null);
    setSelectedIdx({});

    const prompt = buildPrompt({
      focus,
      duration,
      style,
      equipment,
      intensity01,
      sore,
      injuries,
      preferred,
      notes,
    });

    try {
      setLoading(true);
      hMed();
      const res = await generatePlanWithOpenAI({
        dayText: prompt,
        profile: profileContext(profile),
        recent: recentHistory(workouts, 12),
        regenToken: regen ? Date.now() : `${Date.now()}`,
      });
      setPlan(res);
      hLight();
    } catch (e: any) {
      console.warn(e);
      setErrorText(e?.message || "Couldn’t generate right now.");
      Alert.alert("Could not generate workout", e?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function startSessionWithItems(items: PlanItem[]) {
    if (!uid) return;
    if (!items?.length) return;

    hSelect();

    const title = `Coach Spark • ${focus}`;
    const seed = {
      title,
      exercises: items.map((it) => ({
        name: it.exercise,
        sets: Math.max(1, Number(it.sets ?? (style === "Strength" ? 4 : 3))),
        reps: Math.max(1, Number(it.reps ?? (style === "Strength" ? 6 : 10))),
        weightKg: Number(it.weight_kg ?? 0),
        note: (it.notes || "").trim(),
      })),
    };

    await AsyncStorage.setItem(seedKey(uid), JSON.stringify(seed));

    router.replace({
      pathname: "/workouts/session",
      params: { coachSpark: "1", prompt: `${focus}|${duration}|${style}` },
    } as any);
  }

  const selectedItems = useMemo(() => {
    if (!plan?.items?.length) return [];
    return Object.keys(selectedIdx)
      .filter((k) => selectedIdx[Number(k)])
      .map((k) => plan.items[Number(k)])
      .filter(Boolean);
  }, [plan, selectedIdx]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#070A12", "#050711", "#03040A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ambient glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { backgroundColor: withAlpha(accent, 0.18), left: -110, top: -120 },
          breatheGlow,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { backgroundColor: withAlpha(accent2, 0.16), right: -120, top: 90 },
          breatheGlow,
        ]}
      />

      {/* Header */}
      <View style={{ paddingTop: topInset + 10, paddingHorizontal: 12 }}>
        <BlurView intensity={28} tint="dark" style={styles.headerBlur}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={withAlpha("#FFFFFF", 0.92)}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.hTitle}>Coach Spark</Text>
              <Text style={styles.hSub}>Generate workout</Text>
            </View>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.82 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close Coach Spark"
            >
              <Ionicons
                name="close"
                size={18}
                color={withAlpha("#FFFFFF", 0.86)}
              />
            </Pressable>
          </View>
        </BlurView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main panel */}
        <View style={styles.panel}>
          <LinearGradient
            colors={[
              withAlpha("#FFFFFF", 0.1),
              withAlpha("#FFFFFF", 0.04),
              withAlpha("#000000", 0.1),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.panelTop}>
            <Text style={styles.panelTitle}>
              Build a plan that feels intentional.
            </Text>
            <Text style={styles.panelSub}>
              Curated structure • {trustLine}{" "}
              <Text style={{ color: withAlpha("#FFFFFF", 0.62) }}>
                You can edit before you start.
              </Text>
            </Text>
          </View>

          {/* Focus */}
          <SectionLabel label="Focus" />
          <RowChips
            options={FOCUS}
            value={focus}
            onChange={(v) => {
              hSelect();
              setFocus(v as Focus);
            }}
          />

          {/* Duration */}
          <SectionLabel label="Duration" />
          <RowChips
            options={DURATION}
            value={duration}
            onChange={(v) => {
              hSelect();
              setDuration(v as DurationBand);
            }}
          />

          {/* Style */}
          <SectionLabel label="Style" />
          <RowChips
            options={STYLE}
            value={style}
            onChange={(v) => {
              hSelect();
              setStyle(v as StyleMode);
            }}
          />

          {/* Equipment */}
          <SectionLabel label="Equipment" />
          <RowChips
            options={EQUIP}
            value={equipment}
            onChange={(v) => {
              hSelect();
              setEquipment(v as Equipment);
            }}
          />

          {/* Intensity */}
          <View style={{ marginTop: 10 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>Intensity</Text>
              <View style={styles.intensityPill}>
                <View
                  style={[
                    styles.intensityDot,
                    {
                      backgroundColor: withAlpha(accent, 0.92),
                      shadowColor: accent,
                    },
                  ]}
                />
                <Text style={styles.intensityText}>
                  {intensityLabel(intensity01)}
                </Text>
              </View>
            </View>

            <IntensitySlider
              value01={intensity01}
              onChange={(v) => setIntensity01(v)}
              onCommit={() => hSelect()}
            />
            <View style={styles.sliderEnds}>
              <Text style={styles.sliderEndText}>Gentle</Text>
              <Text style={styles.sliderEndText}>Hard</Text>
            </View>
          </View>

          {/* Preview */}
          <View style={styles.previewBox}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewLabel}>Preview</Text>
              {!!errorText && (
                <View style={styles.errorPill}>
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              )}
            </View>
            <Text style={styles.previewLine1} numberOfLines={1}>
              {preview.line1}
            </Text>
            <Text style={styles.previewLine2} numberOfLines={2}>
              {preview.line2}
            </Text>
          </View>

          {/* Advanced (progressive disclosure) */}
          <Pressable
            onPress={() => {
              hSelect();
              setAdvancedOpen((v) => !v);
            }}
            style={({ pressed }) => [
              styles.advancedToggle,
              pressed && { opacity: 0.92 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Optional constraints"
            accessibilityHint="Expands additional preferences"
          >
            <Text style={styles.advancedText}>
              Optional constraints{" "}
              <Text style={{ color: withAlpha("#FFFFFF", 0.55) }}>
                (sore areas, injuries, preferred exercises)
              </Text>
            </Text>
            <Ionicons
              name={advancedOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={withAlpha("#FFFFFF", 0.55)}
            />
          </Pressable>

          {advancedOpen ? (
            <Animated.View
              entering={FadeInDown.duration(220)}
              exiting={FadeOut.duration(140)}
              layout={LinearTransition.springify().damping(18).stiffness(220)}
              style={[styles.advancedWrap]}
            >
              <Animated.View style={advStyle}>
                <SectionLabel label="Sore muscles" subtle />
                <MultiChipRow
                  options={[...SORE_GROUPS]}
                  selected={sore}
                  onToggle={(v) => {
                    hSelect();
                    setSore((curr) =>
                      curr.includes(v)
                        ? curr.filter((x) => x !== v)
                        : [...curr, v]
                    );
                  }}
                />

                <SectionLabel label="Injuries / limitations" subtle />
                <MultiChipRow
                  options={[...INJURY_GROUPS]}
                  selected={injuries}
                  onToggle={(v) => {
                    hSelect();
                    setInjuries((curr) =>
                      curr.includes(v)
                        ? curr.filter((x) => x !== v)
                        : [...curr, v]
                    );
                  }}
                />

                <SectionLabel label="Preferred exercises" subtle />
                <TextInput
                  value={preferred}
                  onChangeText={setPreferred}
                  placeholder="e.g., incline dumbbell press, hip thrusts"
                  placeholderTextColor={withAlpha("#FFFFFF", 0.4)}
                  style={styles.field}
                />

                <SectionLabel label="Notes" subtle />
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything to keep in mind?"
                  placeholderTextColor={withAlpha("#FFFFFF", 0.4)}
                  style={[styles.field, { height: 46 }]}
                />
              </Animated.View>
            </Animated.View>
          ) : null}

          {/* Actions */}
          <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => handleGenerate(false)}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                loading && { opacity: 0.7 },
                pressed && !loading && { opacity: 0.92 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Generate workout"
            >
              <LinearGradient
                colors={[
                  withAlpha(accent, 0.42),
                  withAlpha(accent2, 0.22),
                  withAlpha("#FFFFFF", 0.08),
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryInner}
              >
                {loading ? (
                  <ActivityIndicator color={withAlpha("#FFFFFF", 0.92)} />
                ) : (
                  <Ionicons
                    name="sparkles"
                    size={18}
                    color={withAlpha("#FFFFFF", 0.95)}
                  />
                )}
                <Text style={styles.primaryText}>
                  {loading ? "Generating…" : "Generate workout"}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                hSelect();
                setFocus("Upper");
                setDuration("45–60");
                setStyle("Hypertrophy");
                setEquipment("Gym");
                setIntensity01(0.52);
                setSore([]);
                setInjuries([]);
                setPreferred("");
                setNotes("");
                setPlan(null);
                setSelectedIdx({});
                setErrorText(null);
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.92 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reset"
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={withAlpha("#FFFFFF", 0.86)}
              />
            </Pressable>
          </View>
        </View>

        {/* Result */}
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={accent} />
            <Text style={styles.loadingText}>Building a structured plan…</Text>
          </View>
        ) : plan?.items?.length ? (
          <Animated.View
            entering={FadeInDown.duration(260)}
            style={{ marginTop: 12 }}
          >
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>Generated plan</Text>
                <View style={styles.resultPill}>
                  <Ionicons
                    name="layers-outline"
                    size={14}
                    color={withAlpha("#FFFFFF", 0.8)}
                  />
                  <Text style={styles.resultPillText}>
                    {plan.items.length} items
                  </Text>
                </View>
              </View>

              {!!plan?.rationale && (
                <Text style={styles.rationale} numberOfLines={3}>
                  {plan.rationale}
                </Text>
              )}

              <View style={{ gap: 10, marginTop: 10 }}>
                {plan.items.map((it, idx) => {
                  const picked = !!selectedIdx[idx];

                  const meta =
                    `${it.sets ?? "—"}×${it.reps ?? "—"}` +
                    (typeof it.weight_kg === "number"
                      ? ` • ${Math.round(it.weight_kg)} kg`
                      : "") +
                    (it.notes ? ` • ${it.notes}` : "");

                  return (
                    <Pressable
                      key={`${it.exercise}-${idx}`}
                      onPress={() => {
                        hSelect();
                        setSelectedIdx((m) => ({ ...m, [idx]: !m[idx] }));
                      }}
                      style={({ pressed }) => [
                        styles.itemRow,
                        picked && styles.itemRowPicked,
                        pressed && { opacity: 0.92 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${it.exercise}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {it.exercise}
                        </Text>
                        <Text style={styles.itemSub} numberOfLines={2}>
                          {meta}
                        </Text>
                      </View>

                      <View
                        style={[styles.pickDot, picked && styles.pickDotOn]}
                      >
                        {picked ? (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={withAlpha("#111", 0.92)}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={() => startSessionWithItems(plan.items)}
                  style={({ pressed }) => [
                    styles.startAllBtn,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Ionicons
                    name="play"
                    size={16}
                    color={withAlpha("#111", 0.92)}
                  />
                  <Text style={styles.startAllText}>Start with plan</Text>
                </Pressable>

                <Pressable
                  onPress={() => startSessionWithItems(selectedItems)}
                  disabled={selectedItems.length === 0}
                  style={({ pressed }) => [
                    styles.startSelBtn,
                    selectedItems.length === 0 && { opacity: 0.55 },
                    pressed && selectedItems.length > 0 && { opacity: 0.92 },
                  ]}
                >
                  <Ionicons
                    name="checkbox-outline"
                    size={16}
                    color={withAlpha("#FFFFFF", 0.92)}
                  />
                  <Text style={styles.startSelText}>
                    Start ({selectedItems.length})
                  </Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => handleGenerate(true)}
                  style={({ pressed }) => [
                    styles.regenBtn,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={16}
                    color={withAlpha("#FFFFFF", 0.86)}
                  />
                  <Text style={styles.regenText}>Regenerate</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    hSelect();
                    setPlan(null);
                    setSelectedIdx({});
                  }}
                  style={({ pressed }) => [
                    styles.clearBtn,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={withAlpha("#FF5C6A", 0.95)}
                  />
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ) : (
          <Text style={styles.footerHint}>
            Tip: keep selections simple — generate, then refine with constraints
            if needed.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// -----------------------------
// Components (small, premium)
// -----------------------------
function SectionLabel({ label, subtle }: { label: string; subtle?: boolean }) {
  return (
    <Text
      style={[
        styles.sectionLabel,
        {
          marginTop: subtle ? 10 : 12,
          color: withAlpha("#FFFFFF", subtle ? 0.62 : 0.7),
        },
      ]}
    >
      {label.toUpperCase()}
    </Text>
  );
}

function RowChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const selected = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipOn,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text
              style={[styles.chipText, selected && styles.chipTextOn]}
              numberOfLines={1}
            >
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiChipRow({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={[styles.chipRow, { marginTop: 8 }]}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <Pressable
            key={o}
            onPress={() => onToggle(o)}
            style={({ pressed }) => [
              styles.chip,
              on && styles.chipOn,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text
              style={[styles.chipText, on && styles.chipTextOn]}
              numberOfLines={1}
            >
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Minimal slider (no external lib): tap left/right to adjust + drag-like feel.
 * If you already use @react-native-community/slider you can swap, but this keeps it drop-in.
 */
function IntensitySlider({
  value01,
  onChange,
  onCommit,
}: {
  value01: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  const p = Math.max(0, Math.min(1, value01));
  return (
    <Pressable
      onPress={(e) => {
        const x = e.nativeEvent.locationX;
        // width ~ 320-ish, but we use relative by clamping on 260 baseline
        const v = Math.max(0, Math.min(1, x / 280));
        onChange(v);
        onCommit?.();
      }}
      style={({ pressed }) => [
        styles.sliderTrack,
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={[styles.sliderFill, { width: `${Math.round(p * 100)}%` }]} />
      <View style={[styles.sliderThumb, { left: `${Math.round(p * 100)}%` }]} />
    </Pressable>
  );
}

// -----------------------------
// Styles
// -----------------------------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05060C" },
  glow: { position: "absolute", width: 320, height: 320, borderRadius: 320 },

  headerBlur: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    backgroundColor: withAlpha("#FFFFFF", 0.04),
  },
  headerRow: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.07),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  hTitle: {
    color: withAlpha("#FFFFFF", 0.94),
    fontSize: 16,
    fontWeight: "900",
  },
  hSub: {
    marginTop: 2,
    color: withAlpha("#FFFFFF", 0.6),
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },

  panel: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    padding: 14,
  },
  panelTop: { marginBottom: 6 },
  panelTitle: {
    color: withAlpha("#FFFFFF", 0.94),
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  panelSub: {
    marginTop: 6,
    color: withAlpha("#FFFFFF", 0.62),
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  sectionLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
    maxWidth: "100%",
  },
  chipOn: {
    backgroundColor: withAlpha("#68D7FF", 0.88),
    borderColor: withAlpha("#68D7FF", 0.85),
  },
  chipText: {
    color: withAlpha("#FFFFFF", 0.82),
    fontSize: 12,
    fontWeight: "900",
  },
  chipTextOn: { color: withAlpha("#111", 0.92) },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  intensityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  intensityDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  intensityText: {
    color: withAlpha("#FFFFFF", 0.86),
    fontWeight: "900",
    fontSize: 12,
  },

  sliderTrack: {
    marginTop: 10,
    height: 12,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
    overflow: "hidden",
    justifyContent: "center",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: withAlpha("#68D7FF", 0.45),
  },
  sliderThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 18,
    marginLeft: -9,
    backgroundColor: withAlpha("#FFFFFF", 0.92),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.24),
  },
  sliderEnds: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderEndText: {
    color: withAlpha("#FFFFFF", 0.5),
    fontSize: 11,
    fontWeight: "800",
  },

  previewBox: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewLabel: {
    color: withAlpha("#FFFFFF", 0.58),
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  previewLine1: {
    marginTop: 6,
    color: withAlpha("#FFFFFF", 0.92),
    fontSize: 12,
    fontWeight: "900",
  },
  previewLine2: {
    marginTop: 4,
    color: withAlpha("#FFFFFF", 0.66),
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  errorPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FF5C6A", 0.28),
    backgroundColor: withAlpha("#FF5C6A", 0.12),
  },
  errorText: {
    color: withAlpha("#FF5C6A", 0.95),
    fontSize: 11,
    fontWeight: "900",
  },

  advancedToggle: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: withAlpha("#FFFFFF", 0.04),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  advancedText: {
    color: withAlpha("#FFFFFF", 0.86),
    fontWeight: "900",
    fontSize: 12,
  },

  advancedWrap: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
    backgroundColor: withAlpha("#FFFFFF", 0.04),
    padding: 12,
    overflow: "hidden",
  },

  field: {
    marginTop: 8,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    color: withAlpha("#FFFFFF", 0.92),
    fontWeight: "800",
  },

  primaryBtn: { flex: 1, borderRadius: 18, overflow: "hidden" },
  primaryInner: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.16),
  },
  primaryText: {
    color: withAlpha("#FFFFFF", 0.94),
    fontSize: 14,
    fontWeight: "900",
  },

  secondaryBtn: {
    width: 52,
    height: 48,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    alignItems: "center",
    justifyContent: "center",
  },

  loadingBlock: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  loadingText: {
    marginTop: 10,
    color: withAlpha("#FFFFFF", 0.62),
    fontWeight: "800",
  },

  resultCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    padding: 14,
    overflow: "hidden",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultTitle: {
    color: withAlpha("#FFFFFF", 0.92),
    fontSize: 14,
    fontWeight: "900",
  },
  resultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  resultPillText: {
    color: withAlpha("#FFFFFF", 0.82),
    fontWeight: "800",
    fontSize: 12,
  },

  rationale: {
    marginTop: 8,
    color: withAlpha("#FFFFFF", 0.62),
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  itemRowPicked: {
    backgroundColor: withAlpha("#68D7FF", 0.14),
    borderColor: withAlpha("#68D7FF", 0.28),
  },
  itemTitle: { color: withAlpha("#FFFFFF", 0.92), fontWeight: "900" },
  itemSub: {
    marginTop: 3,
    color: withAlpha("#FFFFFF", 0.6),
    fontSize: 12,
    fontWeight: "700",
  },

  pickDot: {
    width: 26,
    height: 26,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  pickDotOn: {
    backgroundColor: withAlpha("#FFFFFF", 0.92),
    borderColor: withAlpha("#FFFFFF", 0.92),
  },

  startAllBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.92),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  startAllText: { color: withAlpha("#111", 0.92), fontWeight: "900" },

  startSelBtn: {
    width: 150,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  startSelText: { color: withAlpha("#FFFFFF", 0.92), fontWeight: "900" },

  regenBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  regenText: { color: withAlpha("#FFFFFF", 0.9), fontWeight: "900" },

  clearBtn: {
    width: 110,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FF5C6A", 0.1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FF5C6A", 0.28),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  clearText: { color: withAlpha("#FF5C6A", 0.95), fontWeight: "900" },

  footerHint: {
    marginTop: 12,
    color: withAlpha("#FFFFFF", 0.5),
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
});
