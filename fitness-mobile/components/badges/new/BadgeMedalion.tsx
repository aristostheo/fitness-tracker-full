// components/badges/new/BadgeMedalion.tsx
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  unlocked?: boolean;
  accent?: string;
  size?: number;
};

export default function BadgeMedallion({
  icon,
  unlocked = false,
  accent,
  size = 48,
}: Props) {
  const { colors, isDark } = useTheme();
  const ring = useMemo(() => accent || colors.primary || "#6AE3FF", [accent, colors.primary]);

  const outerSize = size;
  const innerSize = Math.max(8, size - 10);

  return (
    <View
      style={[
        styles.outer,
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          shadowColor: ring,
          shadowOpacity: isDark ? 0.3 : 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
      ]}
    >
      <LinearGradient
        colors={
          unlocked
            ? [withAlpha(ring, 0.35), withAlpha(ring, isDark ? 0.9 : 0.75)]
            : [withAlpha(colors.card, 0.6), withAlpha(colors.card, 0.45)]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            borderColor: withAlpha(ring, unlocked ? 0.65 : 0.35),
            backgroundColor: unlocked
              ? withAlpha(ring, isDark ? 0.22 : 0.16)
              : withAlpha(colors.card, isDark ? 0.12 : 0.1),
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={Math.max(16, innerSize * 0.48)}
          color={unlocked ? withAlpha("#FFFFFF", 0.95) : withAlpha(colors.text, 0.6)}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
