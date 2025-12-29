import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { useTheme } from "@/content/ThemeProvider";

type Friend = {
  id: string;
  name: string;
  handle?: string;
  subtitle?: string;
  accent?: "aqua" | "mint" | "violet" | "sun" | "ruby" | "slate";
};

const ACCENTS: Record<NonNullable<Friend["accent"]>, [string, string]> = {
  aqua: ["rgba(92,225,255,0.85)", "rgba(255,90,200,0.35)"],
  mint: ["rgba(140,251,159,0.85)", "rgba(92,225,255,0.30)"],
  violet: ["rgba(180,120,255,0.85)", "rgba(255,90,200,0.28)"],
  sun: ["rgba(255,216,120,0.85)", "rgba(255,120,120,0.25)"],
  ruby: ["rgba(255,120,160,0.85)", "rgba(255,216,120,0.22)"],
  slate: ["rgba(180,190,210,0.65)", "rgba(140,251,159,0.18)"],
};

export function FriendCard({
  user,
  onPress,
  onLongPress,
}: {
  user: Friend;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const { colors, isDark } = useTheme();

  const accent = useMemo(() => ACCENTS[user.accent ?? "aqua"], [user.accent]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={220}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.985 : 1 }],
        opacity: pressed ? 0.96 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={`Friend ${user.name}`}
      accessibilityHint="Opens friend options"
    >
      <View
        style={{
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.06)",
          backgroundColor: isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.72)",
        }}
      >
        {/* glossy wash */}
        <LinearGradient
          colors={
            isDark
              ? ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.00)"]
              : ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.55)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {/* Avatar ring */}
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={[accent[0], accent[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 2,
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark
                      ? "rgba(0,0,0,0.45)"
                      : "rgba(255,255,255,0.85)",
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(0,0,0,0.06)",
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "900",
                      fontSize: 16,
                    }}
                  >
                    {user.name?.trim()?.[0]?.toUpperCase() ?? "U"}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Name + subtitle */}
            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 16,
                    letterSpacing: -0.2,
                  }}
                >
                  {user.name}
                </Text>

                {/* Tiny status chip */}
                <BlurView
                  intensity={isDark ? 26 : 45}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(255,255,255,0.55)",
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(0,0,0,0.06)",
                  }}
                >
                  <Text
                    style={{
                      color: colors.muted,
                      fontWeight: "800",
                      fontSize: 11,
                    }}
                  >
                    FRIEND
                  </Text>
                </BlurView>
              </View>

              {!!user.handle && (
                <Text
                  style={{
                    color: colors.muted,
                    marginTop: 2,
                    fontWeight: "700",
                  }}
                >
                  {user.handle}
                </Text>
              )}

              {!!user.subtitle && (
                <Text style={{ color: colors.muted, marginTop: 6 }}>
                  {user.subtitle}
                </Text>
              )}
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>

          {/* Quick actions row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <QuickIcon label="Ping" icon="notifications-outline" />
            <QuickIcon label="Meals" icon="restaurant-outline" />
            <QuickIcon label="Workouts" icon="barbell-outline" />
            <QuickIcon label="Profile" icon="person-outline" />
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

function QuickIcon({ icon, label }: { icon: any; label: string }) {
  const { colors, isDark } = useTheme();
  return (
    <BlurView
      intensity={isDark ? 26 : 45}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        backgroundColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.62)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
      }}
    >
      <Ionicons name={icon} size={16} color={colors.text} />
      <Text
        style={{
          color: colors.text,
          fontWeight: "800",
          fontSize: 12,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </BlurView>
  );
}
