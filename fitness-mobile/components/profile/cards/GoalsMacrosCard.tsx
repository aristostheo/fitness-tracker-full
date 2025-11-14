import React, { memo, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useTheme } from "@/content/ThemeProvider";

/* ───────────────── types ───────────────── */
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
type GoalType = "maintain" | "cut" | "bulk";
type MacroMethod = "proteinPerKg" | "percent" | "cycling";

type SimplePreview = {
  calorieGoal?: number;
  proteinGoal?: number;
  carbGoal?: number;
  fatGoal?: number;
};
type CyclingPreview = {
  training: Required<SimplePreview>;
  rest: Required<SimplePreview>;
};

type Props = {
  /* Basics (read-only) */
  sex: "male" | "female";
  age: string; // number-like
  heightCm: string; // number-like
  weightUnit: "kg" | "lb";
  currentWeight: string; // number-like, in weightUnit

  /* Goals fields (editable) */
  targetWeight: string;
  setTargetWeight: (v: string) => void;
  targetDate: string;
  setTargetDate: (v: string) => void;
  activityLevel: ActivityLevel;
  setActivityLevel: (v: ActivityLevel) => void;
  trainingDaysPerWeek: string | number;
  setTrainingDaysPerWeek: (v: string) => void;
  stepsGoal: string | number;
  setStepsGoal: (v: string) => void;

  goalType: GoalType;
  setGoalType: (v: GoalType) => void;
  weeklyPace: string; // in weightUnit per week
  setWeeklyPace: (v: string) => void;
  aggressionPct: number;
  setAggressionPct: (n: number) => void;
  calorieCyclingPct: number;
  setCalorieCyclingPct: (n: number) => void;

  /* Macros fields (editable) */
  macroMethod: MacroMethod;
  setMacroMethod: (m: MacroMethod) => void;

  proteinPerKg: string; // for proteinPerKg
  setProteinPerKg: (v: string) => void;

  proteinPct: number;
  carbPct: number;
  fatPct: number; // for percent + cycling (protein shared)
  setProteinPct: (n: number) => void;
  setCarbPct: (n: number) => void;
  setFatPct: (n: number) => void;

  trainCarbPct: number;
  restCarbPct: number; // cycling deltas
  setTrainCarbPct: (n: number) => void;
  setRestCarbPct: (n: number) => void;

  /* Emit preview upward */
  onPreview?: (p: SimplePreview | CyclingPreview | null) => void;
};

/* ───────────────── utils ───────────────── */
const onlyInt = (t: string) => t.replace(/[^0-9]/g, "");
const numeric = (t: string) => t.replace(/[^0-9.]/g, "");
const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);
const kgToLb = (kg: number) => kg * 2.2046226218;
const lbToKg = (lb: number) => lb / 2.2046226218;
const dateISO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Mifflin–St Jeor BMR */
function mifflinBMR(
  sex: "male" | "female",
  kg: number,
  cm: number,
  age: number
) {
  return sex === "male"
    ? 10 * kg + 6.25 * cm - 5 * age + 5
    : 10 * kg + 6.25 * cm - 5 * age - 161;
}
function activityMult(level: ActivityLevel) {
  return (
    {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      athlete: 1.9,
    }[level] ?? 1.55
  );
}
function macrosFromPercents(
  kcal: number,
  pPct: number,
  cPct: number,
  fPct: number
) {
  const pKcal = (pPct / 100) * kcal,
    cKcal = (cPct / 100) * kcal,
    fKcal = (fPct / 100) * kcal;
  return {
    proteinGoal: Math.round(pKcal / 4),
    carbGoal: Math.round(cKcal / 4),
    fatGoal: Math.round(fKcal / 9),
  };
}

/** Rough kcal from steps: ~0.04 kcal/step scaled by body weight (80kg baseline). */
function estimateStepCalories(steps: number, weightKg: number) {
  const perStep = 0.04 * (weightKg > 0 ? weightKg / 80 : 1);
  return Math.round(steps * perStep);
}

/* ───────────────── atoms ───────────────── */
const get = (obj: any, k: string, fb: string) => (obj && obj[k]) || fb;

