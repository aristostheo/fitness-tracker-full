// app/(tabs)/index.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Switch,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Link, Href, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";

import Card from "../../components/Card";
import { useAuth } from "@/content/AuthContext";
import {
  subscribeFoodsByDate,
  subscribeFoodsBetween,
  subscribeExerciseBetween,
  type FoodEntry,
  type ExerciseEntry,
} from "@/services/nutrition";
import {
  ensureProfile,
  subscribeProfile,
  updateProfile,
  type Profile,
} from "@/services/profile";
import WeeklyCaloriesChart from "@/components/WeeklyCaloriesChart";
import ProgressRing from "@/components/ProgressRing";
import { useTheme } from "@/content/ThemeProvider";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import { getAuth } from "firebase/auth";

/* ---------- utils ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const prettyDate = (ymdStr: string) => {
  const [y, m, d] = ymdStr.split("-").map(Number);
  if (!y || !m || !d) return ymdStr;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
};

function withAlpha(color: string, alpha = 0.25) {
  if (!color) return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("rgb")) {
    const body = color.replace(/^rgba?\(|\)$/g, "");
    const [r, g, b] = body.split(",").map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const m = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return color;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(
    m[3],
    16
  )}, ${alpha})`;
}

const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

/* initials helper for avatar */
function initialsOf(name?: string | null, email?: string | null) {
  const src = (name && name.trim()) || (email || "").split("@")[0] || "You";
  const parts = src.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

type SuggestionCard = {
  icon: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: Href;
  tint: "workout" | "meal" | "recovery" | "ok";
};

const AI_URL = process.env.EXPO_PUBLIC_AI_DESCRIBE_URL;
const AI_SUGGESTIONS_ENABLED =
  (process.env.EXPO_PUBLIC_AI_SUGGESTIONS || "on") !== "off";

/* ───────────── helpers: step calories ───────────── */
function estimateStepCalories(steps: number, weightKg?: number | null) {
  const per = 0.04 * ((weightKg && weightKg > 0 ? weightKg : 80) / 80);
  return Math.round((steps || 0) * per);
}

/* ───────────── daily suggestion (rule-based fallback) ───────────── */
function buildDailySuggestion(opts: {
  isRestToday: boolean;
  foodsToday: FoodEntry[];
  exerciseToday: ExerciseEntry[];
  kcalGoal: number;
  proteinGoal: number;
  greeting: string;
}): SuggestionCard {
  const {
    isRestToday,
    foodsToday,
    exerciseToday,
    kcalGoal,
    proteinGoal,
    greeting,
  } = opts;
  const hour = new Date().getHours();

  const totals = foodsToday.reduce(
    (a, f) => ({
      calories: a.calories + (f.calories || 0),
      protein: a.protein + (f.protein || 0),
      carbs: a.carbs + (f.carbs || 0),
      fat: a.fat + (f.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const cRemaining = Math.max(0, Math.round(kcalGoal - totals.calories));
  const pRemaining = Math.max(0, Math.round(proteinGoal - totals.protein));
  const noWorkoutYet = exerciseToday.length === 0;

  const mealSlot =
    hour < 11
      ? "breakfast"
      : hour < 15
      ? "lunch"
      : hour < 19
      ? "dinner"
      : "snacks";

  if (isRestToday) {
    return {
      icon: "leaf-outline" as const,
      title: "Recovery day focus",
      body:
        pRemaining > 0
          ? `Keep it light: aim for ${pRemaining}g protein left with mostly whole foods. Add a 20–30 min walk and 5–10 min mobility before bed. Hydrate!`
          : "Keep it light: prioritize whole foods, 20–30 min easy walk, and 5–10 min mobility before bed. Hydrate!",
      ctaLabel: "Log mobility / walk",
      href: "/(tabs)/workouts" as Href,
      tint: "recovery" as const,
    };
  }

  if (noWorkoutYet) {
    return {
      icon: "barbell-outline" as const,
      title: `${greeting.split(",")[0]} boost`,
      body:
        hour < 15
          ? "Quick suggestion: 25–35 min full-body circuit (3 rounds, 6–8 reps) or 20 min zone-2 cardio. You'll feel great after."
          : "Evening pick-me-up: 20–30 min full-body or 20 min zone-2 cardio. Keep RPE ~6–7.",
      ctaLabel: "Start a workout",
      href: "/(tabs)/workouts" as Href,
      tint: "workout" as const,
    };
  }

  if (cRemaining > 120 || pRemaining > 15) {
    return {
      icon: "fast-food-outline" as const,
      title: `Dial in your ${mealSlot}`,
      body: `Try a ${mealSlot} around ${Math.min(
        cRemaining,
        650
      )} kcal with ≥${Math.min(
        pRemaining || 25,
        55
      )}g protein. Example: chicken bowl (rice, greens, beans) or Greek yogurt + fruit + granola.`,
      ctaLabel: "Add a meal",
      href: "/(tabs)/nutrition" as Href,
      tint: "meal" as const,
    };
  }

  return {
    icon: "thumbs-up-outline" as const,
    title: "Nice pace today",
    body: "You’re trending toward your targets. Keep meals balanced and finish strong with hydration and a walk.",
    ctaLabel: "Review nutrition",
    href: "/(tabs)/nutrition" as Href,
    tint: "ok" as const,
  };
}

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const [date, setDate] = useState(ymd(new Date()));

  const todayStr = ymd(new Date());
  const isToday = date === todayStr;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  });

  const openDatePicker = () => {
    const [y, m, d] = date.split("-").map(Number);
    setPickerDate(new Date(y, m - 1, d));
    setShowDatePicker(true);
  };

  const applyPickedDate = () => {
    const base = new Date(pickerDate);
    base.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const chosen = base.getTime() > today.getTime() ? today : base;
    setDate(ymd(chosen));
    setShowDatePicker(false);
  };

  const cancelDatePicker = () => {
    setShowDatePicker(false);
  };

  const shiftDate = (delta: number) => {
    setDate((prev) => {
      const current = prev || todayStr;

      // Parse "YYYY-MM-DD" as a local date to avoid timezone weirdness
      const [y, m, d] = current.split("-").map(Number);
      const base = new Date(y, m - 1, d);
      base.setHours(0, 0, 0, 0);
      base.setDate(base.getDate() + delta);
      const next = base;

      // don’t allow going into the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (next.getTime() > today.getTime()) return prev;

      return ymd(next);
    });
  };

  const goPrevDay = () => shiftDate(-1);
  const goNextDay = () => shiftDate(1);
  const goToday = () => setDate(todayStr);

  // provide a safe "success" tint even if ThemeColors doesn't define it
  const successTint =
    (colors as any).success ?? (colors as any).chartSecondary ?? colors.primary;

  // responsive helpers
  const isCompact = width < 390; // iPhone mini / compact
  const headingSize = isCompact ? 24 : 28;

  // today
  const [foodsToday, setFoodsToday] = useState<FoodEntry[]>([]);
  const [exerciseToday, setExerciseToday] = useState<ExerciseEntry[]>([]);

  // goals/profile
  const [profile, setProfile] = useState<Profile | null>(null);

  // last 7 days (inclusive)
  const [foodsRange, setFoodsRange] = useState<FoodEntry[]>([]);
  const [exerciseRange, setExerciseRange] = useState<ExerciseEntry[]>([]);

  // NEW: steps state derived from profile (per-day map)
  const todayKey = date;
  const stepsGoal =
    (profile as any)?.stepsGoal != null
      ? Number((profile as any).stepsGoal)
      : 8000;
  const weightKg = (profile as any)?.weightKg ?? 80;
  const stepsToday = useMemo(() => {
    const map = ((profile as any)?.steps ?? {}) as Record<string, number>;
    return Number(map?.[todayKey] ?? 0);
  }, [profile, todayKey]);

  // quick entry modal
  const [openStepsModal, setOpenStepsModal] = useState(false);
  const [customSteps, setCustomSteps] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const unsubs: Array<() => void> = [];

    // Foods for today + log
    unsubs.push(
      subscribeFoodsByDate(user.uid, date, (arr) => {
        setFoodsToday(arr);
      })
    );

    (async () => {
      await ensureProfile(user.uid, user.email ? { email: user.email } : {});
      unsubs.push(subscribeProfile(user.uid, setProfile));
    })();

    const today = new Date();
    const start = addDays(today, -6);
    const from = ymd(start);
    const to = ymd(today);
    unsubs.push(subscribeFoodsBetween(user.uid, from, to, setFoodsRange));
    unsubs.push(subscribeExerciseBetween(user.uid, from, to, setExerciseRange));

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {}
      });
    };
  }, [user?.uid, date]);

  // Derive exerciseToday from range for the selected date
  useEffect(() => {
    // Parse "YYYY-MM-DD" as a local date
    const [y, m, d] = date.split("-").map(Number);
    const selected = new Date(y, m - 1, d);

    const start = new Date(selected);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selected);
    end.setHours(23, 59, 59, 999);

    const toMillis = (v: any): number => {
      if (!v) return 0;
      if (typeof v === "number") return v;
      if (typeof v?.toMillis === "function") return v.toMillis();
      if (typeof v?.seconds === "number") return v.seconds * 1000;
      return 0;
    };

    const filtered = exerciseRange.filter((x) => {
      if (x.date && x.date === date) return true;
      const ms = toMillis((x as any).createdAt);
      return ms >= start.getTime() && ms <= end.getTime();
    });

    setExerciseToday(filtered);
  }, [exerciseRange, date]);

  const hasWorkoutToday = exerciseToday.length > 0;

  // today totals (+ step calories)
  const stepKcal = estimateStepCalories(stepsToday, weightKg);
  const totals = useMemo(() => {
    const t = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
    };

    foodsToday.forEach((f) => {
      const x = f as any;
      t.calories += x.calories || 0;
      t.protein += x.protein || 0;
      t.carbs += x.carbs || 0;
      t.fat += x.fat || 0;
      // handle both `fiber` and `fibre` just in case
      t.fiber += x.fiber ?? x.fibre ?? 0;
      t.sugar += x.sugar ?? 0;
    });

    const burnedWorkouts = exerciseToday.reduce(
      (s, e) => s + (e.calories || 0),
      0
    );
    const burned = burnedWorkouts + stepKcal;
    return { ...t, burned, net: t.calories - burned, burnedWorkouts };
  }, [foodsToday, exerciseToday, stepKcal]);

  // weekly series (unchanged — doesn’t yet include steps; optional future work)
  const weekly = useMemo(() => {
    const today = new Date();
    const start = addDays(today, -6);
    const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(start, i)));
    const consumedMap = Object.fromEntries(days.map((d) => [d, 0]));
    const burnedMap = Object.fromEntries(days.map((d) => [d, 0]));
    foodsRange.forEach((f) => {
      if (consumedMap[f.date] != null)
        consumedMap[f.date] += Number(f.calories || 0);
    });
    exerciseRange.forEach((x) => {
      if (burnedMap[x.date] != null)
        burnedMap[x.date] += Number(x.calories || 0);
    });
    return days.map((d) => ({
      date: d.slice(5),
      consumed: consumedMap[d] || 0,
      burned: burnedMap[d] || 0, // step kcal not backfilled historically (yet)
      net: (consumedMap[d] || 0) - (burnedMap[d] || 0),
    }));
  }, [foodsRange, exerciseRange]);

  // goals
  const kcalGoal = profile?.dailyCaloriesTarget ?? profile?.calorieGoal ?? 2200;
  const proteinGoal = profile?.dailyProteinTarget ?? 130;

  // derived hero stats
  const caloriesRemaining = Math.max(
    0,
    Math.round((kcalGoal || 0) - totals.calories)
  );
  const proteinRemaining = Math.max(
    0,
    Math.round((proteinGoal || 0) - totals.protein)
  );

  const netDiff = kcalGoal || 0 ? totals.net - kcalGoal : 0;
  const netStatus = !kcalGoal
    ? "Goal not set"
    : netDiff < -200
    ? "Under target"
    : netDiff > 200
    ? "Above target"
    : "On track";

  const netStatusColor = !kcalGoal
    ? withAlpha(colors.text, 0.7)
    : netDiff < -200
    ? colors.primary
    : netDiff > 200
    ? "#FFB02E"
    : successTint;

  /* greeting + tiny avatar */
  const greetingLabel = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const greeting = `${greetingLabel}, ${user?.displayName || "there"}`;
  const initials = initialsOf(
    profile?.displayName ?? undefined,
    user?.email ?? undefined
  );

  /* rest-day flag (per selected date) */
  const restDays = (profile as any)?.restDays || {};
  const isRestToday = !!restDays?.[date];
  const toggleRest = async (v: boolean) => {
    if (!user?.uid) return;
    try {
      await updateProfile(user.uid, { [`restDays.${date}`]: v });
    } catch {}
  };

  // Steps updaters
  const writeSteps = async (next: number) => {
    if (!user?.uid) return;
    const safe = Math.max(0, Math.round(next || 0));
    try {
      await updateProfile(user.uid, { [`steps.${todayKey}`]: safe });
    } catch {}
  };
  const addSteps = (delta: number) => writeSteps((stepsToday || 0) + delta);

  // Build daily suggestion
  const [suggestion, setSuggestion] = useState<SuggestionCard>(
    buildDailySuggestion({
      isRestToday,
      foodsToday,
      exerciseToday,
      kcalGoal,
      proteinGoal,
      greeting,
    })
  );

  const lastSugKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // local fallback
    const fallback = buildDailySuggestion({
      isRestToday,
      foodsToday,
      exerciseToday,
      kcalGoal,
      proteinGoal,
      greeting,
    });
    setSuggestion((prev) => {
      if (
        prev.title === fallback.title &&
        prev.body === fallback.body &&
        prev.ctaLabel === fallback.ctaLabel &&
        prev.tint === fallback.tint
      ) {
        return prev;
      }
      return fallback;
    });

    // (server AI kept as-is, not relevant to steps UI)
    if (!AI_SUGGESTIONS_ENABLED || !AI_URL || !user?.uid) return;

    const hour = new Date().getHours();
    const totalsNow = {
      calories: Math.round(
        foodsToday.reduce((s, f) => s + (f.calories || 0), 0)
      ),
      protein: Math.round(foodsToday.reduce((s, f) => s + (f.protein || 0), 0)),
      burned: Math.round(
        exerciseToday.reduce((s, e) => s + (e.calories || 0), 0)
      ),
    };
    const cRem = Math.max(0, Math.round(kcalGoal - totalsNow.calories));
    const pRem = Math.max(0, Math.round(proteinGoal - totalsNow.protein));
    const interesting =
      isRestToday || exerciseToday.length === 0 || cRem > 200 || pRem > 20;

    const tod =
      hour < 11
        ? "morning"
        : hour < 15
        ? "afternoon"
        : hour < 19
        ? "evening"
        : "night";
    const cB = cRem <= 200 ? "b0" : cRem <= 500 ? "b1" : "b2";
    const pB = pRem <= 20 ? "b0" : pRem <= 40 ? "b1" : "b2";
    const key = `${ymd(new Date())}|${tod}|R${isRestToday ? 1 : 0}|W${
      exerciseToday.length ? 1 : 0
    }|C${cB}|P${pB}`;
    if (!interesting || lastSugKeyRef.current === key) return;

    (async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken(true);
        const res = await fetch(AI_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            mode: "suggest:v1",
            date: ymd(new Date()),
            timeOfDay: hour,
            isRestDay: isRestToday,
            goals: { calories: kcalGoal, protein: proteinGoal },
            totals: totalsNow,
          }),
        });

        if (!cancelled && res.ok) {
          const raw = (await res.json()) as Partial<SuggestionCard> & {
            href?: any;
            tint?: string;
          };
          if (raw?.title && raw?.ctaLabel && raw?.href) {
            const allowed = new Set(["workout", "meal", "recovery", "ok"]);
            const safeTint = allowed.has(raw.tint || "")
              ? (raw.tint as SuggestionCard["tint"])
              : "ok";
            setSuggestion((prev) => ({
              icon: raw.icon || prev.icon || "sparkles-outline",
              title: raw.title!,
              body: raw.body || "",
              ctaLabel: raw.ctaLabel!,
              href: raw.href as Href,
              tint: safeTint,
            }));
            lastSugKeyRef.current = key;
          }
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [
    user?.uid,
    isRestToday,
    kcalGoal,
    proteinGoal,
    greeting,
    foodsToday.length,
    exerciseToday.length,
  ]);

  /* ---------- UI ---------- */
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* TOP BAR / AVATAR */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(colors.primary, 0.18),
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              {initials}
            </Text>
          </View>

          {/* Date picker controls + feedback */}
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Pressable onPress={goPrevDay} style={{ padding: 4 }} hitSlop={8}>
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={withAlpha(colors.text, 0.6)}
                />
              </Pressable>

              <Pressable
                onPress={goToday}
                onLongPress={openDatePicker}
                delayLongPress={250}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: withAlpha(colors.primary, 0.16),
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "600",
                  }}
                >
                  {isToday ? "Today" : date}
                </Text>
              </Pressable>

              <Pressable
                onPress={goNextDay}
                disabled={isToday}
                style={{ padding: 4, opacity: isToday ? 0.3 : 1 }}
                hitSlop={8}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={withAlpha(colors.text, 0.6)}
                />
              </Pressable>
            </View>

            <Text
              style={{
                marginTop: 2,
                fontSize: 11,
                color: withAlpha(colors.text, 0.6),
              }}
            >
              {isToday ? "Viewing today" : `Viewing ${prettyDate(date)}`}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Ionicons name="bed-outline" size={16} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: "700" }}>Rest</Text>
          <Switch value={isRestToday} onValueChange={toggleRest} />
          <IconBtn icon="notifications-outline" />
          <IconBtn
            icon="settings-outline"
            onPress={() => router.push("/(modals)/settings")}
          />
        </View>
      </View>

      {/* HERO / GLASS + GRADIENT (revamped) */}
      <MotiView
        from={{ opacity: 0, translateY: 12, scale: 0.98 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ type: "timing", duration: 520 }}
      >
        <LinearGradient
          colors={[
            withAlpha(colors.primary, 0.26),
            withAlpha(successTint, 0.24),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              borderRadius: 26,
              padding: 16,
              borderWidth: 1,
              borderColor: withAlpha(colors.border, 0.9),
              overflow: "hidden",
              position: "relative",
            },
            softShadow,
          ]}
        >
          {/* subtle glow blobs */}
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: 999,
              backgroundColor: withAlpha(successTint, 0.38),
              opacity: 0.6,
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -60,
              left: -40,
              width: 190,
              height: 190,
              borderRadius: 999,
              backgroundColor: withAlpha(colors.primary, 0.4),
              opacity: 0.4,
            }}
          />

          {/* scrim */}
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: withAlpha(colors.card, 0.9),
            }}
          />

          <View style={{ position: "relative" }}>
            <View
              style={{
                flexDirection: isCompact ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isCompact ? "flex-start" : "center",
                gap: 16,
              }}
            >
              {/* LEFT: greeting + micro stats */}
              <View
                style={{
                  flex: 1,
                  paddingRight: isCompact ? 0 : 12,
                  minWidth: 0,
                }}
              >
                <View
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.border, 0.9),
                    backgroundColor: withAlpha(colors.background, 0.18),
                    marginBottom: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={isRestToday ? "leaf-outline" : "flash-outline"}
                    size={14}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      color: withAlpha(colors.text, 0.8),
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    {isRestToday ? "Recovery day overview" : "Daily overview"}
                  </Text>
                </View>

                <Text
                  style={{
                    color: colors.text,
                    fontSize: headingSize,
                    fontWeight: "900",
                    letterSpacing: 0.25,
                    textShadowColor: withAlpha("#000", 0.16),
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                    lineHeight: headingSize + 4,
                  }}
                  allowFontScaling
                  adjustsFontSizeToFit={isCompact}
                  minimumFontScale={0.8}
                  numberOfLines={3} // allow an extra line
                >
                  {greeting}
                </Text>

                <Text
                  style={{
                    color: withAlpha(colors.text, 0.75),
                    marginTop: 4,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {prettyDate(date)} ·{" "}
                  {isRestToday
                    ? "Focus on easy movement, steps, and sleep."
                    : "Hit your calories and steps to stay on track."}
                </Text>

                {/* mini stat chips */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <MiniStat
                    label="Calories"
                    primary={`${Math.round(
                      totals.calories
                    ).toLocaleString()} kcal`}
                    secondary={
                      kcalGoal
                        ? `of ${Math.round(
                            kcalGoal
                          ).toLocaleString()} • ${caloriesRemaining.toLocaleString()} left`
                        : "Goal not set"
                    }
                  />
                  <MiniStat
                    label="Protein"
                    primary={`${Math.round(totals.protein)} g`}
                    secondary={
                      proteinGoal
                        ? `of ${Math.round(
                            proteinGoal
                          )} g • ${proteinRemaining} g left`
                        : "Goal not set"
                    }
                  />
                  <MiniStat
                    label="Steps"
                    primary={`${stepsToday.toLocaleString()} steps`}
                    secondary={`Goal ${stepsGoal.toLocaleString()}`}
                  />
                  <MiniStat
                    label="Workout"
                    primary={hasWorkoutToday ? "Logged" : "Not logged"}
                    secondary={
                      hasWorkoutToday
                        ? "Nice work — keep the streak."
                        : "Tap “Log Workout” below to add one."
                    }
                  />
                </View>
              </View>

              {/* RIGHT: net ring + status */}
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 150,
                  paddingVertical: isCompact ? 6 : 0,
                }}
              >
                <ProgressRing
                  label="Net calories"
                  value={Math.max(0, totals.net)}
                  target={kcalGoal}
                  unit="kcal"
                />
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    fontWeight: "800",
                    color: isDark ? "#ffffff" : colors.text,
                  }}
                >
                  Net {Math.round(totals.net).toLocaleString()} kcal
                </Text>

                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    fontWeight: "600",
                    color: netStatusColor,
                  }}
                >
                  {netStatus}
                </Text>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: withAlpha(colors.text, 0.7),
                  }}
                >
                  Target {Math.round(kcalGoal).toLocaleString()} kcal
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </MotiView>

      {/* AI Suggestions — unchanged */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 60 }}
      >
        <Card
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.35),
            borderRadius: 18,
            ...softShadow,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: withAlpha(colors.primary, 0.15),
                borderWidth: 1,
                borderColor: withAlpha(colors.border, 0.8),
              }}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <Text
              style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}
            >
              AI Suggestions
            </Text>
          </View>

          <View style={{ marginTop: 10, gap: 6 }}>
            <Text
              style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}
            >
              {suggestion.title}
            </Text>
            <Text
              style={{ color: withAlpha(colors.text, 0.75), lineHeight: 20 }}
            >
              {suggestion.body}
            </Text>
          </View>

          <View style={{ marginTop: 12 }}>
            <Link href={suggestion.href} asChild>
              <Pressable
                style={({ pressed }) => [
                  {
                    height: 44,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      suggestion.tint === "workout"
                        ? (colors as any).chartSecondary ?? successTint
                        : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>
                  {suggestion.ctaLabel}
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </MotiView>

      {/* QUICK STATS – full daily macro picture */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 80 }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <StatCard
            label="Calories"
            value={`${Math.round(totals.calories)} kcal`}
          />
          <StatCard label="Protein" value={`${Math.round(totals.protein)} g`} />
          <StatCard label="Carbs" value={`${Math.round(totals.carbs)} g`} />
          <StatCard label="Fat" value={`${Math.round(totals.fat)} g`} />
          <StatCard label="Fibre" value={`${Math.round(totals.fiber)} g`} />
          <StatCard label="Sugar" value={`${Math.round(totals.sugar)} g`} />
          <StatCard
            label="Exercise"
            value={`-${Math.round(totals.burned)} kcal`}
          />
          <StatCard
            label="Net"
            value={`${Math.round(totals.net)} kcal`}
            accent
          />
        </View>
      </MotiView>

      {/* GOALS */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 120 }}
      >
        <Card
          style={{ padding: 14, borderWidth: 1, borderColor: colors.border }}
        >
          <SectionTitle icon="trophy-outline" text="Goals" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <ProgressRing
              label="Calorie Goal"
              value={totals.calories}
              target={kcalGoal}
              unit="kcal"
            />
            <ProgressRing
              label="Protein Goal"
              value={totals.protein}
              target={proteinGoal}
              unit="g"
            />
            {/* NEW: Steps Goal ring */}
            <ProgressRing
              label="Steps Goal"
              value={stepsToday}
              target={Math.max(1, stepsGoal || 8000)}
              unit="steps"
            />
          </View>
        </Card>
      </MotiView>

      {/* NEW: Steps quick-add card */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 140 }}
      >
        <Card
          style={{ padding: 14, borderWidth: 1, borderColor: colors.border }}
        >
          <SectionTitle icon="footsteps-outline" text="Steps" />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <View style={{ flexGrow: 1, minWidth: 180 }}>
              <HeadlineValue
                value={`${stepsToday.toLocaleString()} / ${stepsGoal.toLocaleString()} steps`}
              />
              <Text style={{ color: withAlpha(colors.text, 0.6) }}>
                Estimated burn: {stepKcal} kcal (adds to “Burned”)
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { d: 100, label: "+100" },
                { d: 500, label: "+500" },
                { d: 1000, label: "+1000" },
              ].map((b) => (
                <Pressable
                  key={b.d}
                  onPress={() => addSteps(b.d)}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.primary, 0.4),
                    backgroundColor: withAlpha(
                      colors.primary,
                      pressed ? 0.24 : 0.14
                    ),
                  })}
                >
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    {b.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  setCustomSteps("");
                  setOpenStepsModal(true);
                }}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: withAlpha(colors.card, pressed ? 0.9 : 1),
                })}
              >
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                  Custom
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </MotiView>

      {/* WEEKLY CHART */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 200 }}
      >
        <Card style={{ borderWidth: 1, borderColor: colors.border }}>
          <SectionTitle icon="stats-chart-outline" text="Weekly Trend" />
          <WeeklyCaloriesChart data={weekly} />
        </Card>
      </MotiView>

      {/* TODAY SNAPSHOT BAR */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 220 }}
      >
        <Card
          style={{ padding: 16, borderWidth: 1, borderColor: colors.border }}
        >
          <SectionTitle icon="pulse-outline" text="Daily Snapshot" />
          <TodayBar
            consumed={totals.calories}
            burned={totals.burned}
            target={kcalGoal}
            primary={colors.primary}
            secondary={(colors as any).chartSecondary ?? successTint}
            border={colors.border}
            textColor={colors.text}
            muted={withAlpha(colors.text, 0.6)}
          />
        </Card>
      </MotiView>

      {/* QUICK ACTIONS */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 260 }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <ActionTile
            icon="barbell-outline"
            title="Log Workout"
            desc="Add sets, reps, weight"
            to={"/(tabs)/workouts" as Href}
            tint={(colors as any).chartSecondary ?? successTint}
          />
          <ActionTile
            icon="fast-food-outline"
            title="Add Meal"
            desc="Track food & macros"
            to={"/(tabs)/nutrition" as Href}
            tint={colors.primary}
          />
          <ActionTile
            icon="person-circle-outline"
            title="Profile"
            desc="Account & preferences"
            to={"/(tabs)/profile" as Href}
            tint={(colors as any).success ?? colors.primary}
          />
        </View>
      </MotiView>

      <BottomTabSpacer extra={16} />

      {/* Steps custom modal */}
      <Modal transparent visible={openStepsModal} animationType="fade">
        <Pressable
          onPress={() => setOpenStepsModal(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 16,
              gap: 12,
            }}
          >
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
            >
              Add custom steps
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: withAlpha(colors.card, 0.95),
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons
                name="footsteps-outline"
                size={18}
                color={colors.text}
                style={{ marginRight: 8 }}
              />
              <TextInput
                placeholder="e.g., 750"
                placeholderTextColor={withAlpha(colors.text, 0.45)}
                inputMode="numeric"
                value={customSteps}
                onChangeText={(t) => setCustomSteps(t.replace(/[^0-9]/g, ""))}
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: 18,
                  paddingVertical: 2,
                }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => setOpenStepsModal(false)}
                style={{ paddingVertical: 10, paddingHorizontal: 12 }}
              >
                <Text style={{ color: withAlpha(colors.text, 0.8) }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const n = Math.max(0, Number(customSteps || 0));
                  if (n) addSteps(n);
                  setOpenStepsModal(false);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {/* Date picker modal (long-press on date chip) */}
      <Modal transparent visible={showDatePicker} animationType="fade">
        <Pressable
          onPress={cancelDatePicker}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 16,
              gap: 12,
            }}
          >
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
            >
              Jump to date
            </Text>

            <DateTimePicker
              value={pickerDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "calendar"}
              maximumDate={new Date()} // no future dates
              onChange={(_, selected) => {
                if (selected) setPickerDate(selected);
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <Pressable
                onPress={cancelDatePicker}
                style={{ paddingVertical: 10, paddingHorizontal: 12 }}
              >
                <Text style={{ color: withAlpha(colors.text, 0.8) }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={applyPickedDate}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

/* ---------- bits (helpers) ---------- */

function IconBtn({ icon, onPress }: { icon: any; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(colors.card, 0.9),
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
    </Pressable>
  );
}

function SectionTitle({
  icon,
  text,
  compact,
}: {
  icon: any;
  text: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: compact ? 6 : 10,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(colors.primary, 0.15),
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, 0.35),
        }}
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={{ color: colors.text, fontWeight: "800" }}>{text}</Text>
    </View>
  );
}

