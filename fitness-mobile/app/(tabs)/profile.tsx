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
  StyleSheet,
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

import Card from "@/components/Card";
import ThemeToggle from "@/components/ThemeToggle";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";

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

import SectionNav from "@/components/profile/SectionNav";
import AccordionCard from "@/components/profile/AccordionCard";
import StickySaveBar from "@/components/profile/StickySaveBar";

/* ───────────────── constants / helpers ───────────────── */

const clamp01 = (x: number) => Math.max(0, Math.min(1, Number(x) || 0));

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

const commaSplit = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const joinComma = (arr?: string[]) => (arr || []).join(", ");

const pruneUndefinedDeep = <T,>(val: T): T => {
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
};

export type GoalUILabel = "maintain" | "cut" | "bulk";

const initialsFrom = (displayName?: string | null, email?: string | null) => {
  const source = (displayName || email || "You").trim();
  const parts = source
    .replace(/@.*/, "")
    .split(/\s|[._-]/)
    .filter(Boolean);
  const first = (parts[0] || "Y")[0]?.toUpperCase() ?? "Y";
  const second = (parts[1]?.[0] || (parts[0]?.[1] ?? "U")).toUpperCase();
  return `${first}${second}`;
};

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

  /* state hydrated from profile */
  const [profile, setProfile] = useState<Profile | null>(null);

  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("25");
  const [heightCm, setHeightCm] = useState("175");

  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [weightInput, setWeightInput] = useState("75");
  const [targetWeight, setTargetWeight] = useState("70");
  const [targetDate, setTargetDate] = useState(toISO(new Date()));

  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState("3");
  const [stepsGoal, setStepsGoal] = useState("8000");

  const [macroMethod, setMacroMethod] = useState<
    "proteinPerKg" | "percent" | "cycling"
  >("proteinPerKg");
  const [proteinPerKg, setProteinPerKg] = useState("1.8");
  const [proteinPct, setProteinPct] = useState(30);
  const [carbPct, setCarbPct] = useState(40);
  const [fatPct, setFatPct] = useState(30);
  const [trainCarbPct, setTrainCarbPct] = useState(45);
  const [restCarbPct, setRestCarbPct] = useState(35);

  const [goalType, setGoalType] = useState<GoalUILabel>("maintain");
  const [weeklyPace, setWeeklyPace] = useState<string>("0.5");
  const [aggressionPct, setAggressionPct] = useState<number>(0);
  const [calorieCyclingPct, setCalorieCyclingPct] = useState<number>(0);
  const [macrosPreview, setMacrosPreview] = useState<null | any>(null);

  const DEFAULT_MEALS = [
    { label: "breakfast", time: "08:00" },
    { label: "lunch", time: "12:30" },
    { label: "dinner", time: "19:00" },
    { label: "snacks", time: "" },
  ] as const;
  type MealLabel = (typeof DEFAULT_MEALS)[number]["label"];
  type Meal = { label: MealLabel; time?: string };
  const [meals, setMeals] = useState<Meal[]>([...DEFAULT_MEALS]);

  /* UI state */
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({
    basics: true,
  });
  const [activeChip, setActiveChip] = useState<string | null>("basics");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | "ok" | "err">(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const [mealsPerDay, setMealsPerDay] = useState<string | number>(3);
  const [fastingWindow, setFastingWindow] = useState<string | null>(null);
  const [breakfastTime, setBreakfastTime] = useState("08:00");
  const [lastMealTime, setLastMealTime] = useState("19:00");

  // Track section anchors reliably
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const onSectionLayout = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      sectionOffsets.current[key] = e.nativeEvent.layout.y;
    },
    []
  );

  const openAndJump = (key: keyof typeof anchors) => {
    setOpenKeys((prev) => ({ ...prev, [key]: true }));
    setActiveChip(String(key));
    const y = sectionOffsets.current[String(key)] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
  };

  const toggleOpen = (key: keyof typeof anchors) => {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
    setActiveChip(String(key));
  };

  const anchors = {
    basics: useRef<View>(null),
    goals: useRef<View>(null),
    meals: useRef<View>(null),
  } as const;

  // Fade-in
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderRightActions />,
      headerTitle: "Profile",
      headerBackground: () => <GlassAdaptiveHeader />,
      headerShadowVisible: false,
    });
  }, [navigation, colors]);

  /* hydrate from Firestore */
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
        setActivityLevel((p?.activityLevel as ActivityLevel) || "moderate");
        setTrainingDaysPerWeek(String((p as any)?.trainingDaysPerWeek ?? 3));
        setStepsGoal(String((p as any)?.stepsGoal ?? 8000));

        setMacroMethod((p?.macroMethod as any) || "proteinPerKg");
        setProteinPerKg(String(p?.proteinPerKg ?? 1.8));
        setProteinPct(p?.proteinPct ?? 30);
        setCarbPct(p?.carbPct ?? 40);
        setFatPct(p?.fatPct ?? 30);
        setTrainCarbPct((p as any)?.cycling?.trainingCarbPct ?? 45);
        setRestCarbPct((p as any)?.cycling?.restCarbPct ?? 35);

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

        const legacyGoal = (p as any)?.goal as string | undefined;
        const mappedGoal: GoalUILabel =
          legacyGoal === "lose"
            ? "cut"
            : legacyGoal === "gain"
            ? "bulk"
            : (legacyGoal as GoalUILabel) || "maintain";

        setGoalType(mappedGoal);

        setAggressionPct((p as any)?.aggressionPct ?? 0);
        setCalorieCyclingPct((p as any)?.calorieCyclingPct ?? 0);
        setWeeklyPace(String((p as any)?.weeklyPace ?? "0.5"));

        // Reset dirty state on fresh load
        setDirty(new Set());
      });
    })();
  }, [user?.uid]);

  /* derived previews */
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

  /* ─────────────── saving (manual + autosave) ─────────────── */
  const markDirty = (key: string) => setDirty((d) => new Set(d).add(key));

  async function onSave(manual = true) {
    if (!user?.uid) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const pct = (n: number) => Math.max(0, Math.min(100, Number(n) || 0));
      const remainingPct = (p: number, c: number) => pct(100 - pct(p) - pct(c));

      const trainingFat = remainingPct(proteinPct, trainCarbPct);
      const restFat = remainingPct(proteinPct, restCarbPct);

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
        meals: {
          schedule: meals.map((m) => ({
            label: m.label,
            time: (m.time || "").trim() || undefined,
          })),
        },
        updatedAt: Date.now(),
        goal: goalType, // UI label stored
        aggressionPct,
        calorieCyclingPct,
        weeklyPace: Number(weeklyPace || 0),
      };

      let targets: any = null;

      if (macrosPreview && "calorieGoal" in (macrosPreview as any)) {
        targets = macrosPreview as any;
      } else if (macrosPreview && "training" in (macrosPreview as any)) {
        targets = (macrosPreview as any).training;
      } else {
        const weightKgNum =
          weightUnit === "lb"
            ? lbToKg(Number(weightInput || 0))
            : Number(weightInput || 0);

        type ComputeBase = Parameters<typeof computeTargets>[0];

        const baseParams: ComputeBase = {
          sex,
          weightKg: Number(weightKgNum || 0),
          heightCm: Number(heightCm || 0),
          age: Number(age || 0),
          activityLevel,
          goal: goalType as "maintain" | "cut" | "bulk",
        };

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
          const tFat = remainingPct(proteinPct, trainCarbPct);
          targets = computeTargets(baseParams, {
            mode: "percent",
            proteinPct,
            carbPct: trainCarbPct,
            fatPct: tFat,
          });
        }
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
      setSaveStatus(manual ? "ok" : null);
      setDirty(new Set());
    } catch (e) {
      setSaveStatus("err");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 1500);
    }
  }

  // Debounced autosave when fields change
  const autosaveDeps = [
    sex,
    age,
    heightCm,
    weightUnit,
    weightInput,
    targetWeight,
    targetDate,
    activityLevel,
    trainingDaysPerWeek,
    stepsGoal,
    macroMethod,
    proteinPerKg,
    proteinPct,
    carbPct,
    fatPct,
    trainCarbPct,
    restCarbPct,
    meals,
    goalType,
    aggressionPct,
    calorieCyclingPct,
    weeklyPace,
  ];

  useEffect(() => {
    if (!profile) return;
    if (dirty.size === 0) return;
    const t = setTimeout(() => onSave(false), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, ...autosaveDeps]);

  // Mark keys dirty when setters used
  const setAgeDirty = (v: string) => {
    setAge(v);
    markDirty("age");
  };
  const setHeightDirty = (v: string) => {
    setHeightCm(v);
    markDirty("heightCm");
  };
  const setWeightInputDirty = (v: string) => {
    setWeightInput(v);
    markDirty("weightInput");
  };

  /* skeleton */
  if (!profile) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={isDark ? ["#0b0f1a", "#0e1320"] : ["#eaf2ff", "#f6f7ff"]}
          style={{ position: "absolute", inset: 0 }}
          pointerEvents="none"
        />
        <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
          <Card style={{ padding: 20, gap: 12 }}>
            <View
              style={{
                height: 20,
                borderRadius: 6,
                backgroundColor: withAlpha(colors.text, 0.1),
                width: 160,
              }}
            />
            <View
              style={{
                height: 16,
                borderRadius: 6,
                backgroundColor: withAlpha(colors.text, 0.06),
                width: 120,
              }}
            />
          </Card>
        </View>
      </View>
    );
  }

  const topPad = insets.top + 52;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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

        <ProfileTopBar />

        <Animated.View style={{ flex: 1, opacity: fadeIn }}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{
              paddingTop: topPad,
              paddingHorizontal: 16,
              paddingBottom: 120,
              gap: 14,
            }}
          >
            {/* HERO */}
            <HeroHeader
              name={profile?.displayName || user?.displayName || null}
              email={user?.email || null}
              unit={weightUnit}
              goal={goalType}
              activity={activityLevel}
              stepsGoal={stepsGoal}
              onToggleUnit={() =>
                user &&
                updateProfile(user.uid, {
                  weightUnit: weightUnit === "kg" ? "lb" : "kg",
                })
              }
            />

            {/* Targets snapshot */}
            <TargetsPreview
              colors={colors}
              unit={weightUnit}
              preview={macrosPreview}
              fallback={{
                calories: profile?.calorieGoal,
                protein: profile?.proteinGoal,
                carbs: profile?.carbGoal,
                fat: profile?.fatGoal,
              }}
            />

            {/* Quick actions */}
            <QuickActions
              onSync={() =>
                Alert.alert(
                  "Sync Health",
                  "Coming soon: Apple Health / Google Fit connection."
                )
              }
              onExport={() => Alert.alert("Export", "CSV export coming soon.")}
              onReset={() => {
                setGoalType("maintain");
                setWeeklyPace("0.5");
                setAggressionPct(0);
                setCalorieCyclingPct(0);

                setMacroMethod("proteinPerKg");
                setProteinPerKg("1.8");
                setProteinPct(30);
                setCarbPct(40);
                setFatPct(30);
                setTrainCarbPct(45);
                setRestCarbPct(35);
                setStepsGoal("8000");

                markDirty("goals");
                markDirty("macros");
                Alert.alert(
                  "Reset",
                  "Goals and macro targets reset to defaults."
                );
              }}
            />

            {/* Section chips with dirty markers */}
            <SectionNav
              activeKey={activeChip}
              onPress={(key) => openAndJump(key as keyof typeof anchors)}
              items={[
                {
                  key: "basics",
                  label: dirty.has("basics") ? "Basics •" : "Basics",
                },
                {
                  key: "goals",
                  label: dirty.has("goals") ? "Goals •" : "Goals",
                },
                {
                  key: "meals",
                  label: dirty.has("meals") ? "Meals •" : "Meals",
                },
              ]}
            />

            {/* BASICS */}
            <View ref={anchors.basics} onLayout={onSectionLayout("basics")}>
              <AccordionCard
                title="Basics"
                subtitle="Age, height, weight & sex"
                open={!!openKeys.basics}
                onToggle={() => toggleOpen("basics")}
              >
                <BasicsCard
                  sex={sex}
                  setSex={(v: any) => {
                    setSex(v);
                    markDirty("basics");
                  }}
                  age={age}
                  setAge={setAgeDirty}
                  heightCm={heightCm}
                  setHeightCm={setHeightDirty}
                  weightUnit={weightUnit}
                  setWeightUnit={(v: any) => {
                    setWeightUnit(v);
                    markDirty("basics");
                  }}
                  weightInput={weightInput}
                  setWeightInput={setWeightInputDirty}
                />
              </AccordionCard>
            </View>

            {/* GOALS + MACROS (combined) */}
            <View ref={anchors.goals} onLayout={onSectionLayout("goals")}>
              <AccordionCard
                title="Goals + Macros"
                subtitle="Dial your plan; we do the math"
                open={!!openKeys.goals}
                onToggle={() => toggleOpen("goals")}
              >
                <GoalsMacrosCard
                  /* basics (read-only) */
                  sex={sex}
                  age={age}
                  heightCm={heightCm}
                  weightUnit={weightUnit}
                  currentWeight={weightInput}
                  /* goals */
                  targetWeight={targetWeight}
                  setTargetWeight={(v: string) => {
                    setTargetWeight(v);
                    markDirty("goals");
                  }}
                  targetDate={targetDate}
                  setTargetDate={(v: string) => {
                    setTargetDate(v);
                    markDirty("goals");
                  }}
                  activityLevel={activityLevel}
                  setActivityLevel={(v: ActivityLevel) => {
                    setActivityLevel(v);
                    markDirty("goals");
                  }}
                  trainingDaysPerWeek={trainingDaysPerWeek}
                  setTrainingDaysPerWeek={(v: string) => {
                    setTrainingDaysPerWeek(v);
                    markDirty("goals");
                  }}
                  stepsGoal={stepsGoal}
                  setStepsGoal={(v: string) => {
                    setStepsGoal(v);
                    markDirty("goals");
                  }}
                  goalType={goalType}
                  setGoalType={(v: "maintain" | "cut" | "bulk") => {
                    setGoalType(v);
                    markDirty("goals");
                  }}
                  weeklyPace={weeklyPace}
                  setWeeklyPace={(v: string) => {
                    setWeeklyPace(v);
                    markDirty("goals");
                  }}
                  aggressionPct={aggressionPct}
                  setAggressionPct={(v: number) => {
                    setAggressionPct(v);
                    markDirty("goals");
                  }}
                  calorieCyclingPct={calorieCyclingPct}
                  setCalorieCyclingPct={(v: number) => {
                    setCalorieCyclingPct(v);
                    markDirty("goals");
                  }}
                  /* macros */
                  macroMethod={macroMethod}
                  setMacroMethod={(v: any) => {
                    setMacroMethod(v);
                    markDirty("goals");
                  }}
                  proteinPerKg={proteinPerKg}
                  setProteinPerKg={(v: string) => {
                    setProteinPerKg(v);
                    markDirty("goals");
                  }}
                  proteinPct={proteinPct}
                  setProteinPct={(v: number) => {
                    setProteinPct(v);
                    markDirty("goals");
                  }}
                  carbPct={carbPct}
                  setCarbPct={(v: number) => {
                    setCarbPct(v);
                    markDirty("goals");
                  }}
                  fatPct={fatPct}
                  setFatPct={(v: number) => {
                    setFatPct(v);
                    markDirty("goals");
                  }}
                  trainCarbPct={trainCarbPct}
                  setTrainCarbPct={(v: number) => {
                    setTrainCarbPct(v);
                    markDirty("goals");
                  }}
                  restCarbPct={restCarbPct}
                  setRestCarbPct={(v: number) => {
                    setRestCarbPct(v);
                    markDirty("goals");
                  }}
                  onPreview={setMacrosPreview}
                />
              </AccordionCard>
            </View>

            {/* MEALS */}
            <View ref={anchors.meals} onLayout={onSectionLayout("meals")}>
              <AccordionCard
                title="Meal schedule"
                subtitle="Times for reminders & planning"
                open={!!openKeys.meals}
                onToggle={() => toggleOpen("meals")}
              >
                <MealScheduleCard
                  mealsPerDay={mealsPerDay}
                  setMealsPerDay={(v: string) => {
                    setMealsPerDay(v);
                    markDirty("meals");
                  }}
                  fastingWindow={fastingWindow}
                  setFastingWindow={(v: string | null) => {
                    setFastingWindow(v);
                    markDirty("meals");
                  }}
                  breakfastTime={breakfastTime}
                  setBreakfastTime={(v: string) => {
                    setBreakfastTime(v);
                    markDirty("meals");
                  }}
                  lastMealTime={lastMealTime}
                  setLastMealTime={(v: string) => {
                    setLastMealTime(v);
                    markDirty("meals");
                  }}
                />
              </AccordionCard>
            </View>

            <View style={{ height: 24 }} />
            <BottomTabSpacer extra={16} />
          </ScrollView>
        </Animated.View>

        <StickySaveBar
          saving={saving}
          status={saveStatus}
          onSave={() => onSave(true)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─────────────── header bits ─────────────── */

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
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.35),
        backgroundColor: withAlpha(colors.primary, 0.12),
        marginLeft: 8,
      }}
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
        style={{ flexDirection: "row", borderRadius: 999, overflow: "hidden" }}
      >
        {children}
      </BlurView>
    ) : (
      <View style={{ flexDirection: "row" }}>{children}</View>
    );

  return (
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
  );
}

