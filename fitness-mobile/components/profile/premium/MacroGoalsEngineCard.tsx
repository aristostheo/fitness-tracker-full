// components/profile/cards/MacroGoalsEngineCard.tsx
// Premium Apple-inspired Macro Goals card (glass, calm gradients, premium spacing)
// Keeps compatibility: outputs Targets + calls onPreview just like your current AdvancedCard.
// Uses computeMacroGoalsV2, which still uses calculateGoalTargets internally.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  LayoutAnimation,
  UIManager,
  Modal,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/content/ThemeProvider";
import {
  computeMacroGoalsV2,
  type GoalMode,
  type Targets,
} from "@/services/profile/macroGoalsEngine";

type JobActivity = "sedentary" | "light" | "active";

type Props = {
  currentWeightKg: number;

  targetWeightKg: number;
  targetWeightInput: string;
  onChangeTargetWeight: (v: string) => void;
  weightUnit: "kg" | "lb";

  maintenanceTargets: Targets;

  sex?: "male" | "female";
  age?: number;
  heightCm?: number;

  defaultStepsPerDay?: number;
  defaultGymSessionsPerWeek?: number;
  defaultSportSessionsPerWeek?: number;
  defaultJobActivity?: JobActivity;
  initialMode?: GoalMode;
  initialSimple?: boolean;
  initialGoalIntensity?: number;
  initialPerformanceFocus?: number;
  initialProteinFocus?: number;
  initialTrackingAccurate?: boolean;
  initialBodyFatPct?: string;
  onChangeStepsPerDay?: (v: string) => void;
  onChangeGymSessionsPerWeek?: (v: string) => void;
  onChangeSportSessionsPerWeek?: (v: string) => void;
  onChangeJobActivity?: (v: JobActivity) => void;
  onChangeMode?: (v: GoalMode) => void;
  onChangeSimple?: (v: boolean) => void;
  onChangeGoalIntensity?: (v: number) => void;
  onChangePerformanceFocus?: (v: number) => void;
  onChangeProteinFocus?: (v: number) => void;
  onChangeTrackingAccurate?: (v: boolean) => void;
  onChangeBodyFatPct?: (v: string) => void;

  savedTargets?: Targets;
  onPreview?: (
    t: Targets,
    meta?: { userInitiated?: boolean; engineMeta?: any }
  ) => void;
  hideHeaderText?: boolean;
};

const onlyNum = (t: string) => t.replace(/[^0-9.]/g, "");

function enableLayoutAnimIfNeeded() {
  if (Platform.OS === "android") {
    // @ts-ignore
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      // @ts-ignore
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }
}

function withAlpha(hex: string, a: number) {
  // supports #RRGGBB
  const alpha = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");
  if (!hex?.startsWith("#") || hex.length !== 7) return hex;
  return `${hex}${alpha}`;
}