function HeadlineValue({ value }: { value: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
      {value}
    </Text>
  );
}

function RowSplit({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      {children}
    </View>
  );
}

function MiniStat({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.9),
        backgroundColor: withAlpha(colors.card, 0.95),
        minWidth: 150,
        maxWidth: 220,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          color: withAlpha(colors.text, 0.6),
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          color: colors.text,
        }}
      >
        {primary}
      </Text>
      {secondary ? (
        <Text
          style={{
            fontSize: 11,
            marginTop: 2,
            color: withAlpha(colors.text, 0.7),
          }}
          numberOfLines={2}
        >
          {secondary}
        </Text>
      ) : null}
    </View>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Card
      style={{
        padding: 16,
        minWidth: 150,
        borderWidth: 1,
        borderColor: accent ? withAlpha(colors.primary, 0.35) : colors.border,
        borderRadius: 16,
        ...softShadow,
      }}
    >
      <Text
        style={{
          color: withAlpha(colors.text, 0.6),
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
        {value}
      </Text>
    </Card>
  );
}

function Pill({
  icon,
  label,
  value,
  tint,
}: {
  icon: any;
  label: string;
  value: string;
  tint: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: withAlpha(tint, 0.18),
        borderWidth: 1,
        borderColor: withAlpha(tint, 0.35),
      }}
    >
      <Ionicons name={icon} size={16} color={tint} />
      <Text style={{ color: colors.text, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: withAlpha(colors.text, 0.6) }}>· {value}</Text>
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: withAlpha(color, 0.5),
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color }}>{text}</Text>
    </View>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 180,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: withAlpha(colors.card, 0.9),
        ...softShadow,
      }}
    >
      {children}
    </View>
  );
}

