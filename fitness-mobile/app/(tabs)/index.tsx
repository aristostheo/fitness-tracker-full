// app/(tabs)/home.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Link, Href, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProgressRingAnimated from "@/components/ProgressRingAnimated";
import { withAlpha } from "@/components/workouts/utils/withAlpha";
import ExpandableHeroCard from "@/components/ExpandableHeroCard";
import StreakCard from "@/components/StreakCard";
import AISwipeCard from "@/components/AISwipeCard";
import FloatingAddMenu from "@/components/FloatingAddMenu";
import FabMorphMenu from "@/components/FabMorphMenu";

import { useTheme } from "@/content/ThemeProvider";
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
  type Profile,
} from "@/services/profile";

/* ---------- helpers ---------- */
const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

const homeGradients = {
  hero: ["rgba(108,99,255,0.35)", "rgba(27,32,64,0.9)"] as const,
  activity: ["rgba(16,185,129,0.18)", "rgba(12,18,36,0.92)"] as const,
  week: ["rgba(56,189,248,0.18)", "rgba(12,18,36,0.92)"] as const,
  streak: ["rgba(255,184,77,0.22)", "rgba(12,18,36,0.9)"] as const,
  coach: ["rgba(99,102,241,0.22)", "rgba(12,18,36,0.92)"] as const,
};
const arcadeColors = {
  neonPink: "#ff5ac8",
  neonBlue: "#5ce1ff",
  neonLime: "#8cfb9f",
  amber: "#ffc857",
};

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

function bar(widthPct: number, color: string) {
  const safe = Math.max(0, Math.min(100, widthPct));
  return (
    <View
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <MotiView
        from={{ width: "0%" }}
        animate={{ width: `${safe}%` }}
        transition={{ type: "timing", duration: 420 }}
        style={{
          height: "100%",
          backgroundColor: color,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

function pill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: withAlpha(color, 0.14),
        borderWidth: 1,
        borderColor: withAlpha(color, 0.28),
        gap: 2,
      }}
    >
      <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>
        {label}
      </Text>
      <Text style={{ color, fontWeight: "900", fontSize: 15 }}>{value}</Text>
    </View>
  );
}

const ProgressRow = ({
  label,
  val,
  goal,
  color,
}: {
  label: string;
  val: number;
  goal: number;
  color: string;
}) => {
  const pct = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0;
  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>{label}</Text>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>
          {Math.round(val).toLocaleString()}
          {label === "Calories" ? " kcal" : " g"} /{" "}
          {goal
            ? `${Math.round(goal)}${label === "Calories" ? " kcal" : " g"}`
            : "—"}
        </Text>
      </View>
      {bar(pct, color)}
    </View>
  );
};

