// app/(tabs)/profile.tsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { useEntitlements } from "@/content/useEntitlements";

import {
  ensureProfile,
  subscribeProfile,
  updateProfile,
  type Profile,
} from "@/services/profile";

import { computeTargets } from "@/utils/macros";
import { kgToLb, lbToKg } from "@/utils/units";

import ThemeToggle from "@/components/ThemeToggle";

import { PremiumProfileHeader } from "@/components/profile/premium/PremiumProfileHeader";
import { GoalsCard } from "@/components/profile/premium/GoalsCard";
import { MetricsCard } from "@/components/profile/premium/MetricsCard";
import { LongTermProgressCard } from "@/components/profile/premium/TrendsCard";
import { BodyTwinEvolveCard } from "@/components/profile/premium/BodyTwinEvolveCard";
import { BadgesPreviewCard } from "@/components/profile/premium/BadgesPreviewReviewCard";
import { FriendsPreviewCard } from "@/components/profile/premium/FriendsPreviewCard";
import { QuickActionsRow } from "@/components/profile/premium/QuickActionsRow";
import { GlassCard } from "@/components/profile/premium/GlassCard";
import { EmptyState } from "@/components/profile/premium/EmptyState";
import { withAlpha } from "@/components/profile/premium/ui";
import MacroGoalsEngineCard from "@/components/profile/premium/MacroGoalsEngineCard";

import { AppearanceCard } from "@/components/profile/premium/AppearenceCard";
import { MealSchedulePremiumCard } from "@/components/profile/premium/MealSchedulePremiumCard";
import { MacroMethodCard } from "@/components/profile/premium/MacroMethodCard";
import { GoalInsightsCard } from "@/components/profile/premium/GoalInsightsCard";
import { loadUnlocksLocal, loadFeaturedLocal } from "@/services/badges/store";
import type { UnlockMap } from "@/services/badges/types";
import {
  subscribeFriends,
  subscribeFriendRequests,
  type FriendEdge,
} from "@/services/friends/friends";
import { DietPreferencesCard } from "@/components/profile/cards/DietPreferencesCard";

export type GoalUILabel = "maintain" | "cut" | "lean_bulk" | "bulk";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "athlete";

type Targets = {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
};

const initialsFrom = (displayName?: string | null, email?: string | null) => {
  const source = (displayName || email || "You").trim();
  const parts = source
    .replace(/@.*/, "")
    .split(/\s|[._-]/)
    .filter(Boolean);
  return `${(parts[0]?.[0] || "Y").toUpperCase()}${(
    parts[1]?.[0] ||
    parts[0]?.[1] ||
    "U"
  ).toUpperCase()}`;
};

