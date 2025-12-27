// import React, { useEffect, useMemo, useState } from "react";
// import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useRouter } from "expo-router";
// import { useTheme } from "@/content/ThemeProvider";
// import { useAuth } from "@/content/AuthContext";
// import { endOfToday, fmt, startOfMonth, startOfWeek } from "@/utils/date";
// import Filters from "@/components/workouts/Filters";
// import GroupedWorkouts from "@/components/workouts/GroupedWorkouts";
// import {
//   subscribeWorkouts,
//   updateWorkout,
//   deleteWorkout,
//   type Workout,
// } from "@/services/workouts";
// import { MotiView } from "moti";
// import { withAlpha } from "@/components/workouts/utils/withAlpha";
// import { LinearGradient } from "expo-linear-gradient";

// type PresetKey = "all" | "week" | "7" | "month" | "30";

// function computePrFlags(all: Workout[]) {
//   const list = all
//     .slice()
//     .sort(
//       (a, b) =>
//         (a.date || "").localeCompare(b.date || "") ||
//         ((a.createdAt as any)?.toMillis?.() ?? (a.createdAt as any) ?? 0) -
//           ((b.createdAt as any)?.toMillis?.() ?? (b.createdAt as any) ?? 0)
//     );

//   const bestByExercise = new Map<string, { weight: number; volume: number }>();
//   const flags: Record<string, { prWeight: boolean; prVolume: boolean }> = {};
//   for (const w of list) {
//     const ex = (w.exercise || "").trim().toLowerCase();
//     const prev = bestByExercise.get(ex) || { weight: 0, volume: 0 };
//     const isPRw = Number(w.weight || 0) > prev.weight;
//     const vol = Number(w.sets || 0) * Number(w.reps || 0) * Number(w.weight || 0);
//     const isPRv = vol > prev.volume;
//     flags[w.id] = { prWeight: isPRw, prVolume: isPRv };
//     bestByExercise.set(ex, {
//       weight: Math.max(prev.weight, Number(w.weight || 0)),
//       volume: Math.max(prev.volume, vol),
//     });
//   }
//   return flags;
// }

// export default function WorkoutHistoryScreen() {
//   const { colors } = useTheme();
//   const router = useRouter();
//   const { user } = useAuth();

//   const [preset, setPreset] = useState<PresetKey>("all");
//   const [from, setFrom] = useState<string>("");
//   const [to, setTo] = useState<string>("");
//   const [workouts, setWorkouts] = useState<Workout[]>([]);
//   const unit: "kg" | "lb" = "kg";
//   const [editId, setEditId] = useState<string | null>(null);
//   const [edit, setEdit] = useState({
//     date: "",
//     exercise: "",
//     sets: "",
//     reps: "",
//     weight: "",
//     notes: "",
//   });

//   useEffect(() => {
//     const today = endOfToday(new Date());
//     if (preset === "all") {
//       setFrom("");
//       setTo("");
//       return;
//     }
//     if (preset === "week") {
//       setFrom(fmt(startOfWeek(today)));
//       setTo(fmt(today));
//       return;
//     }
//     if (preset === "7") {
//       const s = new Date(today);
//       s.setDate(s.getDate() - 6);
//       setFrom(fmt(s));
//       setTo(fmt(today));
//       return;
//     }
//     if (preset === "month") {
//       setFrom(fmt(startOfMonth(today)));
//       setTo(fmt(today));
//       return;
//     }
//     if (preset === "30") {
//       const s = new Date(today);
//       s.setDate(s.getDate() - 29);
//       setFrom(fmt(s));
//       setTo(fmt(today));
//       return;
//     }
//   }, [preset]);

//   useEffect(() => {
//     if (from && to && from > to) setTo("");
//   }, [from, to]);

//   useEffect(() => {
//     if (!user?.uid) return;
//     return subscribeWorkouts(user.uid, setWorkouts, { from, to });
//   }, [user?.uid, from, to]);

