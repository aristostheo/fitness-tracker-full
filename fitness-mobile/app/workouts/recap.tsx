// app/workouts/recap.tsx
// Single unified log section: ordered entries (what happened first) + grouped feel via exercise headers

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/content/AuthContext";
import { subscribeWorkouts, type Workout } from "@/services/workouts";

const withAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
};

function createdAtMs(x: any) {
  const t = x?.createdAt;
  if (!t) return 0;
  if (typeof t === "number") return t;
  if (typeof t?.toMillis === "function") return t.toMillis();
  return Number(t) || 0;
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

function volumeKg(sets: number, reps: number, weightKg: number) {
  return Math.max(0, sets) * Math.max(0, reps) * Math.max(0, weightKg);
}

type WorkoutRow = Workout & {
  sessionId?: string;
  sessionTitle?: string;
  sessionStartedAt?: number;
};

type LogItem =
  | { kind: "exerciseHeader"; exercise: string; order: number }
  | {
      kind: "entry";
      id: string;
      index: number;
      exercise: string;
      sets: number;
      reps: number;
      weight: number;
      notes?: string;
      t?: number;
      isFirstOfExercise: boolean;
    };

export default function WorkoutRecapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ sessionKey?: string }>();
  const sessionKey = String(params.sessionKey || "");

  const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

  const [allRows, setAllRows] = useState<WorkoutRow[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeWorkouts(
      user.uid,
      (rows: Workout[]) => setAllRows((rows || []) as WorkoutRow[]),
      { max: 800 }
    );
  }, [user?.uid]);

  const rows = useMemo(() => {
    return allRows
      .filter((r) => {
        const sid = String((r as any).sessionId || "");
        const key = sid ? sid : `date:${r.date || ""}`;
        return key === sessionKey;
      })
      .slice()
      .sort((a, b) => createdAtMs(a) - createdAtMs(b));
  }, [allRows, sessionKey]);

  const meta = useMemo(() => {
    const first = rows[0];
    const last = rows[rows.length - 1];
    const title = String((first as any)?.sessionTitle || "Workout");
    const dateISO = String(first?.date || "");
    const start =
      Number((first as any)?.sessionStartedAt || 0) || createdAtMs(first);
    const end = createdAtMs(last);
    const durationMin =
      start && end && end >= start
        ? Math.max(1, Math.round((end - start) / 60000))
        : 0;

    const totalSets = rows.reduce(
      (a, r) => a + Number((r as any).sets || 0),
      0
    );
    const totalReps = rows.reduce(
      (a, r) => a + Number((r as any).sets || 0) * Number((r as any).reps || 0),
      0
    );
    const totalVol = rows.reduce(
      (a, r) =>
        a +
        volumeKg(
          Number((r as any).sets || 0),
          Number((r as any).reps || 0),
          Number((r as any).weight || 0)
        ),
      0
    );

    // Simple highlights inside session
    let bestWeight = { ex: "", weight: 0, sets: 0, reps: 0 };
    let bestVol = { ex: "", vol: 0, sets: 0, reps: 0, weight: 0 };

    for (const r of rows) {
      const ex = String((r as any).exercise || "Exercise");
      const sets = Number((r as any).sets || 0);
      const reps = Number((r as any).reps || 0);
      const wt = Number((r as any).weight || 0);
      const vol = volumeKg(sets, reps, wt);
      if (wt > bestWeight.weight) bestWeight = { ex, weight: wt, sets, reps };
      if (vol > bestVol.vol) bestVol = { ex, vol, sets, reps, weight: wt };
    }

    return {
      title,
      dateISO,
      timeLabel: start ? fmtTime(start) : "",
      durationMin,
      totalSets,
      totalReps,
      totalVol: Math.round(totalVol),
      bestWeight,
      bestVol,
    };
  }, [rows]);

  const logItems = useMemo<LogItem[]>(() => {
    const out: LogItem[] = [];
    const seenExercise = new Set<string>();
    let idx = 0;

    for (const r of rows) {
      const ex = String((r as any).exercise || "Exercise");
      const sets = Number((r as any).sets || 0);
      const reps = Number((r as any).reps || 0);
      const wt = Number((r as any).weight || 0);
      const notes = String((r as any).notes || "").trim();
      const t = createdAtMs(r) || undefined;

      const firstOf = !seenExercise.has(ex);
      if (firstOf) {
        seenExercise.add(ex);
        // insert a compact header the first time this exercise appears in the log
        out.push({ kind: "exerciseHeader", exercise: ex, order: out.length });
      }

      out.push({
        kind: "entry",
        id: String((r as any).id || `${idx}`),
        index: idx + 1,
        exercise: ex,
        sets,
        reps,
        weight: wt,
        notes: notes || undefined,
        t,
        isFirstOfExercise: firstOf,
      });

      idx++;
    }
    return out;
  }, [rows]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#070A12", "#050711", "#03040A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ paddingTop: topInset }}>
        <BlurView intensity={28} tint="dark" style={styles.headerBlur}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.82 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={withAlpha("#FFFFFF", 0.9)}
              />
              <Text style={styles.backText}>Workouts</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {meta.title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {meta.dateISO ? meta.dateISO : ""}
                {meta.timeLabel ? ` • ${meta.timeLabel}` : ""}
              </Text>
            </View>
          </View>
        </BlurView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Summary</Text>

          <View style={styles.kpisRow}>
            <View style={styles.kpi}>
              <Text style={styles.kpiVal}>{rows.length}</Text>
              <Text style={styles.kpiLab}>Entries</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiVal}>{meta.totalSets}</Text>
              <Text style={styles.kpiLab}>Sets</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiVal}>{meta.durationMin || "—"}</Text>
              <Text style={styles.kpiLab}>Min</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiVal}>{meta.totalVol}</Text>
              <Text style={styles.kpiLab}>Vol (kg)</Text>
            </View>
          </View>

          {!!meta.bestWeight.ex && (
            <View style={styles.highlightRow}>
              <Ionicons
                name="trophy-outline"
                size={16}
                color={withAlpha("#FFD66B", 0.95)}
              />
              <Text style={styles.highlightText} numberOfLines={2}>
                Heaviest: {meta.bestWeight.ex} •{" "}
                {Math.round(meta.bestWeight.weight)}kg ({meta.bestWeight.sets}×
                {meta.bestWeight.reps})
              </Text>
            </View>
          )}

          {!!meta.bestVol.ex && (
            <View style={styles.highlightRow}>
              <Ionicons
                name="sparkles-outline"
                size={16}
                color={withAlpha("#68D7FF", 0.95)}
              />
              <Text style={styles.highlightText} numberOfLines={2}>
                Best volume: {meta.bestVol.ex} • {meta.bestVol.sets}×
                {meta.bestVol.reps} @ {Math.round(meta.bestVol.weight)}kg
              </Text>
            </View>
          )}
        </View>

        {/* Unified log */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.sectionLabel}>Workout log</Text>
          <Text style={styles.smallMuted}>
            Logged order, with exercises grouped as they first appear.
          </Text>

          <View style={{ marginTop: 12, gap: 10 }}>
            {logItems.length === 0 ? (
              <Text style={styles.smallMuted}>
                No entries found for this session.
              </Text>
            ) : (
              logItems.map((item, i) => {
                if (item.kind === "exerciseHeader") {
                  return (
                    <View
                      key={`h-${item.exercise}-${i}`}
                      style={styles.exerciseHeader}
                    >
                      <View style={styles.exercisePill}>
                        <Ionicons
                          name="barbell-outline"
                          size={14}
                          color={withAlpha("#FFFFFF", 0.86)}
                        />
                        <Text
                          style={styles.exerciseHeaderText}
                          numberOfLines={1}
                        >
                          {item.exercise}
                        </Text>
                      </View>
                    </View>
                  );
                }

                const time = item.t ? fmtTime(item.t) : "";
                return (
                  <View key={item.id} style={styles.logRow}>
                    <View style={styles.logLeft}>
                      <View style={styles.logDot} />
                      <Text style={styles.logIndex}>{item.index}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.logTopLine}>
                        <Text style={styles.logTitle} numberOfLines={1}>
                          {item.sets}×{item.reps} @ {Math.round(item.weight)}kg
                        </Text>
                        {!!time && <Text style={styles.logTime}>{time}</Text>}
                      </View>

                      {!!item.notes && (
                        <Text style={styles.note} numberOfLines={4}>
                          {item.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05060C" },

  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha("#FFFFFF", 0.12),
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
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  backText: {
    color: withAlpha("#FFFFFF", 0.9),
    fontWeight: "800",
    fontSize: 13,
  },

  title: {
    color: withAlpha("#FFFFFF", 0.94),
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    color: withAlpha("#FFFFFF", 0.58),
    fontSize: 12,
    fontWeight: "700",
  },

  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  sectionLabel: {
    color: withAlpha("#FFFFFF", 0.7),
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  smallMuted: {
    marginTop: 6,
    color: withAlpha("#FFFFFF", 0.58),
    fontSize: 12,
    fontWeight: "600",
  },

  kpisRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  kpi: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
    alignItems: "center",
  },
  kpiVal: {
    color: withAlpha("#FFFFFF", 0.94),
    fontSize: 18,
    fontWeight: "900",
  },
  kpiLab: {
    marginTop: 2,
    color: withAlpha("#FFFFFF", 0.58),
    fontSize: 11,
    fontWeight: "700",
  },

  highlightRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  highlightText: {
    flex: 1,
    color: withAlpha("#FFFFFF", 0.82),
    fontSize: 12,
    fontWeight: "700",
  },

  /* Unified log */
  exerciseHeader: {
    marginTop: 2,
  },
  exercisePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  exerciseHeaderText: {
    color: withAlpha("#FFFFFF", 0.9),
    fontWeight: "900",
    fontSize: 12,
  },

  logRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  logLeft: { width: 44, alignItems: "center" },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginTop: 2,
    backgroundColor: withAlpha("#68D7FF", 0.92),
    shadowColor: "#68D7FF",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  logIndex: {
    marginTop: 6,
    color: withAlpha("#FFFFFF", 0.62),
    fontSize: 12,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  logTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  logTitle: {
    flex: 1,
    color: withAlpha("#FFFFFF", 0.92),
    fontSize: 13,
    fontWeight: "900",
  },
  logTime: {
    color: withAlpha("#FFFFFF", 0.55),
    fontSize: 12,
    fontWeight: "800",
  },
  note: {
    marginTop: 6,
    color: withAlpha("#FFFFFF", 0.7),
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