/* ---------- screen ---------- */
export default function NewHomeScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [date] = useState(ymd(new Date()));

  const [profile, setProfile] = useState<Profile | null>(null);
  const [foodsToday, setFoodsToday] = useState<FoodEntry[]>([]);
  const [exerciseToday, setExerciseToday] = useState<ExerciseEntry[]>([]);
  const [foodsRange, setFoodsRange] = useState<FoodEntry[]>([]);

  const todayStr = date;
  const quickActions = useMemo(
    () => [
      {
        key: "meal",
        label: "Log meal",
        icon: "restaurant-outline" as const,
        onPress: () => router.push(`/(modals)/add-meal?date=${todayStr}`),
      },
      {
        key: "scan",
        label: "Scan barcode",
        icon: "barcode-outline" as const,
        onPress: () =>
          router.push(`/(modals)/add-meal?date=${todayStr}&tab=scan`),
      },
      {
        key: "workout",
        label: "Log workout",
        icon: "barbell-outline" as const,
        onPress: () => router.push("/(modals)/quick-workout"),
      },
    ],
    [router, todayStr]
  );
  const fabOffset = Math.max(insets.bottom, 12) + 70;

  useEffect(() => {
    if (!user?.uid) return;
    let unsubProfile: undefined | (() => void);
    let unsubFoods: undefined | (() => void);
    let unsubEx: undefined | (() => void);
    let unsubRange: undefined | (() => void);

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
    })();

    return () => {
      try {
        unsubProfile && unsubProfile();
        unsubFoods && unsubFoods();
        unsubEx && unsubEx();
        unsubRange && unsubRange();
      } catch {}
    };
  }, [user?.uid, todayStr]);

  const kcalGoal = profile?.dailyCaloriesTarget ?? profile?.calorieGoal ?? 2400;
  const proteinGoal = profile?.dailyProteinTarget ?? 160;
  const carbGoal = profile?.carbGoal ?? 260;
  const fatGoal = profile?.fatGoal ?? 70;

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
    const map = ((profile as any)?.steps ?? {}) as Record<string, number>;
    return Number(map?.[todayStr] ?? 0);
  }, [profile, todayStr]);
  const burnToday = useMemo(
    () => exerciseToday.reduce((sum, ex) => sum + Number(ex.calories || 0), 0),
    [exerciseToday]
  );

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
    const map = ((profile as any)?.steps ?? {}) as Record<string, number>;
    const days = Array.from({ length: 7 }, (_, i) =>
      ymd(addDays(new Date(), -i))
    );
    const sum = days.reduce((s, d) => s + Number(map[d] || 0), 0);
    return Math.round(sum / days.length);
  }, [profile]);

  const heroGradient: [string, string] = isDark
    ? ["#12182b", "#0f1322"]
    : ["#e8edff", "#f4f7ff"];

  const suggestion =
    proteinRemaining > 25
      ? {
          title: "Low on protein",
          body: "Add a lean 30–40g protein meal or shake to close the gap.",
          href: "/(tabs)/nutrition" as Href,
        }
      : exerciseToday.length === 0
      ? {
          title: "No workout yet",
          body: "Log a 20–30 min session or a brisk walk to keep the streak alive.",
          href: "/(tabs)/workouts" as Href,
        }
      : {
          title: "Nice pace today",
          body: "Calories and protein look solid. Keep hydration and steps moving.",
          href: "/(tabs)/nutrition" as Href,
        };

  const nutritionQuestList = useMemo(
    () => [
      {
        icon: "flame-outline" as const,
        label: "Calories",
        progress: Math.min(1, totals.calories / Math.max(1, kcalGoal)),
        detail: `${Math.max(
          0,
          Math.round(kcalGoal - totals.calories)
        )} kcal left`,
        accent: colors.primary,
      },
      {
        icon: "barbell-outline" as const,
        label: "Protein",
        progress: Math.min(1, totals.protein / Math.max(1, proteinGoal)),
        detail: `${Math.max(
          0,
          Math.round(proteinGoal - totals.protein)
        )} g left`,
        accent: colors.chartSecondary,
      },
      {
        icon: "restaurant-outline" as const,
        label: "Meals logged",
        progress: Math.min(1, foodsToday.length / 3),
        detail: foodsToday.length
          ? `${foodsToday.length} so far`
          : "Add your first meal",
        accent: withAlpha(colors.text, 0.7),
      },
      {
        icon: "sparkles-outline" as const,
        label: "Movement",
        progress: exerciseToday.length ? 1 : 0.2,
        detail: exerciseToday.length ? "Activity added" : "Add a quick burn",
        accent: colors.accent,
      },
    ],
    [
      totals.calories,
      totals.protein,
      kcalGoal,
      proteinGoal,
      foodsToday.length,
      exerciseToday.length,
      colors.primary,
      colors.chartSecondary,
      colors.text,
      colors.accent,
    ]
  );
  const nutritionXp = Math.round(
    (nutritionQuestList.reduce((s, q) => s + q.progress, 0) /
      Math.max(1, nutritionQuestList.length)) *
      100
  );

  const topPad = Math.max(12, insets.top - 8);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 118 + Math.max(insets.bottom, 16),
          gap: 18,
          paddingTop: topPad,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 2,
          }}
        >
          <View>
            <Text
              style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}
            >
              Today · {prettyDate(todayStr)}
            </Text>
            <Text
              style={{ color: colors.muted, fontWeight: "700", marginTop: 2 }}
            >
              How you’re doing + what’s next
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Link href="/(modals)/account" asChild>
              <Pressable>
                {({ pressed }) => (
                  <Ionicons
                    name="settings-outline"
                    size={22}
                    color={colors.text}
                    style={{ opacity: pressed ? 0.6 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
            <Link href="/(tabs)/profile" asChild>
              <Pressable>
                {({ pressed }) => (
                  <Ionicons
                    name="person-circle-outline"
                    size={26}
                    color={colors.text}
                    style={{ opacity: pressed ? 0.6 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Collapsible hero */}
        <View style={{ marginBottom: 14 }}>
          <LinearGradient
            colors={homeGradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 18,
              padding: 2,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.4),
              ...softShadow,
            }}
          >
            <ExpandableHeroCard
              title="Today"
              primaryValue={`${Math.max(
                0,
                Math.round(caloriesRemaining)
              ).toLocaleString()} kcal`}
              primaryLabel="Calories remaining"
              secondaryLeft={`Protein left: ${Math.max(
                0,
                Math.round(proteinRemaining)
              )} g`}
              macros={[
                {
                  label: "Protein",
                  value: `${Math.round(totals.protein)} g`,
                  sub: `Goal ${Math.round(proteinGoal)} g`,
                },
                {
                  label: "Carbs",
                  value: `${Math.round(totals.carbs)} g`,
                  sub: `Goal ${Math.round(carbGoal)} g`,
                },
                {
                  label: "Fat",
                  value: `${Math.round(totals.fat)} g`,
                  sub: `Goal ${Math.round(fatGoal)} g`,
                },
                {
                  label: "Calories",
                  value: `${Math.round(totals.calories)} kcal`,
                  sub: `Goal ${Math.round(kcalGoal)} kcal`,
                },
              ]}
              style={{
                backgroundColor: "rgba(12,16,30,0.75)",
                borderColor: withAlpha(colors.primary, 0.3),
              }}
            />
          </LinearGradient>
        </View>

        {/* Nutrition Today (quest style) */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 420, delay: 60 }}
        >
          <LinearGradient
            colors={[withAlpha(arcadeColors.neonBlue, 0.28), colors.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 14,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              overflow: "hidden",
              position: "relative",
              ...softShadow,
            }}
          >
            <LinearGradient
              colors={[arcadeColors.neonBlue, arcadeColors.neonPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 220,
                height: 220,
                borderRadius: 140,
                opacity: 0.18,
                transform: [{ rotate: "18deg" }],
              }}
              pointerEvents="none"
            />
            <LinearGradient
              colors={[arcadeColors.neonLime, arcadeColors.amber]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                bottom: -70,
                left: -80,
                width: 220,
                height: 220,
                borderRadius: 150,
                opacity: 0.16,
                transform: [{ rotate: "-16deg" }],
              }}
              pointerEvents="none"
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 18,
                  }}
                >
                  Nutrition Today
                </Text>
                <Text
                  style={{
                    color: withAlpha(colors.text, 0.7),
                    fontWeight: "600",
                  }}
                >
                  Earn XP for calories, protein, meals, and movement.
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: withAlpha(colors.card, 0.94),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.border, 0.9),
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: withAlpha(colors.text, 0.7),
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  XP today
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 20,
                    fontWeight: "900",
                  }}
                >
                  {nutritionXp}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 12, gap: 10 }}>
              {nutritionQuestList.map((q, i) => (
                <NutritionQuestChip key={q.label} delay={80 + i * 50} {...q} />
              ))}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              <Link href={`/(modals)/add-meal?date=${todayStr}`} asChild>
                <Pressable
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    flex: 1,
                  })}
                >
                  <View
                    style={{
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      backgroundColor: withAlpha(colors.text, 0.06),
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                      + Meal
                    </Text>
                  </View>
                </Pressable>
              </Link>
              <Link
                href={`/(modals)/add-meal?date=${todayStr}&type=snack`}
                asChild
              >
                <Pressable
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    flex: 1,
                  })}
                >
                  <View
                    style={{
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      backgroundColor: withAlpha(colors.text, 0.06),
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                      + Snack
                    </Text>
                  </View>
                </Pressable>
              </Link>
              <Pressable
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: withAlpha(colors.text, 0.06),
                  }}
                >
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color={colors.text}
                  />
                </View>
              </Pressable>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Activity */}
        <LinearGradient
          colors={homeGradients.activity}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: withAlpha(colors.chartSecondary, 0.35),
            ...softShadow,
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
              style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
            >
              🏋️ Activity
            </Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: withAlpha(colors.chartSecondary, 0.12),
                borderWidth: 1,
                borderColor: withAlpha(colors.chartSecondary, 0.3),
              }}
            >
              <Text
                style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}
              >
                Today
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              Steps {stepsToday.toLocaleString()} / {stepsGoal.toLocaleString()}
            </Text>
            {bar(
              (stepsToday / Math.max(1, stepsGoal)) * 100,
              colors.chartSecondary
            )}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 2,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: withAlpha(colors.text, 0.08),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.text, 0.14),
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  Burn {Math.round(burnToday)} kcal
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: withAlpha(colors.text, 0.08),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.text, 0.14),
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  Workouts {exerciseToday.length}
                </Text>
              </View>
            </View>
            <Text style={{ color: withAlpha(colors.text, 0.65) }}>
              {exerciseToday.length
                ? "Workout logged"
                : "No workout logged yet"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Link href="/(tabs)/workouts" asChild>
              <Pressable
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  flex: 1.6,
                })}
              >
                <View
                  style={{
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.chartSecondary, 0.45),
                    alignItems: "center",
                    backgroundColor: withAlpha(colors.chartSecondary, 0.14),
                  }}
                >
                  <Text
                    style={{ color: colors.chartSecondary, fontWeight: "900" }}
                  >
                    View workouts
                  </Text>
                </View>
              </Pressable>
            </Link>
            <Link href="/(modals)/quick-workout" asChild>
              <Pressable
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  flex: 1,
                })}
              >
                <View
                  style={{
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.text, 0.2),
                    alignItems: "center",
                    backgroundColor: withAlpha(colors.text, 0.06),
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    Quick log
                  </Text>
                </View>
              </Pressable>
            </Link>
          </View>
        </LinearGradient>

        {/* Streak / consistency */}
        <LinearGradient
          colors={homeGradients.streak}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 18,
            padding: 2,
            borderWidth: 1,
            borderColor: withAlpha(colors.chartSecondary, 0.35),
            ...softShadow,
          }}
        >
          <StreakCard
            streakDays={streakDays}
            bestDays={(profile as any)?.bestStreak ?? undefined}
            didImprove={
              (profile as any)?.bestStreak &&
              streakDays > Number((profile as any)?.bestStreak || 0)
            }
            style={{
              backgroundColor: "rgba(12,16,30,0.82)",
              borderColor: withAlpha(colors.chartSecondary, 0.2),
            }}
          />
        </LinearGradient>

        {/* Coach Suggestion */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 420, delay: 60 }}
        >
          <LinearGradient
            colors={homeGradients.coach}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              padding: 2,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              ...softShadow,
            }}
          >
            <AISwipeCard
              title="Smart suggestion"
              suggestion={suggestion.body}
              onAccept={() => Alert.alert("Added", "Suggestion accepted")}
              onDismiss={() => Alert.alert("Skipped", "Suggestion dismissed")}
              style={{
                backgroundColor: "rgba(10,14,30,0.82)",
                borderColor: withAlpha(colors.primary, 0.2),
              }}
            />
          </LinearGradient>
        </MotiView>

        {/* This Week */}
        <LinearGradient
          colors={homeGradients.week}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: withAlpha(colors.accent, 0.35),
            ...softShadow,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>
            📊 This week
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 10,
            }}
          >
            {pill({
              label: "Weight",
              value: profile?.weightKg
                ? `${Math.round(profile.weightKg)} kg`
                : "—",
              color: colors.chartSecondary,
            })}
            {pill({
              label: "Protein hit rate",
              value: `${weeklyProteinHits} / 7`,
              color: colors.primary,
            })}
            {pill({
              label: "Steps avg",
              value: `${stepsAvg.toLocaleString()}/day`,
              color: colors.accent,
            })}
          </View>
        </LinearGradient>
      </ScrollView>

      {/* FloatingAddMenu retained in repo; using new morph menu here */}
      <FabMorphMenu
        actions={quickActions}
        style={{ bottom: Math.max(insets.bottom, 12) + 54, right: 18 }}
        accent={colors.accent || "#5DD6FF"}
        tint={isDark ? "dark" : "light"}
      />
    </View>
  );
}

function NutritionQuestChip({
  icon,
  label,
  progress,
  detail,
  accent,
  delay = 0,
}: {
  icon: string;
  label: string;
  progress: number;
  detail: string;
  accent: string;
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
                backgroundColor: withAlpha(accent, 0.18),
                borderWidth: 1,
                borderColor: withAlpha(accent, 0.35),
              }}
            >
              <Ionicons name={icon as any} size={18} color={accent} />
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
                pct >= 100 ? arcadeColors.neonLime : accent,
                0.16
              ),
            }}
          >
            <Text
              style={{
                color: pct >= 100 ? arcadeColors.neonLime : accent,
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
              backgroundColor: pct >= 100 ? arcadeColors.neonLime : accent,
              opacity: 0.9,
            }}
          />
        </View>
      </View>
    </MotiView>
  );
}