function ActionTile({
  icon,
  title,
  desc,
  to,
  tint,
}: {
  icon: any;
  title: string;
  desc: string;
  to: Href;
  tint: string;
}) {
  const { colors } = useTheme();
  return (
    <Link href={to} asChild>
      <Pressable>
        {({ pressed }) => (
          <MotiView
            from={{ scale: 1 }}
            animate={{ scale: pressed ? 0.98 : 1 }}
            transition={{ type: "timing", duration: 120 }}
            style={{
              padding: 16,
              minWidth: 160,
              borderRadius: 18,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              ...softShadow,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: withAlpha(tint, 0.15),
                borderWidth: 1,
                borderColor: withAlpha(tint, 0.35),
                marginBottom: 8,
              }}
            >
              <Ionicons name={icon} size={20} color={tint} />
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "800", color: colors.text }}
            >
              {title}
            </Text>
            <Text style={{ color: withAlpha(colors.text, 0.6) }}>{desc}</Text>
          </MotiView>
        )}
      </Pressable>
    </Link>
  );
}

function TodayBar({
  consumed,
  burned,
  target,
  primary,
  secondary,
  border,
  textColor,
  muted,
}: {
  consumed: number;
  burned: number;
  target: number;
  primary: string;
  secondary: string;
  border: string;
  textColor: string;
  muted: string;
}) {
  const safeTarget = Math.max(1, target || 1);
  const pctConsumed = Math.min(100, Math.round((consumed / safeTarget) * 100));
  const pctBurned = Math.min(100, Math.round((burned / safeTarget) * 100));
  const net = consumed - burned;

  return (
    <View>
      <View
        style={{
          height: 16,
          borderRadius: 999,
          backgroundColor: withAlpha("#ffffff", 0.04),
          borderWidth: 1,
          borderColor: border,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pctConsumed}%`,
            height: "100%",
            backgroundColor: withAlpha(primary, 0.9),
          }}
        >
          <View
            style={{
              width: `${pctBurned}%`,
              height: "100%",
              backgroundColor: withAlpha(secondary, 0.9),
              opacity: 0.65,
            }}
          />
        </View>
      </View>
      <View
        style={{
          marginTop: 8,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: muted }}>Target: {Math.round(target)} kcal</Text>
        <Text style={{ color: textColor, fontWeight: "700" }}>
          Net: {Math.round(net)} kcal
        </Text>
      </View>
    </View>
  );
}