function modeLabel(m: GoalMode) {
  if (m === "lean_bulk") return "Lean Bulk";
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function paceLabel(mode: GoalMode, weeklyKg: number) {
  if (!Number.isFinite(weeklyKg) || weeklyKg === 0) return "Steady pace";
  const abs = Math.abs(weeklyKg);
  const s = abs >= 1 ? abs.toFixed(1) : abs.toFixed(2);
  if (mode === "cut") return `~${s} kg/week loss`;
  if (mode === "maintain") return "Near maintenance";
  return `~${s} kg/week gain`;
}

export default function MacroGoalsEngineCard({
  currentWeightKg,
  targetWeightKg,
  targetWeightInput,
  onChangeTargetWeight,
  weightUnit,
  maintenanceTargets,
  sex = "male",
  age = 25,
  heightCm = 175,
  defaultStepsPerDay,
  defaultGymSessionsPerWeek,
  defaultSportSessionsPerWeek,
  defaultJobActivity,
  initialMode,
  initialSimple,
  initialGoalIntensity,
  initialPerformanceFocus,
  initialProteinFocus,
  initialTrackingAccurate,
  initialBodyFatPct,
  onChangeStepsPerDay,
  onChangeGymSessionsPerWeek,
  onChangeSportSessionsPerWeek,
  onChangeJobActivity,
  onChangeMode,
  onChangeSimple,
  onChangeGoalIntensity,
  onChangePerformanceFocus,
  onChangeProteinFocus,
  onChangeTrackingAccurate,
  onChangeBodyFatPct,
  savedTargets,
  onPreview,
  hideHeaderText,
}: Props) {
  enableLayoutAnimIfNeeded();
  const { colors, isDark } = useTheme();

  const [mode, setMode] = useState<GoalMode>(initialMode ?? "maintain");
  const [simple, setSimple] = useState(initialSimple ?? true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // simple inputs
  const [stepsPerDay, setStepsPerDay] = useState(
    String(defaultStepsPerDay ?? 7000)
  );
  const [gymSessions, setGymSessions] = useState(
    String(defaultGymSessionsPerWeek ?? 4)
  );
  const [sportSessions, setSportSessions] = useState(
    String(defaultSportSessionsPerWeek ?? 0)
  );
  const [jobActivity, setJobActivity] = useState<JobActivity>(
    defaultJobActivity ?? "light"
  );

  // “Tune” (advanced-friendly) sliders — non-nerdy names
  const [goalIntensity, setGoalIntensity] = useState(
    initialGoalIntensity ?? 0.35
  );
  const [performanceFocus, setPerformanceFocus] = useState(
    initialPerformanceFocus ?? 0.55
  );
  const [proteinFocus, setProteinFocus] = useState(
    initialProteinFocus ?? 0.6
  );

  // optional advanced inputs
  const [bodyFatPct, setBodyFatPct] = useState(initialBodyFatPct ?? ""); // optional
  const [trackingAccurate, setTrackingAccurate] = useState(
    initialTrackingAccurate ?? false
  );

  const [showExplain, setShowExplain] = useState(false);

  const userTouchedRef = useRef(false);
  const markTouched = () => {
    userTouchedRef.current = true;
  };

  useEffect(() => {
    if (userTouchedRef.current) return;

    const nextSteps = String(defaultStepsPerDay ?? 7000);
    const nextGym = String(defaultGymSessionsPerWeek ?? 4);
    const nextSport = String(defaultSportSessionsPerWeek ?? 0);
    const nextJob = defaultJobActivity ?? "light";

    if (stepsPerDay !== nextSteps) setStepsPerDay(nextSteps);
    if (gymSessions !== nextGym) setGymSessions(nextGym);
    if (sportSessions !== nextSport) setSportSessions(nextSport);
    if (jobActivity !== nextJob) setJobActivity(nextJob);
  }, [
    defaultStepsPerDay,
    defaultGymSessionsPerWeek,
    defaultSportSessionsPerWeek,
    defaultJobActivity,
    stepsPerDay,
    gymSessions,
    sportSessions,
    jobActivity,
  ]);

  useEffect(() => {
    if (userTouchedRef.current) return;
    if (initialMode && mode !== initialMode) setMode(initialMode);
    if (initialSimple != null && simple !== initialSimple)
      setSimple(initialSimple);
    if (
      initialGoalIntensity != null &&
      goalIntensity !== initialGoalIntensity
    ) {
      setGoalIntensity(initialGoalIntensity);
    }
    if (
      initialPerformanceFocus != null &&
      performanceFocus !== initialPerformanceFocus
    ) {
      setPerformanceFocus(initialPerformanceFocus);
    }
    if (initialProteinFocus != null && proteinFocus !== initialProteinFocus) {
      setProteinFocus(initialProteinFocus);
    }
    if (
      initialTrackingAccurate != null &&
      trackingAccurate !== initialTrackingAccurate
    ) {
      setTrackingAccurate(initialTrackingAccurate);
    }
    if (initialBodyFatPct != null && bodyFatPct !== initialBodyFatPct) {
      setBodyFatPct(initialBodyFatPct);
    }
  }, [
    initialMode,
    initialSimple,
    initialGoalIntensity,
    initialPerformanceFocus,
    initialProteinFocus,
    initialTrackingAccurate,
    initialBodyFatPct,
    mode,
    simple,
    goalIntensity,
    performanceFocus,
    proteinFocus,
    trackingAccurate,
    bodyFatPct,
  ]);

  // seed mode from saved targets vs maintenance (keeps your existing behavior)
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (initialMode) {
      seededRef.current = true;
      return;
    }
    if (!savedTargets?.calorieGoal) return;

    const maint = maintenanceTargets?.calorieGoal ?? 2200;
    const saved = savedTargets.calorieGoal;

    if (saved < maint - 50) setMode("cut");
    else if (saved > maint + 120) setMode("bulk");
    else setMode("maintain");

    seededRef.current = true;
  }, [savedTargets?.calorieGoal, maintenanceTargets?.calorieGoal]);

  const output = useMemo(() => {
    const parsedSteps = Math.max(0, Number(stepsPerDay || 0) || 0);
    const parsedGym = Math.max(0, Number(gymSessions || 0) || 0);
    const parsedSport = Math.max(0, Number(sportSessions || 0) || 0);

    const bf = Number(bodyFatPct);
    const bfOk = Number.isFinite(bf) ? bf : undefined;

    return computeMacroGoalsV2({
      sex,
      age,
      heightCm,
      weightKg: Math.max(30, currentWeightKg || 0),

      stepsPerDay: parsedSteps || 7000,
      gymSessionsPerWeek: parsedGym,
      sportSessionsPerWeek: parsedSport,
      jobActivity,

      mode,
      goalIntensity,
      performanceFocus,
      proteinFocus,

      bodyFatPct: bfOk,
      trackingAccurate,
      maintenanceTargets,
    });
  }, [
    sex,
    age,
    heightCm,
    currentWeightKg,
    stepsPerDay,
    gymSessions,
    sportSessions,
    jobActivity,
    mode,
    goalIntensity,
    performanceFocus,
    proteinFocus,
    bodyFatPct,
    trackingAccurate,
    maintenanceTargets,
  ]);

  const targets: Targets = useMemo(
    () => ({
      calorieGoal: output?.calorieGoal ?? maintenanceTargets.calorieGoal,
      proteinGoal: output?.proteinGoal ?? maintenanceTargets.proteinGoal,
      carbGoal: output?.carbGoal ?? maintenanceTargets.carbGoal,
      fatGoal: output?.fatGoal ?? maintenanceTargets.fatGoal,
    }),
    [output, maintenanceTargets]
  );

  // calm animated confidence fill
  const conf = output?.meta?.confidence ?? 0.5;
  const confSV = useSharedValue(conf);
  useEffect(() => {
    confSV.value = withTiming(conf, { duration: 420 });
  }, [conf, confSV]);

  const confBarStyle = useAnimatedStyle(() => {
    return { width: `${Math.round(confSV.value * 100)}%` as any };
  });

  // push preview (same logic as your old card: only after user interaction)
  const prevKeyRef = useRef("");
  useEffect(() => {
    if (!onPreview) return;
    if (!userTouchedRef.current) return;

    const key = `${targets.calorieGoal}|${targets.proteinGoal}|${targets.carbGoal}|${targets.fatGoal}`;
    if (key === prevKeyRef.current) return;

    prevKeyRef.current = key;
    onPreview(targets, { userInitiated: true, engineMeta: output?.meta });
  }, [onPreview, targets, output?.meta]);

  const pace = output?.meta?.pace?.weeklyKg ?? 0;

  const cardBorder = isDark
    ? withAlpha("#FFFFFF", 0.12)
    : withAlpha("#0B1220", 0.08);
  const glassBg = isDark
    ? withAlpha("#0B1220", 0.55)
    : withAlpha("#FFFFFF", 0.65);

  const onHaptic = async (
    type: "light" | "selection" | "success" = "selection"
  ) => {
    try {
      if (type === "light")
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === "success")
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      else await Haptics.selectionAsync();
    } catch {}
  };

  const setSimplePremium = (v: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSimple(v);
    onChangeSimple?.(v);
    onHaptic("selection");
  };

  return (
    <View style={{ borderRadius: 22, overflow: "hidden" }}>
      {/* Glass base */}
      <BlurView
        intensity={isDark ? 26 : 34}
        tint={isDark ? "dark" : "light"}
        style={{ borderRadius: 22 }}
      >
        <View
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: cardBorder,
            backgroundColor: glassBg,
            padding: 16,
            gap: 14,
          }}
        >
          {/* subtle gradient sheen */}
          <LinearGradient
            colors={
              isDark
                ? [
                    withAlpha(colors.primary, 0.1),
                    "transparent",
                    withAlpha("#FFFFFF", 0.04),
                  ]
                : [
                    withAlpha(colors.primary, 0.12),
                    "transparent",
                    withAlpha("#000000", 0.02),
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              borderRadius: 22,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap", // ✅ allows toggle to drop instead of clipping
            }}
          >
            {!hideHeaderText ? (
              <View style={{ gap: 2, flex: 1, minWidth: 220 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "900",
                    color: colors.text,
                  }}
                >
                  Macro Goals
                </Text>
                <Text style={{ fontSize: 12.5, color: colors.muted }}>
                  Personalized daily targets · Transparent & safe
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <View
              style={{
                flexDirection: "row",
                gap: 8,
                alignItems: "center",
                flexShrink: 1, // ✅ let this shrink
                justifyContent: "flex-end",
                maxWidth: 180, // ✅ prevents overflow on narrow screens
              }}
            >
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: withAlpha(colors.primary, 0.14),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.28),
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "900", fontSize: 12 }}>
                  Essential
                </Text>
              </View>
            </View>
          </View>

          {/* Mode segmented */}
          <Segmented
            options={[
              { key: "cut", label: "Cut" },
              { key: "maintain", label: "Maintain" },
              { key: "lean_bulk", label: "Lean Bulk" },
              { key: "bulk", label: "Bulk" },
            ]}
            value={mode}
            onChange={(v) => {
              markTouched();
              setMode(v as GoalMode);
              onChangeMode?.(v as GoalMode);
              onHaptic("selection");
            }}
            colors={colors}
            isDark={isDark}
          />

          {/* Pace chip */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: isDark
                  ? withAlpha("#FFFFFF", 0.06)
                  : withAlpha("#0B1220", 0.05),
                borderWidth: 1,
                borderColor: isDark
                  ? withAlpha("#FFFFFF", 0.1)
                  : withAlpha("#0B1220", 0.06),
              }}
            >
              <Text
                style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}
              >
                {paceLabel(mode, pace)}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setShowExplain(true);
                onHaptic("light");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                padding: 6,
              }}
              hitSlop={8}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "900",
                  fontSize: 12,
                }}
              >
                How we got this
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {/* Inputs */}
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            style={{ gap: 12 }}
          >
            {/* Goal weight */}
            <FieldRow
              label="Goal weight"
              right={
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderWidth: 1,
                    borderColor: isDark
                      ? withAlpha("#FFFFFF", 0.1)
                      : withAlpha("#0B1220", 0.08),
                    backgroundColor: isDark
                      ? withAlpha("#000000", 0.22)
                      : withAlpha("#FFFFFF", 0.55),
                    paddingHorizontal: 12,
                    paddingVertical: Platform.OS === "ios" ? 12 : 10,
                    borderRadius: 14,
                    minWidth: 160,
                  }}
                >
                  <TextInput
                    value={targetWeightInput}
                    onChangeText={(t) => {
                      markTouched();
                      onChangeTargetWeight(onlyNum(t));
                    }}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 92"
                    placeholderTextColor={colors.muted}
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: "900",
                    }}
                  />
                  <Text style={{ color: colors.muted, fontWeight: "900" }}>
                    {weightUnit.toUpperCase()}
                  </Text>
                </View>
              }
              colors={colors}
            />

            <FieldRow
              label="Protein target"
              right={
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: isDark
                      ? withAlpha("#FFFFFF", 0.1)
                      : withAlpha("#0B1220", 0.08),
                    backgroundColor: isDark
                      ? withAlpha("#000000", 0.22)
                      : withAlpha("#FFFFFF", 0.55),
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                    borderRadius: 14,
                    minWidth: 160,
                    alignItems: "flex-end",
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
                    {currentWeightKg ? (targets.proteinGoal / currentWeightKg).toFixed(1) : "—"} g/kg
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
                    {targets.proteinGoal}g daily
                  </Text>
                </View>
              }
              colors={colors}
            />

            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setAdvancedOpen((v) => !v);
                onHaptic("selection");
              }}
              style={({ pressed }) => ({
                minHeight: 44,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: isDark
                  ? withAlpha("#FFFFFF", 0.1)
                  : withAlpha("#0B1220", 0.08),
                backgroundColor: isDark
                  ? withAlpha("#FFFFFF", pressed ? 0.08 : 0.05)
                  : withAlpha("#0B1220", pressed ? 0.08 : 0.04),
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              })}
              accessibilityRole="button"
              accessibilityLabel="Toggle fine tune macro goals"
            >
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                Fine-tune {advancedOpen ? "↓" : "→"}
              </Text>
              <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}>
                Steps, training, sliders
              </Text>
            </Pressable>

            {/* Movement + training */}
            {advancedOpen ? (
              <View style={{ gap: 12 }}>
                <TwoColRow
                  left={
                    <LabeledInput
                      label="Steps/day"
                      value={stepsPerDay}
                      onChangeText={(t) => {
                        markTouched();
                        const next = onlyNum(t);
                        setStepsPerDay(next);
                        onChangeStepsPerDay?.(next);
                      }}
                      placeholder="7000"
                      colors={colors}
                      isDark={isDark}
                    />
                  }
                  right={
                    <LabeledInput
                      label="Train/wk"
                      value={gymSessions}
                      onChangeText={(t) => {
                        markTouched();
                        const next = onlyNum(t);
                        setGymSessions(next);
                        onChangeGymSessionsPerWeek?.(next);
                      }}
                      placeholder="4"
                      colors={colors}
                      isDark={isDark}
                    />
                  }
                />

                <TwoColRow
                  left={
                    <LabeledInput
                      label="Sport/wk"
                      value={sportSessions}
                      onChangeText={(t) => {
                        markTouched();
                        const next = onlyNum(t);
                        setSportSessions(next);
                        onChangeSportSessionsPerWeek?.(next);
                      }}
                      placeholder="0"
                      colors={colors}
                      isDark={isDark}
                    />
                  }
                  right={
                    <JobActivityPicker
                      value={jobActivity}
                      onChange={(v) => {
                        markTouched();
                        setJobActivity(v);
                        onChangeJobActivity?.(v);
                        onHaptic("selection");
                      }}
                      colors={colors}
                      isDark={isDark}
                    />
                  }
                />

                <SoftSectionTitle colors={colors} text="Optional fine-tuning" />

                <PremiumSlider
                  label="Goal intensity"
                  hint="Gentle is easier to sustain. Assertive moves faster."
                  value={goalIntensity}
                  defaultValue={0.35}
                  onChange={(v) => {
                    markTouched();
                    setGoalIntensity(v);
                    onChangeGoalIntensity?.(v);
                  }}
                  colors={colors}
                  isDark={isDark}
                />

                <PremiumSlider
                  label="Performance focus"
                  hint="Higher supports training days (more carbs)."
                  value={performanceFocus}
                  defaultValue={0.55}
                  onChange={(v) => {
                    markTouched();
                    setPerformanceFocus(v);
                    onChangePerformanceFocus?.(v);
                  }}
                  colors={colors}
                  isDark={isDark}
                />

                <PremiumSlider
                  label="Protein focus"
                  hint="Higher helps preserve lean mass (especially during cuts)."
                  value={proteinFocus}
                  defaultValue={0.6}
                  onChange={(v) => {
                    markTouched();
                    setProteinFocus(v);
                    onChangeProteinFocus?.(v);
                  }}
                  colors={colors}
                  isDark={isDark}
                />

                <View style={{ gap: 10 }}>
                  <TwoColRow
                    left={
                      <LabeledInput
                        label="Body fat % (optional)"
                        value={bodyFatPct}
                        onChangeText={(t) => {
                          markTouched();
                          const next = onlyNum(t);
                          setBodyFatPct(next);
                          onChangeBodyFatPct?.(next);
                        }}
                        placeholder="e.g. 18"
                        colors={colors}
                        isDark={isDark}
                      />
                    }
                    right={
                      <ToggleRow
                        label="I track accurately"
                        value={trackingAccurate}
                        onPress={() => {
                          markTouched();
                          setTrackingAccurate((p) => {
                            const next = !p;
                            onChangeTrackingAccurate?.(next);
                            return next;
                          });
                          onHaptic("selection");
                        }}
                        colors={colors}
                        isDark={isDark}
                      />
                    }
                  />
                </View>
              </View>
            ) : null}
          </Animated.View>

          {/* Recommendation */}
          <View
            style={{
              marginTop: 2,
              padding: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: isDark
                ? withAlpha("#FFFFFF", 0.1)
                : withAlpha("#0B1220", 0.07),
              backgroundColor: isDark
                ? withAlpha("#000000", 0.22)
                : withAlpha("#FFFFFF", 0.55),
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <View style={{ gap: 2 }}>
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Recommended daily calories
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 32,
                    letterSpacing: -0.5,
                  }}
                >
                  {targets.calorieGoal}
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.muted,
                      fontWeight: "900",
                    }}
                  >
                    {" "}
                    kcal
                  </Text>
                </Text>
              </View>

              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Confidence · {output.meta.confidenceLabel}
                </Text>
                <View
                  style={{
                    width: 120,
                    height: 8,
                    borderRadius: 999,
                    overflow: "hidden",
                    backgroundColor: isDark
                      ? withAlpha("#FFFFFF", 0.08)
                      : withAlpha("#0B1220", 0.06),
                    borderWidth: 1,
                    borderColor: isDark
                      ? withAlpha("#FFFFFF", 0.1)
                      : withAlpha("#0B1220", 0.06),
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor: withAlpha(
                          colors.primary,
                          isDark ? 0.85 : 0.9
                        ),
                      },
                      confBarStyle,
                    ]}
                  />
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: isDark
                  ? withAlpha("#FFFFFF", 0.08)
                  : withAlpha("#0B1220", 0.06),
              }}
            >
              <MacroMini
                label="Protein"
                value={`${targets.proteinGoal}g`}
                colors={colors}
              />
              <MacroMini
                label="Carbs"
                value={`${targets.carbGoal}g`}
                colors={colors}
              />
              <MacroMini
                label="Fat"
                value={`${targets.fatGoal}g`}
                colors={colors}
              />
            </View>

            {!!output.meta.safety?.clamped && (
              <View
                style={{
                  marginTop: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 14,
                  backgroundColor: isDark
                    ? withAlpha("#FF9F0A", 0.12)
                    : withAlpha("#FF9F0A", 0.1),
                  borderWidth: 1,
                  borderColor: isDark
                    ? withAlpha("#FF9F0A", 0.22)
                    : withAlpha("#FF9F0A", 0.18),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#FF9F0A"
                />
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Adjusted for safety
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                  numberOfLines={1}
                >
                  {output.meta.safety.reasons.join(", ")}
                </Text>
              </View>
            )}
          </View>

          {/* Tiny footer */}
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Built from{" "}
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              3 models
            </Text>{" "}
            · reconciled safely · mode:{" "}
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              {modeLabel(mode)}
            </Text>
          </Text>
        </View>
      </BlurView>

      {/* Explain sheet */}
      <Modal
        visible={showExplain}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExplain(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: withAlpha("#000000", isDark ? 0.6 : 0.45),
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowExplain(false)}
          />

          <View
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: isDark
                ? withAlpha("#FFFFFF", 0.12)
                : withAlpha("#0B1220", 0.08),
              backgroundColor: isDark
                ? withAlpha("#0B1220", 0.92)
                : withAlpha("#FFFFFF", 0.92),
            }}
          >
            <LinearGradient
              colors={
                isDark
                  ? [withAlpha(colors.primary, 0.18), "transparent"]
                  : [withAlpha(colors.primary, 0.16), "transparent"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
              }}
            />

            <View
              style={{
                padding: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ gap: 2 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 18,
                  }}
                >
                  How we got this
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  Clear, not overwhelming — you can ignore this if you want.
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowExplain(false);
                  onHaptic("light");
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark
                    ? withAlpha("#FFFFFF", 0.08)
                    : withAlpha("#0B1220", 0.06),
                  borderWidth: 1,
                  borderColor: isDark
                    ? withAlpha("#FFFFFF", 0.1)
                    : withAlpha("#0B1220", 0.08),
                }}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12 }}
            >
              <ExplainBlock
                title="Models used"
                value={output.meta.modelsUsed.join(" · ")}
                colors={colors}
                isDark={isDark}
              />
              <ExplainBlock
                title="Reconciliation"
                value={`Weighted median + safety clamp\nlegacy: ${output.meta.reconciliation.weights.legacy.toFixed(
                  2
                )} · msj: ${output.meta.reconciliation.weights.msj.toFixed(
                  2
                )} · kma: ${output.meta.reconciliation.weights.kma.toFixed(2)}`}
                colors={colors}
                isDark={isDark}
              />
              <ExplainBlock
                title="TDEE estimate"
                value={`${output.meta.tdeeEstimate} kcal/day`}
                colors={colors}
                isDark={isDark}
              />
              <ExplainBlock
                title="Expected pace"
                value={`${output.meta.pace.weeklyKg} kg/week (≈ ${output.meta.pace.weeklyPctBodyweight}% bodyweight/week)`}
                colors={colors}
                isDark={isDark}
              />

              <View style={{ gap: 10 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 14,
                  }}
                >
                  Summary
                </Text>
                {output.meta.explain.map((x, idx) => (
                  <ExplainRow
                    key={`${x.title}-${idx}`}
                    title={x.title}
                    value={x.value}
                    colors={colors}
                  />
                ))}
              </View>

              <View style={{ height: 10 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ----------------------------- UI bits ----------------------------- */

function PillToggle({
  left,
  right,
  valueLeft,
  onChange,
  colors,
  isDark,
}: {
  left: string;
  right: string;
  valueLeft: boolean;
  onChange: (valueLeft: boolean) => void;
  colors: any;
  isDark: boolean;
}) {
  const bg = isDark ? withAlpha("#FFFFFF", 0.08) : withAlpha("#0B1220", 0.06);
  const border = isDark
    ? withAlpha("#FFFFFF", 0.12)
    : withAlpha("#0B1220", 0.08);

  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        padding: 3,
      }}
    >
      <Pressable
        onPress={() => onChange(true)}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 999,
          backgroundColor: valueLeft
            ? withAlpha(colors.primary, 0.9)
            : "transparent",
        }}
      >
        <Text
          style={{
            color: valueLeft ? "#fff" : colors.text,
            fontWeight: "900",
            fontSize: 12,
          }}
        >
          {left}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(false)}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 999,
          backgroundColor: !valueLeft
            ? withAlpha(colors.primary, 0.9)
            : "transparent",
        }}
      >
        <Text
          style={{
            color: !valueLeft ? "#fff" : colors.text,
            fontWeight: "900",
            fontSize: 12,
          }}
        >
          {right}
        </Text>
      </Pressable>
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
  colors,
  isDark,
}: {
  options: Array<{ key: string; label: string }>;
  value: string;
  onChange: (k: string) => void;
  colors: any;
  isDark: boolean;
}) {
  const bg = isDark ? withAlpha("#FFFFFF", 0.06) : withAlpha("#0B1220", 0.05);
  const border = isDark
    ? withAlpha("#FFFFFF", 0.1)
    : withAlpha("#0B1220", 0.07);

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 6,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 16,
        padding: 6,
      }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: active
                ? withAlpha(colors.primary, 0.9)
                : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? "#fff" : colors.text,
                fontWeight: "900",
                fontSize: 12,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FieldRow({
  label,
  right,
  colors,
}: {
  label: string;
  right: React.ReactNode;
  colors: any;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ gap: 2 }}>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 13 }}>
          {label}
        </Text>
        <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}>
          Used for projections & pacing
        </Text>
      </View>
      {right}
    </View>
  );
}

