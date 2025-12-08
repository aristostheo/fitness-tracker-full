// components/Card.tsx
import React from "react";
import { View, ViewProps, Pressable, PressableProps } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

type CardProps = ViewProps &
  Pick<
    PressableProps,
    "onPress" | "onLongPress" | "disabled" | "hitSlop" | "onPressIn" | "onPressOut"
  >;

export default function Card({ style, onPress, onLongPress, ...props }: CardProps) {
  const { colors } = useTheme();

  const baseStyle = {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  };

  if (onPress || onLongPress) {
    return (
      <Pressable
        {...props}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          baseStyle,
          style,
          pressed && { transform: [{ scale: 0.99 }], opacity: 0.94 },
        ]}
      />
    );
  }

  return (
    <View
      {...props}
      style={[baseStyle, style]}
    />
  );
}
