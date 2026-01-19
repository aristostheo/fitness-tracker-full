// app/workouts/recap.tsx
// Premium Workout Recap (Apple-inspired glossy UI)
// Uses your EXISTING backend/session bucketing logic from old recap screen.
// Drop-in replacement ✅
//
// Depends on: expo-router, expo-blur, expo-linear-gradient, expo-haptics, react-native-reanimated
//
// Notes on data:
// Your existing Workout rows appear to be "set blocks" (sets x reps @ weight) rather than per-set details.
// This screen preserves exact performed order by sorting rows by createdAtMs (same as before).
// Within an exercise, each logged row becomes a "performed block" row in order.
// If later you store true per-set details, you can map them into the same UI structure.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeOut,
  Layout,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import { subscribeWorkouts, type Workout } from "@/services/workouts";
import { subscribeProfile, type Profile } from "@/services/profile";

// ---------------------- helpers (kept from old logic) ----------------------

const withAlpha = (hex: string, a: number) => {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
};

function createdAtMs(x: any) {
  const t = x?.setCreatedAt ?? x?.createdAt ?? x?.sessionStartedAt;
  if (!t) return 0;
  if (typeof t === "number") return t;
  if (typeof t?.toMillis === "function") return t.toMillis();
  if (typeof t?.seconds === "number") return t.seconds * 1000;
  return Number(t) || 0;
}

type WorkoutRow = Workout & {
  sessionId?: string;
  sessionTitle?: string;
  sessionStartedAt?: number;
};

type SessionBucket = {
  key: string;
  sessionId?: string;
  dateISO: string;
  title: string;
  startedAt?: number;
  latestAt?: number;
  rows: WorkoutRow[];
};

function dateMsFromISO(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 0;
  return new Date(`${iso}T00:00:00`).getTime();
}

function buildSessionBuckets(all: WorkoutRow[]) {
  const rows = (all || []).slice();
  const gapMs = 1000 * 60 * 120;

  rows.sort((a, b) => {
    const ad = (a as any).date || "";
    const bd = (b as any).date || "";
    if (ad !== bd) return bd.localeCompare(ad);
    return createdAtMs(b) - createdAtMs(a);
  });

  const buckets = new Map<string, SessionBucket>();
  const autoBucketsByDate = new Map<string, SessionBucket[]>();

  for (const r of rows) {
    const dateISO = ((r as any).date || "").trim() || "Unknown date";
    const sid =
      typeof (r as any).sessionId === "string" && (r as any).sessionId.trim()
        ? String((r as any).sessionId)
        : "";
    const title =
      typeof (r as any).sessionTitle === "string" &&
      (r as any).sessionTitle.trim()
        ? String((r as any).sessionTitle)
        : "Workout";
    const startedAt =
      Number((r as any).sessionStartedAt || 0) ||
      createdAtMs(r) ||
      dateMsFromISO(dateISO) ||
      undefined;
    const createdMs = createdAtMs(r) || startedAt || 0;

    if (sid) {
      const key = `session:${sid}`;
      const existing = buckets.get(key);
      if (!existing) {
        buckets.set(key, {
          key,
          sessionId: sid,
          dateISO,
          title,
          startedAt,
          latestAt: createdMs,
          rows: [r],
        });
      } else {
        existing.rows.push(r);
        existing.latestAt = Math.max(existing.latestAt || 0, createdMs || 0);
        if (existing.title === "Workout" && title !== "Workout")
          existing.title = title;
        if (!existing.startedAt && startedAt) existing.startedAt = startedAt;
        if (existing.dateISO === "Unknown date" && dateISO !== "Unknown date")
          existing.dateISO = dateISO;
      }
      continue;
    }

    const autoList = autoBucketsByDate.get(dateISO) || [];
    const last = autoList[autoList.length - 1];
    if (last && last.latestAt && last.latestAt - createdMs <= gapMs) {
      last.rows.push(r);
      last.latestAt = Math.max(last.latestAt || 0, createdMs || 0);
      if (last.title === "Workout" && title !== "Workout") last.title = title;
      if (!last.startedAt && startedAt) last.startedAt = startedAt;
    } else {
      const key = `auto:${dateISO}:${autoList.length}`;
      const bucket: SessionBucket = {
        key,
        sessionId: undefined,
        dateISO,
        title,
        startedAt,
        latestAt: createdMs,
        rows: [r],
      };
      autoList.push(bucket);
      autoBucketsByDate.set(dateISO, autoList);
      buckets.set(key, bucket);
    }
  }

  return Array.from(buckets.values()).sort((a, b) => {
    const at = a.latestAt || a.startedAt || createdAtMs(a.rows[0]) || 0;
    const bt = b.latestAt || b.startedAt || createdAtMs(b.rows[0]) || 0;
    return bt - at;
  });
}