const Chip = ({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) => {
  const { colors, isDark } = useTheme();
  const sv = useSharedValue(1);
  const r = useAnimatedStyle(() => ({ transform: [{ scale: sv.value }] }));
  const bg = active
    ? isDark
      ? "rgba(255,255,255,0.18)"
      : "rgba(0,0,0,0.08)"
    : "transparent";
  const text = active ? (isDark ? "#fff" : "#111") : colors.text;
  return (
    <Animated.View style={[r]}>
      <Pressable
        onPressIn={() => (sv.value = withSpring(0.97))}
        onPressOut={() => (sv.value = withSpring(1))}
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 999,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
          marginRight: 8,
          marginBottom: 8,
        }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color={text}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={{ color: text, fontWeight: "700" }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  inputMode = "decimal",
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "text";
  icon?: keyof typeof Ionicons.glyphMap;
}) => {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ fontSize: 12, opacity: 0.8, color: colors.text }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: Platform.select({ ios: 12, android: 8 }),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: get(
            colors,
            "card",
            isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"
          ),
        }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={colors.text}
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          inputMode={inputMode}
          placeholderTextColor={
            isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)"
          }
          style={{
            flex: 1,
            fontSize: 18,
            color: colors.text,
            paddingVertical: 2,
          }}
        />
      </View>
    </View>
  );
};

const PctField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.text, fontSize: 12, opacity: 0.8 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: get(colors, "card", "rgba(0,0,0,0.04)"),
          paddingHorizontal: 12,
          paddingVertical: Platform.select({ ios: 12, android: 8 }),
        }}
      >
        <Ionicons
          name="pie-chart-outline"
          size={16}
          color={colors.text}
          style={{ marginRight: 8 }}
        />
        <TextInput
          inputMode="decimal"
          placeholder="0–100"
          placeholderTextColor={get(colors, "muted", "rgba(0,0,0,0.5)")}
          value={String(Number.isFinite(value) ? value : "")}
          onChangeText={(t) => onChange(clamp(Number(numeric(t) || 0), 0, 100))}
          style={{
            flex: 1,
            fontSize: 18,
            color: colors.text,
            paddingVertical: 2,
          }}
        />
        <Text style={{ color: colors.muted, marginLeft: 6 }}>%</Text>
      </View>
    </View>
  );
};

/* ─────────────── steppers ─────────────── */
const round1 = (n: number) => Math.round(n * 10) / 10;

function PercentStepper({
  label,
  valuePct,
  onChangePct,
  stepPct = 2.5, // each tap = 2.5%
  minPct = -50,
  maxPct = 50,
  hint,
}: {
  label: string;
  valuePct: number; // e.g., 12.5 (not decimal 0.125)
  onChangePct: (next: number) => void;
  stepPct?: number;
  minPct?: number;
  maxPct?: number;
  hint?: string;
}) {
  const { colors } = useTheme();

  const bump = (dir: 1 | -1) => {
    const raw = valuePct + dir * stepPct;
    const clamped = Math.min(maxPct, Math.max(minPct, raw));
    const rounded = round1(clamped); // keep 1-dec precision
    onChangePct(rounded);
    Haptics.selectionAsync();
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 12,
        gap: 8,
        flex: 1,
        minWidth: 150,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => bump(-1)}
          hitSlop={8}
          style={{
            width: 40,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "transparent",
          }}
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Pressable>

        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>
          {Number.isFinite(valuePct) ? `${round1(valuePct)}%` : "—"}
        </Text>

        <Pressable
          onPress={() => bump(1)}
          hitSlop={8}
          style={{
            width: 40,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "transparent",
          }}
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Pressable>
      </View>

      {!!hint && (
        <Text style={{ color: colors.muted, fontSize: 11 }}>{hint}</Text>
      )}
    </View>
  );
}

const Tile = ({
  label,
  value,
  unit,
}: {
  label: string;
  value?: number;
  unit?: string;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "rgba(0,0,0,0.04)",
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>
        {value ?? "—"} {unit}
      </Text>
    </View>
  );
};