function TwoColRow({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {left}
      {right}
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  isDark,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: any;
  isDark: boolean;
}) {
  const border = isDark
    ? withAlpha("#FFFFFF", 0.1)
    : withAlpha("#0B1220", 0.08);
  const bg = isDark ? withAlpha("#000000", 0.22) : withAlpha("#FFFFFF", 0.55);

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "900" }}>
        {label}
      </Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
          paddingHorizontal: 12,
          paddingVertical: Platform.OS === "ios" ? 12 : 10,
          borderRadius: 14,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}
        />
      </View>
    </View>
  );
}

function JobActivityPicker({
  value,
  onChange,
  colors,
  isDark,
}: {
  value: "sedentary" | "light" | "active";
  onChange: (v: "sedentary" | "light" | "active") => void;
  colors: any;
  isDark: boolean;
}) {
  const border = isDark
    ? withAlpha("#FFFFFF", 0.1)
    : withAlpha("#0B1220", 0.08);
  const bg = isDark ? withAlpha("#000000", 0.22) : withAlpha("#FFFFFF", 0.55);

  const opts: Array<{ k: any; label: string }> = [
    { k: "sedentary", label: "Sedent." },
    { k: "light", label: "Light" },
    { k: "active", label: "Active" },
  ];

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "900" }}>
        Job activity
      </Text>
      <View
        style={{
          flexDirection: "row",
          gap: 4,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
          padding: 6,
          borderRadius: 14,
        }}
      >
        {opts.map((o) => {
          const active = value === o.k;
          return (
            <Pressable
              key={o.k}
              onPress={() => onChange(o.k)}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 4,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: active
                  ? withAlpha(colors.primary, 0.9)
                  : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? "#fff" : colors.text,
                  fontWeight: "900",
                  fontSize: 10.5,
                }}
                numberOfLines={1}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SoftSectionTitle({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          height: 1,
          flex: 1,
          backgroundColor: withAlpha(colors.muted, 0.25),
        }}
      />
      <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}>
        {text}
      </Text>
      <View
        style={{
          height: 1,
          flex: 1,
          backgroundColor: withAlpha(colors.muted, 0.25),
        }}
      />
    </View>
  );
}

