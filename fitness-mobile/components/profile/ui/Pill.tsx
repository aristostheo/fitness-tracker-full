// components/profile/ui/Pill.tsx
import React from "react";
import { Pressable, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import Glass from "./Glass";

export default function Pill({
  children,
  active,
  onPress,
}: {
  children: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Glass
      tint={isDark ? "dark" : "light"}
      intensity={active ? 32 : 20}
      radius={999}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderColor: active ? colors.primary : undefined,
      }}
    >
      <Pressable onPress={onPress} hitSlop={8}>
        <Text
          style={{
            color: active ? colors.primary : colors.text,
            fontWeight: "800",
            letterSpacing: 0.2,
          }}
        >
          {children}
        </Text>
      </Pressable>
    </Glass>
  );
}
