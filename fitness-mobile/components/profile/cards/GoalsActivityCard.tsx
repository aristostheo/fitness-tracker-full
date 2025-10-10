import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Field from "../ui/Field";
import Pill from "../ui/Pill";
import { Ionicons } from "@expo/vector-icons";

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
}: any) {
  const { colors } = useTheme();

  const Row = ({ children, style }: any) => (
    <View style={[{ flexDirection: "row", gap: 10 }, style]}>{children}</View>
  );

  const Glass = ({ children, style }: any) => (
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

      <Row>
        <Glass style={{ flex: 1 }}>
          <Field
            label={`Target weight (${weightUnit})`}
            value={targetWeight}
            onChangeText={setTargetWeight}
            placeholder={weightUnit}
            inputMode="decimal"
          />
        </Glass>
        <Glass style={{ flex: 1 }}>
          <Field
            label="Target date"
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
          />
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            Tip: use a realistic pace (0.25–0.75 kg/week).
          </Text>
        </Glass>
      </Row>

      <Glass>
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
      </Glass>

      <Row>
        <Glass style={{ flex: 1 }}>
          <Field
            label="Training days / week"
            value={trainingDaysPerWeek}
            onChangeText={setTrainingDaysPerWeek}
            inputMode="numeric"
            placeholder="e.g., 4"
          />
        </Glass>
        <Glass style={{ flex: 1 }}>
          <Field
            label="Steps goal / day"
            value={stepsGoal}
            onChangeText={setStepsGoal}
            inputMode="numeric"
            placeholder="e.g., 8000"
          />
        </Glass>
      </Row>
    </Card>
  );
}
