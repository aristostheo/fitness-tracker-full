import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/content/ThemeProvider";

const withAlpha = (hex: string, a: number) => {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
};

type Focus = "Strength" | "Hypertrophy" | "Conditioning" | "Mobility";
type StyleMode = "Calm" | "Balanced" | "Intense";
type Duration = 20 | 30 | 45 | 60;

export type CoachSparkSelections = {
  focus: Focus;
  duration: Duration;
  style: StyleMode;
};

type Props = {
  /** Called when user taps Generate */
  onGenerate: (sel: CoachSparkSelections) => Promise<void> | void;

  /** Optional: open full Coach Spark modal/page */
  onOpen?: () => void;

  /** If true, copy hints it’s based on history */
  hasHistorySignal?: boolean;

  /** Optional defaults */
  initial?: Partial<CoachSparkSelections>;

  /** Optional external loading state; if omitted, component manages it */
  loading?: boolean;

  /** Optional error message to display */
  errorText?: string;

  style?: any;
};

const FOCUS: Focus[] = ["Strength", "Hypertrophy", "Conditioning", "Mobility"];
const DURATIONS: Duration[] = [20, 30, 45, 60];
const STYLES: StyleMode[] = ["Calm", "Balanced", "Intense"];

export function CoachSparkCardPremium({
  onGenerate,
  onOpen,
  hasHistorySignal = true,
  initial,
  loading: loadingProp,
  errorText,
  style,
}: Props) {
  const { colors, isDark } = useTheme();

  const accent = colors.primary ?? "#68D7FF";
  const accent2 = "#8B7CFF";

  const [focus, setFocus] = useState<Focus>(initial?.focus ?? "Strength");
  const [duration, setDuration] = useState<Duration>(initial?.duration ?? 45);
  const [mode, setMode] = useState<StyleMode>(initial?.style ?? "Balanced");

  const [loadingLocal, setLoadingLocal] = useState(false);
  const loading = loadingProp ?? loadingLocal;

  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [breathe]);

  const glowStyle = useAnimatedStyle(() => {
    const o = isDark ? 0.14 : 0.1;
    return { opacity: o + breathe.value * (isDark ? 0.1 : 0.08) };
  });

  const cardBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.9);
  const cardBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.1);

  const tStrong = isDark
    ? withAlpha("#FFFFFF", 0.94)
    : withAlpha(colors.text, 0.94);
  const tMid = isDark
    ? withAlpha("#FFFFFF", 0.7)
    : withAlpha(colors.text, 0.72);
  const tMuted = isDark
    ? withAlpha("#FFFFFF", 0.56)
    : withAlpha(colors.text, 0.6);

  const pillBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.84);
  const pillBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.1);

  const trustLine = hasHistorySignal
    ? "Preview first — tuned from your recent training."
    : "Preview first — balanced defaults, always editable.";

  const preview = useMemo(() => {
    const focusLabel =
      focus === "Conditioning"
        ? "Cardio Conditioning"
        : focus === "Mobility"
        ? "Recovery Mobility"
        : `${focus}`;
    const styleLabel = mode;
    return {
      line1: `Preview: ${focusLabel} • ${duration} min • ${styleLabel}`,
      line2: `Includes warm-up + structured sets • editable before starting`,
    };
  }, [focus, duration, mode]);

  const selectHaptic = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };
  const mediumHaptic = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  async function handleGenerate() {
    if (loading) return;
    mediumHaptic();
    try {
      if (loadingProp == null) setLoadingLocal(true);
      await onGenerate({ focus, duration, style: mode });
    } finally {
      if (loadingProp == null) setLoadingLocal(false);
    }
  }

  return (
    <View style={style}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: tStrong }]}>
          Coach Spark
        </Text>
      </View>

      <Pressable
        onPress={() => {
          // Tap anywhere: open full panel if provided (still calm)
          // (Does not replace primary Generate button)
          onOpen?.();
        }}
        style={({ pressed }) => [
          styles.cardWrap,
          { backgroundColor: cardBg, borderColor: cardBorder },
          pressed && { opacity: 0.94 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Coach Spark"
        accessibilityHint="Choose focus, duration, and style. Then generate a workout."
      >
        {/* Sheen */}
        <LinearGradient
          colors={
            isDark
              ? [
                  withAlpha("#FFFFFF", 0.1),
                  withAlpha("#FFFFFF", 0.04),
                  withAlpha("#000000", 0.1),
                ]
              : [
                  withAlpha(accent, 0.1),
                  withAlpha("#FFFFFF", 0.92),
                  withAlpha("#FFFFFF", 0.88),
                ]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Calm assistant glow */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowBlob,
            { backgroundColor: withAlpha(accent2, isDark ? 0.22 : 0.14) },
            glowStyle,
          ]}
        />

        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <BlurView
              intensity={isDark ? 22 : 16}
              tint={isDark ? "dark" : "light"}
              style={[
                styles.iconBlur,
                {
                  backgroundColor: isDark
                    ? withAlpha("#FFFFFF", 0.06)
                    : withAlpha("#FFFFFF", 0.72),
                  borderColor: isDark
                    ? withAlpha("#FFFFFF", 0.14)
                    : withAlpha(colors.text, 0.1),
                },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={withAlpha(accent, 0.95)}
              />
            </BlurView>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: tStrong }]} numberOfLines={1}>
              Generate a structured workout
            </Text>
            <Text style={[styles.sub, { color: tMid }]} numberOfLines={2}>
              Curated generator • {trustLine}
            </Text>
          </View>

          {/* Primary action */}
          <Pressable
            onPress={handleGenerate}
            disabled={loading}
            style={({ pressed }) => [
              styles.generateBtn,
              {
                borderColor: isDark
                  ? withAlpha("#FFFFFF", 0.16)
                  : withAlpha(colors.text, 0.12),
              },
              pressed &&
                !loading && { transform: [{ scale: 0.985 }], opacity: 0.95 },
              loading && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Generate workout"
          >
            <LinearGradient
              colors={
                isDark
                  ? [withAlpha(accent, 0.28), withAlpha("#FFFFFF", 0.08)]
                  : [withAlpha(accent, 0.95), withAlpha(accent, 0.78)]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.generateBtnInner}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#fff" : "#fff"}
                  />
                  <Text style={[styles.generateText, { color: "#fff" }]}>
                    Generating
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.generateText, { color: "#fff" }]}>
                    Generate
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={withAlpha("#FFFFFF", 0.92)}
                  />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Pickers */}
        <View style={styles.pickersRow}>
          <PickerPill
            label="Focus"
            value={focus}
            options={FOCUS}
            disabled={loading}
            bg={pillBg}
            border={pillBorder}
            textStrong={tStrong}
            textMuted={tMuted}
            onChange={(v) => {
              selectHaptic();
              setFocus(v as Focus);
            }}
          />
          <PickerPill
            label="Duration"
            value={`${duration}m`}
            options={DURATIONS.map((d) => `${d}m`)}
            disabled={loading}
            bg={pillBg}
            border={pillBorder}
            textStrong={tStrong}
            textMuted={tMuted}
            onChange={(v) => {
              selectHaptic();
              const n = parseInt(String(v).replace("m", ""), 10);
              setDuration((n as Duration) || 45);
            }}
          />
          <PickerPill
            label="Style"
            value={mode}
            options={STYLES}
            disabled={loading}
            bg={pillBg}
            border={pillBorder}
            textStrong={tStrong}
            textMuted={tMuted}
            onChange={(v) => {
              selectHaptic();
              setMode(v as StyleMode);
            }}
          />
        </View>

        {/* Preview */}
        <View
          style={[
            styles.previewBox,
            {
              backgroundColor: isDark
                ? withAlpha("#FFFFFF", 0.05)
                : withAlpha("#FFFFFF", 0.72),
              borderColor: isDark
                ? withAlpha("#FFFFFF", 0.12)
                : withAlpha(colors.text, 0.1),
            },
          ]}
        >
          <View style={styles.previewHeader}>
            <Text style={[styles.previewLabel, { color: tMuted }]}>
              Preview
            </Text>

            {!!errorText && (
              <View
                style={[
                  styles.errorPill,
                  {
                    backgroundColor: withAlpha("#FF5A5F", isDark ? 0.14 : 0.1),
                    borderColor: withAlpha("#FF5A5F", isDark ? 0.28 : 0.18),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.errorText,
                    { color: withAlpha("#FF5A5F", 0.95) },
                  ]}
                >
                  {errorText}
                </Text>
              </View>
            )}
          </View>

          <Text
            style={[styles.previewLine1, { color: tStrong }]}
            numberOfLines={1}
          >
            {preview.line1}
          </Text>
          <Text
            style={[styles.previewLine2, { color: tMid }]}
            numberOfLines={2}
          >
            {preview.line2}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function PickerPill({
  label,
  value,
  options,
  disabled,
  bg,
  border,
  textStrong,
  textMuted,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  bg: string;
  border: string;
  textStrong: string;
  textMuted: string;
  onChange: (value: string) => void;
}) {
  const [i, setI] = useState(() => Math.max(0, options.indexOf(value)));

  // keep index in sync if value changes externally
  useEffect(() => {
    const idx = options.indexOf(value);
    if (idx >= 0) setI(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        const next = (i + 1) % options.length;
        setI(next);
        onChange(options[next]);
      }}
      style={({ pressed }) => [
        styles.pickerPill,
        { backgroundColor: bg, borderColor: border },
        pressed && !disabled && { opacity: 0.92 },
        disabled && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      accessibilityHint="Tap to cycle options"
    >
      <Text style={[styles.pickerLabel, { color: textMuted }]}>{label}</Text>
      <View style={styles.pickerValueRow}>
        <Text
          style={[styles.pickerValue, { color: textStrong }]}
          numberOfLines={1}
        >
          {options[i]}
        </Text>
        <Ionicons
          name="chevron-down"
          size={14}
          color={withAlpha(textMuted, 0.9)}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", letterSpacing: 0.4 },

  cardWrap: {
    marginTop: 10,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    overflow: "hidden",
  },

  glowBlob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 260,
    right: -120,
    top: -120,
  },

  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  iconWrap: { width: 40, height: 40 },
  iconBlur: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },

  title: { fontSize: 15, fontWeight: "900", letterSpacing: -0.1 },
  sub: { marginTop: 3, fontSize: 12, fontWeight: "700", lineHeight: 16 },

  generateBtn: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  generateBtnInner: {
    height: 38,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
  },
  generateText: { fontSize: 13, fontWeight: "900", letterSpacing: 0.2 },

  pickersRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  pickerPill: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pickerValueRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pickerValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.1,
  },

  previewBox: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  previewLine1: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: -0.1,
  },
  previewLine2: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  errorPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: { fontSize: 11, fontWeight: "900" },
});
