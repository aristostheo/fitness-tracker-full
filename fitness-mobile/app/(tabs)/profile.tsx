// app/(tabs)/profile.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import {
  View,
  ScrollView,
  Text,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import Card from "@/components/Card";

import {
  ensureProfile,
  subscribeProfile,
  updateProfile,
  type Profile,
} from "@/services/profile";
import { computeTargets } from "@/utils/macros";
import { kgToLb, lbToKg } from "@/utils/units";

import BasicsCard from "@/components/profile/cards/BasicsCard";
import GoalsActivityCard from "@/components/profile/cards/GoalsActivityCard";
import MacrosCard from "@/components/profile/cards/MacrosCard";
import DietCookingCard from "@/components/profile/cards/DietCookingCard";
import MealScheduleCard from "@/components/profile/cards/MealScheduleCard";
import EquipmentCard from "@/components/profile/cards/EquipmentCard";

import SectionNav from "@/components/profile/SectionNav";
import AccordionCard from "@/components/profile/AccordionCard";
import StickySaveBar from "@/components/profile/StickySaveBar";
import Tip from "@/components/profile/Tip";
import HeaderSection from "@/components/profile/HeaderSection";
// at top with other imports
import HeaderActions from "@/components/profile/HeaderActions";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";

// ───────── helpers ─────────
const clamp01 = (x: number) => Math.max(0, Math.min(1, Number(x) || 0));

