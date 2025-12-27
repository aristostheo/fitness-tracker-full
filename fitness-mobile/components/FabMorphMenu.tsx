import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

export type FabAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type Props = {
  actions: FabAction[];
  style?: ViewStyle;
  tint?: "dark" | "light";
  accent?: string; // e.g. colors.primary
};

export default function FabMorphMenu({
  actions,
  style,
  tint = "dark",
  accent = "#5DD6FF",
}: Props) {
  const [open, setOpen] = useState(false);
  const p = useSharedValue(0); // 0 closed, 1 open
  const isLight = tint === "light";
  const textColor = isLight ? "#0f172a" : "white";
  const subText = isLight ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.45)";
  const blurTint =
    tint === "light" ? "systemThinMaterialLight" : "systemThinMaterialDark";

  useEffect(() => {
    p.value = withTiming(open ? 1 : 0, {
      duration: open ? 260 : 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [open]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.86, 1.08]) }],
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(p.value, [0, 1], [1, 1.02]) },
      { rotate: `${interpolate(p.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0, 0.6]),
  })) as any;

  const listStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(p.value, [0, 1], [12, 0]) }],
  }));

  const itemAnim = () =>
    useAnimatedStyle(() => ({
      opacity: interpolate(p.value, [0, 1], [0, 1]),
      transform: [
        { translateY: interpolate(p.value, [0, 1], [10, 0]) },
        { scale: interpolate(p.value, [0, 1], [0.98, 1]) },
      ],
    }));

  const onPick = (a: FabAction) => {
    setOpen(false);
    setTimeout(a.onPress, 160);
  };

  return (
    <>
      <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents={open ? "auto" : "none"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
      </Animated.View>

      <View style={[styles.wrap, style]}>
        <Animated.View style={[styles.listWrap, listStyle]}>
          <BlurView
            intensity={26}
            tint={blurTint as any}
            style={styles.listCard}
          >
            <View
              style={[
                styles.listBorder,
                { borderColor: isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.16)" },
              ]}
            >
              {actions.map((a) => {
                const s = itemAnim();
                return (
                  <Animated.View key={a.key} style={[styles.item, s]}>
                    <Pressable
                      onPress={() => onPick(a)}
                      style={({ pressed }) => [
                        styles.itemBtn,
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <View
                        style={[
                          styles.iconDot,
                          { backgroundColor: `${accent}22`, borderColor: `${accent}55` },
                        ]}
                      >
                        <Ionicons name={a.icon} size={16} color={accent} />
                      </View>
                      <Text style={[styles.itemTxt, { color: textColor }]}>{a.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={subText} />
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </BlurView>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.bubble,
            bubbleStyle,
            { backgroundColor: `${accent}26`, borderColor: `${accent}33` },
          ]}
        />

        <Animated.View
          style={[
            styles.fab,
            fabStyle,
            {
              borderColor: `${accent}66`,
              backgroundColor: `${accent}`,
              shadowColor: accent,
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            },
          ]}
        >
          <Pressable
            onPress={() => setOpen((v) => !v)}
            style={({ pressed }) => [styles.fabBtn, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <BlurView intensity={22} tint={blurTint as any} style={styles.fabBlur}>
              <View style={styles.fabInner}>
                <Ionicons name="add" size={22} color="white" />
              </View>
            </BlurView>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "black",
    zIndex: 30,
  },
  wrap: {
    position: "absolute",
    right: 18,
    bottom: 28,
    zIndex: 40,
    alignItems: "flex-end",
  },
  listWrap: { marginBottom: 12 },
  listCard: {
    borderRadius: 20,
    overflow: "hidden",
    minWidth: 220,
  },
  listBorder: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  item: {},
  itemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  itemTxt: { color: "white", fontWeight: "900", flex: 1 },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  bubble: {
    position: "absolute",
    right: -18,
    bottom: -18,
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  fabBtn: { flex: 1 },
  fabBlur: { flex: 1 },
  fabInner: { flex: 1, alignItems: "center", justifyContent: "center" },
});
