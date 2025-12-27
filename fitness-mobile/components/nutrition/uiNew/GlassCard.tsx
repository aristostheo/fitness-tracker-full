import React from "react";
import { Platform, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

function withAlpha(color: string, alpha = 0.2) {
  if (!color) return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("rgb")) {
    const body = color.replace(/^rgba?\(|\)$/g, "");
    const [r, g, b] = body.split(",").map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const m = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return color;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(
    m[3],
    16
  )}, ${alpha})`;
}

export function GlassCard({
  children,
  colors,
  isDark,
  radius = 22,
  pad = 14,
  style,
}: React.PropsWithChildren<{
  children: React.ReactNode;
  colors: any;
  isDark: boolean;
  radius?: number;
  pad?: number;
  style?: ViewStyle | any;
}>) {
  if (Platform.OS === "ios") {
    return (
      <View
        style={[
          {
            borderRadius: radius,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <BlurView
          intensity={22}
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          style={{ padding: pad }}
        >
          <LinearGradient
            colors={[
              withAlpha(colors.card, 0.75),
              withAlpha(colors.card, 0.35),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", inset: 0 }}
          />
          {children}
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: withAlpha(colors.card, 0.95),
          padding: pad,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
