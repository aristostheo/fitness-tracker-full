// components/workouts/ui/GradientButton.tsx
import React from "react";
import { Pressable, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/content/ThemeProvider";

export function GradientButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={!disabled ? onPress : undefined} style={{ flex: 0 }}>
      <LinearGradient
        colors={[colors.primary, "#16a34a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 44,
          paddingHorizontal: 18,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
