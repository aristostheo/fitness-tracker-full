// components/profile/premium/GoalsCard.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha, clamp, fmt } from "./ui";

type Targets = {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
};
type GoalUILabel = "maintain" | "cut" | "bulk";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";

function Segmented<T extends string>({
  value,
  setValue,
  items,
}: {
  value: T;
  setValue: (v: T) => void;
  items: { key: T; label: string; icon?: any }[];
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.segmentWrap,
        { backgroundColor: withAlpha(colors.border, isDark ? 0.12 : 0.22) },
      ]}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              Haptics.selectionAsync();
              setValue(it.key);
            }}
            style={[
              styles.segment,
              active && {
                backgroundColor: withAlpha(colors.card, isDark ? 0.26 : 0.75),
                borderColor: withAlpha(colors.border, 0.75),
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={it.label}
          >
            {it.icon ? (
              <Ionicons name={it.icon} size={14} color={colors.text} />
            ) : null}
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 12 }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.miniStat}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "900", marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

export function GoalsCard(props: {
  isDark: boolean;

  sex: "male" | "female";
  setSex: (v: "male" | "female") => void;

  age: string;
  setAge: (v: string) => void;

  heightCm: string;
  setHeightCm: (v: string) => void;

  weightUnit: "kg" | "lb";
  weightInput: string;
  setWeightInput: (v: string) => void;

  targetWeightInput: string;
  setTargetWeightInput: (v: string) => void;

  activityLevel: ActivityLevel;
  setActivityLevel: (v: ActivityLevel) => void;

  goalType: GoalUILabel;
  setGoalType: (v: GoalUILabel) => void;

  weeklyPace: string;
  setWeeklyPace: (v: string) => void;

  maintenanceTargets: Targets;
  savedTargets: Targets;
  previewTargets: Targets | null;
  onPreviewTargets: (t: Targets) => void;

  onCommitSave: () => void;
  saving: boolean;
}) {
  const { colors, isDark } = useTheme();

  // A calm, transparent “goal delta” model:
  const derivedTargets = useMemo(() => {
    const base = props.maintenanceTargets;

    // weekly pace influences calorie delta
    const pace = clamp(Number(props.weeklyPace || 0.5), 0.2, 1.0);
    const delta = Math.round(250 + pace * 350); // 320..600-ish

    const calories =
      props.goalType === "cut"
        ? Math.max(1400, base.calorieGoal - delta)
        : props.goalType === "bulk"
        ? base.calorieGoal + Math.round(delta * 0.8)
        : base.calorieGoal;

    // protein anchored, carbs/fat adjust gently
    const protein = Math.max(
      base.proteinGoal,
      Math.round(base.proteinGoal * (props.goalType === "cut" ? 1.05 : 1.0))
    );

    // keep fat reasonable, carbs float
    const fat = Math.round(
      clamp(
        base.fatGoal +
          (props.goalType === "bulk" ? 10 : props.goalType === "cut" ? -6 : 0),
        45,
        95
      )
    );
    const carbs = Math.max(
      80,
      Math.round((calories - protein * 4 - fat * 9) / 4)
    );

    return {
      calorieGoal: calories,
      proteinGoal: protein,
      carbGoal: carbs,
      fatGoal: fat,
    } satisfies Targets;
  }, [props.maintenanceTargets, props.goalType, props.weeklyPace]);

  const showing = props.previewTargets ?? props.savedTargets;

  return (
    <GlassCard>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
            Goals
          </Text>
          <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 18 }}>
            Set direction. The numbers adapt — you stay in control.
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            props.onPreviewTargets(derivedTargets);
          }}
          style={({ pressed }) => [
            styles.previewBtn,
            {
              backgroundColor: withAlpha(colors.primary, pressed ? 0.22 : 0.16),
              borderColor: withAlpha(colors.primary, 0.32),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Preview updated targets"
        >
          <Ionicons name="sparkles-outline" size={16} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: "900" }}>Preview</Text>
        </Pressable>
      </View>

      <View style={{ height: 12 }} />

      <Segmented
        value={props.goalType}
        setValue={props.setGoalType}
        items={[
          {
            key: "maintain",
            label: "Maintain",
            icon: "shield-checkmark-outline",
          },
          { key: "cut", label: "Cut", icon: "trending-down-outline" },
          { key: "bulk", label: "Bulk", icon: "trending-up-outline" },
        ]}
      />

      <View style={{ height: 12 }} />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <MiniStat
          label="Calories"
          value={`${fmt.num0(showing.calorieGoal)} kcal`}
        />
        <MiniStat
          label="Protein"
          value={`${fmt.num0(showing.proteinGoal)} g`}
        />
        <MiniStat label="Carbs" value={`${fmt.num0(showing.carbGoal)} g`} />
        <MiniStat label="Fat" value={`${fmt.num0(showing.fatGoal)} g`} />
      </View>

      <View style={{ height: 12 }} />

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Weekly pace</Text>
          <Text style={{ color: colors.text, fontWeight: "900", marginTop: 4 }}>
            {clamp(Number(props.weeklyPace || 0.5), 0.2, 1.0).toFixed(1)} kg /
            week
          </Text>
        </View>
        <View style={{ width: 160, alignItems: "flex-end" }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Gentle → Aggressive
          </Text>
        </View>
      </View>

      <Slider
        value={clamp(Number(props.weeklyPace || 0.5), 0.2, 1.0)}
        onValueChange={(v: number) => props.setWeeklyPace(String(v))}
        minimumValue={0.2}
        maximumValue={1.0}
        step={0.1}
        minimumTrackTintColor={withAlpha(colors.primary, 0.55)}
        maximumTrackTintColor={withAlpha(colors.border, isDark ? 0.22 : 0.35)}
        thumbTintColor={colors.text}
        accessibilityLabel="Weekly pace slider"
      />

      <View style={{ height: 10 }} />

      <View style={styles.inputsGrid}>
        <Field
          label="Age"
          value={props.age}
          onChange={props.setAge}
          keyboardType="number-pad"
        />
        <Field
          label="Height (cm)"
          value={props.heightCm}
          onChange={props.setHeightCm}
          keyboardType="number-pad"
        />
        <Field
          label={`Weight (${props.weightUnit})`}
          value={props.weightInput}
          onChange={props.setWeightInput}
          keyboardType="decimal-pad"
        />
        <Field
          label={`Target (${props.weightUnit})`}
          value={props.targetWeightInput}
          onChange={props.setTargetWeightInput}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={{ height: 12 }} />

      <View style={{ gap: 10 }}>
        <Segmented
          value={props.activityLevel}
          setValue={props.setActivityLevel}
          items={[
            { key: "sedentary", label: "Low" },
            { key: "moderate", label: "Mid" },
            { key: "active", label: "High" },
          ]}
        />

        <Segmented
          value={props.sex}
          setValue={props.setSex}
          items={[
            { key: "male", label: "Male" },
            { key: "female", label: "Female" },
          ]}
        />
      </View>

      <View style={{ height: 14 }} />

      <Pressable
        onPress={() => props.onCommitSave()}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor: withAlpha(colors.text, pressed ? 0.08 : 0.06),
            borderColor: withAlpha(colors.border, 0.7),
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Save goals and profile"
      >
        <Ionicons
          name="checkmark-circle-outline"
          size={18}
          color={colors.text}
        />
        <Text style={{ color: colors.text, fontWeight: "900" }}>
          {props.saving ? "Saving…" : "Save"}
        </Text>
        <Text style={{ color: colors.muted, marginLeft: "auto" }}>
          Preview first if you want
        </Text>
      </Pressable>

      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          marginTop: 10,
          lineHeight: 16,
        }}
      >
        Tip: This page avoids “good/bad” labels. It’s guidance, not judgment.
      </Text>
    </GlassCard>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: any;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.field,
        {
          borderColor: withAlpha(colors.border, 0.7),
          backgroundColor: withAlpha(colors.card, isDark ? 0.16 : 0.65),
        },
      ]}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        keyboardType={props.keyboardType}
        style={{
          color: colors.text,
          fontWeight: "900",
          fontSize: 14,
          paddingVertical: Platform.OS === "ios" ? 8 : 6,
        }}
        placeholder="—"
        placeholderTextColor={withAlpha(colors.muted, 0.7)}
        accessibilityLabel={props.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  segmentWrap: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    gap: 6,
  },
  segment: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  miniStat: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  row2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  field: {
    width: "48%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  saveBtn: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
