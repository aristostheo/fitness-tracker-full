import React from "react";
import { Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { useTheme } from "@/content/ThemeProvider";

export function GlassPill({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 220 }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.92 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <BlurView
          intensity={isDark ? 35 : 55}
          style={{
            paddingHorizontal: 12,
            height: 38,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,255,255,0.65)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.06)",
          }}
        >
          <Ionicons name={icon} size={16} color={colors.text} />
          <Text
            style={{
              color: colors.text,
              fontWeight: "800",
              letterSpacing: -0.1,
            }}
          >
            {label}
          </Text>
        </BlurView>
      </Pressable>
    </MotiView>
  );
}
