// components/Card.tsx
import React from "react";
import { View, ViewProps } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

export default function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    />
  );
}
