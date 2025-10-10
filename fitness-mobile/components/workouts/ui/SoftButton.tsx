// components/workouts/ui/SoftButton.tsx
import React from "react";
import { Pressable, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "../utils/withAlpha";

export function SoftButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          height: 42,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed
            ? withAlpha(colors.primary, 0.08)
            : "transparent",
        },
      ]}
    >
      <Text style={{ color: colors.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
