// components/scanMeal/ScanMealProcessingOverlay.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/content/ThemeProvider";

type Props = { title: string; subtitle?: string };

export default function ScanMealProcessingOverlay({ title, subtitle }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      style={styles.overlay}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.card}>
        <ActivityIndicator />
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
        <Text style={styles.note}>You can edit anything after we scan.</Text>
      </View>
    </Animated.View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.25)",
    },
    card: {
      width: "100%",
      maxWidth: 420,
      padding: 18,
      borderRadius: 22,
      alignItems: "center",
      backgroundColor:
        colors.surface ??
        (isDark ? "rgba(20,20,20,0.92)" : "rgba(255,255,255,0.92)"),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
    },
    title: {
      marginTop: 10,
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
    },
    sub: {
      marginTop: 6,
      color:
        colors.muted ??
        (isDark ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.55)"),
      textAlign: "center",
    },
    note: {
      marginTop: 10,
      color:
        colors.muted ?? (isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"),
      fontWeight: Platform.OS === "ios" ? "700" : "600",
    },
  });
}
