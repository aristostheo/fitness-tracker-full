// components/profile/bodyTwin/FutureSelfSheet.tsx
import React, { useMemo, useState } from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import type {
  FutureSelfTarget,
  BodyMetrics,
} from "@/services/profile/bodyTwin/types";

export function FutureSelfSheet(props: {
  visible: boolean;
  onClose: () => void;
  current?: BodyMetrics;
  onChangeTarget: (t: FutureSelfTarget) => void;
  hideNumbers?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const surface = isDark
    ? withAlpha("#0B0B0F", 0.92)
    : withAlpha("#FFFFFF", 0.92);

  const curW = props.current?.weightKg ?? 85;
  const curBf = props.current?.bodyFatPct ?? 18;

  const [weightKg, setWeightKg] = useState(curW);
  const [bodyFatPct, setBodyFatPct] = useState(curBf);

  const weightRange = useMemo(() => {
    // Gentle range around current
    const min = Math.max(40, curW - 25);
    const max = Math.min(180, curW + 25);
    return { min, max };
  }, [curW]);

  const bfRange = useMemo(() => {
    const min = Math.max(5, curBf - 12);
    const max = Math.min(45, curBf + 12);
    return { min, max };
  }, [curBf]);

  function commit() {
    Haptics.selectionAsync();
    props.onChangeTarget({ weightKg, bodyFatPct });
  }

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: surface,
              borderColor: withAlpha(colors.text, isDark ? 0.1 : 0.08),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.hTitle, { color: colors.text }]}>
              Future Self
            </Text>
            <Pressable
              onPress={props.onClose}
              style={[
                styles.close,
                { backgroundColor: withAlpha(colors.text, 0.08) },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: "800" }}>✕</Text>
            </Pressable>
          </View>

          <Text
            style={[styles.caption, { color: withAlpha(colors.text, 0.62) }]}
          >
            This is a gentle preview overlay for motivation — not a promise.
            Choose targets that feel supportive.
          </Text>

          <View
            style={[
              styles.block,
              { backgroundColor: withAlpha(colors.text, 0.06) },
            ]}
          >
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>
                Target weight
              </Text>
              <Text
                style={[styles.value, { color: withAlpha(colors.text, 0.7) }]}
              >
                {props.hideNumbers ? "Hidden" : `${weightKg.toFixed(1)} kg`}
              </Text>
            </View>

            <Slider
              minimumValue={weightRange.min}
              maximumValue={weightRange.max}
              value={weightKg}
              step={0.1}
              onValueChange={(v: number) => setWeightKg(v)}
              onSlidingComplete={commit}
              minimumTrackTintColor={colors.primary ?? "#4B8DFF"}
              maximumTrackTintColor={withAlpha(colors.text, 0.18)}
            />
          </View>

          <View
            style={[
              styles.block,
              { backgroundColor: withAlpha(colors.text, 0.06) },
            ]}
          >
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>
                Target body fat
              </Text>
              <Text
                style={[styles.value, { color: withAlpha(colors.text, 0.7) }]}
              >
                {props.hideNumbers ? "Hidden" : `${bodyFatPct.toFixed(0)}%`}
              </Text>
            </View>

            <Slider
              minimumValue={bfRange.min}
              maximumValue={bfRange.max}
              value={bodyFatPct}
              step={1}
              onValueChange={(v: number) => setBodyFatPct(v)}
              onSlidingComplete={commit}
              minimumTrackTintColor={colors.primary ?? "#4B8DFF"}
              maximumTrackTintColor={withAlpha(colors.text, 0.18)}
            />
          </View>

          <Pressable
            onPress={() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              commit();
              props.onClose();
            }}
            style={[
              styles.done,
              {
                backgroundColor: withAlpha(
                  colors.primary ?? "#4B8DFF",
                  isDark ? 0.92 : 0.9
                ),
              },
            ]}
          >
            <Text style={styles.doneText}>Preview</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              props.onChangeTarget({});
              props.onClose();
            }}
            style={[
              styles.clear,
              { borderColor: withAlpha(colors.text, 0.14) },
            ]}
          >
            <Text
              style={[
                styles.clearText,
                { color: withAlpha(colors.text, 0.75) },
              ]}
            >
              Clear preview
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
  },
  hTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    marginBottom: 12,
  },
  block: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  value: {
    fontSize: 12,
    fontWeight: "800",
  },
  done: {
    marginTop: 6,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  doneText: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  clear: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  clearText: {
    fontWeight: "900",
    letterSpacing: -0.2,
  },
});
