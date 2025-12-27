// =============================
// FILE: app/insights.tsx (moved from tabs)
// =============================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Platform, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import {
  getFirestore,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import InsightCard from "@/components/insights/InsightCard";
import TrendMiniChart from "@/components/insights/TrendMiniChart";
import { withAlpha } from "@/components/workouts/utils/withAlpha";
import { fmt } from "@/utils/date";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";

/* ────────────────────────────────────────────── */
type Pt = { x: number; y: number };

type WorkoutDoc = {
  date: string;
  exercise?: string;
  sets?: number | string;
  reps?: number | string;
  weight?: number | string; // kg in your app; fallback handled below
  weightKg?: number | string; // sometimes stored under these keys
  weight_kg?: number | string;
};

type BurnDoc = { date: string; name?: string; calories?: number | string };
type MealDoc = { date: string; name?: string; calories?: number | string };
type WeightDoc = {
  date?: string;
  weight?: number | string;
  weightKg?: number | string;
  weight_kg?: number | string;
  createdAt?: any;
  timestamp?: any;
};

const db = getFirestore();
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

/* ────────────────────────────────────────────── */
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function rangeDaysISO(days: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(fmt(addDays(end, -i)));
  return out;
}
function toPtsFromDailyMap(map: Map<string, number>, isoDays: string[]): Pt[] {
  return isoDays.map((d, idx) => ({ x: idx, y: map.get(d) ?? 0 }));
}
function sum(nums: number[]) {
  return nums.reduce((s, n) => s + n, 0);
}
function n(v: any): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function dateKeyFromDoc(doc: any): string {
  const raw = doc?.date;
  if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, 10);
  const ts = doc?.createdAt ?? doc?.timestamp;
  if (ts?.seconds) return fmt(new Date(ts.seconds * 1000));
  if (typeof ts === "number" && Number.isFinite(ts)) return fmt(new Date(ts));
  return "";
}

/* ────────────────────────────────────────────── */
/* Firestore loaders (with safe fallbacks)        */
async function loadWorkouts(uid: string, fromISO?: string, toISO?: string) {
  const subs = ["workouts", "exerciseEntries", "exerciseLogs"];
  const all: WorkoutDoc[] = [];

  const withinRange = (iso: string) => {
    if (!fromISO || !toISO) return true;
    return iso >= fromISO && iso <= toISO;
  };

  for (const sub of subs) {
    try {
      const collRef = collection(db, "users", uid, sub);
      let qy = query(collRef, orderBy("date", "asc"));
      if (fromISO && toISO) {
        qy = query(
          collRef,
          where("date", ">=", fromISO),
          where("date", "<=", toISO),
          orderBy("date", "asc")
        );
      }
      const snap = await getDocs(qy);
      snap.forEach((d) => {
        const data = d.data() as any;
        const dk = dateKeyFromDoc(data);
        if (dk && withinRange(dk)) all.push(data);
      });
    } catch {
      // fallback: try no where filters (some collections might lack indexes)
      try {
        const collRef = collection(db, "users", uid, sub);
        const snap = await getDocs(collRef);
        snap.forEach((d) => {
          const data = d.data() as any;
          const dk = dateKeyFromDoc(data);
          if (dk && withinRange(dk)) all.push(data);
        });
      } catch {}
    }
  }

  return all;
}

async function loadExerciseBurns(uid: string, fromISO: string, toISO: string) {
  const out: BurnDoc[] = [];
  const withinRange = (iso: string) => iso && iso >= fromISO && iso <= toISO;
  const scan = async (sub: string) => {
    try {
      const collRef = collection(db, "users", uid, sub);
      let snap;
      try {
        const qy = query(
          collRef,
          where("date", ">=", fromISO),
          where("date", "<=", toISO),
          orderBy("date", "asc")
        );
        snap = await getDocs(qy);
      } catch {
        snap = await getDocs(collRef);
      }
      snap.forEach((d) => {
        const data = d.data() as any;
        const dk = dateKeyFromDoc(data);
        if (dk && withinRange(dk)) out.push(data);
      });
    } catch {}
  };
  await scan("exerciseBurnEntries");
  await scan("activityEntries");
  await scan("exercises");
  return out;
}