function ProfileTopBar() {
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
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
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
          padding: 4,
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
      <View style={{ flexDirection: "row", gap: 8, padding: 4 }}>
        {children}
      </View>
    );

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
      <View
        style={{
          paddingHorizontal: 12,
          paddingBottom: 2,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ marginTop: -48, alignItems: "flex-end" }}>
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

/* ─────────────── hero + preview + actions ─────────────── */

function HeroHeader({
  name,
  email,
  unit,
  goal,
  activity,
  stepsGoal,
  onToggleUnit,
}: {
  name: string | null;
  email: string | null;
  unit: "kg" | "lb";
  goal: GoalUILabel;
  activity: ActivityLevel | string;
  stepsGoal: string;
  onToggleUnit: () => void;
}) {
  const { colors } = useTheme();
  const initials = initialsFrom(name || undefined, email || undefined);

  const Chip = ({
    icon,
    label,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.35),
        backgroundColor: withAlpha(colors.primary, 0.12),
      }}
    >
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Card
      style={{
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        colors={[
          withAlpha(colors.primary, 0.06),
          withAlpha(colors.primary, 0.12),
        ]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(colors.primary, 0.18),
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.35),
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}
            numberOfLines={1}
          >
            {name || email || "Your profile"}
          </Text>
          <Text style={{ color: colors.muted }} numberOfLines={1}>
            Personalization & goals
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        <Chip
          icon="scale-outline"
          label={`Unit: ${unit.toUpperCase()}`}
          onPress={onToggleUnit}
        />
        <Chip icon="flag-outline" label={`Goal: ${String(goal)}`} />
        <Chip icon="flash-outline" label={`Activity: ${activity}`} />
        <Chip icon="walk-outline" label={`Steps goal: ${stepsGoal}`} />
      </View>
    </Card>
  );
}