const AGG_LIMITS: Record<GoalType, { min: number; max: number }> = {
  maintain: { min: 0, max: 0 },
  cut: { min: 5, max: 25 },
  bulk: { min: 5, max: 15 },
};

/* ───────────────── main ───────────────── */
export default memo(function GoalsMacrosCard({
  /* basics */
  sex,
  age,
  heightCm,
  weightUnit,
  currentWeight,
  /* goals */
  targetWeight,
  setTargetWeight,
  targetDate,
  setTargetDate,
  activityLevel,
  setActivityLevel,
  trainingDaysPerWeek,
  setTrainingDaysPerWeek,
  stepsGoal,
  setStepsGoal,
  goalType,
  setGoalType,
  weeklyPace,
  setWeeklyPace,
  aggressionPct,
  setAggressionPct,
  calorieCyclingPct,
  setCalorieCyclingPct,
  /* macros */
  macroMethod,
  setMacroMethod,
  proteinPerKg,
  setProteinPerKg,
  proteinPct,
  setProteinPct,
  carbPct,
  setCarbPct,
  fatPct,
  setFatPct,
  trainCarbPct,
  setTrainCarbPct,
  restCarbPct,
  setRestCarbPct,
  /* out */
  onPreview,
}: Props) {
  const { colors, isDark } = useTheme();

  /* 0) Basics -> kg */
  const weightKg = useMemo(
    () =>
      weightUnit === "lb"
        ? lbToKg(Number(currentWeight || 0))
        : Number(currentWeight || 0),
    [currentWeight, weightUnit]
  );
  const heightNum = Number(heightCm || 0);
  const ageNum = Number(age || 0);

  /* 1) Tabs */
  const [tab, setTab] = useState<0 | 1>(0); // 0 = Manual, 1 = Auto

  /* 2) Auto local state mirrors (so user can experiment before applying) */
  const [autoGoal, setAutoGoal] = useState<GoalType>(goalType);
  const [autoActivity, setAutoActivity] =
    useState<ActivityLevel>(activityLevel);
  const [autoPace, setAutoPace] = useState<string>(
    String(weeklyPace || (weightUnit === "kg" ? "0.5" : "1"))
  );
  const [autoCurrentW, setAutoCurrentW] = useState<string>(currentWeight);
  const [autoTargetW, setAutoTargetW] = useState<string>(targetWeight);
  const [autoAgg, setAutoAgg] = useState<number>(aggressionPct);
  const [autoCycling, setAutoCycling] = useState<number>(calorieCyclingPct);

  /* 3) Target date / suggestions (Auto) */
  const suggest = useMemo(() => {
    const cur = toNum(autoCurrentW),
      tgt = toNum(autoTargetW);
    let pace = toNum(autoPace);
    const minP = weightUnit === "kg" ? 0.25 : 0.5;
    const maxP = weightUnit === "kg" ? 1.0 : 2.0;
    if (pace && pace > 0) pace = clamp(pace, minP, maxP);

    let weeks: number | undefined;
    let date: string | undefined;
    if (
      autoGoal !== "maintain" &&
      cur != null &&
      tgt != null &&
      pace &&
      pace > 0
    ) {
      const delta = Math.abs(cur - tgt);
      weeks = clamp(delta / pace, 2, 104);
      const d = new Date();
      d.setDate(d.getDate() + Math.ceil(weeks) * 7);
      date = dateISO(d);
    }

    // Steps suggestion algorithm
    const lvlBase: Record<ActivityLevel, number> = {
      sedentary: 3,
      light: 3,
      moderate: 4,
      active: 5,
      athlete: 5,
    };
    let train = lvlBase[autoActivity];
    if (autoGoal === "bulk") train = Math.min(train + 1, 6);

    let steps = 8000;
    if (autoGoal === "cut") steps += 1000;
    if (autoActivity === "sedentary") steps += 500;
    if (autoActivity === "active" || autoActivity === "athlete") steps -= 500;
    steps = clamp(steps, 6000, 12000);

    return {
      date,
      train: String(train),
      steps: String(steps),
      weeks: weeks ? weeks.toFixed(1) : undefined,
    };
  }, [autoGoal, autoActivity, autoPace, autoCurrentW, autoTargetW, weightUnit]);

  const applySuggestions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActivityLevel(autoActivity);
    setTargetWeight(autoTargetW || "");
    if (suggest.date) setTargetDate(suggest.date);
    setTrainingDaysPerWeek(suggest.train);
    setStepsGoal(suggest.steps);
    setGoalType(autoGoal);
    setWeeklyPace(autoPace);
    setAggressionPct(autoAgg);
    setCalorieCyclingPct(autoCycling);
  };

  /* 4) BMR/TDEE & calories (live) */
  const bmr = useMemo(() => {
    if (!weightKg || !heightNum || !ageNum) return 0;
    return Math.round(mifflinBMR(sex, weightKg, heightNum, ageNum));
  }, [sex, weightKg, heightNum, ageNum]);

  const tdee = useMemo(
    () => Math.round(bmr * activityMult(activityLevel)),
    [bmr, activityLevel]
  );

  // Aggressiveness clamp
  const cutMin = 5,
    cutMax = 25,
    bulkMin = 5,
    bulkMax = 15;
  const adj =
    goalType === "maintain"
      ? 0
      : goalType === "cut"
      ? clamp(aggressionPct, cutMin, cutMax)
      : clamp(aggressionPct, bulkMin, bulkMax);

  const baseCalories = useMemo(() => {
    if (!tdee) return 0;
    if (goalType === "maintain") return tdee;
    return Math.round(
      goalType === "cut" ? tdee * (1 - adj / 100) : tdee * (1 + adj / 100)
    );
  }, [tdee, goalType, adj]);

  const cyc = clamp(calorieCyclingPct || 0, -20, 20);
  const trainCals = Math.round(baseCalories * (1 + Math.abs(cyc) / 100));
  const restCals = Math.round(baseCalories * (1 - Math.abs(cyc) / 100));

  /* 5) Macro breakdowns */
  const preview: SimplePreview | CyclingPreview | null = useMemo(() => {
    if (!baseCalories) return null;

    if (macroMethod === "proteinPerKg") {
      const bw = weightKg || 0;
      const pPerKg = Number(proteinPerKg || 0);
      const p = Math.round(pPerKg * bw);
      const fatK = Math.round(baseCalories * 0.3); // sensible default
      const f = Math.round(fatK / 9);
      const c = Math.max(0, Math.round((baseCalories - p * 4 - fatK) / 4));
      return {
        calorieGoal: baseCalories,
        proteinGoal: p,
        carbGoal: c,
        fatGoal: f,
      };
    }

    if (macroMethod === "percent") {
      const prot = clamp(proteinPct ?? 0, 0, 100);
      const carb = clamp(carbPct ?? 0, 0, 100);
      const fat = clamp(100 - prot - carb, 0, 100);
      return {
        calorieGoal: baseCalories,
        ...macrosFromPercents(baseCalories, prot, carb, fat),
      };
    }

    // cycling
    const prot = clamp(proteinPct ?? 0, 0, 100);
    const tCarb = clamp(trainCarbPct ?? 0, 0, 100);
    const rCarb = clamp(restCarbPct ?? 0, 0, 100);
    const tFat = clamp(100 - prot - tCarb, 0, 100);
    const rFat = clamp(100 - prot - rCarb, 0, 100);
    return {
      training: {
        calorieGoal: trainCals,
        ...macrosFromPercents(trainCals, prot, tCarb, tFat),
      },
      rest: {
        calorieGoal: restCals,
        ...macrosFromPercents(restCals, prot, rCarb, rFat),
      },
    };
  }, [
    baseCalories,
    macroMethod,
    proteinPerKg,
    weightKg,
    proteinPct,
    carbPct,
    fatPct,
    trainCarbPct,
    restCarbPct,
    trainCals,
    restCals,
  ]);

  useEffect(() => {
    onPreview?.(preview ?? null);
  }, [JSON.stringify(preview)]);

  /* 6) Explainability popover */
  const [openWhy, setOpenWhy] = useState(false);

  /* ─────────────── UI ─────────────── */
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const headerBG = isDark ? "rgba(20,22,26,0.45)" : "rgba(255,255,255,0.65)";

  return (
    <Animated.View
      entering={FadeIn.duration(240)}
      exiting={FadeOut}
      style={{
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: cardBorder,
      }}
    >
      {/* HEADER */}
      <LinearGradient
        colors={[
          get(colors, "primary", "#6EA8FF"),
          get(colors, "tint", "#8FA8FF"),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingVertical: 14 }}
      >
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.18)"
                : "rgba(0,0,0,0.08)",
              marginRight: 12,
            }}
          >
            <Ionicons
              name="flag-outline"
              size={20}
              color={isDark ? "#fff" : "#111"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: isDark ? "#fff" : "#111",
                fontWeight: "800",
                fontSize: 16,
              }}
            >
              Goals + Macros
            </Text>
            <Text
              style={{
                color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)",
                fontSize: 12,
              }}
            >
              Manual or Auto goals → calories → macros
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setOpenWhy(true);
            }}
            hitSlop={8}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: cardBorder,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
            }}
          >
            <Text
              style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}
            >
              Why these targets?
            </Text>
          </Pressable>
        </Animated.View>

        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          {(["Manual", "Auto"] as const).map((l, i) => (
            <Pressable
              key={l}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(i as 0 | 1);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  tab === i
                    ? isDark
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(0,0,0,0.08)"
                    : "transparent",
                borderWidth: 1,
                borderColor: tab === i ? cardBorder : "transparent",
              }}
            >
              <Text
                style={{
                  fontWeight: "800",
                  color: tab === i ? (isDark ? "#fff" : "#111") : colors.text,
                }}
              >
                {l}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* BODY */}
      <BlurView
        intensity={isDark ? 35 : 25}
        tint={isDark ? "dark" : "light"}
        style={{ padding: 14, backgroundColor: headerBG }}
      >
        {/* Goals Part */}
        {tab === 0 ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label={`Target weight (${weightUnit})`}
                value={targetWeight}
                onChangeText={(t) => setTargetWeight(numeric(t))}
                placeholder={weightUnit}
                inputMode="decimal"
                icon="fitness-outline"
              />
              <Field
                label="Target date"
                value={targetDate}
                onChangeText={(s) => setTargetDate(s.replace(/[^0-9-]/g, ""))}
                placeholder="YYYY-MM-DD"
                inputMode="text"
                icon="calendar-outline"
              />
            </View>

            <View>
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.8,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Primary goal
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {(["maintain", "cut", "bulk"] as GoalType[]).map((g) => (
                  <Chip
                    key={g}
                    active={goalType === g}
                    label={
                      g === "cut" ? "Cut" : g === "bulk" ? "Bulk" : "Maintain"
                    }
                    icon={
                      g === "cut"
                        ? "trending-down-outline"
                        : g === "bulk"
                        ? "trending-up-outline"
                        : "remove-outline"
                    }
                    onPress={() => setGoalType(g)}
                  />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <PercentStepper
                label={`Aggressiveness (${
                  goalType === "maintain"
                    ? "±0"
                    : goalType === "cut"
                    ? "deficit"
                    : "surplus"
                })`}
                valuePct={aggressionPct}
                minPct={AGG_LIMITS[goalType].min}
                maxPct={AGG_LIMITS[goalType].max}
                stepPct={2.5}
                onChangePct={(next) => setAggressionPct(next)}
                hint="How hard you want to cut/bulk (0-25 %)"
              />
              <PercentStepper
                label="Calorie cycling (±)"
                valuePct={calorieCyclingPct}
                minPct={-30}
                maxPct={30}
                stepPct={2.5}
                onChangePct={(next) => setCalorieCyclingPct(next)}
                hint="Raise/lower training vs rest calories"
              />
            </View>

            <View>
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.8,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Activity level
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {(
                  [
                    "sedentary",
                    "light",
                    "moderate",
                    "active",
                    "athlete",
                  ] as ActivityLevel[]
                ).map((l) => (
                  <Chip
                    key={l}
                    active={activityLevel === l}
                    label={l[0].toUpperCase() + l.slice(1)}
                    icon="walk-outline"
                    onPress={() => setActivityLevel(l)}
                  />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label="Training days / week"
                value={String(trainingDaysPerWeek ?? "")}
                onChangeText={(t) => setTrainingDaysPerWeek(onlyInt(t))}
                inputMode="numeric"
                icon="barbell-outline"
              />
              <Field
                label="Steps goal / day"
                value={String(stepsGoal ?? "")}
                onChangeText={(t) => setStepsGoal(onlyInt(t))}
                inputMode="numeric"
                icon="footsteps-outline"
              />
            </View>

            {/* NEW: Step calories estimator (Manual) */}
            <View
              style={{
                marginTop: 4,
                borderRadius: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: cardBorder,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.03)",
                gap: 8,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                Step calories estimator
              </Text>
              <Text style={{ color: colors.muted }}>
                Approx. burn per 1,000 steps at your weight:{" "}
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                  {estimateStepCalories(1000, weightKg || 80)} kcal
                </Text>
              </Text>
              <Text style={{ color: colors.muted }}>
                Daily burn at your current steps goal:{" "}
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                  {estimateStepCalories(Number(stepsGoal || 0), weightKg || 80)}{" "}
                  kcal
                </Text>
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label={`Current weight (${weightUnit})`}
                value={autoCurrentW}
                onChangeText={(t) => setAutoCurrentW(numeric(t))}
                placeholder={weightUnit}
                inputMode="decimal"
                icon="body-outline"
              />
              <Field
                label={`Target weight (${weightUnit})`}
                value={autoTargetW}
                onChangeText={(t) => setAutoTargetW(numeric(t))}
                placeholder={weightUnit}
                inputMode="decimal"
                icon="fitness-outline"
              />
            </View>

            <View>
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.8,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Primary goal
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {(["maintain", "cut", "bulk"] as GoalType[]).map((g) => (
                  <Chip
                    key={g}
                    active={autoGoal === g}
                    label={
                      g === "cut" ? "Cut" : g === "bulk" ? "Bulk" : "Maintain"
                    }
                    icon={
                      g === "cut"
                        ? "trending-down-outline"
                        : "trending-up-outline"
                    }
                    onPress={() => setAutoGoal(g)}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.8,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Weekly pace ({weightUnit}/week)
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {(weightUnit === "kg"
                  ? ["0.25", "0.5", "0.75", "1.0"]
                  : ["0.5", "1", "1.5", "2"]
                ).map((p) => (
                  <Chip
                    key={p}
                    active={autoPace === p}
                    label={p}
                    icon="speedometer-outline"
                    onPress={() => setAutoPace(p)}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.8,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Activity level
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {(
                  [
                    "sedentary",
                    "light",
                    "moderate",
                    "active",
                    "athlete",
                  ] as ActivityLevel[]
                ).map((l) => (
                  <Chip
                    key={l}
                    active={autoActivity === l}
                    label={l[0].toUpperCase() + l.slice(1)}
                    icon="walk-outline"
                    onPress={() => setAutoActivity(l)}
                  />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <PercentStepper
                label={`Aggressiveness (${
                  autoGoal === "maintain"
                    ? "±0"
                    : autoGoal === "cut"
                    ? "deficit"
                    : "surplus"
                })`}
                valuePct={autoAgg}
                minPct={AGG_LIMITS[autoGoal].min}
                maxPct={AGG_LIMITS[autoGoal].max}
                stepPct={2.5}
                onChangePct={(next) => setAutoAgg(next)}
                hint="How hard you want to cut/bulk"
              />
              <PercentStepper
                label="Calorie cycling (±)"
                valuePct={autoCycling}
                minPct={-30}
                maxPct={30}
                stepPct={2.5}
                onChangePct={(next) => setAutoCycling(next)}
                hint="Raise/lower training vs rest calories"
              />
            </View>

            {/* Suggestions */}
            <View
              style={{
                marginTop: 4,
                borderRadius: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: cardBorder,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.03)",
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "800",
                  marginBottom: 8,
                }}
              >
                Suggested plan
              </Text>
              <Row
                label="Target date"
                value={suggest.date ?? "—"}
                icon="calendar-outline"
              />
              <Row
                label="Training days / week"
                value={suggest.train}
                icon="barbell-outline"
              />
              <Row
                label="Steps goal / day"
                value={suggest.steps}
                icon="footsteps-outline"
              />
              {suggest.weeks && (
                <Row
                  label="Estimated weeks"
                  value={suggest.weeks}
                  icon="time-outline"
                />
              )}
              <Pressable
                onPress={applySuggestions}
                style={({ pressed }) => ({
                  marginTop: 10,
                  alignSelf: "flex-start",
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(0,0,0,0.1)",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                  Apply Suggestions to Fields
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Macros Part */}
        <View style={{ height: 10 }} />
        <Text
          style={{ color: colors.text, fontWeight: "800", marginBottom: 8 }}
        >
          Macros
        </Text>

        <View
          style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}
        >
          {(["proteinPerKg", "percent", "cycling"] as MacroMethod[]).map(
            (m) => (
              <Chip
                key={m}
                active={macroMethod === m}
                label={
                  m === "proteinPerKg"
                    ? "P/kg"
                    : m === "percent"
                    ? "% Split"
                    : "Cycling"
                }
                icon={m === "cycling" ? "repeat-outline" : undefined}
                onPress={() => setMacroMethod(m)}
              />
            )
          )}
        </View>

        {macroMethod === "proteinPerKg" && (
          <View style={{ gap: 8 }}>
            <Field
              label={`Protein (g/kg · body = ${Math.round(weightKg || 0)} kg)`}
              value={proteinPerKg}
              onChangeText={(t) => setProteinPerKg(numeric(t))}
              inputMode="decimal"
              icon="barbell-outline"
            />
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Common range: 1.6–2.2 g/kg.
            </Text>
          </View>
        )}

        {macroMethod === "percent" && (
          <View style={{ gap: 10 }}>
            <PctField
              label="Protein %"
              value={proteinPct}
              onChange={(v) => setProteinPct(v)}
            />
            <PctField
              label="Carbs %"
              value={carbPct}
              onChange={(v) => setCarbPct(v)}
            />
            <PctField
              label="Fat %"
              value={fatPct}
              onChange={(v) => setFatPct(v)}
            />
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              If totals ≠ 100, Fat auto-fills the remainder.
            </Text>
          </View>
        )}

        {macroMethod === "cycling" && (
          <View style={{ gap: 10 }}>
            <PctField
              label="Protein % (both days)"
              value={proteinPct}
              onChange={(v) => setProteinPct(v)}
            />
            <PctField
              label="Training day Carbs %"
              value={trainCarbPct}
              onChange={(v) => setTrainCarbPct(v)}
            />
            <PctField
              label="Rest day Carbs %"
              value={restCarbPct}
              onChange={(v) => setRestCarbPct(v)}
            />
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Fat % is auto = 100 − Protein − Carbs (per day).
            </Text>
          </View>
        )}

        {/* Live preview */}
        {!!preview &&
          (macroMethod !== "cycling" ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 10,
              }}
            >
              <Tile
                label="Calories"
                value={(preview as any).calorieGoal}
                unit="kcal"
              />
              <Tile
                label="Protein"
                value={(preview as any).proteinGoal}
                unit="g"
              />
              <Tile label="Carbs" value={(preview as any).carbGoal} unit="g" />
              <Tile label="Fat" value={(preview as any).fatGoal} unit="g" />
            </View>
          ) : (
            <>
              <Text style={{ color: colors.muted, marginTop: 10 }}>
                Training day
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Tile
                  label="Calories"
                  value={(preview as CyclingPreview).training.calorieGoal}
                  unit="kcal"
                />
                <Tile
                  label="Protein"
                  value={(preview as CyclingPreview).training.proteinGoal}
                  unit="g"
                />
                <Tile
                  label="Carbs"
                  value={(preview as CyclingPreview).training.carbGoal}
                  unit="g"
                />
                <Tile
                  label="Fat"
                  value={(preview as CyclingPreview).training.fatGoal}
                  unit="g"
                />
              </View>
              <Text style={{ color: colors.muted, marginTop: 6 }}>
                Rest day
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Tile
                  label="Calories"
                  value={(preview as CyclingPreview).rest.calorieGoal}
                  unit="kcal"
                />
                <Tile
                  label="Protein"
                  value={(preview as CyclingPreview).rest.proteinGoal}
                  unit="g"
                />
                <Tile
                  label="Carbs"
                  value={(preview as CyclingPreview).rest.carbGoal}
                  unit="g"
                />
                <Tile
                  label="Fat"
                  value={(preview as CyclingPreview).rest.fatGoal}
                  unit="g"
                />
              </View>
            </>
          ))}

        {/* Explainability */}
        <Modal transparent visible={openWhy} animationType="fade">
          <Pressable
            onPress={() => setOpenWhy(false)}
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
                maxWidth: 560,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: cardBorder,
              }}
            >
              <BlurView
                intensity={isDark ? 35 : 25}
                tint={isDark ? "dark" : "light"}
                style={{ padding: 14 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "900",
                      fontSize: 16,
                      flex: 1,
                    }}
                  >
                    Why these targets?
                  </Text>
                  <Pressable onPress={() => setOpenWhy(false)} hitSlop={10}>
                    <Ionicons name="close" size={18} color={colors.text} />
                  </Pressable>
                </View>

                <View style={{ height: 8 }} />

                <Text style={{ color: colors.text, marginBottom: 6 }}>
                  BMR (Mifflin–St Jeor) ={" "}
                  {sex === "male"
                    ? "10·kg + 6.25·cm − 5·age + 5"
                    : "10·kg + 6.25·cm − 5·age − 161"}
                </Text>

                <Text style={{ color: colors.muted, marginBottom: 2 }}>
                  • Your BMR:{" "}
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    {bmr || "—"}
                  </Text>{" "}
                  kcal
                </Text>

                <Text style={{ color: colors.muted, marginBottom: 2 }}>
                  • TDEE = BMR × activity ({activityLevel}) →{" "}
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    {tdee || "—"}
                  </Text>{" "}
                  kcal
                </Text>

                <Text style={{ color: colors.muted, marginBottom: 2 }}>
                  • Goal: {goalType}
                  {goalType !== "maintain"
                    ? ` (${adj}% ${goalType === "cut" ? "deficit" : "surplus"})`
                    : ""}
                </Text>

                <Text style={{ color: colors.muted, marginBottom: 2 }}>
                  • Base calories:{" "}
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    {baseCalories || "—"}
                  </Text>{" "}
                  kcal
                  {calorieCyclingPct
                    ? `  (±${Math.abs(cyc)}% training/rest)`
                    : ""}
                </Text>

                <Text
                  style={{
                    color: colors.text,
                    marginTop: 8,
                    fontWeight: "800",
                  }}
                >
                  Macro method
                </Text>

                {macroMethod === "proteinPerKg" && (
                  <Text style={{ color: colors.muted }}>
                    • Protein ={" "}
                    <Text style={{ fontWeight: "800", color: colors.text }}>
                      {proteinPerKg}
                    </Text>{" "}
                    g/kg × body weight → 30% fat, rest carbs.
                  </Text>
                )}

                {macroMethod === "percent" && (
                  <Text style={{ color: colors.muted }}>
                    • % Split = Protein {proteinPct}% · Carbs {carbPct}% · Fat{" "}
                    {Math.max(
                      0,
                      Math.min(100, 100 - (proteinPct ?? 0) - (carbPct ?? 0))
                    )}
                    %.
                  </Text>
                )}

                {macroMethod === "cycling" && (
                  <Text style={{ color: colors.muted }}>
                    • Cycling = Protein {proteinPct}% both days; Carbs{" "}
                    {trainCarbPct}% (train) / {restCarbPct}% (rest); Fat fills
                    to 100%.
                  </Text>
                )}
              </BlurView>
            </Pressable>
          </Pressable>
        </Modal>
      </BlurView>
    </Animated.View>
  );
});

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={colors.text}
        style={{ marginRight: 8 }}
      />
      <Text style={{ color: colors.text, opacity: 0.8, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