async function loadMeals(uid: string, fromISO: string, toISO: string) {
  const out: MealDoc[] = [];
  const withinRange = (iso: string) => iso && iso >= fromISO && iso <= toISO;
  const scan = async (sub: string) => {
    try {
      const collRef = collection(db, "users", uid, sub);
      let snap;
      try {
        const qy = query(
          collRef,
          where("date", ">=", fromISO),
          where("date", "<=", toISO),
          orderBy("date", "asc")
        );
        snap = await getDocs(qy);
      } catch {
        snap = await getDocs(collRef);
      }
      snap.forEach((d) => {
        const data = d.data() as any;
        const dk = dateKeyFromDoc(data);
        if (dk && withinRange(dk)) out.push(data);
      });
    } catch {}
  };
  await scan("foodEntries");
  await scan("nutritionEntries");
  await scan("meals");
  return out;
}

async function loadWeights(uid: string, fromISO?: string, toISO?: string) {
  const out: WeightDoc[] = [];
  const withinRange = (iso: string) =>
    !fromISO || !toISO ? true : iso >= fromISO && iso <= toISO;
  const scan = async (sub: string) => {
    try {
      const collRef = collection(db, "users", uid, sub);
      let snap;
      try {
        let qy = query(collRef, orderBy("date", "asc"));
        if (fromISO && toISO) {
          qy = query(
            collRef,
            where("date", ">=", fromISO),
            where("date", "<=", toISO),
            orderBy("date", "asc")
          );
        }
        snap = await getDocs(qy);
      } catch {
        snap = await getDocs(collRef);
      }
      snap.forEach((d) => {
        const data = d.data() as any;
        const dk = dateKeyFromDoc(data);
        if (dk && withinRange(dk)) out.push(data);
      });
    } catch {}
  };
  await scan("weightEntries");
  await scan("bodyEntries");
  await scan("measurements");
  return out;
}

