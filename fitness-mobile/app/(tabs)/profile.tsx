// app/(tabs)/profile.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import {
  View,
  ScrollView,
  Text,
  Animated,
  Easing,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  LayoutChangeEvent,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { useRouter, useNavigation } from "expo-router";
import { useEntitlements } from "@/content/useEntitlements";
import { getFirestore, collection, addDoc } from "firebase/firestore";

import Card from "@/components/Card";
import ThemeToggle from "@/components/ThemeToggle";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import AdvancedGoalsEngineCard from "@/components/profile/cards/AdvancedCard";

import {
  ensureProfile,
  subscribeProfile,
  updateProfile,
  type Profile,
} from "@/services/profile";
import { computeTargets } from "@/utils/macros";
import { kgToLb, lbToKg } from "@/utils/units";

import BasicsCard from "@/components/profile/cards/BasicsCard";
import GoalsMacrosCard from "@/components/profile/cards/GoalsMacrosCard";
import MealScheduleCard from "@/components/profile/cards/MealScheduleCard";

/* ✅ NEW EXPLANATORY CARDS */
import GoalSummaryCard from "@/components/profile/cards/GoalSummaryCard";
import MacroMethodExplainer from "@/components/profile/cards/MacroMethodExplainer";
import MealTimingHintCard from "@/components/profile/cards/MealTimingHintCard";

import StickySaveBar from "@/components/profile/StickySaveBar";

/* ✅ GLOSSY UI */
import { GlassSurface } from "@/components/profile/uiNew/GlassSurface";
import { ProfileHero } from "@/components/profile/uiNew/ProfileHero";
import { TargetsGlassPanel } from "@/components/profile/uiNew/TargetsGlassPanel";
import { GlassAccordion } from "@/components/profile/uiNew/GlassAccordion";
import { SectionDock } from "@/components/profile/uiNew/SectionDock";

/* ───────────────── helpers ───────────────── */