function TargetsPreview({
  colors,
  unit,
  preview,
  fallback,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  unit: "kg" | "lb";
  preview:
    | null
    | {
        calorieGoal?: number;
        proteinGoal?: number;
        carbGoal?: number;
        fatGoal?: number;
      }
    | {
        training: {
          calorieGoal: number;
          proteinGoal: number;
          carbGoal: number;
          fatGoal: number;
        };
        rest: {
          calorieGoal: number;
          proteinGoal: number;
          carbGoal: number;
          fatGoal: number;
        };
      };
  fallback: {
    calories?: number | null | undefined;
    protein?: number | null | undefined;
    carbs?: number | null | undefined;
    fat?: number | null | undefined;
  };
}) {
  const tile = (
    title: string,
    value: number | string | undefined,
    unitNote?: string
  ) => (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: withAlpha(colors.text, 0.04),
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{title}</Text>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>
        {value ?? "—"} {unitNote}
      </Text>
    </View>
  );

  const simple =
    preview && "calorieGoal" in (preview as any) ? (preview as any) : null;
  const training =
    preview && "training" in (preview as any)
      ? (preview as any).training
      : null;
  const rest =
    preview && "rest" in (preview as any) ? (preview as any).rest : null;
  const base = simple || training || rest || null;

  return (
    <Card
      style={{
        padding: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "800" }}>
        Daily targets
      </Text>

      {!base ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {tile("Calories", fallback.calories || 0, "kcal")}
          {tile("Protein", fallback.protein || 0, "g")}
        </View>
      ) : training && rest ? (
        <>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Training day
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {tile("Calories", training.calorieGoal, "kcal")}
            {tile("Protein", training.proteinGoal, "g")}
            {tile("Carbs", training.carbGoal, "g")}
            {tile("Fat", training.fatGoal, "g")}
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
            Rest day
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {tile("Calories", rest.calorieGoal, "kcal")}
            {tile("Protein", rest.proteinGoal, "g")}
            {tile("Carbs", rest.carbGoal, "g")}
            {tile("Fat", rest.fatGoal, "g")}
          </View>
        </>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {tile("Calories", (base as any).calorieGoal, "kcal")}
          {tile("Protein", (base as any).proteinGoal, "g")}
          {tile("Carbs", (base as any).carbGoal, "g")}
          {tile("Fat", (base as any).fatGoal, "g")}
        </View>
      )}
    </Card>
  );
}

function QuickActions({
  onSync,
  onExport,
  onReset,
}: {
  onSync: () => void;
  onExport: () => void;
  onReset: () => void;
}) {
  const { colors } = useTheme();
  const Action = ({
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
      style={{
        flex: 1,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.35),
        backgroundColor: withAlpha(colors.primary, 0.12),
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Action icon="sync-outline" label="Sync health" onPress={onSync} />
      <Action icon="download-outline" label="Export" onPress={onExport} />
      <Action icon="refresh-outline" label="Reset targets" onPress={onReset} />
    </View>
  );
}