//   const grouped = useMemo(() => {
//     const byDate: Record<string, Workout[]> = {};
//     for (const w of workouts) (byDate[w.date] ??= []).push(w);
//     const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
//     return dates.map((d) => ({
//       date: d,
//       items: byDate[d]
//         .slice()
//         .sort((a, b) => (a.exercise || "").localeCompare(b.exercise || "")),
//     }));
//   }, [workouts]);
//   const prFlags = useMemo(() => computePrFlags(workouts), [workouts]);

//   const clearDates = () => {
//     setPreset("all");
//     setFrom("");
//     setTo("");
//   };

//   function startEdit(w: Workout) {
//     setEditId(w.id);
//     setEdit({
//       date: w.date || "",
//       exercise: w.exercise || "",
//       sets: String(w.sets ?? ""),
//       reps: String(w.reps ?? ""),
//       weight: String(w.weight ?? ""),
//       notes: w.notes || "",
//     });
//   }

//   async function saveEdit() {
//     if (!user?.uid || !editId) {
//       setEditId(null);
//       return;
//     }
//     const patch = {
//       date: edit.date,
//       exercise: edit.exercise.trim(),
//       sets: Number(edit.sets || 0),
//       reps: Number(edit.reps || 0),
//       weight: Number(edit.weight || 0),
//       notes: (edit.notes || "").trim(),
//     };
//     const prev = workouts;
//     setWorkouts((curr) =>
//       curr.map((w) => (w.id === editId ? { ...w, ...patch } : w))
//     );
//     setEditId(null);
//     try {
//       await updateWorkout(user.uid, editId, patch);
//     } catch (e) {
//       console.warn(e);
//       setWorkouts(prev);
//     }
//   }

//   async function removeWorkout(id: string) {
//     if (!user?.uid) return;
//     const prev = workouts;
//     setWorkouts((curr) => curr.filter((w) => w.id !== id));
//     try {
//       await deleteWorkout(user.uid, id);
//     } catch (e) {
//       console.warn(e);
//       setWorkouts(prev);
//     }
//   }

//   const cancelEdit = () => {
//     setEditId(null);
//   };

//   const totals = useMemo(() => {
//     let sets = 0;
//     let volume = 0;
//     for (const w of workouts) {
//       const s = Number(w.sets || 0);
//       const r = Number(w.reps || 0);
//       const wt = Number(w.weight || 0);
//       sets += s;
//       volume += s * r * wt;
//     }
//     return {
//       workouts: workouts.length,
//       sets,
//       volume: Math.round(volume),
//     };
//   }, [workouts]);

//   const StatPill = ({
//     icon,
//     label,
//     value,
//   }: {
//     icon: any;
//     label: string;
//     value: string;
//   }) => (
//     <View
//       style={{
//         flexDirection: "row",
//         alignItems: "center",
//         gap: 8,
//         paddingHorizontal: 12,
//         paddingVertical: 10,
//         borderRadius: 12,
//         backgroundColor: withAlpha(colors.card, 0.9),
//         borderWidth: 1,
//         borderColor: withAlpha(colors.border, 0.7),
//         flex: 1,
//       }}
//     >
//       <View
//         style={{
//           width: 32,
//           height: 32,
//           borderRadius: 10,
//           alignItems: "center",
//           justifyContent: "center",
//           backgroundColor: withAlpha(colors.primary, 0.12),
//           borderWidth: 1,
//           borderColor: withAlpha(colors.primary, 0.35),
//         }}
//       >
//         <Ionicons name={icon} size={16} color={colors.primary} />
//       </View>
//       <View style={{ flex: 1 }}>
//         <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>{label}</Text>
//         <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 12 }}>{value}</Text>
//       </View>
//     </View>
//   );

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === "ios" ? "padding" : undefined}
//       keyboardVerticalOffset={0}
//     >
//       <LinearGradient
//         colors={[withAlpha(colors.primary, 0.14), colors.background]}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={{ flex: 1 }}
//       >
//         <ScrollView
//           style={{ flex: 1 }}
//           contentContainerStyle={{ paddingBottom: 28, gap: 14 }}
//           showsVerticalScrollIndicator={false}
//         >
//           <View style={{ paddingTop: 46, paddingHorizontal: 16, gap: 12 }}>
//             <Pressable
//               onPress={() => router.back()}
//               style={({ pressed }) => ({
//                 alignSelf: "flex-start",
//                 flexDirection: "row",
//                 alignItems: "center",
//                 gap: 6,
//                 paddingHorizontal: 12,
//                 paddingVertical: 8,
//                 borderRadius: 999,
//                 borderWidth: 1,
//                 borderColor: withAlpha(colors.primary, 0.35),
//                 backgroundColor: withAlpha(colors.primary, pressed ? 0.18 : 0.1),
//               })}
//             >
//               <Ionicons name="arrow-back" size={16} color={colors.primary} />
//               <Text style={{ color: colors.primary, fontWeight: "800" }}>Back to Workouts</Text>
//             </Pressable>

