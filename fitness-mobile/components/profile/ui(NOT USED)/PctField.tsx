// components/profile/ui/PctField.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import Glass from "./Glass";

export default function PctField({
  label,
  value,
  onChange,
  step = 0.05, // 5%
}: {
  label: string;
  value: number; // 0..1
  onChange: (v: number) => void;
  step?: number;
}) {
  const { colors, isDark } = useTheme();

  const pct = Math.round((value ?? 0) * 100);
  const clamp = (x: number) => Math.max(0, Math.min(1, x));

  function bump(delta: number) {
    onChange(clamp((value ?? 0) + delta));
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>

      <Glass tint={isDark ? "dark" : "light"} intensity={24} radius={16}>
        <View
          style={{
            padding: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Pressable
            onPress={() => bump(-step)}
            hitSlop={8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${label}`}
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </Pressable>

          <View style={{ alignItems: "center", flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 22,
                fontWeight: "900",
                letterSpacing: 0.3,
              }}
            >
              {pct}%
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>0–100%</Text>
          </View>

          <Pressable
            onPress={() => bump(step)}
            hitSlop={8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${label}`}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </Pressable>
        </View>
      </Glass>
    </View>
  );
}
