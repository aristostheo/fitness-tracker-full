// app/(tabs)/home.tsx
// Premium Home page (Apple-inspired, calm + rewarding)
// Requires: expo-router, expo-blur, expo-linear-gradient, moti, react-native-reanimated, @expo/vector-icons
// Uses your ThemeProvider: import { useTheme } from "@/content/ThemeProvider";
// app/(tabs)/home.tsx
// Premium Home page (Apple-inspired) wired to your OLD backend logic.
// Requires: expo-router, expo-blur, expo-linear-gradient, moti, react-native-reanimated, @expo/vector-icons
// Uses: ThemeProvider + AuthContext + services from your repo

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
  AccessibilityInfo,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";

import {
  subscribeActivityBetween,
  addActivity,
  updateActivity,
  deleteActivity,
  type ActivityEntry as CardioEntry,
} from "@/services/activity";

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
  type Profile,
} from "@/services/profile";

// New components you added earlier
import { MetricRing } from "@/components/home/MetricRing";
import {
  QuickActionRow,
  type QuickAction,
} from "@/components/home/QuickActionRow";
import {
  AISuggestionCard,
  type AISuggestion,
} from "@/components/home/AISuggestionCard";
import { AnimatedStepPill } from "@/components/home/AnimatedStepPill";

import { TextInput, KeyboardAvoidingView } from "react-native";
import * as Haptics from "expo-haptics"; // optional
import { setStepsForDate, addStepsForDate } from "@/services/profile";
import ActivityLogSheet from "@/components/activity/ActivityLogSheet";

import { useFocusEffect } from "expo-router";
import BadgeMedallion from "@/components/badges/new/BadgeMedalion";
import { BADGE_BY_ID, BADGES } from "@/services/badges/registry";
import { useBadgesLocal } from "@/services/badges/useBadgesLocal";

type IoniconName = keyof typeof Ionicons.glyphMap;

function toIoniconName(icon: any): IoniconName {
  const key = String(icon || "");
  return (key in Ionicons.glyphMap ? key : "ribbon") as IoniconName;
}

/* ───────────────── helpers (from your old page) ───────────────── */
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}
function formatDateLong(d: Date) {
  try {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d.toDateString();
  }
}
function getGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** expo-linear-gradient v15 typing: colors must be a tuple with >=2 items */
type LGColors = readonly [string, string, ...string[]];
const lg = (...c: [string, string, ...string[]]) => c as LGColors;

/* ───────────────── tokens (same aesthetic as your new page) ───────────────── */
type HomeTokens = {
  bg0: string;
  bg1: string;
  card: string;
  card2: string;
  text: string;
  muted: string;
  hairline: string;
  shadow: string;
  tint: string;
  ringA: string;
  ringB: string;
  good: string;
  warn: string;
  bad: string;
};