//             <LinearGradient
//               colors={[withAlpha(colors.primary, 0.22), withAlpha(colors.card, 0.96)]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 1 }}
//               style={{
//                 borderRadius: 18,
//                 padding: 14,
//                 borderWidth: 1,
//                 borderColor: withAlpha(colors.primary, 0.35),
//                 gap: 12,
//               }}
//             >
//               <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
//                 <Ionicons name="time-outline" size={20} color={colors.text} />
//                 <View style={{ flex: 1 }}>
//                   <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>
//                     Workout history
//                   </Text>
//                   <Text style={{ color: withAlpha(colors.text, 0.7), fontWeight: "600" }}>
//                     Glide through your logged sessions, filter ranges, and spot PRs.
//                   </Text>
//                 </View>
//               </View>

//               <View style={{ flexDirection: "row", gap: 10 }}>
//                 <StatPill icon="barbell-outline" label="Workouts" value={`${totals.workouts}`} />
//                 <StatPill icon="layers-outline" label="Sets logged" value={`${totals.sets}`} />
//                 <StatPill
//                   icon="ribbon-outline"
//                   label="PR badges"
//                   value={`${Object.values(prFlags).filter((f) => f.prWeight || f.prVolume).length}`}
//                 />
//               </View>
//             </LinearGradient>
//           </View>

//           <View style={{ paddingHorizontal: 16, gap: 12 }}>
//             <LinearGradient
//               colors={[withAlpha(colors.card, 0.8), withAlpha(colors.card, 0.95)]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 1 }}
//               style={{
//                 borderRadius: 16,
//                 padding: 12,
//                 borderWidth: 1,
//                 borderColor: withAlpha(colors.border, 0.6),
//                 gap: 10,
//               }}
//             >
//               <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
//                 <Ionicons name="filter-outline" size={16} color={colors.text} />
//                 <Text style={{ color: colors.text, fontWeight: "800" }}>Filters</Text>
//               </View>
//               <Filters
//                 preset={preset}
//                 setPreset={setPreset}
//                 from={from}
//                 to={to}
//                 setFrom={setFrom}
//                 setTo={setTo}
//               />
//               <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>
//                 Tip: tap a date header to collapse/expand a session. Long-press a workout to
//                 delete. PR badges show where you hit weight or volume bests.
//               </Text>
//             </LinearGradient>

//             <MotiView
//               from={{ opacity: 0, translateY: 12 }}
//               animate={{ opacity: 1, translateY: 0 }}
//               transition={{ type: "timing", duration: 320, delay: 40 }}
//             >
//               <GroupedWorkouts
//                 grouped={grouped}
//                 unit={unit}
//                 colors={colors}
//                 editId={editId}
//                 edit={edit}
//                 setEdit={setEdit}
//                 startEdit={startEdit}
//                 saveEdit={saveEdit}
//                 removeWorkout={removeWorkout}
//                 onCancelEdit={cancelEdit}
//                 prFlags={prFlags}
//               />
//             </MotiView>
//           </View>
//         </ScrollView>
//       </LinearGradient>
//     </KeyboardAvoidingView>
//   );
// }

