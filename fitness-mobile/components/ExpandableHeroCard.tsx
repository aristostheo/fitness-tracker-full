import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withTiming,
} from "react-native-reanimated";

type Macro = { label: string; value: string; sub?: string };

type Props = {
  title?: string;
  primaryValue: string; // e.g. "760"
  primaryLabel: string; // e.g. "Calories left"
  secondaryLeft?: string; // e.g. "Protein left: 42g"
  macros?: Macro[]; // expanded grid
  style?: ViewStyle;
};

export default function ExpandableHeroCard({
  title = "Today",
  primaryValue,
  primaryLabel,
  secondaryLeft,
  macros = [
    { label: "Protein", value: "138g", sub: "goal 170g" },
    { label: "Carbs", value: "210g", sub: "goal 250g" },
    { label: "Fat", value: "62g", sub: "goal 70g" },
    { label: "Fiber", value: "22g", sub: "goal 30g" },
  ],
  style,
}: Props) {
  const [open, setOpen] = useState(false);
  const t = useSharedValue(0); // 0 closed, 1 open

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    t.value = next
      ? withSpring(1, { damping: 16, stiffness: 160 })
      : withSpring(0, { damping: 18, stiffness: 170 });
  };

  const containerStyle = useAnimatedStyle(() => {
    const h = interpolate(t.value, [0, 1], [142, 320], Extrapolate.CLAMP);
    return { height: h };
  });

  const chevronStyle = useAnimatedStyle(() => {
    const rot = interpolate(t.value, [0, 1], [0, 180], Extrapolate.CLAMP);
    return { transform: [{ rotate: `${rot}deg` }] };
  });

  const detailsStyle = useAnimatedStyle(() => {
    const opacity = withTiming(t.value, { duration: 180 });
    const translateY = interpolate(t.value, [0, 1], [10, 0], Extrapolate.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const grid = useMemo(() => macros.slice(0, 4), [macros]);

  return (
    <Pressable onPress={onToggle} style={styles.press}>
      <Animated.View style={[styles.card, style, containerStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Animated.View style={[styles.chev, chevronStyle]}>
            <Text style={styles.chevText}>⌄</Text>
          </Animated.View>
        </View>

        <View style={styles.mainRow}>
          <Text style={styles.big}>{primaryValue}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bigLabel}>{primaryLabel}</Text>
            {!!secondaryLeft && <Text style={styles.sub}>{secondaryLeft}</Text>}
          </View>
        </View>

        <Animated.View
          style={[styles.details, detailsStyle]}
          pointerEvents={open ? "auto" : "none"}
        >
          <View style={styles.grid}>
            {grid.map((m) => (
              <View key={m.label} style={styles.tile}>
                <Text style={styles.tileLabel}>{m.label}</Text>
                <Text style={styles.tileValue}>{m.value}</Text>
                {!!m.sub && <Text style={styles.tileSub}>{m.sub}</Text>}
              </View>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { width: "100%" },
  card: {
    width: "100%",
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  chev: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  chevText: { color: "rgba(255,255,255,0.8)", fontSize: 16, marginTop: -2 },
  mainRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
  },
  big: { color: "white", fontSize: 36, fontWeight: "900" },
  bigLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  sub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  details: { marginTop: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  tileLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontWeight: "700",
  },
  tileValue: { color: "white", fontSize: 18, fontWeight: "900", marginTop: 4 },
  tileSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
});
