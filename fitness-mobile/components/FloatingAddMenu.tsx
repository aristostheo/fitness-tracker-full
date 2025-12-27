import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type Action = {
  key: string;
  title: string;
  subtitle?: string;
  icon?: string; // emoji or your icon component outside
  onPress: () => void;
  tint?: "blue" | "green" | "purple" | "orange" | "red";
};

type Props = {
  actions: Action[];
  bottomOffset?: number; // spacing above tab bar
};

type PanUpdateEvent = { translationY: number };

export default function FloatingAddMenu({ actions, bottomOffset = 92 }: Props) {
  const [open, setOpen] = useState(false);
  const t = useSharedValue(0); // 0 closed, 1 open
  const dragY = useSharedValue(0);

  const openMenu = async () => {
    setOpen(true);
    try {
      await Haptics.selectionAsync();
    } catch {}
    t.value = withSpring(1, { damping: 18, stiffness: 180 });
  };

  const closeMenu = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    t.value = withTiming(
      0,
      { duration: 180, easing: Easing.out(Easing.quad) },
      () => {
        runOnJS(setOpen)(false);
      }
    );
    dragY.value = 0;
  };

  // Close on back gesture (swipe down)
  const pan = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((e: PanUpdateEvent) => {
        if (!open) return;
        dragY.value = Math.max(0, e.translationY);
      })
      .onEnd(() => {
        if (!open) return;
        if (dragY.value > 90) {
          runOnJS(closeMenu)();
        } else {
          dragY.value = withSpring(0, { damping: 18, stiffness: 180 });
        }
      });
  }, [open]);

  const fabStyle = useAnimatedStyle(() => {
    const rot = interpolate(t.value, [0, 1], [0, 45]);
    const scale = withSpring(open ? 0.92 : 1, {
      damping: 16,
      stiffness: 200,
    });
    return { transform: [{ rotate: `${rot}deg` }, { scale }] };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0, 1]),
  }));

  const sheetStyle = useAnimatedStyle(() => {
    const translateY = interpolate(t.value, [0, 1], [260, 0]);
    const scale = interpolate(t.value, [0, 1], [0.98, 1]);
    return {
      transform: [{ translateY: translateY + dragY.value }, { scale }],
      opacity: interpolate(t.value, [0, 1], [0, 1]),
    };
  });

  return (
    <>
      {/* Overlay + Sheet */}
      {open && (
        <Animated.View
          style={[StyleSheet.absoluteFill, overlayStyle]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />

          <GestureDetector gesture={pan}>
            <Animated.View
              style={[styles.sheetWrap, { paddingBottom: bottomOffset }, sheetStyle]}
            >
              <BlurView intensity={28} tint="dark" style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>Quick Add</Text>

                <View style={{ marginTop: 10, gap: 10 }}>
                  {actions.map((a, idx) => (
                    <ActionRow
                      key={a.key}
                      action={a}
                      index={idx}
                      onPicked={async () => {
                        try {
                          await Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                        } catch {}
                        a.onPress();
                        closeMenu();
                      }}
                    />
                  ))}
                </View>

                <Pressable onPress={closeMenu} style={styles.cancelBtn}>
                  <Text style={styles.cancelTxt}>Cancel</Text>
                </Pressable>
              </BlurView>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      )}

      {/* Floating Button */}
      <View
        pointerEvents="box-none"
        style={[styles.fabWrap, { bottom: bottomOffset - 10 }]}
      >
        <Pressable onPress={open ? closeMenu : openMenu} style={styles.fabPress}>
          <BlurView intensity={22} tint="dark" style={styles.fab}>
            <Animated.View style={fabStyle}>
              <Text style={styles.plus}>+</Text>
            </Animated.View>
          </BlurView>
        </Pressable>
      </View>
    </>
  );
}

function ActionRow({
  action,
  index,
  onPicked,
}: {
  action: Action;
  index: number;
  onPicked: () => void;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    // staggered slide-in
    t.value = 0;
    t.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, []);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [
      { translateY: interpolate(t.value, [0, 1], [10 + index * 2, 0]) },
    ],
  }));

  const pill = tintStyles[action.tint ?? "purple"];

  return (
    <Animated.View style={rowStyle}>
      <Pressable
        onPress={onPicked}
        style={({ pressed }) => [
          styles.row,
          pressed && { transform: [{ scale: 0.99 }] },
        ]}
      >
        <View style={[styles.iconPill, pill]}>
          <Text style={styles.iconTxt}>{action.icon ?? "+"}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{action.title}</Text>
          {!!action.subtitle && (
            <Text style={styles.rowSub}>{action.subtitle}</Text>
          )}
        </View>

        <Text style={styles.chev}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

const tintStyles = StyleSheet.create({
  blue: {
    backgroundColor: "rgba(120,200,255,0.16)",
    borderColor: "rgba(120,200,255,0.30)",
  },
  green: {
    backgroundColor: "rgba(120,255,180,0.14)",
    borderColor: "rgba(120,255,180,0.30)",
  },
  purple: {
    backgroundColor: "rgba(160,140,255,0.14)",
    borderColor: "rgba(160,140,255,0.30)",
  },
  orange: {
    backgroundColor: "rgba(255,180,120,0.14)",
    borderColor: "rgba(255,180,120,0.30)",
  },
  red: {
    backgroundColor: "rgba(255,120,120,0.12)",
    borderColor: "rgba(255,120,120,0.30)",
  },
});

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    right: 18,
    zIndex: 50,
  },
  fabPress: { borderRadius: 18 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  plus: { color: "white", fontSize: 28, fontWeight: "900", marginTop: -1 },

  sheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  sheet: {
    borderRadius: 22,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginTop: 2,
    marginBottom: 10,
  },
  sheetTitle: { color: "white", fontSize: 14, fontWeight: "900" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconTxt: { fontSize: 18 },
  rowTitle: { color: "white", fontSize: 14, fontWeight: "900" },
  rowSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  chev: { color: "rgba(255,255,255,0.65)", fontSize: 22, fontWeight: "900" },

  cancelBtn: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cancelTxt: { color: "white", fontWeight: "900" },
});
