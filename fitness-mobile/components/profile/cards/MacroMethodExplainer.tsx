// components/profile/cards/MacroMethodExplainer.tsx
import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

type Props = {
  method: "proteinPerKg" | "percent" | "cycling";
};

export default function MacroMethodExplainer({ method }: Props) {
  const { colors } = useTheme();

  const text = {
    proteinPerKg:
      "Protein is set based on your body weight. Fats and carbs are automatically balanced for performance and recovery.",
    percent:
      "Calories are split into protein, carbs, and fats by percentage. Best for users who like full control.",
    cycling:
      "Macros adjust between training and rest days to support workouts while managing calories.",
  }[method];

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
        How this works
      </Text>
      <Text style={{ marginTop: 6, color: colors.muted, lineHeight: 18 }}>
        {text}
      </Text>
    </View>
  );
}