function PremiumSlider({
  label,
  hint,
  value,
  defaultValue,
  onChange,
  colors,
  isDark,
}: {
  label: string;
  hint: string;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
  colors: any;
  isDark: boolean;
}) {
  const border = isDark
    ? withAlpha("#FFFFFF", 0.1)
    : withAlpha("#0B1220", 0.08);
  const bg = isDark ? withAlpha("#000000", 0.22) : withAlpha("#FFFFFF", 0.55);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontWeight: "900" }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: colors.muted, fontWeight: "900" }}>
            {Math.round(value * 100)}%
          </Text>
          <Pressable
            onPress={() => onChange(defaultValue)}
            onLongPress={() => onChange(defaultValue)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Reset ${label}`}
          >
            <Ionicons name="refresh-outline" size={15} color={colors.muted} />
          </Pressable>
        </View>
      </View>
      <View
        style={{
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
          borderRadius: 14,
          paddingHorizontal: 10,
          paddingVertical: 10,
        }}
      >
        <Slider
          value={value}
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          minimumTrackTintColor={withAlpha(colors.primary, 0.95)}
          maximumTrackTintColor={
            isDark ? withAlpha("#FFFFFF", 0.12) : withAlpha("#0B1220", 0.1)
          }
          onValueChange={onChange}
        />
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
        {hint}
      </Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onPress,
  colors,
  isDark,
}: {
  label: string;
  value: boolean;
  onPress: () => void;
  colors: any;
  isDark: boolean;
}) {
  const border = isDark
    ? withAlpha("#FFFFFF", 0.1)
    : withAlpha("#0B1220", 0.08);
  const bg = isDark ? withAlpha("#000000", 0.22) : withAlpha("#FFFFFF", 0.55);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        gap: 10,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        justifyContent: "space-between",
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "900" }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "900" }}>
          {value ? "On" : "Off"}
        </Text>
        <View
          style={{
            width: 44,
            height: 26,
            borderRadius: 999,
            backgroundColor: value
              ? withAlpha(colors.primary, 0.9)
              : isDark
              ? withAlpha("#FFFFFF", 0.1)
              : withAlpha("#0B1220", 0.1),
            padding: 3,
            alignItems: value ? "flex-end" : "flex-start",
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              backgroundColor: "#fff",
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

function MacroMini({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
        {value}
      </Text>
    </View>
  );
}

function ExplainBlock({
  title,
  value,
  colors,
  isDark,
}: {
  title: string;
  value: string;
  colors: any;
  isDark: boolean;
}) {
  const border = isDark
    ? withAlpha("#FFFFFF", 0.12)
    : withAlpha("#0B1220", 0.08);
  const bg = isDark ? withAlpha("#000000", 0.22) : withAlpha("#FFFFFF", 0.65);

  return (
    <View
      style={{
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
        gap: 6,
      }}
    >
      <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}>
        {title}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontWeight: "900",
          fontSize: 13,
          lineHeight: 18,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ExplainRow({
  title,
  value,
  colors,
}: {
  title: string;
  value: string;
  colors: any;
}) {
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}
    >
      <Text style={{ color: colors.muted, fontWeight: "900", flex: 1 }}>
        {title}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontWeight: "900",
          flex: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
