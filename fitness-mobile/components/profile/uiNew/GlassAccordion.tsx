// components/profile/v2/GlassAccordion.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
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

export function GlassAccordion({
  title,
  subtitle,
  icon,
  open,
  dirty,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  open: boolean;
  dirty?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors, isDark } = useTheme();

  return (
    <LinearGradient
      colors={[
        withAlpha(colors.primary, isDark ? 0.22 : 0.16),
        withAlpha(colors.card, 0.92),
      ]}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      style={{ borderRadius: 22, padding: 1 }}
    >
      <GlassSurface
        intensity={18}
        rounded={20}
        style={{
          borderWidth: 1,
          borderColor: withAlpha(colors.border, isDark ? 0.32 : 0.55),
          overflow: "hidden",
        }}
      >
        <Pressable onPress={onToggle}>
          {({ pressed }) => (
            <View
              style={{
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: withAlpha(
                  colors.primary,
                  pressed ? 0.1 : 0.06
                ),
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: withAlpha(colors.primary, 0.3),
                    backgroundColor: withAlpha(colors.primary, 0.14),
                  }}
                >
                  <Ionicons name={icon} size={18} color={colors.primary} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "950" as any,
                        fontSize: 16,
                      }}
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                    {dirty ? (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: withAlpha(colors.primary, 0.14),
                          borderWidth: 1,
                          borderColor: withAlpha(colors.primary, 0.25),
                        }}
                      >
                        <Text
                          style={{
                            color: colors.primary,
                            fontWeight: "900",
                            fontSize: 11,
                          }}
                        >
                          Edited
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {subtitle ? (
                    <Text
                      style={{ color: colors.muted, fontWeight: "700" }}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={18}
                color={withAlpha(colors.text, 0.45)}
              />
            </View>
          )}
        </Pressable>

        {open ? (
          <MotiView
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 220 }}
            style={{ padding: 14, paddingTop: 10 }}
          >
            {children}
          </MotiView>
        ) : null}
      </GlassSurface>
    </LinearGradient>
  );
}
