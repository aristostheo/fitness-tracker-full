import React from "react";
import {
  View,
  ViewStyle,
  StyleSheet,
  Platform,
  ColorValue,
  StyleProp,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { alpha } from "./utils";
import type { NutritionColors } from "./NutritionTheme";

type Props = {
  colors: NutritionColors;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  intensity?: number;
};

export function GlassCard({
  colors,
  isDark,
  style,
  children,
  intensity = 22,
}: Props) {
  const border = colors.border;

  // ✅ Key: use a LIGHT card base in light mode, darker base in dark mode
  const baseBg = isDark ? alpha(colors.card, 0.12) : alpha(colors.card, 0.92);

  // ✅ Subtle “sheen” gradient changes based on mode
  const sheen: [ColorValue, ColorValue] = isDark
    ? [alpha("#FFFFFF", 0.18), alpha("#FFFFFF", 0.02)]
    : [alpha("#FFFFFF", 0.75), alpha("#FFFFFF", 0.2)];

  // ✅ Blur tint should match mode
  const blurTint = isDark
    ? "systemThinMaterialDark"
    : "systemThinMaterialLight";

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: border, backgroundColor: baseBg },
        style,
      ]}
      accessibilityRole="summary"
    >
      <LinearGradient
        colors={sheen}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <BlurView
        intensity={
          Platform.OS === "android" ? Math.max(10, intensity - 6) : intensity
        }
        tint={blurTint as any}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.inner}>{children}</View>
    </View>
  );
}

export function softShadow(isDark: boolean) {
  if (isDark) {
    return {
      shadowColor: "#000",
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    } as ViewStyle;
  }
  return {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  } as ViewStyle;
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  inner: {
    padding: 14,
  },
});