// app/workouts/history.tsx
// Glossy history screen.
// Keeps backend philosophy: subscribeWorkouts + optimistic update/delete. :contentReference[oaicite:6]{index=6}

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  StyleSheet,
  Platform,
  StatusBar,
  Alert as RNAlert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/content/AuthContext";
import { withAlpha } from "@/components/workouts/utils/withAlpha";
import { endOfToday, fmt, startOfMonth, startOfWeek } from "@/utils/date";
import {
  subscribeWorkouts,
  updateWorkout,
  deleteWorkout,
  type Workout,
} from "@/services/workouts";

type PresetKey = "all" | "week" | "7" | "month" | "30";

function computePrFlags(all: Workout[]) {
  const list = all
    .slice()
    .sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        ((a.createdAt as any)?.toMillis?.() ?? (a.createdAt as any) ?? 0) -
          ((b.createdAt as any)?.toMillis?.() ?? (b.createdAt as any) ?? 0)
    );

  const bestByExercise = new Map<string, { weight: number; volume: number }>();
  const flags: Record<string, { prWeight: boolean; prVolume: boolean }> = {};
  for (const w of list) {
    const ex = (w.exercise || "").trim().toLowerCase();
    const prev = bestByExercise.get(ex) || { weight: 0, volume: 0 };
    const isPRw = Number(w.weight || 0) > prev.weight;
    const vol =
      Number(w.sets || 0) * Number(w.reps || 0) * Number(w.weight || 0);
    const isPRv = vol > prev.volume;
    flags[w.id] = { prWeight: isPRw, prVolume: isPRv };
    bestByExercise.set(ex, {
      weight: Math.max(prev.weight, Number(w.weight || 0)),
      volume: Math.max(prev.volume, vol),
    });
  }
  return flags;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

