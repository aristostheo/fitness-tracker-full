import React, { memo } from "react";
import { View, Text } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Field from "../ui/Field";
import Pill from "../ui/Pill";
import { Ionicons } from "@expo/vector-icons";

const GlassBox = memo(function GlassBox({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

export default function GoalsActivityCard({
  targetWeight,
  setTargetWeight,
  targetDate,
  setTargetDate,
  weightUnit,
  activityLevel,
  setActivityLevel,
  trainingDaysPerWeek,
  setTrainingDaysPerWeek,
  stepsGoal,
  setStepsGoal,
}: {
  targetWeight: string | number | undefined;
  setTargetWeight: (v: string) => void;
  targetDate: string | undefined;
  setTargetDate: (v: string) => void;
  weightUnit: "kg" | "lb";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "athlete";
  setActivityLevel: (v: any) => void;
  trainingDaysPerWeek: string | number | undefined;
  setTrainingDaysPerWeek: (v: string) => void;
  stepsGoal: string | number | undefined;
  setStepsGoal: (v: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <Card
      style={{
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        gap: 12,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Ionicons name="flag-outline" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>
            Goals & Activity
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Target, movement & steps
          </Text>
        </View>
      </View>

      {/* Target weight / date */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <GlassBox style={{ flex: 1 }}>
          <Field
            label={`Target weight (${weightUnit})`}
            value={targetWeight == null ? "" : String(targetWeight)}
            onChangeText={setTargetWeight}
            placeholder={weightUnit}
            inputMode="decimal"
            style={{ width: "100%" }}
            inputStyle={{ paddingVertical: 10 }}
          />
        </GlassBox>
        <GlassBox style={{ flex: 1 }}>
          <Field
            label="Target date"
            value={targetDate ?? ""}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
            style={{ width: "100%" }}
            inputStyle={{ paddingVertical: 10 }}
          />
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            Tip: use a realistic pace (0.25–0.75 {weightUnit}/week).
          </Text>
        </GlassBox>
      </View>

      {/* Activity level */}
      <GlassBox>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          Activity level
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {(
            ["sedentary", "light", "moderate", "active", "athlete"] as const
          ).map((lvl) => (
            <Pill
              key={lvl}
              active={activityLevel === lvl}
              onPress={() => setActivityLevel(lvl)}
            >
              {lvl[0].toUpperCase() + lvl.slice(1)}
            </Pill>
          ))}
        </View>
      </GlassBox>

      {/* Training days / Steps */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <GlassBox style={{ flex: 1 }}>
          <Field
            label="Training days / week"
            value={
              trainingDaysPerWeek == null ? "" : String(trainingDaysPerWeek)
            }
            onChangeText={setTrainingDaysPerWeek}
            inputMode="numeric"
            placeholder="e.g., 4"
            style={{ width: "100%" }}
            inputStyle={{ paddingVertical: 10 }}
          />
        </GlassBox>
        <GlassBox style={{ flex: 1 }}>
          <Field
            label="Steps goal / day"
            value={stepsGoal == null ? "" : String(stepsGoal)}
            onChangeText={setStepsGoal}
            inputMode="numeric"
            placeholder="e.g., 8000"
            style={{ width: "100%" }}
            inputStyle={{ paddingVertical: 10 }}
          />
        </GlassBox>
      </View>
    </Card>
  );
}