const getSavedTargets = (p: Profile | null): Targets => ({
  calorieGoal: Number(p?.calorieGoal ?? p?.dailyCaloriesTarget ?? 2200),
  proteinGoal: Number(p?.proteinGoal ?? p?.dailyProteinTarget ?? 150),
  carbGoal: Number(p?.carbGoal ?? 250),
  fatGoal: Number(p?.fatGoal ?? 70),
});

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isPro } = useEntitlements();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Core editable state
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("25");
  const [heightCm, setHeightCm] = useState("175");
  const [weightInput, setWeightInput] = useState("75");
  const [targetWeightInput, setTargetWeightInput] = useState("70");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [stepsPerDay, setStepsPerDay] = useState("7000");
  const [gymSessionsPerWeek, setGymSessionsPerWeek] = useState("4");
  const [sportSessionsPerWeek, setSportSessionsPerWeek] = useState("0");
  const [jobActivity, setJobActivity] = useState<
    "sedentary" | "light" | "active"
  >("light");
  const [macroEngineMode, setMacroEngineMode] =
    useState<GoalUILabel>("maintain");
  const [macroEngineSimple, setMacroEngineSimple] = useState(true);
  const [goalIntensity, setGoalIntensity] = useState(0.35);
  const [performanceFocus, setPerformanceFocus] = useState(0.55);
  const [proteinFocus, setProteinFocus] = useState(0.6);
  const [trackingAccurate, setTrackingAccurate] = useState(false);
  const [bodyFatPctInput, setBodyFatPctInput] = useState("");

  const [goalType, setGoalType] = useState<GoalUILabel>("maintain");
  const [weeklyPace, setWeeklyPace] = useState("0.5");

  // ✅ Old feature states (re-skinned)
  const [macroMethod, setMacroMethod] = useState<
    "proteinPerKg" | "percent" | "cycling"
  >("proteinPerKg");
  const [macroMethodOpen, setMacroMethodOpen] = useState(true);
  const [proteinPerKgInput, setProteinPerKgInput] = useState("1.8");
  const [proteinPctInput, setProteinPctInput] = useState("30");
  const [carbPctInput, setCarbPctInput] = useState("40");
  const [fatPctInput, setFatPctInput] = useState("30");
  const [trainingCarbPctInput, setTrainingCarbPctInput] = useState("45");
  const [restCarbPctInput, setRestCarbPctInput] = useState("30");
  const [trainingFatPctInput, setTrainingFatPctInput] = useState("25");
  const [restFatPctInput, setRestFatPctInput] = useState("35");
  const [macroGoalsOpen, setMacroGoalsOpen] = useState(true);

  const [mealsPerDay, setMealsPerDay] = useState<string | number>(3);
  const [breakfastTime, setBreakfastTime] = useState("08:00");
  const [lastMealTime, setLastMealTime] = useState("19:00");

  // Save / dirty
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | "ok" | "err">(null);

  // Targets preview (from GoalsCard)
  const [targetsPreview, setTargetsPreview] = useState<Targets | null>(null);
  const lastPreviewKey = useRef<string>("");
  const lastMetricsRef = useRef<{
    weightUnit?: "kg" | "lb";
    weightKg?: number;
    targetWeightKg?: number;
    heightCm?: number;
    bodyFatPct?: number;
    waistCm?: number;
  } | null>(null);
  const [badgePreviewIds, setBadgePreviewIds] = useState<string[]>([]);
  const [badgeUnlockedCount, setBadgeUnlockedCount] = useState(0);
  const [friendsPreview, setFriendsPreview] = useState<
    Array<{ name?: string | null; email?: string | null }>
  >([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendsPings, setFriendsPings] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Profile",
      headerShadowVisible: false,
    });
  }, [navigation]);

  const refreshBadgesPreview = useCallback(async () => {
    const unlocks = (await loadUnlocksLocal()) as UnlockMap;
    const featured = await loadFeaturedLocal();

    const unlockedIds = Object.entries(unlocks)
      .filter(([, v]) => !!v?.unlockedAt)
      .sort((a, b) => (b[1]?.unlockedAt ?? 0) - (a[1]?.unlockedAt ?? 0))
      .map(([id]) => id);

    const preview = (featured?.length ? featured : unlockedIds).slice(0, 3);
    setBadgePreviewIds(preview);
    setBadgeUnlockedCount(Object.keys(unlocks || {}).length);
  }, []);

  useEffect(() => {
    refreshBadgesPreview().catch(() => {});
  }, [refreshBadgesPreview]);

  useFocusEffect(
    useCallback(() => {
      refreshBadgesPreview().catch(() => {});
    }, [refreshBadgesPreview])
  );

  useEffect(() => {
    if (!user?.uid) {
      setFriendsPreview([]);
      setFriendsCount(0);
      setFriendsPings(0);
      return;
    }

    const unsubFriends = subscribeFriends(
      user.uid,
      (rows: FriendEdge[]) => {
        const accepted = rows.filter((r) => r.status === "accepted");
        setFriendsCount(accepted.length);
        setFriendsPreview(
          accepted.slice(0, 3).map((r) => ({
            name: r.friendDisplayName,
            email: r.friendEmail,
          }))
        );
      },
      ["accepted"]
    );

    const unsubRequests = subscribeFriendRequests(user.uid, (rows) => {
      setFriendsPings(rows.length);
    });

    return () => {
      unsubFriends?.();
      unsubRequests?.();
    };
  }, [user?.uid]);

  // ✅ Old behavior: ensureProfile safety
  useEffect(() => {
    if (!user?.uid) return;
    ensureProfile(user.uid).catch(() => {});
  }, [user?.uid]);

  // Hydrate from backend
  useEffect(() => {
    if (!user?.uid) return;

    return subscribeProfile(user.uid, (p) => {
      setProfile(p);

      if (!hydrated && p) {
        const unit = p?.weightUnit === "lb" ? "lb" : "kg";
        setWeightUnit(unit);

        setSex((p?.sex as any) || "male");
        setAge(String(p?.age ?? 25));
        setHeightCm(String(p?.heightCm ?? 175));

        const wkg = Number(p?.weightKg ?? 75);
        const tkg = Number(p?.targetWeightKg ?? 70);

        setWeightInput(
          unit === "lb"
            ? String(Math.round(kgToLb(wkg)))
            : String(Math.round(wkg))
        );
        setTargetWeightInput(
          unit === "lb"
            ? String(Math.round(kgToLb(tkg)))
            : String(Math.round(tkg))
        );

        setActivityLevel((p?.activityLevel as ActivityLevel) || "moderate");
        setGoalType(((p as any)?.goal as GoalUILabel) || "maintain");
        setWeeklyPace(String((p as any)?.weeklyPace ?? "0.5"));

        // ✅ hydrate old feature fields if present
        setMacroMethod(((p as any)?.macroMethod as any) || "proteinPerKg");
        setMealsPerDay((p as any)?.mealsPerDay ?? 3);
        setBreakfastTime((p as any)?.breakfastTime ?? "08:00");
        setLastMealTime((p as any)?.lastMealTime ?? "19:00");
        setProteinPerKgInput(String((p as any)?.proteinPerKg ?? "1.8"));
        setProteinPctInput(String((p as any)?.proteinPct ?? "30"));
        setCarbPctInput(String((p as any)?.carbPct ?? "40"));
        setFatPctInput(String((p as any)?.fatPct ?? "30"));
        setTrainingCarbPctInput(
          String((p as any)?.cycling?.trainingCarbPct ?? "45")
        );
        setRestCarbPctInput(String((p as any)?.cycling?.restCarbPct ?? "30"));
        setTrainingFatPctInput(
          String((p as any)?.cycling?.trainingFatPct ?? "25")
        );
        setRestFatPctInput(String((p as any)?.cycling?.restFatPct ?? "35"));

        setStepsPerDay(String((p as any)?.stepsPerDay ?? 7000));
        setGymSessionsPerWeek(String((p as any)?.gymSessionsPerWeek ?? 4));
        setSportSessionsPerWeek(String((p as any)?.sportSessionsPerWeek ?? 0));
        setJobActivity(((p as any)?.jobActivity as any) || "light");
        setMacroEngineMode(
          ((p as any)?.macroEngineMode as GoalUILabel) || "maintain"
        );
        setMacroEngineSimple((p as any)?.macroEngineSimple ?? true);
        setGoalIntensity(Number((p as any)?.goalIntensity ?? 0.35));
        setPerformanceFocus(Number((p as any)?.performanceFocus ?? 0.55));
        setProteinFocus(Number((p as any)?.proteinFocus ?? 0.6));
        setTrackingAccurate(Boolean((p as any)?.trackingAccurate ?? false));
        setBodyFatPctInput(
          (p as any)?.bodyFatPct != null ? String((p as any)?.bodyFatPct) : ""
        );
        setHydrated(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, hydrated]);

  useEffect(() => {
    if (!profile) return;

    const next = {
      weightUnit: profile.weightUnit,
      weightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      heightCm: profile.heightCm,
      bodyFatPct: (profile as any)?.bodyFatPct,
      waistCm: (profile as any)?.waistCm,
    };

    const last = lastMetricsRef.current;
    const changed =
      !last ||
      last.weightUnit !== next.weightUnit ||
      last.weightKg !== next.weightKg ||
      last.targetWeightKg !== next.targetWeightKg ||
      last.heightCm !== next.heightCm ||
      last.bodyFatPct !== next.bodyFatPct ||
      last.waistCm !== next.waistCm;

    if (!changed) return;
    lastMetricsRef.current = next;

    const nextUnit = next.weightUnit ?? weightUnit;
    if (nextUnit !== weightUnit) setWeightUnit(nextUnit);

    if (Number.isFinite(next.weightKg)) {
      const w =
        nextUnit === "lb"
          ? Math.round(kgToLb(next.weightKg as number))
          : Math.round(next.weightKg as number);
      setWeightInput(String(w));
    }

    if (Number.isFinite(next.targetWeightKg)) {
      const tw =
        nextUnit === "lb"
          ? Math.round(kgToLb(next.targetWeightKg as number))
          : Math.round(next.targetWeightKg as number);
      setTargetWeightInput(String(tw));
    }

    if (Number.isFinite(next.heightCm)) {
      setHeightCm(String(Math.round(next.heightCm as number)));
    }
  }, [profile, weightUnit]);

  const weightKg = useMemo(() => {
    const n = Number(weightInput || 0);
    return weightUnit === "lb" ? lbToKg(n) : n;
  }, [weightInput, weightUnit]);

  const targetWeightKg = useMemo(() => {
    const n = Number(targetWeightInput || 0);
    return weightUnit === "lb" ? lbToKg(n) : n;
  }, [targetWeightInput, weightUnit]);

  const savedTargets = useMemo(() => getSavedTargets(profile), [profile]);

  // ✅ Old algorithm: maintenance computed from computeTargets
  const maintenanceTargets = useMemo(() => {
    const baseParams = {
      sex,
      weightKg: Number(weightKg || 0),
      heightCm: Number(heightCm || 0),
      age: Number(age || 0),
      activityLevel,
      goal: "maintain" as const,
    };
    const out = computeTargets(baseParams, {
      mode: "proteinPerKg",
      proteinPerKg: 1.8,
    });
    return {
      calorieGoal: out?.calorieGoal ?? 2200,
      proteinGoal: out?.proteinGoal ?? 150,
      carbGoal: out?.carbGoal ?? 250,
      fatGoal: out?.fatGoal ?? 70,
    } satisfies Targets;
  }, [sex, weightKg, heightCm, age, activityLevel]);

  const macroMethodSummary = useMemo(() => {
    if (macroMethod === "proteinPerKg") {
      return `Protein-first · ${proteinPerKgInput || "—"} g/kg`;
    }
    if (macroMethod === "percent") {
      return `Split ${proteinPctInput || "—"}/${carbPctInput || "—"}/${
        fatPctInput || "—"
      }`;
    }
    return `Cycling ${trainingCarbPctInput || "—"}/${
      restCarbPctInput || "—"
    } carbs`;
  }, [
    macroMethod,
    proteinPerKgInput,
    proteinPctInput,
    carbPctInput,
    fatPctInput,
    trainingCarbPctInput,
    restCarbPctInput,
  ]);

  const macroGoalsSummary = useMemo(() => {
    const t = targetsPreview ?? savedTargets;
    const kcal = t?.calorieGoal ?? 0;
    const modeLabel =
      macroEngineMode === "lean_bulk"
        ? "Lean bulk"
        : macroEngineMode.charAt(0).toUpperCase() + macroEngineMode.slice(1);
    return `${modeLabel} · ${Math.round(kcal)} kcal`;
  }, [targetsPreview, savedTargets, macroEngineMode]);

  const initials = initialsFrom(
    profile?.displayName || user?.displayName,
    user?.email
  );

  const onPreviewTargets = useCallback((t: Targets) => {
    const key = `${t.calorieGoal}|${t.proteinGoal}|${t.carbGoal}|${t.fatGoal}`;
    if (key === lastPreviewKey.current) return;
    lastPreviewKey.current = key;

    setTargetsPreview(t);
    setDirty(true);
  }, []);

  const onToggleUnit = useCallback(async () => {
    if (!user?.uid) return;

    const nextUnit = weightUnit === "kg" ? "lb" : "kg";

    const w = Number(weightInput || 0);
    const tw = Number(targetWeightInput || 0);

    const nextW =
      nextUnit === "lb"
        ? Math.round(kgToLb(weightUnit === "kg" ? w : lbToKg(w)))
        : Math.round(lbToKg(weightUnit === "lb" ? w : kgToLb(w)));

    const nextTW =
      nextUnit === "lb"
        ? Math.round(kgToLb(weightUnit === "kg" ? tw : lbToKg(tw)))
        : Math.round(lbToKg(weightUnit === "lb" ? tw : kgToLb(tw)));

    setWeightUnit(nextUnit);
    setWeightInput(String(nextW));
    setTargetWeightInput(String(nextTW));

    setDirty(true);
    Haptics.selectionAsync();

    try {
      await updateProfile(user.uid, { weightUnit: nextUnit });
    } catch {}
  }, [user?.uid, weightInput, targetWeightInput, weightUnit]);

  // ✅ Save now includes the “old features” fields too
  const onSave = useCallback(async () => {
    if (!user?.uid) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      const t = targetsPreview ?? savedTargets;

      await updateProfile(user.uid, {
        // targets
        calorieGoal: t.calorieGoal,
        proteinGoal: t.proteinGoal,
        carbGoal: t.carbGoal,
        fatGoal: t.fatGoal,
        dailyCaloriesTarget: t.calorieGoal,
        dailyProteinTarget: t.proteinGoal,

        // body basics
        sex,
        age: Number(age || 0),
        heightCm: Number(heightCm || 0),
        weightUnit,
        weightKg: Number(weightKg || 0),
        targetWeightKg: Number(targetWeightKg || 0),

        // goal meta
        goal: goalType,
        weeklyPace: Number(weeklyPace || 0.5),
        activityLevel,

        // ✅ old profile features (now persisted)
        macroMethod,
        proteinPerKg: Number(proteinPerKgInput || 0),
        proteinPct: Number(proteinPctInput || 0),
        carbPct: Number(carbPctInput || 0),
        fatPct: Number(fatPctInput || 0),
        cycling: {
          trainingCarbPct: Number(trainingCarbPctInput || 0),
          restCarbPct: Number(restCarbPctInput || 0),
          trainingFatPct: Number(trainingFatPctInput || 0),
          restFatPct: Number(restFatPctInput || 0),
        },
        mealsPerDay,
        breakfastTime,
        lastMealTime,
        // macro engine activity inputs (optional but recommended)
        stepsPerDay: Number(stepsPerDay || 7000),
        gymSessionsPerWeek: Number(gymSessionsPerWeek || 4),
        sportSessionsPerWeek: Number(sportSessionsPerWeek || 0),
        jobActivity,
        macroEngineMode,
        macroEngineSimple,
        goalIntensity,
        performanceFocus,
        proteinFocus,
        trackingAccurate,
        bodyFatPct: bodyFatPctInput ? Number(bodyFatPctInput) : null,

        updatedAt: Date.now(),
      } as any);

      setSaveStatus("ok");
      setDirty(false);
      setTargetsPreview(null);
      lastPreviewKey.current = "";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setSaveStatus("err");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 1200);
    }
  }, [
    user?.uid,
    targetsPreview,
    savedTargets,
    sex,
    age,
    heightCm,
    weightUnit,
    weightKg,
    targetWeightKg,
    goalType,
    weeklyPace,
    activityLevel,
    macroMethod,
    proteinPerKgInput,
    proteinPctInput,
    carbPctInput,
    fatPctInput,
    trainingCarbPctInput,
    restCarbPctInput,
    trainingFatPctInput,
    restFatPctInput,
    mealsPerDay,
    breakfastTime,
    lastMealTime,

    stepsPerDay,
    gymSessionsPerWeek,
    sportSessionsPerWeek,
    jobActivity,
    macroEngineMode,
    macroEngineSimple,
    goalIntensity,
    performanceFocus,
    proteinFocus,
    trackingAccurate,
    bodyFatPctInput,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    setTimeout(() => setRefreshing(false), 650);
  }, []);

  // Trend series placeholder (same as before)
  const trendSeries = useMemo(() => {
    const w = Number(weightKg || 0);
    if (!w) return [];
    const base = w;
    return Array.from({ length: 24 }).map((_, i) => {
      const t = i / 23;
      const wave = Math.sin(t * Math.PI * 2) * 0.6;
      const drift = (t - 0.5) * 0.8;
      return Number((base + wave + drift).toFixed(1));
    });
  }, [weightKg]);

  if (!profile) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={isDark ? ["#070A12", "#0B1020"] : ["#EAF2FF", "#F7FAFF"]}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: colors.muted, fontWeight: "800" }}>
            Loading…
          </Text>
        </View>
      </View>
    );
  }

  const gradient = isDark
    ? (["#070A12", "#0B1020", "#070A12"] as [string, string, string])
    : (["#EEF4FF", "#FFFFFF", "#EEF4FF"] as [string, string, string]);

  const savePill = (
    <Pressable
      onPress={() => {
        if (!dirty) return;
        onSave();
      }}
      style={({ pressed }: { pressed: boolean }) => ({
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: dirty
          ? withAlpha(colors.primary, pressed ? 0.22 : 0.18)
          : withAlpha(colors.border, 0.22),
        borderWidth: 1,
        borderColor: dirty
          ? withAlpha(colors.primary, 0.35)
          : withAlpha(colors.border, 0.55),
      })}
      accessibilityRole="button"
      accessibilityLabel={dirty ? "Save profile changes" : "No changes to save"}
    >
      <Text
        style={{
          color: dirty ? colors.text : colors.muted,
          fontWeight: "900",
          fontSize: 12,
        }}
      >
        {saving
          ? "Saving…"
          : saveStatus === "ok"
          ? "Saved"
          : saveStatus === "err"
          ? "Try again"
          : dirty
          ? "Save changes"
          : "Up to date"}
      </Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={gradient}
        style={{ position: "absolute", inset: 0 }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 16,
          gap: 14,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.muted}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <PremiumProfileHeader
          initials={initials}
          name={profile.displayName || user?.displayName || "You"}
          subtitle={user?.email || ""}
          isPro={isPro}
          weightKg={Number(weightKg || 0)}
          targetWeightKg={Number(targetWeightKg || 0)}
          unit={weightUnit}
          goalType={goalType}
          activityLevel={activityLevel}
          onToggleUnit={onToggleUnit}
          onPressSettings={() => router.push("(modals)/control-center")}
          onPressGoPro={() => router.push("/paywall")}
          rightSlot={savePill}
        />

        {/* <QuickActionsRow
          onScanMeal={() => router.push("/scan-meal")}
          onLogWorkout={() => router.push("/workouts")}
          onAddCheckIn={() => {
            Haptics.selectionAsync();
            Alert.alert(
              "Add a check-in",
              "Wire this to your check-in flow (weight, photos, measurements).",
              [{ text: "OK" }]
            );
          }}
          onBadges={() => router.push("/badges")}
          onFriends={() => router.push("/friends")}
        /> */}

        {/* ✅ NEW: Appearance (old feature, premium skin) */}
        <AppearanceCard>
          <ThemeToggle />
        </AppearanceCard>

        {/* ✅ NEW: Macro method (old feature, premium skin) */}
        <View>
          <Pressable
            onPress={() => setMacroMethodOpen((v) => !v)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.glassBorder,
                backgroundColor: pressed ? colors.surface2 : colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle macro method"
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}
              >
                Macro method
              </Text>
              {!macroMethodOpen ? (
                <Text style={{ color: colors.muted, fontSize: 12.5 }}>
                  {macroMethodSummary}
                </Text>
              ) : null}
            </View>
            <Ionicons
              name={macroMethodOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.muted}
            />
          </Pressable>
          {macroMethodOpen ? (
            <View style={{ marginTop: 10 }}>
              <MacroMethodCard
                hideHeader
                value={macroMethod}
                onChange={(v) => {
                  setMacroMethod(v);
                  setDirty(true);
                }}
                proteinPerKg={proteinPerKgInput}
                onChangeProteinPerKg={(v) => {
                  setProteinPerKgInput(v);
                  setDirty(true);
                }}
                proteinPct={proteinPctInput}
                carbPct={carbPctInput}
                fatPct={fatPctInput}
                onChangeProteinPct={(v) => {
                  setProteinPctInput(v);
                  setDirty(true);
                }}
                onChangeCarbPct={(v) => {
                  setCarbPctInput(v);
                  setDirty(true);
                }}
                onChangeFatPct={(v) => {
                  setFatPctInput(v);
                  setDirty(true);
                }}
                trainingCarbPct={trainingCarbPctInput}
                restCarbPct={restCarbPctInput}
                trainingFatPct={trainingFatPctInput}
                restFatPct={restFatPctInput}
                onChangeTrainingCarbPct={(v) => {
                  setTrainingCarbPctInput(v);
                  setDirty(true);
                }}
                onChangeRestCarbPct={(v) => {
                  setRestCarbPctInput(v);
                  setDirty(true);
                }}
                onChangeTrainingFatPct={(v) => {
                  setTrainingFatPctInput(v);
                  setDirty(true);
                }}
                onChangeRestFatPct={(v) => {
                  setRestFatPctInput(v);
                  setDirty(true);
                }}
              />
            </View>
          ) : null}
        </View>
        <View>
          <Pressable
            onPress={() => setMacroGoalsOpen((v) => !v)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.glassBorder,
                backgroundColor: pressed ? colors.surface2 : colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle macro goals"
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}
              >
                Macro goals
              </Text>
              {!macroGoalsOpen ? (
                <Text style={{ color: colors.muted, fontSize: 12.5 }}>
                  {macroGoalsSummary}
                </Text>
              ) : null}
            </View>
            <Ionicons
              name={macroGoalsOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.muted}
            />
          </Pressable>
          {macroGoalsOpen ? (
            <View style={{ marginTop: 10 }}>
              <MacroGoalsEngineCard
                hideHeaderText
                currentWeightKg={Number(weightKg || 0)}
                targetWeightKg={Number(targetWeightKg || 0)}
                targetWeightInput={targetWeightInput}
                onChangeTargetWeight={(v) => {
                  setTargetWeightInput(v);
                  setDirty(true);
                }}
                weightUnit={weightUnit}
                maintenanceTargets={maintenanceTargets}
                sex={sex}
                age={Number(age || 25)}
                heightCm={Number(heightCm || 175)}
                defaultStepsPerDay={Number(stepsPerDay || 7000)}
                defaultGymSessionsPerWeek={Number(gymSessionsPerWeek || 4)}
                defaultSportSessionsPerWeek={Number(sportSessionsPerWeek || 0)}
                defaultJobActivity={jobActivity}
                initialMode={macroEngineMode}
                initialSimple={macroEngineSimple}
                initialGoalIntensity={goalIntensity}
                initialPerformanceFocus={performanceFocus}
                initialProteinFocus={proteinFocus}
                initialTrackingAccurate={trackingAccurate}
                initialBodyFatPct={bodyFatPctInput}
                onChangeStepsPerDay={(v) => {
                  setStepsPerDay(v);
                  setDirty(true);
                }}
                onChangeGymSessionsPerWeek={(v) => {
                  setGymSessionsPerWeek(v);
                  setDirty(true);
                }}
                onChangeSportSessionsPerWeek={(v) => {
                  setSportSessionsPerWeek(v);
                  setDirty(true);
                }}
                onChangeJobActivity={(v) => {
                  setJobActivity(v);
                  setDirty(true);
                }}
                onChangeMode={(v) => {
                  setMacroEngineMode(v);
                  setDirty(true);
                }}
                onChangeSimple={(v) => {
                  setMacroEngineSimple(v);
                  setDirty(true);
                }}
                onChangeGoalIntensity={(v) => {
                  setGoalIntensity(v);
                  setDirty(true);
                }}
                onChangePerformanceFocus={(v) => {
                  setPerformanceFocus(v);
                  setDirty(true);
                }}
                onChangeProteinFocus={(v) => {
                  setProteinFocus(v);
                  setDirty(true);
                }}
                onChangeTrackingAccurate={(v) => {
                  setTrackingAccurate(v);
                  setDirty(true);
                }}
                onChangeBodyFatPct={(v) => {
                  setBodyFatPctInput(v);
                  setDirty(true);
                }}
                savedTargets={savedTargets}
                onPreview={(t, meta) => {
                  onPreviewTargets(t);
                }}
              />
            </View>
          ) : null}
        </View>

        {/* ✅ Old “explanatory cards” feature — premium condensed version */}
        {/* <GoalInsightsCard
          isDark={isDark}
          macroMethod={macroMethod}
          maintenance={maintenanceTargets}
          activeTargets={targetsPreview ?? savedTargets}
          goalType={goalType}
          weeklyPace={Number(weeklyPace || 0.5)}
        /> */}
        <DietPreferencesCard
          value={(profile as any)?.dietPreferences}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(modals)/diet-preferences");
          }}
        />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <MetricsCard
              unit={weightUnit}
              weightKg={Number(weightKg || 0)}
              targetWeightKg={Number(targetWeightKg || 0)}
              heightCm={Number(heightCm || 0)}
              bodyFatPct={(profile as any)?.bodyFatPct}
              waistCm={(profile as any)?.waistCm}
              onPressAdd={() => {
                Haptics.selectionAsync();

                router.push({
                  pathname: "/(modals)/body-metrics",
                  params: {
                    unit: weightUnit, // "lb" | "kg"
                    weightKg: String(weightKg ?? ""),
                    targetWeightKg: String(targetWeightKg ?? ""),
                    heightCm: String(heightCm ?? ""),
                    bodyFatPct: String((profile as any)?.bodyFatPct ?? ""),
                    waistCm: String((profile as any)?.waistCm ?? ""),
                  },
                });
              }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <BodyTwinEvolveCard
              isDark={isDark}
              weightKg={Number(weightKg || 0)}
              heightCm={Number(heightCm || 0)}
              goalType={goalType}
              trendHint={
                trendSeries.length
                  ? trendSeries[trendSeries.length - 1] - trendSeries[0]
                  : 0
              }
              onPressCustomize={() => {
                Haptics.selectionAsync();
                router.push({
                  pathname: "/(modals)/bodyTwin",
                  params: {
                    weightKg: String(weightKg ?? ""),
                    heightCm: String(heightCm ?? ""),
                    // optional extras if you have them:
                    bodyFatPct: String((profile as any)?.bodyFatPct ?? ""),
                    waistCm: String((profile as any)?.waistCm ?? ""),
                  },
                });
              }}
            />
          </View>
        </View>

        <LongTermProgressCard
          unit={weightUnit} // "lb" | "kg"
          initialRange="6m"
          showConfidence
          onPressAddCheckIn={() => {
            // push your body metrics editor/modal
            router.push("/(modals)/long-term-progress");
          }}
        />

        {/* ✅ Meal schedule (old feature, premium skin) */}
        {/* <MealSchedulePremiumCard
          mealsPerDay={mealsPerDay}
          setMealsPerDay={(v) => {
            setMealsPerDay(v);
            setDirty(true);
          }}
          breakfastTime={breakfastTime}
          setBreakfastTime={(v) => {
            setBreakfastTime(v);
            setDirty(true);
          }}
          lastMealTime={lastMealTime}
          setLastMealTime={(v) => {
            setLastMealTime(v);
            setDirty(true);
          }}
        /> */}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <BadgesPreviewCard
              onPressAll={() => router.push("/badges")}
              unlockedCount={badgeUnlockedCount}
              previewIds={badgePreviewIds}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FriendsPreviewCard
              onPressAll={() => router.push("/friends")}
              friendsCount={friendsCount}
              streakPings={friendsPings}
              previewFriends={friendsPreview}
            />
          </View>
        </View>

        <GlassCard>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
            Privacy & safety
          </Text>
          <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 18 }}>
            Your progress is yours. This page avoids shame language, hides
            sensitive signals by default, and uses neutral, supportive copy.
          </Text>

          <View style={{ height: 10 }} />
          <View style={{ gap: 10 }}>
            <EmptyState
              title="Private by default"
              message="Friends see what you choose to share — never raw weight or calories unless you opt in."
              icon="lock-closed-outline"
            />
            <EmptyState
              title="Accessibility aware"
              message="Large touch targets, readable contrast, reduced motion friendly interactions."
              icon="eye-outline"
            />
            <EmptyState
              title="Emotionally safe"
              message="Trends are framed as information — not judgment. You’re in control."
              icon="heart-outline"
            />
          </View>
        </GlassCard>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Optional: “always visible” save prompt in premium style (keeps your save pill too) */}
      {dirty ? (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + 52,
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={onSave}
            style={({ pressed }: { pressed: boolean }) => ({
              height: 52,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              backgroundColor: withAlpha(colors.primary, pressed ? 0.22 : 0.16),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            })}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              {saving
                ? "Saving…"
                : saveStatus === "ok"
                ? "Saved"
                : "Save changes"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