function fmtCompact(n: number) {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`;
  if (abs >= 1_000) return `${Math.round((n / 1_000) * 10) / 10}k`;
  return String(Math.round(n));
}

function GlassCard({
  children,
  style,
  intensity = 34,
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

function StatChip({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={14} color={withAlpha("#FFFFFF", 0.82)} />
      <Text style={styles.statChipText}>{label}</Text>
    </View>
  );
}

function RowBtn({
  title,
  onPress,
  active,
}: {
  title: string;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterPill,
        active && styles.filterPillActive,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text
        style={[styles.filterPillText, active && styles.filterPillTextActive]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const { user } = useAuth();
  const uid = user?.uid;

  const accent = "#68D7FF";
  const accent2 = "#8B7CFF";

  const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

  const [preset, setPreset] = useState<PresetKey>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const unit: "kg" | "lb" = "kg"; // keep as your current behavior (you can wire profile later)

  // collapsible date groups
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // edit modal
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    date: "",
    exercise: "",
    sets: "",
    reps: "",
    weight: "",
    notes: "",
  });

  // preset -> date range (same logic you already had) :contentReference[oaicite:7]{index=7}
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

  useEffect(() => {
    if (!uid) return;
    return subscribeWorkouts(uid, setWorkouts, { from, to });
  }, [uid, from, to]);

  const grouped = useMemo(() => {
    const byDate: Record<string, Workout[]> = {};
    for (const w of workouts) (byDate[w.date] ??= []).push(w);
    const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
    return dates.map((d) => ({
      date: d,
      items: byDate[d]
        .slice()
        .sort((a, b) => (a.exercise || "").localeCompare(b.exercise || "")),
    }));
  }, [workouts]);

  const prFlags = useMemo(() => computePrFlags(workouts), [workouts]);

  const totals = useMemo(() => {
    let setsSum = 0;
    let volume = 0;
    for (const w of workouts) {
      const s = Number(w.sets || 0);
      const r = Number(w.reps || 0);
      const wt = Number(w.weight || 0);
      setsSum += s;
      volume += s * r * wt;
    }
    const prCount = Object.values(prFlags).filter(
      (f) => f.prWeight || f.prVolume
    ).length;
    return {
      workouts: workouts.length,
      sets: setsSum,
      volume: Math.round(volume),
      prCount,
    };
  }, [workouts, prFlags]);

  function startEdit(w: Workout) {
    setEditId(w.id);
    setEdit({
      date: w.date || "",
      exercise: w.exercise || "",
      sets: String(w.sets ?? ""),
      reps: String(w.reps ?? ""),
      weight: String(w.weight ?? ""),
      notes: w.notes || "",
    });
    Haptics.selectionAsync().catch(() => {});
  }

  async function saveEdit() {
    if (!uid || !editId) {
      setEditId(null);
      return;
    }

    const patch = {
      date: edit.date,
      exercise: edit.exercise.trim(),
      sets: Number(edit.sets || 0),
      reps: Number(edit.reps || 0),
      weight: Number(edit.weight || 0),
      notes: (edit.notes || "").trim(),
    };

    // optimistic patch (same as before) :contentReference[oaicite:8]{index=8}
    const prev = workouts;
    setWorkouts((curr) =>
      curr.map((w) => (w.id === editId ? { ...w, ...patch } : w))
    );
    setEditId(null);

    try {
      await updateWorkout(uid, editId, patch);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {
      console.warn(e);
      setWorkouts(prev);
    }
  }

  async function removeWorkout(id: string) {
    if (!uid) return;

    RNAlert.alert("Delete workout?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const prev = workouts;
          setWorkouts((curr) => curr.filter((w) => w.id !== id));
          try {
            await deleteWorkout(uid, id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
              () => {}
            );
          } catch (e) {
            console.warn(e);
            setWorkouts(prev);
          }
        },
      },
    ]);
  }

  const sidePad = 16;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#070A12", "#050711", "#03040A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          { top: -120, left: -80, backgroundColor: withAlpha(accent, 0.18) },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          { top: 120, right: -90, backgroundColor: withAlpha(accent2, 0.16) },
        ]}
      />

      {/* Header */}
      <View style={{ paddingTop: topInset }}>
        <BlurView intensity={26} tint="dark" style={styles.headerBlur}>
          <View style={[styles.headerRow, { paddingHorizontal: sidePad }]}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={withAlpha("#FFFFFF", 0.9)}
              />
              <Text style={styles.backText}>Workouts</Text>
            </Pressable>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Pressable
                onPress={() => router.push("/workouts/session")}
                style={({ pressed }) => [
                  styles.headerAction,
                  pressed && { opacity: 0.9 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open active session"
              >
                <Ionicons
                  name="play"
                  size={16}
                  color={withAlpha("#FFFFFF", 0.9)}
                />
                <Text style={styles.headerActionText}>Session</Text>
              </Pressable>
            </View>
          </View>
        </BlurView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: sidePad, paddingBottom: 30, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard intensity={30} style={{ borderRadius: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons
              name="time-outline"
              size={20}
              color={withAlpha("#FFFFFF", 0.9)}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Workout history</Text>
              <Text style={styles.subtitle}>
                Glide through your logged entries, filter ranges, and spot PRs.
              </Text>
            </View>
          </View>

          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <StatChip
              icon="barbell-outline"
              label={`${totals.workouts} workouts`}
            />
            <StatChip icon="layers-outline" label={`${totals.sets} sets`} />
            <StatChip icon="ribbon-outline" label={`${totals.prCount} PRs`} />
            <StatChip
              icon="stats-chart-outline"
              label={`${fmtCompact(totals.volume)} ${unit} vol`}
            />
          </View>
        </GlassCard>

        {/* Filter pills */}
        <GlassCard intensity={26} style={{ borderRadius: 22 }}>
          <Text style={styles.sectionTitle}>Range</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 10,
            }}
          >
            <RowBtn
              title="All"
              active={preset === "all"}
              onPress={() => setPreset("all")}
            />
            <RowBtn
              title="Week"
              active={preset === "week"}
              onPress={() => setPreset("week")}
            />
            <RowBtn
              title="7d"
              active={preset === "7"}
              onPress={() => setPreset("7")}
            />
            <RowBtn
              title="Month"
              active={preset === "month"}
              onPress={() => setPreset("month")}
            />
            <RowBtn
              title="30d"
              active={preset === "30"}
              onPress={() => setPreset("30")}
            />
          </View>

          {!!from && !!to && (
            <Text
              style={{
                marginTop: 10,
                color: withAlpha("#FFFFFF", 0.6),
                fontWeight: "700",
              }}
            >
              Showing: {from} → {to}
            </Text>
          )}
        </GlassCard>

        {/* Groups */}
        {grouped.length === 0 ? (
          <GlassCard intensity={24} style={{ borderRadius: 22 }}>
            <Text style={styles.sectionTitle}>No workouts yet</Text>
            <Text
              style={{
                marginTop: 6,
                color: withAlpha("#FFFFFF", 0.62),
                fontWeight: "700",
                lineHeight: 18,
              }}
            >
              Finish your first session and it’ll show up here.
            </Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            {grouped.map((g) => {
              const isCollapsed = collapsed[g.date] ?? false;
              return (
                <GlassCard
                  key={g.date}
                  intensity={28}
                  style={{ borderRadius: 22 }}
                >
                  <Pressable
                    onPress={() =>
                      setCollapsed((c) => ({ ...c, [g.date]: !isCollapsed }))
                    }
                    style={({ pressed }) => [
                      styles.groupHeader,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <Text style={styles.groupDate}>{g.date}</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Text style={styles.groupCount}>{g.items.length}</Text>
                      <Ionicons
                        name={isCollapsed ? "chevron-down" : "chevron-up"}
                        size={16}
                        color={withAlpha("#FFFFFF", 0.6)}
                      />
                    </View>
                  </Pressable>

                  {!isCollapsed ? (
                    <View style={{ marginTop: 10, gap: 10 }}>
                      {g.items.map((w) => {
                        const pr = prFlags[w.id];
                        const vol =
                          Number(w.sets || 0) *
                          Number(w.reps || 0) *
                          Number(w.weight || 0);
                        return (
                          <Pressable
                            key={w.id}
                            onPress={() => startEdit(w)}
                            onLongPress={() => removeWorkout(w.id)}
                            style={({ pressed }) => [
                              styles.row,
                              pressed && { opacity: 0.92 },
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <Text style={styles.rowTitle} numberOfLines={1}>
                                  {w.exercise || "Exercise"}
                                </Text>
                                {pr?.prWeight || pr?.prVolume ? (
                                  <View style={styles.prBadge}>
                                    <Ionicons
                                      name="trophy"
                                      size={14}
                                      color={withAlpha("#111", 0.9)}
                                    />
                                    <Text style={styles.prText}>PR</Text>
                                  </View>
                                ) : null}
                              </View>

                              <Text style={styles.rowSub} numberOfLines={1}>
                                {w.sets}×{w.reps} • {w.weight} {unit} • vol{" "}
                                {fmtCompact(vol)}
                              </Text>
                              {!!w.notes && (
                                <Text style={styles.rowNotes} numberOfLines={2}>
                                  {w.notes}
                                </Text>
                              )}
                            </View>

                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color={withAlpha("#FFFFFF", 0.55)}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit modal */}
      <Modal
        visible={!!editId}
        animationType="fade"
        transparent
        onRequestClose={() => setEditId(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEditId(null)}
          />
          <View style={styles.modalWrap}>
            <GlassCard intensity={42} style={{ borderRadius: 22 }}>
              <Text style={styles.modalTitle}>Edit</Text>
              <Text style={styles.modalSub}>
                Tap save to update this entry.
              </Text>

              <View style={{ marginTop: 12, gap: 10 }}>
                <TextInput
                  value={edit.exercise}
                  onChangeText={(v) => setEdit((e) => ({ ...e, exercise: v }))}
                  placeholder="Exercise"
                  placeholderTextColor={withAlpha("#FFFFFF", 0.45)}
                  style={styles.field}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    value={edit.sets}
                    onChangeText={(v) => setEdit((e) => ({ ...e, sets: v }))}
                    placeholder="Sets"
                    placeholderTextColor={withAlpha("#FFFFFF", 0.45)}
                    style={[styles.field, { flex: 1 }]}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    value={edit.reps}
                    onChangeText={(v) => setEdit((e) => ({ ...e, reps: v }))}
                    placeholder="Reps"
                    placeholderTextColor={withAlpha("#FFFFFF", 0.45)}
                    style={[styles.field, { flex: 1 }]}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    value={edit.weight}
                    onChangeText={(v) => setEdit((e) => ({ ...e, weight: v }))}
                    placeholder={`Weight (${unit})`}
                    placeholderTextColor={withAlpha("#FFFFFF", 0.45)}
                    style={[styles.field, { flex: 1 }]}
                    keyboardType="numeric"
                  />
                </View>
                <TextInput
                  value={edit.notes}
                  onChangeText={(v) => setEdit((e) => ({ ...e, notes: v }))}
                  placeholder="Notes"
                  placeholderTextColor={withAlpha("#FFFFFF", 0.45)}
                  style={styles.field}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable
                  onPress={() => setEditId(null)}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={saveEdit}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Save</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => {
                  const id = editId!;
                  setEditId(null);
                  removeWorkout(id);
                }}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={withAlpha("#FFFFFF", 0.9)}
                />
                <Text style={styles.dangerText}>Delete</Text>
              </Pressable>
            </GlassCard>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05060C" },
  glow: { position: "absolute", width: 260, height: 260, borderRadius: 260 },

  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha("#FFFFFF", 0.12),
  },
  headerRow: {
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  backText: { color: withAlpha("#FFFFFF", 0.9), fontWeight: "900" },
  headerAction: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  headerActionText: { color: withAlpha("#FFFFFF", 0.9), fontWeight: "900" },

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

  title: {
    color: withAlpha("#FFFFFF", 0.94),
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 4,
    color: withAlpha("#FFFFFF", 0.62),
    fontWeight: "700",
    lineHeight: 18,
  },

  sectionTitle: { color: withAlpha("#FFFFFF", 0.88), fontWeight: "900" },

  statChip: {
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
  statChipText: {
    color: withAlpha("#FFFFFF", 0.82),
    fontSize: 12,
    fontWeight: "800",
  },

  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  filterPillActive: {
    backgroundColor: withAlpha("#FFFFFF", 0.92),
    borderColor: withAlpha("#FFFFFF", 0.92),
  },
  filterPillText: { color: withAlpha("#FFFFFF", 0.86), fontWeight: "900" },
  filterPillTextActive: { color: withAlpha("#111", 0.92) },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupDate: {
    color: withAlpha("#FFFFFF", 0.92),
    fontWeight: "900",
    fontSize: 14,
  },
  groupCount: { color: withAlpha("#FFFFFF", 0.62), fontWeight: "900" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  rowTitle: {
    color: withAlpha("#FFFFFF", 0.94),
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: -0.1,
  },
  rowSub: {
    marginTop: 4,
    color: withAlpha("#FFFFFF", 0.62),
    fontWeight: "700",
    fontSize: 12,
  },
  rowNotes: {
    marginTop: 4,
    color: withAlpha("#FFFFFF", 0.62),
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
  },

  prBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFD66B", 0.92),
  },
  prText: { color: withAlpha("#111", 0.9), fontSize: 12, fontWeight: "900" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
    paddingBottom: 16,
  },
  modalTitle: {
    color: withAlpha("#FFFFFF", 0.94),
    fontWeight: "900",
    fontSize: 16,
  },
  modalSub: {
    marginTop: 6,
    color: withAlpha("#FFFFFF", 0.62),
    fontWeight: "700",
  },

  field: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    color: withAlpha("#FFFFFF", 0.92),
    fontWeight: "900",
  },

  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.92),
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: withAlpha("#111", 0.92), fontWeight: "900" },

  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: withAlpha("#FFFFFF", 0.86), fontWeight: "900" },

  dangerBtn: {
    marginTop: 10,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FF5A5F", 0.16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FF5A5F", 0.35),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  dangerText: { color: withAlpha("#FFFFFF", 0.92), fontWeight: "900" },
});
