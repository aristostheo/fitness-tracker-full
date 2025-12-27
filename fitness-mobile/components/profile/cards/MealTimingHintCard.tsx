// components/profile/cards/MealTimingHintCard.tsx
import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

export default function MealTimingHintCard() {
  const { colors } = useTheme();

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
        About meal timing
      </Text>
      <Text style={{ marginTop: 6, color: colors.muted, lineHeight: 18 }}>
        Meal times are flexible. Try to keep them consistent, but missing a
        window won’t affect your progress.
      </Text>
    </View>
  );
}
