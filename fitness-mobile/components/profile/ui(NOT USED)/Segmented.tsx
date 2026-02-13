// components/profile/ui/Segmented.tsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import Glass from "./Glass";

export default function Segmented<T extends string>({
  value,
  options,
  setValue,
}: {
  value: T;
  options: readonly T[] | T[];
  setValue: (v: T) => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <Glass
      tint={isDark ? "dark" : "light"}
      intensity={24}
      radius={999}
      style={{
        flexDirection: "row",
        padding: 4,
        gap: 6,
      }}
    >
      {options.map((opt) => {
        const active = opt === value;
        const label =
          typeof opt === "string"
            ? opt
                .replace(/([A-Z])/g, " $1")
                .replace("-", " ")
                .trim()
            : String(opt);
        return (
          <Pressable
            key={String(opt)}
            onPress={() => setValue(opt)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: active
                ? "rgba(255,255,255,0.24)"
                : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active ? colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.primary : colors.text,
                fontWeight: active ? "900" : "700",
                fontSize: 12,
                letterSpacing: 0.2,
                textTransform: "capitalize",
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </Glass>
  );
}