const withAlpha = (hex: string, a = 0.18) => {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

function toISO(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function commaSplit(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
function joinComma(arr?: string[]) {
  return (arr || []).join(", ");
}
function pruneUndefinedDeep<T>(val: T): T {
  if (Array.isArray(val)) return val.map(pruneUndefinedDeep) as unknown as T;
  if (val && typeof val === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(val as any)) {
      if (v === undefined) continue;
      out[k] = pruneUndefinedDeep(v as any);
    }
    return out;
  }
  return val;
}

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  // ── all hooks before any early return ──
  const [profile, setProfile] = useState<Profile | null>(null);

  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("25");
  const [heightCm, setHeightCm] = useState("175");

  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [weightInput, setWeightInput] = useState("75");
  const [targetWeight, setTargetWeight] = useState("70");
  const [targetDate, setTargetDate] = useState(toISO(new Date()));

  const [activityLevel, setActivityLevel] = useState<
    "sedentary" | "light" | "moderate" | "active" | "athlete"
  >("moderate");
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState("3");
  const [stepsGoal, setStepsGoal] = useState("8000");

  const navigation = useNavigation();

  const [macroMethod, setMacroMethod] = useState<
    "proteinPerKg" | "percent" | "cycling"
  >("proteinPerKg");
  const [proteinPerKg, setProteinPerKg] = useState("1.8");

  const [proteinPct, setProteinPct] = useState(0.3);
  const [carbPct, setCarbPct] = useState(0.4);
  const [fatPct, setFatPct] = useState(0.3);
  const [trainCarbPct, setTrainCarbPct] = useState(0.45);
  const [restCarbPct, setRestCarbPct] = useState(0.35);

  const [dietType, setDietType] = useState<
    | "balanced"
    | "mediterranean"
    | "high-protein"
    | "vegetarian"
    | "vegan"
    | "keto"
  >("balanced");
  const [allergies, setAllergies] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [cookMins, setCookMins] = useState("20");
  const [cookSkill, setCookSkill] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [budgetPerMeal, setBudgetPerMeal] = useState("5");

  const DEFAULT_MEALS = [
    { label: "breakfast", time: "08:00" },
    { label: "lunch", time: "12:30" },
    { label: "dinner", time: "19:00" },
    { label: "snacks", time: "" },
  ] as const;
  type MealLabel = (typeof DEFAULT_MEALS)[number]["label"];
  type Meal = { label: MealLabel; time?: string };
  const [meals, setMeals] = useState<Meal[]>([...DEFAULT_MEALS]);

  const EQUIP = [
    "none",
    "bands",
    "dumbbells",
    "barbell",
    "kettlebells",
    "machines",
    "cable",
    "pullupbar",
  ] as const;
  const [equipment, setEquipment] = useState<string[]>([]);
  const [workoutPlace, setWorkoutPlace] = useState<"home" | "gym">("home");
  const [injuries, setInjuries] = useState("");

  const insets = useSafeAreaInsets();
  const TOP_BAR_H = -52; // height of your ProfileTopBar's chip cluster
  const topPad = insets.top + TOP_BAR_H; // safe area + bar + breathing room

  // multi-open accordions + active chip
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({
    basics: true,
  });
  const [activeChip, setActiveChip] = useState<string | null>("basics");

  // save feedback
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | "ok" | "err">(null);

  // entrance
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // keep % balanced
  function setSplit(
    which: "proteinPct" | "carbPct" | "fatPct",
    nextVal: number
  ) {
    const next = clamp01(nextVal);
    const current = { proteinPct, carbPct, fatPct };
    const others = Object.entries(current)
      .filter(([k]) => k !== which)
      .map(([key, val]) => ({ key, val: val as number }));
    const sumOthers = others[0].val + others[1].val;
    const targetOthers = 1 - next;
    const scale = sumOthers <= 0 ? 0.5 : targetOthers / sumOthers;
    const n1 = sumOthers <= 0 ? targetOthers / 2 : others[0].val * scale;
    const n2 = sumOthers <= 0 ? targetOthers / 2 : others[1].val * scale;
    if (which === "proteinPct") {
      setProteinPct(next);
      (others[0].key === "carbPct" ? setCarbPct : setFatPct)(n1);
      (others[1].key === "fatPct" ? setFatPct : setCarbPct)(n2);
    } else if (which === "carbPct") {
      setCarbPct(next);
      (others[0].key === "proteinPct" ? setProteinPct : setFatPct)(n1);
      (others[1].key === "fatPct" ? setFatPct : setProteinPct)(n2);
    } else {
      setFatPct(next);
      (others[0].key === "proteinPct" ? setProteinPct : setCarbPct)(n1);
      (others[1].key === "carbPct" ? setCarbPct : setProteinPct)(n2);
    }
  }
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderRightActions />, // ← replace here
      headerTitle: "Profile",
      headerBackground: () => <GlassAdaptiveHeader />,
      headerShadowVisible: false,
    });
  }, [navigation, colors]);
  // hydrate
  useEffect(() => {
    if (!user?.uid) return;
    let unsub: undefined | (() => void);
    (async () => {
      await ensureProfile(user.uid, user.email ? { email: user.email } : {});
      unsub = subscribeProfile(user.uid, (p) => {
        setProfile(p);
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
        setTargetDate(p?.targetDate || toISO(new Date()));
        setActivityLevel((p?.activityLevel as any) || "moderate");
        setTrainingDaysPerWeek(String((p as any)?.trainingDaysPerWeek ?? 3));
        setStepsGoal(String((p as any)?.stepsGoal ?? 8000));
        setMacroMethod((p?.macroMethod as any) || "proteinPerKg");
        setProteinPerKg(String(p?.proteinPerKg ?? 1.8));
        setProteinPct(p?.proteinPct ?? 0.3);
        setCarbPct(p?.carbPct ?? 0.4);
        setFatPct(p?.fatPct ?? 0.3);
        setTrainCarbPct((p as any)?.cycling?.trainingCarbPct ?? 0.45);
        setRestCarbPct((p as any)?.cycling?.restCarbPct ?? 0.35);
        setDietType((p as any)?.diet?.type ?? "balanced");
        setAllergies(joinComma((p as any)?.diet?.allergies));
        setDislikes(joinComma((p as any)?.diet?.dislikes));
        setCookMins(String((p as any)?.cooking?.minutes ?? 20));
        setCookSkill(((p as any)?.cooking?.skill as any) || "beginner");
        setBudgetPerMeal(String((p as any)?.cooking?.budgetPerMealUSD ?? 5));
        const ALLOWED: readonly MealLabel[] = [
          "breakfast",
          "lunch",
          "dinner",
          "snacks",
        ] as const;
        const rawSched = Array.isArray((p as any)?.meals?.schedule)
          ? (p as any).meals.schedule
          : DEFAULT_MEALS;
        setMeals(
          rawSched.map((m: any) => ({
            label: ALLOWED.includes(m?.label)
              ? (m.label as MealLabel)
              : "snacks",
            time: (m?.time || "").trim() || undefined,
          }))
        );
        setEquipment((p as any)?.equipment ?? []);
        setWorkoutPlace((p as any)?.workoutPlace ?? "home");
        setInjuries(((p as any)?.injuries || []).join(", "));
      });
    })();
    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, [user?.uid]);

  // derived preview
  const weightKg = useMemo(
    () =>
      weightUnit === "lb"
        ? lbToKg(Number(weightInput || 0))
        : Number(weightInput || 0),
    [weightInput, weightUnit]
  );
  const targetWeightKg = useMemo(
    () =>
      weightUnit === "lb"
        ? lbToKg(Number(targetWeight || 0))
        : Number(targetWeight || 0),
    [targetWeight, weightUnit]
  );

  const baseParams = useMemo(
    () => ({
      sex,
      weightKg: Number(weightKg || 0),
      heightCm: Number(heightCm || 0),
      age: Number(age || 0),
      activityLevel,
      goal: (profile?.goal as any) || "maintain",
    }),
    [sex, weightKg, heightCm, age, activityLevel, profile?.goal]
  );

  const preview = useMemo(() => {
    if (!baseParams.weightKg || !baseParams.heightCm || !baseParams.age)
      return null;
    if (macroMethod === "proteinPerKg") {
      return computeTargets(baseParams, {
        mode: "proteinPerKg",
        proteinPerKg: Number(proteinPerKg || 0),
      });
    }
    if (macroMethod === "percent") {
      return computeTargets(baseParams, {
        mode: "percent",
        proteinPct,
        carbPct,
        fatPct,
      });
    }
    const trainingFat = clamp01(1 - proteinPct - trainCarbPct);
    const restFat = clamp01(1 - proteinPct - restCarbPct);
    const training = computeTargets(baseParams, {
      mode: "percent",
      proteinPct,
      carbPct: trainCarbPct,
      fatPct: trainingFat,
    });
    const rest = computeTargets(baseParams, {
      mode: "percent",
      proteinPct,
      carbPct: restCarbPct,
      fatPct: restFat,
    });
    return { training, rest };
  }, [
    baseParams,
    macroMethod,
    proteinPerKg,
    proteinPct,
    carbPct,
    fatPct,
    trainCarbPct,
    restCarbPct,
  ]);

  // refs
  const scrollRef = useRef<ScrollView>(null);
  const anchors = {
    basics: useRef<View>(null),
    goals: useRef<View>(null),
    macros: useRef<View>(null),
    diet: useRef<View>(null),
    meals: useRef<View>(null),
    equipment: useRef<View>(null),
  };

  // early skeleton
  if (!profile) {
    return (
      <View style={{ flex: 1 }}>
        {/* Wallpaper */}
        <LinearGradient
          colors={isDark ? ["#0b0f1a", "#0e1320"] : ["#eaf2ff", "#f6f7ff"]}
          style={{ position: "absolute", inset: 0 }}
          pointerEvents="none"
        />
        <View style={{ flex: 1, padding: 16 }}>
          <Card style={{ padding: 16, gap: 12 }}>
            <View
              style={{
                height: 22,
                borderRadius: 6,
                backgroundColor: "rgba(255,255,255,0.2)",
                width: 160,
              }}
            />
            <View
              style={{
                height: 16,
                borderRadius: 6,
                backgroundColor: "rgba(255,255,255,0.18)",
                width: 120,
              }}
            />
          </Card>
        </View>
      </View>
    );
  }
  function GlassAdaptiveHeader() {
    const { isDark } = useTheme();
    let BlurView: any = View;
    try {
      BlurView = require("expo-blur").BlurView;
    } catch {}
    return (
      <BlurView
        intensity={28}
        tint={isDark ? "dark" : "light"}
        style={{
          flex: 1,
          borderBottomWidth: 1,
          borderColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.18)",
        }}
      />
    );
  }
  function toggleOpen(key: keyof typeof anchors) {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
    setActiveChip(String(key));
  }
  function openAndJump(key: keyof typeof anchors) {
    setOpenKeys((prev) => ({ ...prev, [key]: true }));
    setActiveChip(String(key));
    anchors[key].current?.measure?.((x, y, w, h, px, py) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, py - 80), animated: true });
    });
  }

  async function onSave() {
    if (!user?.uid) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const trainingFat = clamp01(1 - proteinPct - trainCarbPct);
      const restFat = clamp01(1 - proteinPct - restCarbPct);

      const patch: Partial<Profile> & Record<string, any> = {
        email: user.email || undefined,
        sex,
        age: Number(age || 0),
        heightCm: Number(heightCm || 0),
        weightUnit,
        weightKg: Number(weightKg || 0),
        targetWeightKg: Number(targetWeightKg || 0),
        targetDate: targetDate || undefined,
        activityLevel,
        trainingDaysPerWeek: Number(trainingDaysPerWeek || 0),
        stepsGoal: Number(stepsGoal || 0),
        macroMethod,
        proteinPerKg: Number(proteinPerKg || 0),
        proteinPct,
        carbPct,
        fatPct,
        cycling: {
          trainingCarbPct: trainCarbPct,
          restCarbPct: restCarbPct,
          trainingFatPct: trainingFat,
          restFatPct: restFat,
        },
        diet: {
          type: dietType,
          allergies: commaSplit(allergies),
          dislikes: commaSplit(dislikes),
        },
        meals: {
          schedule: meals.map((m) => ({
            label: m.label,
            time: (m.time || "").trim() || undefined,
          })),
        },
        cooking: {
          minutes: Number(cookMins || 0),
          skill: cookSkill,
          budgetPerMealUSD: Number(budgetPerMeal || 0),
        },
        equipment,
        workoutPlace,
        injuries: commaSplit(injuries),
        updatedAt: Date.now(),
      };

      let targets: null | {
        calorieGoal: number;
        proteinGoal: number;
        carbGoal: number;
        fatGoal: number;
      } = null;
      if (macroMethod === "proteinPerKg") {
        targets = computeTargets(baseParams, {
          mode: "proteinPerKg",
          proteinPerKg: Number(proteinPerKg || 0),
        });
      } else if (macroMethod === "percent") {
        targets = computeTargets(baseParams, {
          mode: "percent",
          proteinPct,
          carbPct,
          fatPct,
        });
      } else {
        const tFat = clamp01(1 - proteinPct - trainCarbPct);
        targets = computeTargets(baseParams, {
          mode: "percent",
          proteinPct,
          carbPct: trainCarbPct,
          fatPct: tFat,
        });
      }
      if (targets) {
        patch.calorieGoal = targets.calorieGoal;
        patch.proteinGoal = targets.proteinGoal;
        patch.carbGoal = targets.carbGoal;
        patch.fatGoal = targets.fatGoal;
        patch.dailyCaloriesTarget = targets.calorieGoal;
        patch.dailyProteinTarget = targets.proteinGoal;
      }

      const safePatch = pruneUndefinedDeep(patch);
      await updateProfile(user.uid, safePatch);
      setSaveStatus("ok");
    } catch {
      setSaveStatus("err");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 1500);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      // If you have a fixed top bar, offset so the content centers correctly while typing:
      keyboardVerticalOffset={-40}
    >
      <View style={{ flex: 1 }}>
        {/* Wallpaper */}
        <LinearGradient
          colors={
            isDark
              ? ["#0b0f1a", "#0e1320", "#0b0f1a"]
              : ["#eaf2ff", "#f4f7ff", "#eef5ff"]
          }
          locations={[0, 0.6, 1]}
          style={{ position: "absolute", inset: 0 }}
          pointerEvents="none"
        />
        {/* Soft vignette */}
        <LinearGradient
          colors={[
            "rgba(255,255,255,0)",
            isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.06)",
          ]}
          style={{
            position: "absolute",
            left: -80,
            right: -80,
            top: -40,
            height: 240,
            borderBottomLeftRadius: 200,
            borderBottomRightRadius: 200,
          }}
        />
        <ProfileTopBar />
        <Animated.View style={{ flex: 1, opacity: fadeIn }}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets // ⬅︎ iOS 15+: auto insets when kb shows
            contentContainerStyle={{
              paddingTop: topPad, // your computed topPad
              paddingHorizontal: 16,
              paddingBottom: 120,
              gap: 14,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 2,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "800",
                    letterSpacing: -0.2,
                    color: colors.text,
                  }}
                >
                  Profile
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  Personalization & goals
                </Text>
              </View>

              {/* Right cluster: theme + quick actions */}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ThemeToggle />
              </View>
            </View>

            {/* Glass chips */}
            <SectionNav
              activeKey={activeChip}
              onPress={(key) => openAndJump(key as keyof typeof anchors)}
              items={[
                { key: "basics", label: "Basics" },
                { key: "goals", label: "Goals" },
                { key: "macros", label: "Macros" },
                { key: "diet", label: "Diet" },
                { key: "meals", label: "Meals" },
                { key: "equipment", label: "Equipment" },
              ]}
            />

            {/* Basics */}
            <View ref={anchors.basics}>
              <AccordionCard
                title="Basics"
                subtitle="Age, height, weight & sex"
                open={!!openKeys.basics}
                onToggle={() => toggleOpen("basics")}
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
              </AccordionCard>
            </View>

            {/* Goals */}
            <View ref={anchors.goals}>
              <AccordionCard
                title="Goals & Activity"
                subtitle="Target weight, date & movement"
                open={!!openKeys.goals}
                onToggle={() => toggleOpen("goals")}
              >
                <GoalsActivityCard
                  targetWeight={targetWeight}
                  setTargetWeight={setTargetWeight}
                  targetDate={targetDate}
                  setTargetDate={setTargetDate}
                  weightUnit={weightUnit}
                  activityLevel={activityLevel}
                  setActivityLevel={setActivityLevel}
                  trainingDaysPerWeek={trainingDaysPerWeek}
                  setTrainingDaysPerWeek={setTrainingDaysPerWeek}
                  stepsGoal={stepsGoal}
                  setStepsGoal={setStepsGoal}
                />
              </AccordionCard>
            </View>

            {/* Macros */}
            <View ref={anchors.macros} style={{ position: "relative" }}>
              <AccordionCard
                title="Macros"
                subtitle="Pick a method and fine-tune"
                open={!!openKeys.macros}
                onToggle={() => toggleOpen("macros")}
              >
                <Tip text="Percent mode auto-balances to 100%. Cycling sets different carbs on training vs rest days; fat fills the remainder." />
                <MacrosCard
                  macroMethod={macroMethod}
                  setMacroMethod={setMacroMethod}
                  proteinPerKg={proteinPerKg}
                  setProteinPerKg={setProteinPerKg}
                  proteinPct={proteinPct}
                  setProteinPct={setProteinPct}
                  carbPct={carbPct}
                  setCarbPct={setCarbPct}
                  fatPct={fatPct}
                  setFatPct={setFatPct}
                  trainCarbPct={trainCarbPct}
                  setTrainCarbPct={setTrainCarbPct}
                  restCarbPct={restCarbPct}
                  setRestCarbPct={setRestCarbPct}
                  setSplit={setSplit}
                  preview={preview}
                  clamp01={clamp01}
                />
              </AccordionCard>
            </View>

            {/* Diet */}
            <View ref={anchors.diet}>
              <AccordionCard
                title="Diet & Cooking"
                subtitle="Food preferences & constraints"
                open={!!openKeys.diet}
                onToggle={() => toggleOpen("diet")}
              >
                <DietCookingCard
                  dietType={dietType}
                  setDietType={setDietType}
                  allergies={allergies}
                  setAllergies={setAllergies}
                  dislikes={dislikes}
                  setDislikes={setDislikes}
                  cookMins={cookMins}
                  setCookMins={setCookMins}
                  cookSkill={cookSkill}
                  setCookSkill={setCookSkill}
                  budgetPerMeal={budgetPerMeal}
                  setBudgetPerMeal={setBudgetPerMeal}
                />
              </AccordionCard>
            </View>

            {/* Meal schedule */}
            <View ref={anchors.meals}>
              <AccordionCard
                title="Meal schedule"
                subtitle="Times for reminders & planning"
                open={!!openKeys.meals}
                onToggle={() => toggleOpen("meals")}
              >
                <MealScheduleCard meals={meals} setMeals={setMeals} />
              </AccordionCard>
            </View>

            {/* Equipment */}
            <View ref={anchors.equipment}>
              <AccordionCard
                title="Equipment & constraints"
                subtitle="Available gear, place & injuries"
                open={!!openKeys.equipment}
                onToggle={() => toggleOpen("equipment")}
              >
                <EquipmentCard
                  EQUIP={EQUIP as readonly string[]}
                  equipment={equipment}
                  setEquipment={setEquipment}
                  workoutPlace={workoutPlace}
                  setWorkoutPlace={setWorkoutPlace}
                  injuries={injuries}
                  setInjuries={setInjuries}
                />
              </AccordionCard>
            </View>

            <View style={{ height: 24 }} />
            <BottomTabSpacer extra={16} />
          </ScrollView>
        </Animated.View>

        <StickySaveBar saving={saving} status={saveStatus} onSave={onSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
function HeaderRightActions() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  let BlurView: any = View;
  try {
    BlurView = require("expo-blur").BlurView;
  } catch {}

  const Chip = ({
    icon,
    label,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }) => (
    <View
      style={{
        marginLeft: 8,
        borderRadius: 999,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.35),
      }}
    >
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: withAlpha(colors.primary, 0.12),
        }}
        hitSlop={6}
      >
        <Ionicons
          name={icon}
          size={14}
          color={colors.primary}
          style={{ marginRight: 6 }}
        />
        <Text
          style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {BlurView !== View ? (
        <BlurView
          intensity={18}
          tint={isDark ? "dark" : "light"}
          style={{
            flexDirection: "row",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <Chip
            icon="person-circle-outline"
            label="Account"
            onPress={() => router.push("/(modals)/account")}
          />
          <Chip
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push("/(modals)/settings")}
          />
        </BlurView>
      ) : (
        <>
          <Chip
            icon="person-circle-outline"
            label="Account"
            onPress={() => router.push("/(modals)/account")}
          />
          <Chip
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push("/(modals)/settings")}
          />
        </>
      )}
    </View>
  );
}

