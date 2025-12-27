// components/profile/cards/GoalSummaryCard.tsx
import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

type Props = {
  goalType: "maintain" | "cut" | "bulk";
  weeklyPace: string;
  activityLevel: string;
};

export default function GoalSummaryCard({
  goalType,
  weeklyPace,
  activityLevel,
}: Props) {
  const { colors } = useTheme();

  const copy = {
    maintain: "You’re aiming to maintain your current weight.",
    cut: `You’re aiming to lose about ${weeklyPace} kg per week.`,
    bulk: `You’re aiming to gain about ${weeklyPace} kg per week.`,
  }[goalType];

  return (
    <View
      style={{
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ fontWeight: "900", fontSize: 15, color: colors.text }}>
        Plan summary
      </Text>

      <Text style={{ marginTop: 6, color: colors.muted, lineHeight: 18 }}>
        {copy} Your activity level is set to{" "}
        <Text style={{ color: colors.text, fontWeight: "700" }}>
          {activityLevel}
        </Text>
        , which is used to calculate your daily calories.
      </Text>
    </View>
  );
}
