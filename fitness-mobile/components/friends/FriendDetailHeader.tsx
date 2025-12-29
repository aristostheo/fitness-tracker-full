import React from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export function FriendDetailHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  rightLabel,
  onRight,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightIcon?: any;
  rightLabel?: string;
  onRight?: () => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => ({
          width: 42,
          height: 42,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.8 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <BlurView
          intensity={isDark ? 26 : 50}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,255,255,0.70)",
            overflow: "hidden",
          }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </BlurView>
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.text,
            fontWeight: "900",
            fontSize: 20,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: colors.muted, marginTop: 4 }}>{subtitle}</Text>
        )}
      </View>

      {rightIcon && rightLabel && onRight ? (
        <Pressable
          onPress={onRight}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
        >
          <BlurView
            intensity={isDark ? 26 : 50}
            style={{
              height: 42,
              borderRadius: 14,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(0,0,0,0.06)",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.70)",
              overflow: "hidden",
            }}
          >
            <Ionicons name={rightIcon} size={16} color={colors.text} />
            <Text
              style={{
                color: colors.text,
                fontWeight: "900",
                letterSpacing: -0.1,
              }}
            >
              {rightLabel}
            </Text>
          </BlurView>
        </Pressable>
      ) : null}
    </View>
  );
}