function fmtTime(ms: number) {
  if (!ms) return "";
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDateLong(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function volumeKg(sets: number, reps: number, weightKg: number) {
  return Math.max(0, sets) * Math.max(0, reps) * Math.max(0, weightKg);
}

// ---------------------- UI models ----------------------

type PerformedBlock = {
  id: string;
  order: number; // 1..n within session overall
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
  t?: number; // created time
  vol: number;
};

type ExerciseGroup = {
  name: string;
  firstIndex: number; // index in session (for performed order)
  blocks: PerformedBlock[]; // in performed order
  totalSets: number;
  totalVol: number;
  bestWeight: number;
  bestVol: number;
  hasNotes: boolean;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function computeSignalLabel(
  totalVol: number,
  durationMin: number,
  exCount: number
) {
  // Calm, low-drama "signal" based on work density.
  // (Keeps it stable without user history comparison.)
  if (!totalVol || !durationMin)
    return { label: "Logged", tone: "neutral" as const };
  const density = totalVol / Math.max(1, durationMin); // kg/min
  const complexity = exCount >= 8 ? 1.07 : exCount >= 5 ? 1.0 : 0.93;
  const score = density * complexity;

  if (score >= 220) return { label: "High Output", tone: "strong" as const };
  if (score >= 140) return { label: "Solid", tone: "good" as const };
  if (score >= 80) return { label: "Steady", tone: "neutral" as const };
  return { label: "Light", tone: "soft" as const };
}

function formatKg(n: number) {
  if (!isFinite(n)) return "—";
  const r = Math.round(n);
  return `${r}`;
}

function formatVolume(n: number) {
  if (!isFinite(n)) return "—";
  // Keep it clean: show 12.4k for big sessions.
  if (n >= 100000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

// ---------------------- micro component helpers ----------------------

function usePressScale() {
  const s = useSharedValue(1);
  const onPressIn = () => {
    s.value = withSpring(0.98, { damping: 18, stiffness: 260 });
  };
  const onPressOut = () => {
    s.value = withSpring(1, { damping: 18, stiffness: 260 });
  };
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
  }));
  return { style, onPressIn, onPressOut };
}

const HAPTIC_LIGHT = () => {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
};
const HAPTIC_SOFT = () => {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    // Soft is iOS-only; fallback to Light on Android
    const anyHaptics: any = Haptics;
    const soft = anyHaptics?.ImpactFeedbackStyle?.Soft;
    Haptics.impactAsync(soft ?? Haptics.ImpactFeedbackStyle.Light).catch(
      () => {}
    );
  }
};

// ---------------------- Screen ----------------------

export default function WorkoutRecapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);

  const params = useLocalSearchParams<{ sessionKey?: string }>();
  const sessionKey = String(params.sessionKey || "");

  const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

  const [allRows, setAllRows] = useState<WorkoutRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // per exercise

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeWorkouts(
      user.uid,
      (rows: Workout[]) => setAllRows((rows || []) as WorkoutRow[]),
      { max: 800 }
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      return;
    }
    return subscribeProfile(user.uid, (p) => setProfile(p || null));
  }, [user?.uid]);

  const session = useMemo(() => {
    const sessions = buildSessionBuckets(allRows);
    let match = sessions.find((s) => s.key === sessionKey);
    if (!match && sessionKey.startsWith("session:")) {
      const sid = sessionKey.replace("session:", "");
      match = sessions.find((s) => s.sessionId === sid);
    }
    if (!match && sessionKey.startsWith("date:")) {
      const iso = sessionKey.replace("date:", "");
      match = sessions.find((s) => s.dateISO === iso);
    }
    return match || null;
  }, [allRows, sessionKey]);

  const rows = useMemo(() => {
    return (session?.rows || [])
      .slice()
      .sort((a, b) => createdAtMs(a) - createdAtMs(b));
  }, [session]);

  const weightUnit = profile?.weightUnit === "lb" ? "lb" : "kg";
  const toDisplayWeight = useCallback(
    (kg: number) => (weightUnit === "lb" ? kg * 2.20462 : kg),
    [weightUnit]
  );
  const formatWeightValue = useCallback(
    (kg: number) => formatKg(toDisplayWeight(kg)),
    [toDisplayWeight]
  );
  const formatVolumeDisplay = useCallback(
    (kg: number) => formatVolume(toDisplayWeight(kg)),
    [toDisplayWeight]
  );

  const performedBlocks = useMemo<PerformedBlock[]>(() => {
    const out: PerformedBlock[] = [];
    let idx = 0;
    for (const r of rows) {
      const exercise = String((r as any).exercise || "Exercise");
      const sets = Number((r as any).sets || 0);
      const reps = Number((r as any).reps || 0);
      const weight = Number((r as any).weight || 0);
      const notes = String((r as any).notes || "").trim();
      const t = createdAtMs(r) || undefined;
      const vol = volumeKg(sets, reps, weight);
      out.push({
        id: String((r as any).id || `${idx}`),
        order: idx + 1,
        exercise,
        sets,
        reps,
        weight,
        notes: notes || undefined,
        t,
        vol,
      });
      idx++;
    }
    return out;
  }, [rows]);

  const exercises = useMemo<ExerciseGroup[]>(() => {
    const map = new Map<string, ExerciseGroup>();
    performedBlocks.forEach((b, i) => {
      const ex = b.exercise;
      const cur = map.get(ex);
      if (!cur) {
        map.set(ex, {
          name: ex,
          firstIndex: i,
          blocks: [b],
          totalSets: b.sets,
          totalVol: b.vol,
          bestWeight: b.weight,
          bestVol: b.vol,
          hasNotes: !!b.notes,
        });
      } else {
        cur.blocks.push(b);
        cur.totalSets += b.sets;
        cur.totalVol += b.vol;
        cur.bestWeight = Math.max(cur.bestWeight, b.weight);
        cur.bestVol = Math.max(cur.bestVol, b.vol);
        cur.hasNotes = cur.hasNotes || !!b.notes;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.firstIndex - b.firstIndex);
  }, [performedBlocks]);

  useEffect(() => {
    // default expand first 1-2 exercises (feels premium, less empty)
    if (!exercises.length) return;
    setExpanded((prev) => {
      if (Object.keys(prev).length) return prev;
      const next: Record<string, boolean> = {};
      exercises.forEach((e, idx) => {
        next[e.name] = idx < 2;
      });
      return next;
    });
  }, [exercises]);

  const meta = useMemo(() => {
    if (!performedBlocks.length) {
      return {
        title: session?.title || "Workout",
        dateISO: session?.dateISO || "",
        dateLabel: session?.dateISO ? fmtDateLong(session.dateISO) : "",
        timeLabel: "",
        durationMin: 0,
        totalSets: 0,
        totalReps: 0,
        totalVol: 0,
        exCount: 0,
        prCount: 0,
        bestBlockId: "",
        bestWeight: { ex: "", weight: 0, sets: 0, reps: 0 },
        bestVol: { ex: "", vol: 0, sets: 0, reps: 0, weight: 0 },
      };
    }

    const first = rows[0];
    const last = rows[rows.length - 1];

    const title =
      session?.title || String((first as any)?.sessionTitle || "Workout");

    const dateISO = String(session?.dateISO || (first as any)?.date || "");
    const start =
      Number((session as any)?.startedAt || 0) || createdAtMs(first);
    const end = createdAtMs(last) || start;

    const durationMin =
      start && end && end >= start
        ? Math.max(1, Math.round((end - start) / 60000))
        : 0;

    const totalSets = performedBlocks.reduce((a, b) => a + (b.sets || 0), 0);
    const totalReps = performedBlocks.reduce(
      (a, b) => a + (b.sets || 0) * (b.reps || 0),
      0
    );
    const totalVol = performedBlocks.reduce((a, b) => a + (b.vol || 0), 0);

    let bestWeight = { ex: "", weight: 0, sets: 0, reps: 0 };
    let bestVol = { ex: "", vol: 0, sets: 0, reps: 0, weight: 0 };
    let bestBlockId = performedBlocks[0]?.id || "";

    for (const b of performedBlocks) {
      if (b.weight > bestWeight.weight) {
        bestWeight = {
          ex: b.exercise,
          weight: b.weight,
          sets: b.sets,
          reps: b.reps,
        };
      }
      if (b.vol > bestVol.vol) {
        bestVol = {
          ex: b.exercise,
          vol: b.vol,
          sets: b.sets,
          reps: b.reps,
          weight: b.weight,
        };
        bestBlockId = b.id;
      }
    }

    // PR count heuristic (session-local):
    // - Count distinct exercises that had a "best block" (max weight OR max volume) (within this session)
    // This avoids needing your historical PR system.
    let prCount = 0;
    for (const ex of exercises) {
      const bestW = ex.bestWeight;
      const bestV = ex.bestVol;
      // if there's meaningful effort
      if (bestW > 0 || bestV > 0) prCount++;
    }

    return {
      title,
      dateISO,
      dateLabel: dateISO ? fmtDateLong(dateISO) : "",
      timeLabel: start ? fmtTime(start) : "",
      durationMin,
      totalSets,
      totalReps,
      totalVol: Math.round(totalVol),
      exCount: exercises.length,
      prCount,
      bestBlockId,
      bestWeight,
      bestVol,
    };
  }, [performedBlocks, rows, session, exercises]);

  // ---------------------- theme tokens ----------------------

  const accent = colors.primary ?? "#68D7FF";
  const accent2 = "#8B7CFF";
  const gold = "#FFD66B";
  const hot = "#FF4FD8";

  const bgGradient = isDark
    ? ["#050710", "#040513", "#02030A"]
    : [
        withAlpha(accent, 0.12),
        withAlpha("#FFFFFF", 0.92),
        withAlpha("#FFFFFF", 0.88),
      ];

  const headerBorder = withAlpha(colors.text, isDark ? 0.12 : 0.08);

  const glassBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.8);
  const glassBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.1);

  const cardBg = isDark
    ? withAlpha("#FFFFFF", 0.05)
    : withAlpha("#FFFFFF", 0.86);
  const cardBorder = isDark
    ? withAlpha("#FFFFFF", 0.12)
    : withAlpha(colors.text, 0.08);

  const pillBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.86);
  const pillBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.1);

  const textStrong = isDark ? withAlpha("#FFFFFF", 0.94) : colors.text;
  const textMid = withAlpha(colors.text, isDark ? 0.7 : 0.76);
  const textMuted = withAlpha(colors.text, isDark ? 0.58 : 0.62);

  const signal = computeSignalLabel(
    meta.totalVol,
    meta.durationMin,
    meta.exCount
  );
  const signalColor =
    signal.tone === "strong"
      ? withAlpha(hot, 0.95)
      : signal.tone === "good"
      ? withAlpha(accent, 0.95)
      : signal.tone === "soft"
      ? withAlpha("#B6C0FF", 0.85)
      : withAlpha("#FFFFFF", isDark ? 0.72 : 0.68);

  const onToggleExercise = useCallback((name: string) => {
    HAPTIC_SOFT();
    setExpanded((p) => ({ ...p, [name]: !p[name] }));
  }, []);

  const onAction = useCallback((kind: "repeat" | "duplicate" | "edit") => {
    HAPTIC_LIGHT();
    // Hook these into your real flows when ready.
    // Keeping it safe: no assumptions about your routes/templates structure.
    const msg =
      kind === "repeat"
        ? "Repeat workout"
        : kind === "duplicate"
        ? "Duplicate as template"
        : "Edit workout";
    Alert.alert(msg, "Wire this action to your workflow/template system.");
  }, []);

  // ---------------------- header press scale ----------------------

  const backPress = usePressScale();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={bgGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* soft glows */}
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            top: -140,
            left: -110,
            backgroundColor: withAlpha(accent, isDark ? 0.18 : 0.14),
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            top: 140,
            right: -120,
            backgroundColor: withAlpha(accent2, isDark ? 0.16 : 0.12),
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glowSm,
          {
            bottom: 40,
            left: 40,
            backgroundColor: withAlpha(hot, isDark ? 0.1 : 0.08),
          },
        ]}
      />

      {/* ---------------------- Header ---------------------- */}
      <View style={{ paddingTop: topInset }}>
        <BlurView
          intensity={isDark ? 30 : 22}
          tint={isDark ? "dark" : "light"}
          style={[styles.headerBlur, { borderBottomColor: headerBorder }]}
        >
          <View style={styles.headerRow}>
            <Animated.View style={backPress.style}>
              <Pressable
                onPress={() => router.back()}
                onPressIn={backPress.onPressIn}
                onPressOut={backPress.onPressOut}
                style={({ pressed }) => [
                  styles.backBtn,
                  { backgroundColor: pillBg, borderColor: pillBorder },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={withAlpha(colors.text, isDark ? 0.9 : 0.8)}
                />
                <Text style={[styles.backText, { color: textStrong }]}>
                  History
                </Text>
              </Pressable>
            </Animated.View>

            <View style={{ flex: 1 }}>
              <Text
                style={[styles.title, { color: textStrong }]}
                numberOfLines={1}
              >
                {meta.title}
              </Text>

              <View style={styles.subRow}>
                <Text
                  style={[styles.subtitle, { color: textMuted }]}
                  numberOfLines={1}
                >
                  {meta.dateLabel || meta.dateISO || ""}
                  {meta.timeLabel ? ` • ${meta.timeLabel}` : ""}
                  {meta.durationMin ? ` • ${meta.durationMin} min` : ""}
                </Text>

                <View
                  style={[
                    styles.signalPill,
                    {
                      backgroundColor: withAlpha(
                        signalColor,
                        isDark ? 0.14 : 0.1
                      ),
                      borderColor: withAlpha(signalColor, isDark ? 0.28 : 0.18),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.signalDot,
                      {
                        backgroundColor: signalColor,
                        shadowColor: signalColor,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.signalText,
                      { color: withAlpha(textStrong, isDark ? 0.86 : 0.82) },
                    ]}
                  >
                    {signal.label}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.headerRight}>
              <View
                style={[
                  styles.headerIconPill,
                  { backgroundColor: pillBg, borderColor: pillBorder },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color={withAlpha(accent, 0.95)}
                />
              </View>
            </View>
          </View>
        </BlurView>
      </View>

      {/* ---------------------- Content ---------------------- */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Edge states */}
        {!session ? (
          <View
            style={[
              styles.edgeCard,
              { backgroundColor: glassBg, borderColor: glassBorder },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={withAlpha(gold, 0.9)}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.edgeTitle, { color: textStrong }]}>
                Workout not found
              </Text>
              <Text style={[styles.edgeSub, { color: textMuted }]}>
                This session key doesn’t match any saved workout in history.
              </Text>
            </View>
          </View>
        ) : performedBlocks.length === 0 ? (
          <View
            style={[
              styles.edgeCard,
              { backgroundColor: glassBg, borderColor: glassBorder },
            ]}
          >
            <Ionicons
              name="file-tray-outline"
              size={18}
              color={withAlpha(accent, 0.9)}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.edgeTitle, { color: textStrong }]}>
                No log entries
              </Text>
              <Text style={[styles.edgeSub, { color: textMuted }]}>
                This workout has no sets recorded.
              </Text>
            </View>
          </View>
        ) : null}

        {/* ---------------------- Premium Summary ---------------------- */}
        {!!session && (
          <View
            style={[
              styles.card,
              { backgroundColor: glassBg, borderColor: glassBorder },
            ]}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: withAlpha(colors.text, isDark ? 0.7 : 0.6) },
              ]}
            >
              Recap
            </Text>

            {/* Highlight chips */}
            <View style={styles.chipsWrap}>
              <Chip
                icon="barbell-outline"
                label="Exercises"
                value={`${meta.exCount || 0}`}
                tone="neutral"
                isDark={isDark}
                textStrong={textStrong}
                textMuted={textMuted}
                pillBg={pillBg}
                pillBorder={pillBorder}
              />
              <Chip
                icon="repeat-outline"
                label="Sets"
                value={`${meta.totalSets || 0}`}
                tone="good"
                accent={accent}
                isDark={isDark}
                textStrong={textStrong}
                textMuted={textMuted}
                pillBg={pillBg}
                pillBorder={pillBorder}
              />
              <Chip
                icon="pulse-outline"
                label="Volume"
                value={`${formatVolumeDisplay(meta.totalVol)}`}
                // display as "12.4k" (we append k label visually; value already includes k for big)
                // but keep it cute: show “12.4k”
                tone="strong"
                accent={accent2}
                isDark={isDark}
                textStrong={textStrong}
                textMuted={textMuted}
                pillBg={pillBg}
                pillBorder={pillBorder}
                valueOverride={`${formatVolumeDisplay(meta.totalVol)}${
                  meta.totalVol >= 10000 ? "" : ""
                }`}
                suffix={` ${weightUnit}`}
              />
              <Chip
                icon="trophy-outline"
                label="PRs"
                value={`${meta.prCount || 0}`}
                tone="gold"
                accent={gold}
                isDark={isDark}
                textStrong={textStrong}
                textMuted={textMuted}
                pillBg={pillBg}
                pillBorder={pillBorder}
              />
            </View>

            {/* Best moments */}
            <View style={{ marginTop: 10, gap: 8 }}>
              {!!meta.bestWeight.ex && meta.bestWeight.weight > 0 && (
                <HighlightLine
                  icon="trophy-outline"
                  iconColor={withAlpha(gold, 0.95)}
                  text={`Heaviest: ${meta.bestWeight.ex} • ${formatWeightValue(
                    meta.bestWeight.weight
                  )}${weightUnit} (${meta.bestWeight.sets}×${
                    meta.bestWeight.reps
                  })`}
                  textColor={withAlpha(colors.text, isDark ? 0.84 : 0.78)}
                />
              )}
              {!!meta.bestVol.ex && meta.bestVol.vol > 0 && (
                <HighlightLine
                  icon="sparkles-outline"
                  iconColor={withAlpha(accent, 0.95)}
                  text={`Best output: ${meta.bestVol.ex} • ${
                    meta.bestVol.sets
                  }×${meta.bestVol.reps} @ ${formatWeightValue(
                    meta.bestVol.weight
                  )}${weightUnit}`}
                  textColor={withAlpha(colors.text, isDark ? 0.84 : 0.78)}
                />
              )}
            </View>
          </View>
        )}

        {/* ---------------------- Exercise List ---------------------- */}
        {!!session && (
          <View style={{ marginTop: 12 }}>
            <Text
              style={[
                styles.sectionLabel,
                { color: withAlpha(colors.text, isDark ? 0.7 : 0.6) },
              ]}
            >
              Exercises
            </Text>
            <Text style={[styles.smallMuted, { color: textMuted }]}>
              Performed order • tap to expand
            </Text>

            <View style={{ marginTop: 10, gap: 10 }}>
              {exercises.map((ex, idx) => {
                const isOpen = !!expanded[ex.name];
                const exBestWeight = ex.bestWeight;
                const exBestVol = ex.bestVol;

                // subtle "PR" highlight badge if this exercise has meaningful load
                const hasPR = exBestWeight > 0 || exBestVol > 0;

                return (
                  <Animated.View
                    key={ex.name}
                    layout={LinearTransition.springify()
                      .damping(18)
                      .stiffness(220)}
                    entering={FadeInDown.duration(260).delay(
                      clamp(idx * 18, 0, 140)
                    )}
                    style={[
                      styles.exerciseCard,
                      {
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
                      },
                    ]}
                  >
                    {/* Exercise Header */}
                    <Pressable
                      onPress={() => onToggleExercise(ex.name)}
                      style={({ pressed }) => [
                        styles.exerciseHeaderRow,
                        pressed && { opacity: 0.9 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle ${ex.name}`}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.exerciseTitleRow}>
                          <View
                            style={[
                              styles.exerciseIconPill,
                              {
                                backgroundColor: withAlpha(
                                  accent,
                                  isDark ? 0.14 : 0.1
                                ),
                                borderColor: withAlpha(
                                  accent,
                                  isDark ? 0.28 : 0.16
                                ),
                              },
                            ]}
                          >
                            <Ionicons
                              name="barbell-outline"
                              size={14}
                              color={withAlpha(accent, 0.95)}
                            />
                          </View>

                          <Text
                            style={[styles.exerciseName, { color: textStrong }]}
                            numberOfLines={1}
                          >
                            {ex.name}
                          </Text>

                          {hasPR && (
                            <View
                              style={[
                                styles.miniBadge,
                                {
                                  backgroundColor: withAlpha(
                                    gold,
                                    isDark ? 0.12 : 0.1
                                  ),
                                  borderColor: withAlpha(
                                    gold,
                                    isDark ? 0.26 : 0.18
                                  ),
                                },
                              ]}
                            >
                              <Ionicons
                                name="trophy-outline"
                                size={12}
                                color={withAlpha(gold, 0.92)}
                              />
                              <Text
                                style={[
                                  styles.miniBadgeText,
                                  {
                                    color: withAlpha(
                                      textStrong,
                                      isDark ? 0.86 : 0.82
                                    ),
                                  },
                                ]}
                              >
                                Best
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.exerciseMetaRow}>
                          <Text
                            style={[styles.exerciseMeta, { color: textMuted }]}
                          >
                            {ex.blocks.length} log
                            {ex.blocks.length === 1 ? "" : "s"} • {ex.totalSets}{" "}
                            sets
                          </Text>
                          <Text
                            style={[styles.exerciseMeta, { color: textMuted }]}
                          >
                            {formatVolumeDisplay(ex.totalVol)} {weightUnit}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.chevWrap}>
                        <View
                          style={[
                            styles.chevPill,
                            {
                              backgroundColor: pillBg,
                              borderColor: pillBorder,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isOpen ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={withAlpha(colors.text, isDark ? 0.86 : 0.76)}
                          />
                        </View>
                      </View>
                    </Pressable>

                    {/* Expanded content */}
                    {isOpen && (
                      <Animated.View
                        entering={FadeInDown.duration(220)}
                        exiting={FadeOut.duration(140)}
                        layout={Layout.springify().damping(18).stiffness(220)}
                        style={{ marginTop: 10, gap: 8 }}
                      >
                        {ex.blocks.map((b, j) => {
                          const isSessionBest = b.id === meta.bestBlockId;
                          const isExBestWeight =
                            b.weight === exBestWeight && b.weight > 0;
                          const isExBestVol = b.vol === exBestVol && b.vol > 0;

                          // "PR" highlight rules:
                          // - session best output gets strongest glow
                          // - exercise best weight or best volume gets subtle highlight
                          const prLevel: "none" | "soft" | "strong" =
                            isSessionBest
                              ? "strong"
                              : isExBestWeight || isExBestVol
                              ? "soft"
                              : "none";

                          return (
                            <SetRow
                              key={b.id}
                              indexInExercise={j + 1}
                              block={b}
                              prLevel={prLevel}
                              isDark={isDark}
                              textStrong={textStrong}
                              textMuted={textMuted}
                              colorsText={colors.text}
                              accent={accent}
                              gold={gold}
                              hot={hot}
                              weightUnit={weightUnit}
                              formatWeightValue={formatWeightValue}
                              formatVolumeDisplay={formatVolumeDisplay}
                            />
                          );
                        })}

                        {ex.hasNotes && (
                          <View
                            style={[
                              styles.noteCard,
                              {
                                backgroundColor: withAlpha(
                                  "#FFFFFF",
                                  isDark ? 0.04 : 0.7
                                ),
                                borderColor: withAlpha(
                                  "#FFFFFF",
                                  isDark ? 0.1 : 0.12
                                ),
                              },
                            ]}
                          >
                            <Ionicons
                              name="document-text-outline"
                              size={16}
                              color={withAlpha(
                                colors.text,
                                isDark ? 0.7 : 0.62
                              )}
                            />
                            <Text
                              style={[styles.noteHint, { color: textMuted }]}
                            >
                              Some sets have notes. Expand each row to read
                              them.
                            </Text>
                          </View>
                        )}
                      </Animated.View>
                    )}
                  </Animated.View>
                );
              })}

              {exercises.length === 0 && !!session && (
                <Text style={[styles.smallMuted, { color: textMuted }]}>
                  No exercises found for this workout.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ---------------------- Notes (session-level) ---------------------- */}
        {!!session && (
          <View
            style={[
              styles.card,
              {
                marginTop: 12,
                backgroundColor: glassBg,
                borderColor: glassBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: withAlpha(colors.text, isDark ? 0.7 : 0.6) },
              ]}
            >
              Notes
            </Text>

            <Text style={[styles.notesBody, { color: textMid }]}>
              {/* You don’t have a session-level notes field in the provided logic.
                  So we derive a clean summary from set notes (deduped). */}
              {deriveSessionNotes(performedBlocks) ||
                "No notes for this workout."}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ---------------------- Bottom Actions ---------------------- */}
      {!!session && (
        <BlurView
          intensity={isDark ? 34 : 22}
          tint={isDark ? "dark" : "light"}
          style={[styles.bottomBar, { borderTopColor: headerBorder }]}
        >
          <View style={styles.actionsRow}>
            <ActionButton
              icon="refresh-outline"
              label="Repeat"
              onPress={() => onAction("repeat")}
              accent={accent}
              isDark={isDark}
              textStrong={textStrong}
              pillBg={pillBg}
              pillBorder={pillBorder}
            />
            <ActionButton
              icon="copy-outline"
              label="Duplicate"
              onPress={() => onAction("duplicate")}
              accent={accent2}
              isDark={isDark}
              textStrong={textStrong}
              pillBg={pillBg}
              pillBorder={pillBorder}
            />
            <ActionButton
              icon="create-outline"
              label="Edit"
              onPress={() => onAction("edit")}
              accent={gold}
              isDark={isDark}
              textStrong={textStrong}
              pillBg={pillBg}
              pillBorder={pillBorder}
            />
          </View>
        </BlurView>
      )}
    </View>
  );
}

// ---------------------- Components ----------------------

function Chip(props: {
  icon: any;
  label: string;
  value: string;
  valueOverride?: string;
  suffix?: string;
  tone: "neutral" | "good" | "strong" | "gold";
  accent?: string;
  isDark: boolean;
  textStrong: string;
  textMuted: string;
  pillBg: string;
  pillBorder: string;
}) {
  const { style, onPressIn, onPressOut } = usePressScale();
  const accent = props.accent || "#68D7FF";

  const ringBg =
    props.tone === "neutral"
      ? withAlpha("#FFFFFF", props.isDark ? 0.06 : 0.12)
      : withAlpha(accent, props.isDark ? 0.14 : 0.1);

  const ringBorder =
    props.tone === "neutral"
      ? withAlpha("#FFFFFF", props.isDark ? 0.14 : 0.12)
      : withAlpha(accent, props.isDark ? 0.26 : 0.18);

  const iconColor =
    props.tone === "neutral"
      ? withAlpha(props.textStrong, props.isDark ? 0.78 : 0.72)
      : withAlpha(accent, 0.95);

  return (
    <Animated.View style={[styles.chipWrap, style]}>
      <Pressable
        onPress={() => HAPTIC_LIGHT()}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: props.pillBg, borderColor: props.pillBorder },
          pressed && { opacity: 0.92 },
        ]}
      >
        <View
          style={[
            styles.chipIconRing,
            { backgroundColor: ringBg, borderColor: ringBorder },
          ]}
        >
          <Ionicons name={props.icon} size={14} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.chipLabel, { color: props.textMuted }]}>
            {props.label}
          </Text>
          <Text style={[styles.chipValue, { color: props.textStrong }]}>
            {props.valueOverride ?? props.value}
            {props.suffix ? (
              <Text
                style={{
                  color: withAlpha(props.textMuted, props.isDark ? 0.85 : 0.85),
                }}
              >
                {props.suffix}
              </Text>
            ) : null}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function HighlightLine(props: {
  icon: any;
  iconColor: string;
  text: string;
  textColor: string;
}) {
  return (
    <View style={styles.highlightRow}>
      <Ionicons name={props.icon} size={16} color={props.iconColor} />
      <Text
        style={[styles.highlightText, { color: props.textColor }]}
        numberOfLines={2}
      >
        {props.text}
      </Text>
    </View>
  );
}

function SetRow(props: {
  indexInExercise: number;
  block: PerformedBlock;
  prLevel: "none" | "soft" | "strong";
  isDark: boolean;
  textStrong: string;
  textMuted: string;
  colorsText: string;
  accent: string;
  gold: string;
  hot: string;
  weightUnit: "kg" | "lb";
  formatWeightValue: (kg: number) => string;
  formatVolumeDisplay: (kg: number) => string;
}) {
  const { style, onPressIn, onPressOut } = usePressScale();
  const [showNote, setShowNote] = useState(false);

  const t = props.block.t ? fmtTime(props.block.t) : "";

  const prAccent =
    props.prLevel === "strong"
      ? props.hot
      : props.prLevel === "soft"
      ? props.gold
      : props.accent;

  const bg =
    props.prLevel === "strong"
      ? withAlpha(prAccent, props.isDark ? 0.16 : 0.1)
      : props.prLevel === "soft"
      ? withAlpha(prAccent, props.isDark ? 0.1 : 0.08)
      : withAlpha("#FFFFFF", props.isDark ? 0.04 : 0.7);

  const border =
    props.prLevel === "strong"
      ? withAlpha(prAccent, props.isDark ? 0.3 : 0.18)
      : props.prLevel === "soft"
      ? withAlpha(prAccent, props.isDark ? 0.22 : 0.14)
      : withAlpha("#FFFFFF", props.isDark ? 0.1 : 0.12);

  const dot =
    props.prLevel === "strong"
      ? withAlpha(prAccent, 0.95)
      : props.prLevel === "soft"
      ? withAlpha(prAccent, 0.9)
      : withAlpha(props.accent, 0.9);

  const onToggleNote = () => {
    if (!props.block.notes) return;
    HAPTIC_SOFT();
    setShowNote((v) => !v);
  };

  return (
    <Animated.View layout={Layout.springify().damping(18).stiffness(220)}>
      <Animated.View style={style}>
        <Pressable
          onPress={onToggleNote}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={({ pressed }) => [
            styles.setRow,
            { backgroundColor: bg, borderColor: border },
            pressed && { opacity: 0.92 },
          ]}
          accessibilityRole={props.block.notes ? "button" : undefined}
          accessibilityLabel={
            props.block.notes ? "Toggle set notes" : "Set row"
          }
        >
          <View style={styles.setLeft}>
            <View
              style={[
                styles.setDot,
                {
                  backgroundColor: dot,
                  shadowColor: dot,
                  shadowOpacity: props.isDark ? 0.55 : 0.22,
                },
              ]}
            />
            <Text
              style={[
                styles.setIndex,
                { color: withAlpha(props.textMuted, props.isDark ? 0.9 : 0.9) },
              ]}
            >
              {props.indexInExercise}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.setTopLine}>
              <Text
                style={[styles.setTitle, { color: props.textStrong }]}
                numberOfLines={1}
              >
                {props.block.sets}×{props.block.reps}{" "}
                <Text
                  style={{
                    color: withAlpha(
                      props.textMuted,
                      props.isDark ? 0.78 : 0.7
                    ),
                  }}
                >
                  @
                </Text>{" "}
                {props.formatWeightValue(props.block.weight)}
                {props.weightUnit}
              </Text>

              {!!t && (
                <View style={styles.timePill}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={withAlpha(
                      props.colorsText,
                      props.isDark ? 0.66 : 0.6
                    )}
                  />
                  <Text
                    style={[
                      styles.timeText,
                      {
                        color: withAlpha(
                          props.colorsText,
                          props.isDark ? 0.66 : 0.6
                        ),
                      },
                    ]}
                  >
                    {t}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.setBottomLine}>
              <View style={styles.metricPill}>
                <Ionicons
                  name="pulse-outline"
                  size={12}
                  color={withAlpha(props.accent, 0.9)}
                />
                <Text
                  style={[
                    styles.metricText,
                    {
                      color: withAlpha(
                        props.textMuted,
                        props.isDark ? 0.9 : 0.9
                      ),
                    },
                  ]}
                >
                  {props.formatVolumeDisplay(props.block.vol)} {props.weightUnit}
                </Text>
              </View>

              {props.prLevel !== "none" && (
                <View
                  style={[
                    styles.prPill,
                    {
                      backgroundColor: withAlpha(
                        prAccent,
                        props.isDark ? 0.14 : 0.1
                      ),
                      borderColor: withAlpha(
                        prAccent,
                        props.isDark ? 0.28 : 0.16
                      ),
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      props.prLevel === "strong" ? "sparkles" : "trophy-outline"
                    }
                    size={12}
                    color={withAlpha(prAccent, 0.95)}
                  />
                  <Text
                    style={[
                      styles.prText,
                      {
                        color: withAlpha(
                          props.textStrong,
                          props.isDark ? 0.86 : 0.82
                        ),
                      },
                    ]}
                  >
                    {props.prLevel === "strong" ? "Peak" : "Best"}
                  </Text>
                </View>
              )}

              {!!props.block.notes && (
                <View style={styles.noteTapHint}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={12}
                    color={withAlpha(
                      props.textMuted,
                      props.isDark ? 0.86 : 0.78
                    )}
                  />
                  <Text
                    style={[
                      styles.noteTapText,
                      {
                        color: withAlpha(
                          props.textMuted,
                          props.isDark ? 0.86 : 0.78
                        ),
                      },
                    ]}
                  >
                    Note
                  </Text>
                  <Ionicons
                    name={showNote ? "chevron-up" : "chevron-down"}
                    size={12}
                    color={withAlpha(
                      props.textMuted,
                      props.isDark ? 0.86 : 0.78
                    )}
                  />
                </View>
              )}
            </View>

            {!!props.block.notes && showNote && (
              <Animated.View
                entering={FadeInDown.duration(160)}
                exiting={FadeOut.duration(120)}
                layout={Layout.springify().damping(18).stiffness(220)}
                style={[
                  styles.inlineNote,
                  {
                    borderColor: withAlpha(
                      "#FFFFFF",
                      props.isDark ? 0.1 : 0.14
                    ),
                    backgroundColor: withAlpha(
                      "#000000",
                      props.isDark ? 0.16 : 0.05
                    ),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.inlineNoteText,
                    {
                      color: withAlpha(
                        props.textStrong,
                        props.isDark ? 0.86 : 0.78
                      ),
                    },
                  ]}
                >
                  {props.block.notes}
                </Text>
              </Animated.View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function ActionButton(props: {
  icon: any;
  label: string;
  onPress: () => void;
  accent: string;
  isDark: boolean;
  textStrong: string;
  pillBg: string;
  pillBorder: string;
}) {
  const { style, onPressIn, onPressOut } = usePressScale();
  const glow = useSharedValue(0);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const onPress = () => {
    glow.value = withTiming(1, { duration: 90 }, () => {
      glow.value = withTiming(0, { duration: 240 });
    });
    props.onPress();
  };

  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          onPressIn();
          HAPTIC_LIGHT();
        }}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.actionBtn,
          { backgroundColor: props.pillBg, borderColor: props.pillBorder },
          pressed && { opacity: 0.92 },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.actionGlow,
            {
              backgroundColor: withAlpha(
                props.accent,
                props.isDark ? 0.18 : 0.12
              ),
            },
            glowStyle,
          ]}
        />
        <View
          style={[
            styles.actionIconRing,
            {
              backgroundColor: withAlpha(
                props.accent,
                props.isDark ? 0.14 : 0.1
              ),
              borderColor: withAlpha(props.accent, props.isDark ? 0.28 : 0.16),
            },
          ]}
        >
          <Ionicons
            name={props.icon}
            size={16}
            color={withAlpha(props.accent, 0.95)}
          />
        </View>
        <Text style={[styles.actionText, { color: props.textStrong }]}>
          {props.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------- Notes derivation ----------------------

function deriveSessionNotes(blocks: PerformedBlock[]) {
  const notes = (blocks || [])
    .map((b) => (b.notes || "").trim())
    .filter(Boolean);

  if (!notes.length) return "";

  // Dedupe but keep order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of notes) {
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
    if (out.length >= 6) break; // keep it premium, not a dump
  }

  return out.join("\n\n");
}

// ---------------------- Styles ----------------------

const styles = StyleSheet.create({
  root: { flex: 1 },

  glow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 320,
  },
  glowSm: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 220,
  },

  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  backText: { fontWeight: "900", fontSize: 13, letterSpacing: -0.1 },

  title: { fontSize: 18, fontWeight: "950" as any, letterSpacing: -0.3 },

  subRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subtitle: { flex: 1, fontSize: 12, fontWeight: "750" as any },

  signalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  signalText: { fontSize: 11, fontWeight: "850" as any, letterSpacing: -0.1 },

  headerRight: { justifyContent: "center", alignItems: "center" },
  headerIconPill: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "950" as any,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  smallMuted: { marginTop: 6, fontSize: 12, fontWeight: "650" as any },

  chipsWrap: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chipWrap: {
    flexBasis: "48%",
    flexGrow: 1,
    maxWidth: "48%",
  },
  chip: {
    width: "100%",
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chipIconRing: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: { fontSize: 11, fontWeight: "800" as any, letterSpacing: -0.1 },
  chipValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "950" as any,
    letterSpacing: -0.3,
  },

  highlightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  highlightText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "750" as any,
    lineHeight: 16,
  },

  exerciseCard: {
    borderRadius: 18,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exerciseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseIconPill: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "950" as any,
    letterSpacing: -0.2,
  },

  miniBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: "900" as any,
    letterSpacing: -0.1,
  },

  exerciseMetaRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  exerciseMeta: { fontSize: 12, fontWeight: "700" as any },

  chevWrap: { justifyContent: "center", alignItems: "center" },
  chevPill: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  setRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  setLeft: { width: 40, alignItems: "center" },
  setDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginTop: 2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  setIndex: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "950" as any,
    fontVariant: ["tabular-nums"],
  },
  setTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  setTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "950" as any,
    letterSpacing: -0.2,
  },

  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  timeText: { fontSize: 11, fontWeight: "800" as any, letterSpacing: -0.1 },

  setBottomLine: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  metricText: { fontSize: 11, fontWeight: "850" as any, letterSpacing: -0.1 },

  prPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  prText: { fontSize: 11, fontWeight: "900" as any, letterSpacing: -0.1 },

  noteTapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  noteTapText: { fontSize: 11, fontWeight: "850" as any, letterSpacing: -0.1 },

  inlineNote: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inlineNoteText: {
    fontSize: 12,
    fontWeight: "650" as any,
    lineHeight: 16,
  },

  noteCard: {
    marginTop: 4,
    padding: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteHint: { flex: 1, fontSize: 12, fontWeight: "650" as any, lineHeight: 16 },

  notesBody: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "650" as any,
    lineHeight: 18,
  },

  edgeCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  edgeTitle: { fontSize: 14, fontWeight: "950" as any, letterSpacing: -0.2 },
  edgeSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "650" as any,
    lineHeight: 16,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionsRow: { flexDirection: "row", gap: 10 },

  actionBtn: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  actionGlow: {
    position: "absolute",
    left: -40,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 120,
  },
  actionIconRing: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { fontSize: 13, fontWeight: "950" as any, letterSpacing: -0.2 },
});
