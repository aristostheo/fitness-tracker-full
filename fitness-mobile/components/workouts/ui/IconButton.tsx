// components/workouts/ui/IconButton.tsx
import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "../utils/withAlpha";

export function IconButton({
  icon,
  onPress,
  disabled,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        {
          height: 38,
          width: 38,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: danger ? withAlpha("#ef4444", 0.5) : colors.border,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed
            ? withAlpha(colors.primary, 0.06)
            : "transparent",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={danger ? "#ef4444" : colors.text}
      />
    </Pressable>
  );
}
