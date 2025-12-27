// components/profile/v2/SectionDock.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { GlassSurface } from "./GlassSurface";

const withAlpha = (hex: string, a = 0.18) => {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export function SectionDock({
  items,
  activeKey,
  onPress,
}: {
  items: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    dirty?: boolean;
  }[];
  activeKey: string | null;
  onPress: (k: string) => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <GlassSurface
      intensity={18}
      rounded={999}
      style={{
        borderWidth: 1,
        borderColor: withAlpha(colors.border, isDark ? 0.32 : 0.55),
        padding: 6,
        flexDirection: "row",
        gap: 6,
        justifyContent: "space-between",
      }}
    >
      {items.map((it) => {
        const active = activeKey === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => onPress(it.key)}
            style={{ flex: 1 }}
          >
            {({ pressed }) => (
              <View
                style={{
                  borderRadius: 999,
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: active
                    ? withAlpha(colors.primary, 0.45)
                    : withAlpha(colors.border, isDark ? 0.22 : 0.45),
                  backgroundColor: active
                    ? withAlpha(colors.primary, pressed ? 0.22 : 0.16)
                    : withAlpha(colors.text, pressed ? 0.06 : 0.04),
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name={it.icon}
                  size={16}
                  color={active ? colors.primary : withAlpha(colors.text, 0.55)}
                />
                <Text
                  style={{
                    color: active ? colors.text : withAlpha(colors.text, 0.7),
                    fontWeight: "950" as any,
                  }}
                >
                  {it.label}
                </Text>
                {it.dirty ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      backgroundColor: colors.primary,
                      opacity: 0.9,
                    }}
                  />
                ) : null}
              </View>
            )}
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}