const withAlpha = (hex: string, a = 0.18) => {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const toISO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

/* ───────────────── types ───────────────── */

export type GoalUILabel = "maintain" | "cut" | "bulk";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "athlete";

/* ───────────────── screen ───────────────── */

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isPro } = useEntitlements();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>("basics");
  const [openKeys, setOpenKeys] = useState({
    basics: true,
    goals: false,
    meals: false,
  });

  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("25");
  const [heightCm, setHeightCm] = useState("175");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [weightInput, setWeightInput] = useState("75");
  const [targetWeight, setTargetWeight] = useState("70");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");

  const [goalType, setGoalType] = useState<GoalUILabel>("maintain");
  const [weeklyPace, setWeeklyPace] = useState("0.5");
  const [hydrated, setHydrated] = useState(false);

  const [macroMethod, setMacroMethod] = useState<
    "proteinPerKg" | "percent" | "cycling"
  >("proteinPerKg");

  const [mealsPerDay, setMealsPerDay] = useState<string | number>(3);
  const [breakfastTime, setBreakfastTime] = useState("08:00");
  const [lastMealTime, setLastMealTime] = useState("19:00");

  const [macrosPreview, setMacrosPreview] = useState<any>(null);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | "ok" | "err">(null);
  const [dirty, setDirty] = useState(false);

  const initials = initialsFrom(
    profile?.displayName || user?.displayName,
    user?.email
  );

  // add near other hooks
  const lastPreviewRef = useRef<string>("");

  const handlePreview = useCallback((t: any) => {
    const key = `${t?.calorieGoal ?? ""}|${t?.proteinGoal ?? ""}|${
      t?.carbGoal ?? ""
    }|${t?.fatGoal ?? ""}`;
    if (key === lastPreviewRef.current) return;
    lastPreviewRef.current = key;
    setMacrosPreview(t);
    setDirty(true); // if you want sliders to mark dirty
  }, []);

  /* ─────────── hydrate profile ─────────── */

  useEffect(() => {
    if (!user?.uid) return;

    return subscribeProfile(user.uid, (p) => {
      setProfile(p);

      // ✅ IMPORTANT: only set local input states once
      if (!hydrated && p) {
        const unit = p?.weightUnit === "lb" ? "lb" : "kg";

        setSex((p?.sex as any) || "male");
        setAge(String(p?.age ?? 25));
        setHeightCm(String(p?.heightCm ?? 175));

        setWeightUnit(unit);

        const wkg = Number(p?.weightKg ?? 75);
        const tkg = Number(p?.targetWeightKg ?? 70);

        setWeightInput(
          unit === "lb"
            ? String(Math.round(kgToLb(wkg)))
            : String(Math.round(wkg))
        );

        setTargetWeight(
          unit === "lb"
            ? String(Math.round(kgToLb(tkg)))
            : String(Math.round(tkg))
        );

        setActivityLevel((p?.activityLevel as ActivityLevel) || "moderate");
        setGoalType(((p as any)?.goal as GoalUILabel) || "maintain");
        setWeeklyPace(String((p as any)?.weeklyPace ?? "0.5"));

        setHydrated(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, hydrated]);

  async function onSave() {
    if (!user?.uid) return;
    setSaving(true);
    setSaveStatus(null);

    try {
      // ✅ prefer preview targets (from sliders). Fallback to existing.
      const t = macrosPreview ?? {
        calorieGoal:
          profile?.calorieGoal ?? profile?.dailyCaloriesTarget ?? 2200,
        proteinGoal: profile?.proteinGoal ?? profile?.dailyProteinTarget ?? 150,
        carbGoal: profile?.carbGoal ?? 250,
        fatGoal: profile?.fatGoal ?? 70,
      };
      const weightKgNow =
        weightUnit === "lb"
          ? lbToKg(Number(weightInput || 0))
          : Number(weightInput || 0);

      const targetWeightKgNow =
        weightUnit === "lb"
          ? lbToKg(Number(targetWeight || 0))
          : Number(targetWeight || 0);

      await updateProfile(user.uid, {
        calorieGoal: t.calorieGoal,
        proteinGoal: t.proteinGoal,
        carbGoal: t.carbGoal,
        fatGoal: t.fatGoal,
        dailyCaloriesTarget: t.calorieGoal,
        dailyProteinTarget: t.proteinGoal,

        weightUnit,
        weightKg: weightKgNow,
        targetWeightKg: targetWeightKgNow,

        updatedAt: Date.now(),
      });

      setSaveStatus("ok");
      setDirty(false);
    } catch (e) {
      setSaveStatus("err");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 1200);
    }
  }

  /* ─────────── header ─────────── */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Profile",
      headerShadowVisible: false,
    });
  }, [navigation]);

  const weightKg =
    weightUnit === "lb"
      ? lbToKg(Number(weightInput || 0))
      : Number(weightInput || 0);

  const targetWeightKg =
    weightUnit === "lb"
      ? lbToKg(Number(targetWeight || 0))
      : Number(targetWeight || 0);

  const maintenance = useMemo(() => {
    // build the same base params computeTargets expects
    const baseParams = {
      sex,
      weightKg: Number(weightKg || 0),
      heightCm: Number(heightCm || 0),
      age: Number(age || 0),
      activityLevel,
      goal: "maintain" as const,
    };

    // pick ONE macro mode just to get calorieGoal (doesn't matter much)
    // proteinPerKg is simplest and stable
    const out = computeTargets(baseParams, {
      mode: "proteinPerKg",
      proteinPerKg: 1.8,
    });

    return out; // { calorieGoal, proteinGoal, carbGoal, fatGoal, ... }
  }, [sex, weightKg, heightCm, age, activityLevel]);

  const maintenanceTargets = useMemo(
    () => ({
      calorieGoal: maintenance?.calorieGoal ?? 2200,
      proteinGoal: maintenance?.proteinGoal ?? 150,
      carbGoal: maintenance?.carbGoal ?? 250,
      fatGoal: maintenance?.fatGoal ?? 70,
    }),
    [maintenance]
  );

  if (!profile) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={isDark ? ["#070A12", "#0B1020"] : ["#EAF2FF", "#F5F8FF"]}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: colors.muted, fontWeight: "700" }}>
            Loading…
          </Text>
        </View>
      </View>
    );
  }

  const maintenanceCalories = maintenance?.calorieGoal ?? 2200;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={isDark ? ["#070A12", "#0B1020"] : ["#EAF2FF", "#F5F8FF"]}
        style={{ position: "absolute", inset: 0 }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 70,
          paddingHorizontal: 16,
          paddingBottom: 140,
          gap: 16,
        }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <ProfileHero
          initials={initials}
          name={profile.displayName || user?.displayName || null}
          email={user?.email || null}
          completionPct={80}
          goal={goalType}
          activity={activityLevel}
          stepsGoal="8000"
          unit={weightUnit}
          isPro={isPro}
          onGoPro={() => router.push("/paywall")}
          onToggleUnit={() =>
            updateProfile(user!.uid, {
              weightUnit: weightUnit === "kg" ? "lb" : "kg",
            })
          }
          onAccount={() => router.push("/(modals)/account")}
        />

        <TargetsGlassPanel
          preview={macrosPreview}
          fallback={{
            calories: profile?.calorieGoal,
            protein: profile?.proteinGoal,
            carbs: profile?.carbGoal,
            fat: profile?.fatGoal,
          }}
        />

        {/* Appearance toggle */}
        <GlassSurface
          style={{
            padding: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 10,
          }}
          intensity={18}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Ionicons
              name="color-palette-outline"
              size={16}
              color={colors.text}
            />
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              Appearance
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, flex: 1 }}>
              System / Light / Dark
            </Text>
          </View>
          <ThemeToggle />
        </GlassSurface>

        <SectionDock
          activeKey={activeChip}
          items={[
            { key: "basics", label: "Basics", icon: "person-outline" },
            { key: "goals", label: "Goals", icon: "trophy-outline" },
            { key: "meals", label: "Meals", icon: "fast-food-outline" },
          ]}
          onPress={(k) => {
            setActiveChip(k);
            setOpenKeys((p) => ({ ...p, [k]: true }));
          }}
        />

        {/* ───────── BASICS ───────── */}
        <GlassAccordion
          title="Basics"
          subtitle="Age, height, weight"
          icon="person-outline"
          open={openKeys.basics}
          onToggle={() => setOpenKeys((p) => ({ ...p, basics: !p.basics }))}
        >
          <BasicsCard
            sex={sex}
            setSex={setSex}
            age={age}
            setAge={setAge}
            heightCm={heightCm}
            setHeightCm={setHeightCm}
            weightUnit={weightUnit}
            setWeightUnit={setWeightUnit}
            weightInput={weightInput}
            setWeightInput={setWeightInput}
          />
        </GlassAccordion>

        {/* ───────── GOALS ───────── */}
        <GlassAccordion
          title="Goals Engine"
          subtitle="Simulate, adjust, and predict outcomes"
          icon="pulse-outline"
          open={openKeys.goals}
          onToggle={() => setOpenKeys((p) => ({ ...p, goals: !p.goals }))}
        >
          <AdvancedGoalsEngineCard
            currentWeightKg={weightKg}
            targetWeightKg={targetWeightKg}
            targetWeightInput={targetWeight}
            onChangeTargetWeight={setTargetWeight}
            weightUnit={weightUnit}
            maintenanceTargets={maintenanceTargets}
            sex={sex}
            age={Number(age || 0)}
            heightCm={Number(heightCm || 0)}
            onPreview={handlePreview}
          />
        </GlassAccordion>

        {/* ───────── MEALS ───────── */}
        <GlassAccordion
          title="Meal schedule"
          subtitle="Timing, not pressure"
          icon="fast-food-outline"
          open={openKeys.meals}
          onToggle={() => setOpenKeys((p) => ({ ...p, meals: !p.meals }))}
        >
          <MealScheduleCard
            mealsPerDay={mealsPerDay}
            setMealsPerDay={setMealsPerDay}
            fastingWindow={null}
            setFastingWindow={() => {}}
            breakfastTime={breakfastTime}
            setBreakfastTime={setBreakfastTime}
            lastMealTime={lastMealTime}
            setLastMealTime={setLastMealTime}
          />

          <MealTimingHintCard />
        </GlassAccordion>

        <BottomTabSpacer extra={16} />
      </ScrollView>

      <StickySaveBar
        saving={saving}
        status={saveStatus}
        dirty={dirty}
        onSave={onSave}
      />
    </KeyboardAvoidingView>
  );
}