function makeTokens(isDark: boolean): HomeTokens {
  const tint = "#64D2FF";
  return isDark
    ? {
        bg0: "#06070A",
        bg1: "#0B1020",
        card: "rgba(255,255,255,0.08)",
        card2: "rgba(255,255,255,0.06)",
        text: "#F4F6FF",
        muted: "rgba(244,246,255,0.70)",
        hairline: "rgba(255,255,255,0.12)",
        shadow: "rgba(0,0,0,0.45)",
        tint,
        ringA: "#64D2FF",
        ringB: "#A78BFA",
        good: "#7CFFB2",
        warn: "#FFD37C",
        bad: "#FF7C7C",
      }
    : {
        bg0: "#F6F7FB",
        bg1: "#FFFFFF",
        card: "rgba(255,255,255,0.72)",
        card2: "rgba(255,255,255,0.56)",
        text: "#0B1020",
        muted: "rgba(11,16,32,0.62)",
        hairline: "rgba(11,16,32,0.10)",
        shadow: "rgba(11,16,32,0.12)",
        tint,
        ringA: "#00B7FF",
        ringB: "#7C5CFF",
        good: "#15C47E",
        warn: "#D9822B",
        bad: "#D64545",
      };
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { isDark } = useTheme() as any;
  const { user } = useAuth() as any;

  const t = useMemo(() => makeTokens(!!isDark), [isDark]);

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  // Date key is exactly like old page (string YYYY-MM-DD)
  const [todayStr] = useState(ymd(new Date()));
  const today = useMemo(() => {
    // keep “today” consistent with todayStr
    const [y, m, d] = todayStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [todayStr]);

  /* ───────────────── OLD backend state ───────────────── */
  const [profile, setProfile] = useState<Profile | null>(null);
  const [foodsToday, setFoodsToday] = useState<FoodEntry[]>([]);
  const [exerciseToday, setExerciseToday] = useState<ExerciseEntry[]>([]);
  const [foodsRange, setFoodsRange] = useState<FoodEntry[]>([]);
  const [activityEntries, setActivityEntries] = useState<CardioEntry[]>([]);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CardioEntry | null>(
    null
  );
  const { badgeUnlocks, featuredBadges, refreshBadgesLocal } =
    useBadgesLocal(true);

  const unlockedBadgeCount = useMemo(
    () => Object.keys(badgeUnlocks || {}).length,
    [badgeUnlocks]
  );

  const unseenBadgeCount = useMemo(() => {
    return Object.values(badgeUnlocks || {}).filter(
      (s) => s && s.seen === false
    ).length;
  }, [badgeUnlocks]);

  const featuredBadgeIdsForRow = useMemo(() => {
    // Prefer featured, and prefer unlocked ones first
    const featured = (featuredBadges || []).filter((id) => !!BADGE_BY_ID[id]);

    const unlockedFeatured = featured.filter((id) => !!badgeUnlocks?.[id]);
    const lockedFeatured = featured.filter((id) => !badgeUnlocks?.[id]);

    // Fallback fill: use any unlocked badges if user hasn’t featured 3 yet
    const unlockedAny = BADGES.map((b) => b.id).filter(
      (id) => !!badgeUnlocks?.[id]
    );
    const fill = unlockedAny.filter((id) => !featured.includes(id));

    const finalIds = [...unlockedFeatured, ...lockedFeatured, ...fill].slice(
      0,
      3
    );
    return finalIds;
  }, [featuredBadges, badgeUnlocks]);

  useEffect(() => {
    if (!user?.uid) return;

    let unsubProfile: undefined | (() => void);
    let unsubFoods: undefined | (() => void);
    let unsubEx: undefined | (() => void);
    let unsubRange: undefined | (() => void);
    let unsubActivity: undefined | (() => void);

    (async () => {
      await ensureProfile(user.uid, user.email ? { email: user.email } : {});
      unsubProfile = subscribeProfile(user.uid, setProfile);

      unsubFoods = subscribeFoodsByDate(user.uid, todayStr, setFoodsToday);

      unsubEx = subscribeExerciseBetween(user.uid, todayStr, todayStr, (arr) =>
        setExerciseToday(arr || [])
      );

      const start = ymd(addDays(new Date(), -6));
      unsubRange = subscribeFoodsBetween(
        user.uid,
        start,
        todayStr,
        setFoodsRange
      );
      const startAct = ymd(addDays(new Date(), -14));
      unsubActivity = subscribeActivityBetween(
        user.uid,
        startAct,
        todayStr,
        (arr) => setActivityEntries(arr || [])
      );
    })();

    return () => {
      try {
        unsubProfile && unsubProfile();
        unsubFoods && unsubFoods();
        unsubEx && unsubEx();
        unsubRange && unsubRange();
        unsubActivity && unsubActivity();
      } catch {}
    };
  }, [user?.uid, user?.email, todayStr]);

  useFocusEffect(
    React.useCallback(() => {
      refreshBadgesLocal();
    }, [refreshBadgesLocal])
  );

  /* ───────────────── Derivations (copied from old logic) ───────────────── */
  const kcalGoal =
    profile?.dailyCaloriesTarget ?? (profile as any)?.calorieGoal ?? 2400;
  const proteinGoal = profile?.dailyProteinTarget ?? 160;
  const carbGoal = (profile as any)?.carbGoal ?? 260;
  const fatGoal = (profile as any)?.fatGoal ?? 70;

  const totals = useMemo(() => {
    return foodsToday.reduce(
      (a, f) => ({
        calories: a.calories + (f.calories || 0),
        protein: a.protein + (f.protein || 0),
        carbs: a.carbs + (f.carbs || 0),
        fat: a.fat + (f.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [foodsToday]);

  const caloriesRemaining = Math.max(0, Math.round(kcalGoal - totals.calories));
  const proteinRemaining = Math.max(
    0,
    Math.round(proteinGoal - totals.protein)
  );

  const stepsGoal = Number((profile as any)?.stepsGoal ?? 8000);
  const stepsToday = useMemo(() => {
    const map =
      (((profile as any)?.steps ?? {}) as Record<string, number>) || {};
    return Number(map?.[todayStr] ?? 0);
  }, [profile, todayStr]);
  const [stepsSheetOpen, setStepsSheetOpen] = useState(false);
  const [stepsMode, setStepsMode] = useState<"add" | "set">("add");
  const [stepsInput, setStepsInput] = useState("");

  const canEditSteps = !!user?.uid;

  function openStepsSheet(mode: "add" | "set") {
    setStepsMode(mode);
    setStepsInput("");
    setStepsSheetOpen(true);
    try {
      Haptics.selectionAsync();
    } catch {}
  }

  async function saveSteps() {
    if (!user?.uid) return;

    const n = Math.max(
      0,
      Math.floor(Number(stepsInput.replace(/[^\d]/g, "")) || 0)
    );

    if (stepsMode === "add" && n <= 0) {
      setStepsSheetOpen(false);
      return;
    }
    if (stepsMode === "set" && stepsInput.trim() === "") {
      setStepsSheetOpen(false);
      return;
    }

    try {
      if (stepsMode === "set") {
        await setStepsForDate(user.uid, todayStr, n);
      } else {
        await addStepsForDate(user.uid, todayStr, n);
      }

      setStepsSheetOpen(false);

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {}
    } catch (e: any) {
      console.log("saveSteps error:", e);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      alert(e?.message ?? "Failed to save steps.");
    }
  }

  async function handleCreateActivity(e: CardioEntry) {
    if (!user?.uid) return;
    try {
      await addActivity(user.uid, e);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {}
    } catch (err) {
      console.log("addActivity error:", err);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
  }

  async function handleUpdateActivity(e: CardioEntry) {
    if (!user?.uid) return;
    try {
      await updateActivity(user.uid, e);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {}
    } catch (err) {
      console.log("updateActivity error:", err);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
  }

  async function handleDeleteActivity(id: string) {
    if (!user?.uid) return;
    try {
      await deleteActivity(user.uid, id);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {}
    } catch (err) {
      console.log("deleteActivity error:", err);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
  }

  const burnToday = useMemo(() => {
    const workoutsBurn = exerciseToday.reduce(
      (sum, ex) => sum + Number(ex.calories || 0),
      0
    );

    const activityBurn = activityEntries.reduce(
      (sum, a) => sum + Number(a.calories || 0),
      0
    );

    return workoutsBurn + activityBurn;
  }, [exerciseToday, activityEntries]);

  const weeklyProteinHits = useMemo(() => {
    if (!proteinGoal) return 0;
    const start = ymd(addDays(new Date(), -6));
    const days = Array.from({ length: 7 }, (_, i) =>
      ymd(addDays(new Date(start), i))
    );
    const proteinByDate: Record<string, number> = {};
    foodsRange.forEach((f) => {
      proteinByDate[f.date] = (proteinByDate[f.date] || 0) + (f.protein || 0);
    });
    return days.filter((d) => (proteinByDate[d] || 0) >= proteinGoal * 0.8)
      .length;
  }, [foodsRange, proteinGoal]);

  const streakDays = useMemo(() => {
    const d = new Set(
      foodsRange.map((f) => f.date?.slice(0, 10)).filter(Boolean) as string[]
    );
    return d.size;
  }, [foodsRange]);

  const stepsAvg = useMemo(() => {
    const map =
      (((profile as any)?.steps ?? {}) as Record<string, number>) || {};
    const days = Array.from({ length: 7 }, (_, i) =>
      ymd(addDays(new Date(), -i))
    );
    const sum = days.reduce((s, d) => s + Number(map[d] || 0), 0);
    return Math.round(sum / days.length);
  }, [profile]);

  /* ───────────────── UI data mapping ───────────────── */
  const ringData = useMemo(
    () => [
      {
        label: "Calories",
        value: totals.calories,
        goal: kcalGoal,
        unit: "kcal",
        tone: "tint" as const,
        sublabel: `${caloriesRemaining.toLocaleString()} left`,
        onPress: () => router.push("/(tabs)/nutrition"),
      },
      {
        label: "Protein",
        value: totals.protein,
        goal: proteinGoal,
        unit: "g",
        tone: "violet" as const,
        sublabel: `${proteinRemaining}g to goal`,
        onPress: () => router.push("/(tabs)/nutrition"),
      },
      {
        label: "Steps",
        value: stepsToday,
        goal: stepsGoal,
        unit: "",
        tone: "mint" as const,
        sublabel: `${Math.max(
          0,
          stepsGoal - stepsToday
        ).toLocaleString()} to go`,
        onPress: () => router.push("/(tabs)/workouts"),
      },
    ],
    [
      totals.calories,
      totals.protein,
      kcalGoal,
      proteinGoal,
      caloriesRemaining,
      proteinRemaining,
      stepsToday,
      stepsGoal,
      router,
    ]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        key: "log-meal",
        label: "Log Meal",
        icon: toIoniconName("restaurant"),
        hint: "Open meal logging",
        onPress: () =>
          router.push(`/(modals)/add-meal?date=${todayStr}` as any),
        color: t.tint,
      },
      {
        key: "scan",
        label: "Scan",
        icon: toIoniconName("scan"),
        hint: "Scan a barcode",
        onPress: () =>
          router.push(`/(modals)/add-meal?date=${todayStr}&tab=scan` as any),
        color: "#FFD37C",
      },
      {
        key: "steps",
        label: "Add Steps",
        icon: toIoniconName("walk"),
        hint: "Manually add today’s steps",
        onPress: () => openStepsSheet("add"),
        color: t.good,
      },
      {
        key: "water",
        label: "Water",
        icon: toIoniconName("water"),
        hint: "Log hydration",
        onPress: () => router.push("/(tabs)/nutrition"),
        color: "#4FD1FF",
      },
      {
        key: "workout",
        label: "Workout",
        icon: toIoniconName("barbell"),
        hint: "Log a workout",
        onPress: () => router.push("/(modals)/quick-workout" as any),
        color: t.good,
      },
      {
        key: "ai",
        label: "AI Coach",
        icon: toIoniconName("sparkles"),
        hint: "Get smart suggestions",
        onPress: () => router.push("/(tabs)/nutrition"),
        color: "#FF7CEB",
      },
    ],
    [router, todayStr, t.tint, t.good]
  );

  const aiSuggestions: AISuggestion[] = useMemo(() => {
    const mealCount = foodsToday.length;
    const hasWorkout = exerciseToday.length > 0;

    return [
      {
        id: "ai-1",
        title:
          proteinRemaining > 25
            ? "Close your protein gap"
            : "Protein looks solid",
        body:
          proteinRemaining > 25
            ? `You’re ${proteinRemaining}g short. Aim for a lean 30–40g hit (shake, Greek yogurt, chicken wrap).`
            : "You’re on track. Add fiber + micronutrients to round out the day.",
        pill:
          proteinRemaining > 0
            ? `${proteinRemaining}g to goal`
            : "Goal reached",
        icon: toIoniconName("flash"),
        actionLabel: "Suggest meals",
        onAction: () => router.push("/(tabs)/nutrition"),
      },
      {
        id: "ai-2",
        title:
          caloriesRemaining > 0
            ? "Smooth calories to target"
            : "You’re at target",
        body:
          caloriesRemaining > 0
            ? `You have ~${caloriesRemaining} kcal left. Keep it satisfying: protein + fiber beats “random snacks.”`
            : "Want a cut-friendly swap that keeps cravings low?",
        pill:
          caloriesRemaining > 0
            ? `~${caloriesRemaining} kcal left`
            : "At target",
        icon: toIoniconName("leaf"),
        actionLabel: "Get options",
        onAction: () => router.push("/(tabs)/nutrition"),
      },
      {
        id: "ai-3",
        title: hasWorkout ? "Nice pace today" : "Add a small movement win",
        body: hasWorkout
          ? `Burned ~${Math.round(
              burnToday
            )} kcal in workouts. Keep steps moving for recovery.`
          : "No workout logged yet. A 20–30 min walk or quick session keeps momentum.",
        pill: hasWorkout ? "Workout logged" : "No workout yet",
        icon: toIoniconName("walk"),
        actionLabel: "Open activity",
        onAction: () => router.push("/(tabs)/workouts"),
      },
      {
        id: "ai-4",
        title: "Consistency",
        body: `Protein hit rate: ${weeklyProteinHits}/7 · Steps avg: ${stepsAvg.toLocaleString()}/day · Logs: ${mealCount} today.`,
        pill: `${streakDays} day streak`,
        icon: toIoniconName("trophy"),
        actionLabel: "View history",
        onAction: () => router.push("/(tabs)/nutrition"),
      },
    ];
  }, [
    proteinRemaining,
    caloriesRemaining,
    foodsToday.length,
    exerciseToday.length,
    burnToday,
    weeklyProteinHits,
    stepsAvg,
    streakDays,
    router,
  ]);

  const softShadow = useMemo(
    () =>
      Platform.select({
        ios: {
          shadowColor: t.shadow,
          shadowOpacity: 1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        },
        android: { elevation: 10 },
        default: {},
      }),
    [t.shadow]
  );

  const topPad = Math.max(12, insets.top - 6);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg0 }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      {/* background wash */}
      <LinearGradient
        colors={lg(t.bg0, t.bg1)}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: Platform.OS === "ios" ? topPad + 44 : topPad + 26,
          paddingBottom: 44 + Math.max(insets.bottom, 16),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16 }}>
          <LinearGradient
            colors={
              isDark ? lg("#0B1020", "#06070A") : lg("#FFFFFF", "#F6F7FB")
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: t.hairline,
              ...softShadow,
            }}
          >
            <BlurView
              intensity={isDark ? 18 : 28}
              tint={isDark ? "dark" : "light"}
            >
              <View style={{ padding: 16, gap: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: t.muted,
                        fontSize: 12,
                        fontWeight: "800",
                        letterSpacing: 0.4,
                      }}
                    >
                      {formatDateLong(today).toUpperCase()}
                    </Text>

                    <Text
                      style={{
                        color: t.text,
                        fontSize: 26,
                        fontWeight: "900",
                        marginTop: 4,
                        letterSpacing: -0.2,
                      }}
                      accessibilityRole="header"
                    >
                      {getGreeting(today)}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => router.push("/(tabs)/profile")}
                    accessibilityRole="button"
                    accessibilityLabel="Open profile"
                    accessibilityHint="Opens your profile and settings"
                    hitSlop={12}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: withAlpha(
                          isDark ? "#FFFFFF" : "#0B1020",
                          isDark ? 0.08 : 0.06
                        ),
                        borderWidth: 1,
                        borderColor: t.hairline,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="person-circle" size={26} color={t.text} />
                    </View>
                  </Pressable>
                </View>

                {/* Streak */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: withAlpha(t.tint, isDark ? 0.14 : 0.12),
                      borderWidth: 1,
                      borderColor: withAlpha(t.tint, isDark ? 0.26 : 0.22),
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 7,
                    }}
                    accessibilityRole="text"
                    accessibilityLabel={`Streak ${streakDays} days`}
                  >
                    <Ionicons name="flame" size={14} color={t.tint} />
                    <Text
                      style={{ color: t.text, fontWeight: "900", fontSize: 12 }}
                    >
                      {streakDays} day streak
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: t.muted,
                      fontSize: 13,
                      fontWeight: "600",
                      flex: 1,
                    }}
                  >
                    Calm progress. One log at a time.
                  </Text>
                </View>
                {/* Badges (quiet recognition) */}
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(modals)/badges",
                      params: { source: "home" },
                    } as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Open badges"
                  accessibilityHint="Shows your unlocked badges and progress"
                  hitSlop={10}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.995 : 1 }],
                  })}
                >
                  <View
                    style={{
                      marginTop: 6,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: withAlpha(t.hairline, 1),
                      backgroundColor: withAlpha(
                        isDark ? "#FFFFFF" : "#0B1020",
                        isDark ? 0.06 : 0.04
                      ),
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    {/* Left: label + count */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: t.text,
                            fontWeight: "900",
                            fontSize: 14,
                            letterSpacing: -0.1,
                          }}
                          numberOfLines={1}
                        >
                          Badges
                        </Text>

                        {/* tiny “new” dot */}
                        {unseenBadgeCount > 0 ? (
                          <View
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 99,
                              backgroundColor: t.tint,
                              opacity: 0.95,
                            }}
                          />
                        ) : null}
                      </View>

                      <Text
                        style={{
                          marginTop: 2,
                          color: t.muted,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                        numberOfLines={1}
                      >
                        {unlockedBadgeCount} unlocked
                        {unseenBadgeCount > 0
                          ? ` • ${unseenBadgeCount} new`
                          : ""}
                      </Text>
                    </View>

                    {/* Right: medallions */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {featuredBadgeIdsForRow.map((id) => {
                        const def = BADGE_BY_ID[id];
                        if (!def) return null;
                        const unlocked = !!badgeUnlocks?.[id];
                        return (
                          <BadgeMedallion
                            key={id}
                            icon={toIoniconName(def.icon)}
                            unlocked={unlocked}
                            accent={def.accent}
                            size={34}
                          />
                        );
                      })}

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={withAlpha(t.text, isDark ? 0.55 : 0.4)}
                      />
                    </View>
                  </View>
                </Pressable>
              </View>
            </BlurView>
          </LinearGradient>
        </View>

        {/* Rings */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            paddingHorizontal: 16,
            marginTop: 14,
          }}
        >
          {ringData.map((r) => (
            <View key={r.label} style={{ flex: 1 }}>
              <MetricRing
                tone={r.tone}
                label={r.label}
                value={r.value}
                goal={r.goal}
                unit={r.unit}
                sublabel={r.sublabel}
                reduceMotion={reduceMotion}
                tokens={t}
                style={softShadow as any}
                onPress={r.onPress}
              />
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={{ marginTop: 14, paddingHorizontal: 16 }}>
          <Text
            style={{
              color: t.muted,
              fontWeight: "900",
              fontSize: 12,
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            QUICK ACTIONS
          </Text>

          <QuickActionRow
            tokens={t as any}
            reduceMotion={reduceMotion}
            actions={quickActions}
            maxWidth={width}
          />
        </View>

        {/* Nutrition summary */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text
            style={{
              color: t.muted,
              fontWeight: "900",
              fontSize: 12,
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            NUTRITION
          </Text>

          <LinearGradient
            colors={lg(withAlpha(t.card, 1), withAlpha(t.card2, 1))}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: t.hairline,
              ...softShadow,
            }}
          >
            <BlurView
              intensity={isDark ? 16 : 26}
              tint={isDark ? "dark" : "light"}
            >
              <View style={{ padding: 14, gap: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 14,
                        backgroundColor: withAlpha(
                          t.ringB,
                          isDark ? 0.18 : 0.14
                        ),
                        borderWidth: 1,
                        borderColor: withAlpha(t.ringB, isDark ? 0.3 : 0.22),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="nutrition" size={18} color={t.ringB} />
                    </View>

                    <View>
                      <Text
                        style={{
                          color: t.text,
                          fontWeight: "900",
                          fontSize: 16,
                          letterSpacing: -0.2,
                        }}
                      >
                        Today’s macros
                      </Text>
                      <Text
                        style={{
                          color: t.muted,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        Real-time from your logged meals.
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => router.push("/(tabs)/nutrition")}
                    accessibilityRole="button"
                    accessibilityLabel="Open nutrition details"
                    hitSlop={10}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                    })}
                  >
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: withAlpha(t.tint, isDark ? 0.14 : 0.1),
                        borderWidth: 1,
                        borderColor: withAlpha(t.tint, isDark ? 0.22 : 0.16),
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: t.text,
                          fontWeight: "900",
                          fontSize: 12,
                        }}
                      >
                        Details
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={t.text}
                      />
                    </View>
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[
                    {
                      k: "Protein",
                      v: `${Math.round(totals.protein)}g`,
                      c: t.good,
                      sub: `Goal ${Math.round(proteinGoal)}g`,
                    },
                    {
                      k: "Carbs",
                      v: `${Math.round(totals.carbs)}g`,
                      c: t.tint,
                      sub: `Goal ${Math.round(carbGoal)}g`,
                    },
                    {
                      k: "Fat",
                      v: `${Math.round(totals.fat)}g`,
                      c: t.warn,
                      sub: `Goal ${Math.round(fatGoal)}g`,
                    },
                  ].map((m) => (
                    <View
                      key={m.k}
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: withAlpha(m.c, isDark ? 0.28 : 0.2),
                        backgroundColor: withAlpha(m.c, isDark ? 0.12 : 0.1),
                      }}
                      accessibilityRole="text"
                      accessibilityLabel={`${m.k} ${m.v}`}
                    >
                      <Text
                        style={{
                          color: t.muted,
                          fontWeight: "900",
                          fontSize: 11,
                          letterSpacing: 0.4,
                        }}
                      >
                        {m.k.toUpperCase()}
                      </Text>
                      <Text
                        style={{
                          color: t.text,
                          fontWeight: "900",
                          fontSize: 16,
                          marginTop: 4,
                        }}
                      >
                        {m.v}
                      </Text>
                      <Text
                        style={{
                          color: t.muted,
                          fontWeight: "800",
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {m.sub}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: t.muted,
                        fontWeight: "800",
                        fontSize: 12,
                      }}
                    >
                      Calories
                    </Text>
                    <Text
                      style={{
                        color: t.text,
                        fontWeight: "900",
                        fontSize: 16,
                        marginTop: 2,
                      }}
                    >
                      {Math.round(totals.calories).toLocaleString()} /{" "}
                      {Math.round(kcalGoal).toLocaleString()} kcal
                    </Text>
                    <Text
                      style={{
                        color: t.muted,
                        fontWeight: "800",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {caloriesRemaining.toLocaleString()} left
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      router.push(`/(modals)/add-meal?date=${todayStr}` as any)
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Log meal"
                    hitSlop={10}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                    })}
                  >
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 16,
                        backgroundColor: withAlpha(
                          t.good,
                          isDark ? 0.16 : 0.12
                        ),
                        borderWidth: 1,
                        borderColor: withAlpha(t.good, isDark ? 0.24 : 0.18),
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons name="add" size={18} color={t.good} />
                      <Text
                        style={{
                          color: t.text,
                          fontWeight: "900",
                          fontSize: 12,
                        }}
                      >
                        Meal
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </BlurView>
          </LinearGradient>
        </View>

        {/* Activity + Steps */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text
            style={{
              color: t.muted,
              fontWeight: "900",
              fontSize: 12,
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            ACTIVITY
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1.25 }}>
              <AnimatedStepPill
                tokens={t as any}
                reduceMotion={reduceMotion}
                steps={stepsToday}
                goal={stepsGoal}
                moveMin={
                  exerciseToday.length
                    ? Math.min(180, 20 + exerciseToday.length * 10)
                    : 0
                } // simple proxy (you can wire real minutes if you store it)
                onPress={() => openStepsSheet("add")}
                style={softShadow as any}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Pressable
                onPress={() => {
                  setEditingActivity(null);
                  setActivitySheetOpen(true);
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                }}
                accessibilityRole="button"
                accessibilityLabel="Open activity details"
                hitSlop={10}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                <LinearGradient
                  colors={lg(withAlpha(t.card, 1), withAlpha(t.card2, 1))}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: t.hairline,
                    height: 128,
                    ...softShadow,
                  }}
                >
                  <BlurView
                    intensity={isDark ? 16 : 26}
                    tint={isDark ? "dark" : "light"}
                  >
                    <View
                      style={{
                        padding: 14,
                        height: 128,
                        justifyContent: "space-between",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: t.text,
                            fontWeight: "900",
                            fontSize: 14,
                          }}
                        >
                          Burn
                        </Text>
                        <Ionicons name="flame" size={16} color={t.warn} />
                      </View>

                      <View>
                        <Text
                          style={{
                            color: t.text,
                            fontWeight: "900",
                            fontSize: 24,
                            letterSpacing: -0.4,
                          }}
                        >
                          {Math.round(burnToday)} kcal
                        </Text>
                        <Text
                          style={{
                            color: t.muted,
                            fontWeight: "700",
                            fontSize: 12,
                            marginTop: 2,
                          }}
                        >
                          {exerciseToday.length} workouts today
                        </Text>
                      </View>

                      <Text
                        style={{
                          color: t.muted,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        Tap for activities →
                      </Text>
                    </View>
                  </BlurView>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
          {/* Cardio / Activity Logging Card
          <View style={{ marginTop: 12 }}>
            <ActivityCard
              entries={activityEntries}
              goal={{
                minutesPerDay: Number(
                  (profile as any)?.activityMinutesGoal ?? 30
                ),
              }}
              onCreate={handleCreateActivity}
              onUpdate={handleUpdateActivity}
              onDelete={handleDeleteActivity}
              title="Movement"
              subtitle="Optional • small adds count"
              presets={[
                {
                  type: "walk",
                  minutes: 10,
                  intensity: "easy",
                  label: "Walk 10",
                },
                {
                  type: "run",
                  minutes: 20,
                  intensity: "moderate",
                  label: "Run 20",
                },
                {
                  type: "bike",
                  minutes: 20,
                  intensity: "moderate",
                  label: "Bike 20",
                },
                {
                  type: "stretch",
                  minutes: 10,
                  intensity: "easy",
                  label: "Stretch 10",
                },
              ]}
            />
          </View> */}
        </View>

        {/* AI Coach */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text
            style={{
              color: t.muted,
              fontWeight: "900",
              fontSize: 12,
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            AI COACH
          </Text>

          <View style={{ gap: 12 }}>
            {aiSuggestions.slice(0, 3).map((s, i) => (
              <MotiView
                key={s.id}
                from={reduceMotion ? undefined : { opacity: 0, translateY: 10 }}
                animate={
                  reduceMotion ? undefined : { opacity: 1, translateY: 0 }
                }
                transition={{
                  type: "timing",
                  duration: 420,
                  delay: 70 + i * 60,
                }}
              >
                <AISuggestionCard
                  tokens={t as any}
                  reduceMotion={reduceMotion}
                  suggestion={s}
                  style={softShadow as any}
                />
              </MotiView>
            ))}
          </View>
        </View>

        {/* This week mini */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text
            style={{
              color: t.muted,
              fontWeight: "900",
              fontSize: 12,
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            THIS WEEK
          </Text>

          <LinearGradient
            colors={lg(withAlpha(t.card, 1), withAlpha(t.card2, 1))}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: t.hairline,
              ...softShadow,
            }}
          >
            <BlurView
              intensity={isDark ? 16 : 26}
              tint={isDark ? "dark" : "light"}
            >
              <View style={{ padding: 14, gap: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: t.text, fontWeight: "900", fontSize: 16 }}
                  >
                    Consistency snapshot
                  </Text>
                  <Ionicons name="stats-chart" size={18} color={t.muted} />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[
                    {
                      k: "Protein hits",
                      v: `${weeklyProteinHits}/7`,
                      c: t.ringB,
                    },
                    {
                      k: "Steps avg",
                      v: `${stepsAvg.toLocaleString()}/day`,
                      c: t.tint,
                    },
                    { k: "Streak", v: `${streakDays} days`, c: t.good },
                  ].map((m) => (
                    <View
                      key={m.k}
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: withAlpha(m.c, isDark ? 0.28 : 0.2),
                        backgroundColor: withAlpha(m.c, isDark ? 0.12 : 0.1),
                      }}
                    >
                      <Text
                        style={{
                          color: t.muted,
                          fontWeight: "900",
                          fontSize: 11,
                          letterSpacing: 0.4,
                        }}
                      >
                        {m.k.toUpperCase()}
                      </Text>
                      <Text
                        style={{
                          color: t.text,
                          fontWeight: "900",
                          fontSize: 16,
                          marginTop: 4,
                        }}
                      >
                        {m.v}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </BlurView>
          </LinearGradient>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
      <ActivityLogSheet
        visible={activitySheetOpen}
        onClose={() => {
          setActivitySheetOpen(false);
          setEditingActivity(null);
        }}
        editing={editingActivity}
        onCreate={handleCreateActivity}
        onUpdate={handleUpdateActivity}
        onDelete={handleDeleteActivity}
        goal={{
          minutesPerDay: Number((profile as any)?.activityMinutesGoal ?? 30),
        }}
        presets={[
          { type: "walk", minutes: 10, intensity: "easy", label: "Walk 10" },
          { type: "run", minutes: 20, intensity: "moderate", label: "Run 20" },
          {
            type: "bike",
            minutes: 20,
            intensity: "moderate",
            label: "Bike 20",
          },
          {
            type: "stretch",
            minutes: 10,
            intensity: "easy",
            label: "Stretch 10",
          },
        ]}
      />

      {/* Steps bottom sheet */}
      {stepsSheetOpen ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 50,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => setStepsSheetOpen(false)}
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <LinearGradient
              colors={lg(withAlpha(t.card, 1), withAlpha(t.card2, 1))}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderWidth: 1,
                borderColor: t.hairline,
                overflow: "hidden",
                paddingBottom: Math.max(insets.bottom, 12),
              }}
            >
              <BlurView
                intensity={isDark ? 18 : 28}
                tint={isDark ? "dark" : "light"}
              >
                <View style={{ padding: 16, gap: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          backgroundColor: withAlpha(
                            t.good,
                            isDark ? 0.16 : 0.12
                          ),
                          borderWidth: 1,
                          borderColor: withAlpha(t.good, isDark ? 0.24 : 0.18),
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="walk" size={18} color={t.good} />
                      </View>
                      <View>
                        <Text
                          style={{
                            color: t.text,
                            fontWeight: "900",
                            fontSize: 16,
                          }}
                        >
                          {stepsMode === "add" ? "Add steps" : "Set steps"}
                        </Text>
                        <Text
                          style={{
                            color: t.muted,
                            fontWeight: "700",
                            fontSize: 12,
                          }}
                        >
                          Today: {stepsToday.toLocaleString()} /{" "}
                          {stepsGoal.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setStepsSheetOpen(false)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Close steps editor"
                    >
                      <Ionicons name="close" size={22} color={t.muted} />
                    </Pressable>
                  </View>

                  {/* mode toggle */}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => setStepsMode("add")}
                      accessibilityRole="button"
                      accessibilityLabel="Add mode"
                      style={({ pressed }) => ({
                        flex: 1,
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <View
                        style={{
                          paddingVertical: 10,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor:
                            stepsMode === "add"
                              ? withAlpha(t.good, 0.35)
                              : t.hairline,
                          backgroundColor:
                            stepsMode === "add"
                              ? withAlpha(t.good, isDark ? 0.14 : 0.1)
                              : withAlpha(t.card, 0.6),
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: t.text, fontWeight: "900" }}>
                          Add
                        </Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setStepsMode("set")}
                      accessibilityRole="button"
                      accessibilityLabel="Set mode"
                      style={({ pressed }) => ({
                        flex: 1,
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <View
                        style={{
                          paddingVertical: 10,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor:
                            stepsMode === "set"
                              ? withAlpha(t.tint, 0.35)
                              : t.hairline,
                          backgroundColor:
                            stepsMode === "set"
                              ? withAlpha(t.tint, isDark ? 0.14 : 0.1)
                              : withAlpha(t.card, 0.6),
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: t.text, fontWeight: "900" }}>
                          Set
                        </Text>
                      </View>
                    </Pressable>
                  </View>

                  {/* input */}
                  <View
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: t.hairline,
                      backgroundColor: withAlpha(t.card, 0.75),
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: t.muted,
                        fontWeight: "800",
                        fontSize: 12,
                      }}
                    >
                      {stepsMode === "add"
                        ? "How many steps to add?"
                        : "Set today’s steps to:"}
                    </Text>

                    <TextInput
                      value={stepsInput}
                      onChangeText={setStepsInput}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={withAlpha(t.muted, 0.65)}
                      style={{
                        color: t.text,
                        fontWeight: "900",
                        fontSize: 28,
                        marginTop: 6,
                      }}
                      accessibilityLabel="Steps input"
                      accessibilityHint="Enter a number of steps"
                    />
                  </View>

                  {/* quick chips */}
                  <View
                    style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}
                  >
                    {[500, 1000, 2000, 3000].map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setStepsInput(String(n))}
                        accessibilityRole="button"
                        accessibilityLabel={`Set steps input to ${n}`}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: withAlpha(
                              t.good,
                              isDark ? 0.22 : 0.18
                            ),
                            backgroundColor: withAlpha(
                              t.good,
                              isDark ? 0.12 : 0.1
                            ),
                          }}
                        >
                          <Text style={{ color: t.text, fontWeight: "900" }}>
                            +{n.toLocaleString()}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>

                  {/* save */}
                  <Pressable
                    onPress={saveSteps}
                    disabled={!canEditSteps}
                    accessibilityRole="button"
                    accessibilityLabel="Save steps"
                    accessibilityHint="Saves your step entry"
                    style={({ pressed }) => ({
                      opacity: !canEditSteps ? 0.5 : pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                    })}
                  >
                    <View
                      style={{
                        marginTop: 2,
                        paddingVertical: 14,
                        borderRadius: 16,
                        alignItems: "center",
                        backgroundColor: withAlpha(
                          t.good,
                          isDark ? 0.22 : 0.18
                        ),
                        borderWidth: 1,
                        borderColor: withAlpha(t.good, isDark ? 0.35 : 0.25),
                      }}
                    >
                      <Text
                        style={{
                          color: t.text,
                          fontWeight: "900",
                          fontSize: 14,
                        }}
                      >
                        Save
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </BlurView>
            </LinearGradient>
          </KeyboardAvoidingView>
        </View>
      ) : null}
    </View>
  );
}
