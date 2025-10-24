// =============================
// FILE: app/(tabs)/insights.tsx
// =============================
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
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
};

const db = getFirestore();

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

/* ────────────────────────────────────────────── */
/* Firestore loaders (with safe fallbacks)        */
async function loadWorkouts(uid: string, fromISO?: string, toISO?: string) {
  const collRef = collection(db, "users", uid, "exerciseEntries");
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
  const items: WorkoutDoc[] = [];
  snap.forEach((d) => items.push(d.data() as any));
  return items;
}

async function loadExerciseBurns(uid: string, fromISO: string, toISO: string) {
  const out: BurnDoc[] = [];
  const scan = async (sub: string) => {
    try {
      const collRef = collection(db, "users", uid, sub);
      const qy = query(
        collRef,
        where("date", ">=", fromISO),
        where("date", "<=", toISO),
        orderBy("date", "asc")
      );
      const snap = await getDocs(qy);
      snap.forEach((d) => out.push(d.data() as any));
    } catch {}
  };
  await scan("exerciseBurnEntries");
  await scan("activityEntries");
  await scan("exercises");
  return out;
}

async function loadMeals(uid: string, fromISO: string, toISO: string) {
  const out: MealDoc[] = [];
  const scan = async (sub: string) => {
    try {
      const collRef = collection(db, "users", uid, sub);
      const qy = query(
        collRef,
        where("date", ">=", fromISO),
        where("date", "<=", toISO),
        orderBy("date", "asc")
      );
      const snap = await getDocs(qy);
      snap.forEach((d) => out.push(d.data() as any));
    } catch {}
  };
  await scan("foodEntries");
  await scan("nutritionEntries");
  await scan("meals");
  return out;
}

async function loadWeights(uid: string, fromISO?: string, toISO?: string) {
  const out: WeightDoc[] = [];
  const scan = async (sub: string) => {
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
      snap.forEach((d) => out.push(d.data() as any));
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
          const d = (w.date as string) || "";
          if (!d) continue;

          const s = Number(w.sets ?? 0);
          const r = Number(w.reps ?? 0);
          // Match Hero.tsx: use the 'weight' field directly (kg), no extra keys, no filtering
          const wt = Number((w as any).weight ?? 0);

          setsCount += s;
          const vol = s * r * wt;
          vMap.set(d, (vMap.get(d) || 0) + vol);
        }

        // Exercise burn (14d)
        const burns14 = await loadExerciseBurns(uid, from14, to14);
        const bMap = new Map<string, number>();
        for (const b of burns14) {
          const d = b.date || "";
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
          const d = m.date || "";
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
        for (const w of w30) if (w.date) daysWithAny.add(w.date);
        for (const b of burns7) if (b.date) daysWithAny.add(b.date);
        for (const m of meals7) if (m.date) daysWithAny.add(m.date);
        const consistency = last7.reduce(
          (acc, d) => acc + (daysWithAny.has(d) ? 1 : 0),
          0
        );

        // Weights (30d)
        const weights = await loadWeights(uid, from30, to30);
        const wpts: { date: string; kg: number }[] = [];
        for (const wd of weights) {
          const d = wd.date;
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 16,
        // BIGGER bottom padding so last cards never get clipped by the tab bar / home indicator.
        paddingBottom: Platform.OS === "ios" ? 140 : 120,
        gap: 14,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingBottom: 2,
        }}
      >
        <View>
          <Text style={{ color: colors.muted, fontWeight: "800" }}>
            Your insights
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: "900",
              marginTop: 2,
            }}
          >
            Last 14–30 days
          </Text>
        </View>
        <CalendarChip />
      </View>

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
    </ScrollView>
  );
}