/* ────────────────────────────────────────────── */
/* Screen                                         */
export default function InsightsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { useRouter } = require("expo-router");
  const router = useRouter();
  const uid = user?.uid ?? "__demo__";

  const today = useMemo(() => new Date(), []);
  const last14 = useMemo(() => rangeDaysISO(14, today), [today]);
  const last30 = useMemo(() => rangeDaysISO(30, today), [today]);
  const last7 = useMemo(() => rangeDaysISO(7, today), [today]);

  const from14 = last14[0];
  const to14 = last14[last14.length - 1];
  const from30 = last30[0];
  const to30 = last30[last30.length - 1];

  // STATE
  const [loading, setLoading] = useState(false);

  // Daily maps
  const [volumeDaily, setVolumeDaily] = useState<Map<string, number>>(
    new Map()
  ); // date -> volume (sets*reps*weight_kg, weight>0 only)
  const [burnDaily, setBurnDaily] = useState<Map<string, number>>(new Map()); // date -> burn kcal
  const [mealCalsDaily, setMealCalsDaily] = useState<Map<string, number>>(
    new Map()
  ); // date -> intake kcal
  const [mealCountDaily, setMealCountDaily] = useState<Map<string, number>>(
    new Map()
  ); // date -> #meals

  // Aggregates
  const [workouts30, setWorkouts30] = useState(0);
  const [exBurn14, setExBurn14] = useState(0);
  const [meals14, setMeals14] = useState(0);
  const [mealCals14, setMealCals14] = useState(0);
  const [consistency7, setConsistency7] = useState(0); // 0..7

  // Weight
  const [weightSeries, setWeightSeries] = useState<Pt[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [weightDelta30, setWeightDelta30] = useState<number | null>(null);

  // NEW: keep total sets for 14d to display next to volume
  const [sets14, setSets14] = useState(0);

  /* LOAD DATA */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!uid) return;
      try {
        setLoading(true);

        // Workouts 14/30
        const [w14, w30] = await Promise.all([
          loadWorkouts(uid, from14, to14),
          loadWorkouts(uid, from30, to30),
        ]);

        // Volume per day (14d) — EXACTLY like Hero: volume = sets * reps * weight
        const vMap = new Map<string, number>();
        let setsCount = 0;

        for (const w of w14) {
          const d = dateKeyFromDoc(w);
          if (!d) continue;

          const s = Number(w.sets ?? 0);
          const r = Number(w.reps ?? 0);
          const wt = n(
            (w as any).weight ?? (w as any).weightKg ?? (w as any).weight_kg
          );

          setsCount += s;
          const vol = s * r * wt;
          vMap.set(d, (vMap.get(d) || 0) + vol);
        }

        // Exercise burn (14d)
        const burns14 = await loadExerciseBurns(uid, from14, to14);
        const bMap = new Map<string, number>();
        for (const b of burns14) {
          const d = dateKeyFromDoc(b);
          if (!d) continue;
          const kcal = n(b.calories);
          if (kcal <= 0) continue;
          bMap.set(d, (bMap.get(d) || 0) + kcal);
        }

        // Meals (14d)
        const meals14Docs = await loadMeals(uid, from14, to14);
        const mcMap = new Map<string, number>();
        const mcalMap = new Map<string, number>();
        for (const m of meals14Docs) {
          const d = dateKeyFromDoc(m);
          if (!d) continue;
          mcMap.set(d, (mcMap.get(d) || 0) + 1);
          const kcal = n(m.calories);
          if (kcal > 0) mcalMap.set(d, (mcalMap.get(d) || 0) + kcal);
        }

        // Consistency (7d) – any activity: workouts OR exercise burns OR meals
        const burns7 = await loadExerciseBurns(
          uid,
          last7[0],
          last7[last7.length - 1]
        );
        const meals7 = await loadMeals(uid, last7[0], last7[last7.length - 1]);
        const daysWithAny = new Set<string>();
        for (const w of w30) {
          const d = dateKeyFromDoc(w);
          if (d) daysWithAny.add(d);
        }
        for (const b of burns7) {
          const d = dateKeyFromDoc(b);
          if (d) daysWithAny.add(d);
        }
        for (const m of meals7) {
          const d = dateKeyFromDoc(m);
          if (d) daysWithAny.add(d);
        }
        const consistency = last7.reduce((acc, d) => {
          const iso = d.slice(0, 10);
          return acc + (daysWithAny.has(iso) ? 1 : 0);
        }, 0);

        // Weights (30d)
        const weights = await loadWeights(uid, from30, to30);
        const wpts: { date: string; kg: number }[] = [];
        for (const wd of weights) {
          const d = dateKeyFromDoc(wd);
          if (!d) continue;
          const kg = n(wd.weightKg ?? wd.weight_kg ?? wd.weight);
          if (kg <= 0) continue;
          wpts.push({ date: d, kg });
        }
        wpts.sort((a, b) => a.date.localeCompare(b.date));
        const wSeries: Pt[] = wpts.map((p, idx) => ({ x: idx, y: p.kg }));
        const wLatest = wpts.length ? wpts[wpts.length - 1].kg : null;
        const wFirst = wpts.length ? wpts[0].kg : null;
        const wDelta =
          wLatest !== null && wFirst !== null ? wLatest - wFirst : null;

        if (!cancelled) {
          setVolumeDaily(vMap);
          setSets14(setsCount);
          setBurnDaily(bMap);
          setMealCountDaily(mcMap);
          setMealCalsDaily(mcalMap);

          setWorkouts30(w30.length);
          setExBurn14(
            Math.round(sum(toPtsFromDailyMap(bMap, last14).map((p) => p.y)))
          );
          setMeals14(
            toPtsFromDailyMap(mcMap, last14).reduce((s, p) => s + p.y, 0)
          );
          setMealCals14(
            Math.round(sum(toPtsFromDailyMap(mcalMap, last14).map((p) => p.y)))
          );
          setConsistency7(consistency);

          setWeightSeries(wSeries);
          setLatestWeight(wLatest);
          setWeightDelta30(wDelta);
        }
      } catch (e) {
        console.warn("Insights load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, from14, to14, from30, to30, last7, last14]);

  // CHART SERIES
  const volumeSeries: Pt[] = useMemo(
    () => toPtsFromDailyMap(volumeDaily, last14),
    [volumeDaily, last14]
  );
  const burnSeries: Pt[] = useMemo(
    () => toPtsFromDailyMap(burnDaily, last14),
    [burnDaily, last14]
  );
  const mealCountSeries: Pt[] = useMemo(
    () => toPtsFromDailyMap(mealCountDaily, last14),
    [mealCountDaily, last14]
  );
  const mealCalsSeries: Pt[] = useMemo(
    () => toPtsFromDailyMap(mealCalsDaily, last14),
    [mealCalsDaily, last14]
  );

  // HEADER: Calendar chip
  const CalendarChip = () => (
    <Link href="/(modals)/full-calendar" asChild>
      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: withAlpha(colors.text, isDark ? 0.06 : 0.05),
        }}
      >
        <Ionicons name="calendar-outline" size={14} color={colors.text} />
        <Text style={{ color: colors.text, fontWeight: "800" }}>Calendar</Text>
      </Pressable>
    </Link>
  );

  const weightPrimary =
    latestWeight !== null ? `${Math.round(latestWeight)} kg` : "—";
  const weightSecondary =
    weightDelta30 !== null
      ? `${weightDelta30 >= 0 ? "+" : "−"}${Math.abs(
          Math.round(weightDelta30)
        )} kg in 30d`
      : "30d change";
  const totalVolume14 = Math.round(sum(volumeSeries.map((p) => p.y)));
  const avgMealsPerDay = (meals14 / 14).toFixed(1);
  const heroLift = scrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [0, -14],
    extrapolate: "clamp",
  });
  const heroScale = scrollY.interpolate({
    inputRange: [-50, 0, 140],
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
        icon: "flame-outline" as const,
        label: "Calories logged",
        progress: Math.min(1, mealCals14 / Math.max(1, 14 * 2200)),
        detail: `${mealCals14.toLocaleString()} kcal in 14d`,
      },
      {
        icon: "barbell-outline" as const,
        label: "Strength volume",
        progress: Math.min(1, totalVolume14 / Math.max(1, 14 * 4000)),
        detail: `${totalVolume14.toLocaleString()} kg in 14d`,
      },
      {
        icon: "checkmark-done-outline" as const,
        label: "Consistency",
        progress: Math.min(1, consistency7 / 7),
        detail: `${consistency7}/7 active days`,
      },
    ],
    [consistency7, mealCals14, totalVolume14]
  );
  const questXp = Math.round(
    (questList.reduce((s, q) => s + q.progress, 0) /
      Math.max(1, questList.length)) *
      100
  );

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: Platform.OS === "ios" ? 140 : 120,
        gap: 14,
      }}
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
          top: -70,
          right: -60,
          width: 220,
          height: 220,
          opacity: isDark ? 0.16 : 0.26,
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
          style={{ flex: 1, borderRadius: 120, transform: [{ rotate: "16deg" }] }}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 240,
          left: -80,
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
          style={{ flex: 1, borderRadius: 120, transform: [{ rotate: "-12deg" }] }}
        />
      </Animated.View>

      {/* Hero header */}
      <Animated.View
        style={{
          transform: [{ translateY: heroLift }, { scale: heroScale }],
        }}
      >
        <LinearGradient
          colors={[withAlpha(arcadeColors.neonBlue, 0.28), colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.35),
            overflow: "hidden",
            ...softShadow,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Text style={{ color: withAlpha(colors.text, 0.7), fontWeight: "800" }}>
                Your insights
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 26,
                  fontWeight: "900",
                  letterSpacing: 0.2,
                }}
              >
                14–30 day pulse
              </Text>
              <Text style={{ color: withAlpha(colors.text, 0.7), fontWeight: "600" }}>
                XP today: {questXp}
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: withAlpha(colors.card, 0.92),
                borderWidth: 1,
                borderColor: withAlpha(colors.border, 0.9),
                alignItems: "center",
                minWidth: 120,
              }}
            >
              <Text style={{ color: withAlpha(colors.text, 0.65), fontWeight: "700", fontSize: 12 }}>
                Meals / day
              </Text>
              <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>
                {avgMealsPerDay}
              </Text>
              <Text style={{ color: withAlpha(colors.text, 0.65), fontWeight: "700", fontSize: 12, marginTop: 4 }}>
                Volume 14d
              </Text>
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                {totalVolume14.toLocaleString()} kg
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <CalendarChip />
            <View
              style={{
                height: 10,
                borderRadius: 999,
                flex: 1,
                backgroundColor: withAlpha(colors.border, 0.9),
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.min(100, questXp)}%`,
                  height: "100%",
                  backgroundColor: arcadeColors.neonPink,
                  opacity: 0.85,
                }}
              />
            </View>
          </View>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              position: "absolute",
              top: 12,
              left: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              backgroundColor: withAlpha(colors.card, pressed ? 0.8 : 0.92),
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            })}
          >
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "800" }}>Back</Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>

      {/* Quests */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 420, delay: 60 }}
      >
        <LinearGradient
          colors={[withAlpha(arcadeColors.neonPink, 0.16), colors.card]}
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>
              Daily quests
            </Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: withAlpha(colors.card, 0.92),
                borderWidth: 1,
                borderColor: withAlpha(colors.border, 0.8),
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "800" }}>{questXp} XP</Text>
            </View>
          </View>
          <View style={{ gap: 10 }}>
            {questList.map((q, i) => (
              <QuestChip key={q.label} delay={80 + i * 60} {...q} />
            ))}
          </View>
        </LinearGradient>
      </MotiView>

      {/* Workout Volume */}
      <InsightCard
        title="Workout Volume"
        icon="barbell-outline"
        primary={`${Math.round(
          sum(volumeSeries.map((p) => p.y))
        ).toLocaleString()} kg`}
        secondary={`${sets14} sets • 14d`}
        accent="primary"
      >
        <View style={{ marginTop: 6 }}>
          <TrendMiniChart seriesA={volumeSeries} colorA="#3B82F6" height={64} />
        </View>
      </InsightCard>

      {/* Exercise Calories (burn) */}
      <InsightCard
        title="Exercise Calories"
        icon="flame-outline"
        primary={`${exBurn14.toLocaleString()} kcal`}
        secondary="14d total"
        accent="green"
      >
        <View style={{ marginTop: 6 }}>
          <TrendMiniChart seriesA={burnSeries} colorA="#10B981" height={64} />
        </View>
      </InsightCard>

      {/* Meals row: count + calories */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <InsightCard
            title="Meals Logged"
            icon="fast-food-outline"
            primary={`${meals14}`}
            secondary="past 14 days"
            accent="violet"
          >
            <View style={{ marginTop: 6 }}>
              <TrendMiniChart
                seriesA={mealCountSeries}
                colorA="#8B5CF6"
                height={56}
              />
            </View>
          </InsightCard>
        </View>

        <View style={{ flex: 1 }}>
          <InsightCard
            title="Meal Calories"
            icon="restaurant-outline"
            primary={`${mealCals14.toLocaleString()} kcal`}
            secondary="past 14 days"
            accent="cyan"
          >
            <View style={{ marginTop: 6 }}>
              <TrendMiniChart
                seriesA={mealCalsSeries}
                colorA="#06B6D4"
                height={56}
              />
            </View>
          </InsightCard>
        </View>
      </View>

      {/* Weight row: latest + 30d change */}
      <InsightCard
        title="Bodyweight"
        icon="scale-outline"
        primary={weightPrimary}
        secondary={weightSecondary}
        accent="primary"
      >
        <View style={{ marginTop: 6 }}>
          <TrendMiniChart seriesA={weightSeries} colorA="#3B82F6" height={64} />
        </View>
      </InsightCard>

      {/* Quick stats row */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <InsightCard
            title="Workouts"
            icon="fitness-outline"
            primary={`${workouts30}`}
            secondary="last 30 days"
            accent="violet"
          />
        </View>

        <View style={{ flex: 1 }}>
          <InsightCard
            title="Consistency"
            icon="checkmark-done-outline"
            primary={`${consistency7}/7 days`}
            secondary="activity in last week"
            accent="cyan"
          />
        </View>
      </View>
    </Animated.ScrollView>
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