function ProfileTopBar() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // ⬇️ TUNING KNOBS
  const COMPACT_LIFT = 48; // pulls the chip cluster UP (reduce gap under island). Try 4–10.
  const OUTER_BOTTOM = 2; // space between bar and page content (vertical)
  const SHELL_PAD = 4; // inner padding of the glass container around the chips
  const CHIP_VPAD = 6; // chip vertical padding (height)
  const CHIP_HPAD = 12; // chip horizontal padding (width)

  let BlurView: any = View;
  try {
    BlurView = require("expo-blur").BlurView;
  } catch {}

  const Chip = ({
    icon,
    label,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: CHIP_HPAD,
        paddingVertical: CHIP_VPAD,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.35),
        backgroundColor: withAlpha(colors.primary, pressed ? 0.22 : 0.12),
      })}
    >
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );

  const Shell = ({ children }: { children: React.ReactNode }) =>
    BlurView !== View ? (
      <BlurView
        intensity={20}
        tint={isDark ? "dark" : "light"}
        style={{
          flexDirection: "row",
          gap: 8,
          padding: SHELL_PAD, // ⬅️ tighter
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: isDark
            ? "rgba(12,14,20,0.25)"
            : "rgba(245,248,255,0.25)",
        }}
      >
        {children}
      </BlurView>
    ) : (
      <View style={{ flexDirection: "row", gap: 8, padding: SHELL_PAD }}>
        {children}
      </View>
    );

  return (
    // SafeAreaView keeps us below the island; we then *slightly* lift the content.
    <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
      <View
        style={{
          paddingHorizontal: 12, // side gutters
          paddingBottom: OUTER_BOTTOM, // space below the bar
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            marginTop: -COMPACT_LIFT, // ⬅️ pulls the chips closer to the island
            alignItems: "flex-end",
          }}
        >
          <Shell>
            <Chip
              icon="person-circle-outline"
              label="Account"
              onPress={() => router.push("/(modals)/account")}
            />
            <Chip
              icon="settings-outline"
              label="Settings"
              onPress={() => router.push("/(modals)/settings")}
            />
          </Shell>
        </View>
      </View>
    </SafeAreaView>
  );
}
