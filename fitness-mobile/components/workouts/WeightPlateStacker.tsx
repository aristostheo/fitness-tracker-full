import React, { memo, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  Platform,
  useWindowDimensions,
} from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from "react-native-svg";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  Layout,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AView = Animated.createAnimatedComponent(View);

type Unit = "lb" | "kg";

type PlateSpec = {
  value: number;
  label?: string;
  size: number;
  tone: "carbon" | "aqua" | "mint" | "violet" | "sun" | "ruby" | "slate";
};

type Breakdown = {
  target: number;
  perSide: number;
  bar: number;
  unit: Unit;
  collars: number;
  platesPerSide: PlateSpec[];
};

const DEFAULT_LB_PLATES: PlateSpec[] = [
  { value: 45, size: 1.0, tone: "carbon" },
  { value: 35, size: 0.92, tone: "slate" },
  { value: 25, size: 0.84, tone: "aqua" },
  { value: 10, size: 0.68, tone: "mint" },
  { value: 5, size: 0.56, tone: "violet" },
  { value: 2.5, size: 0.48, tone: "sun" },
];

const DEFAULT_KG_PLATES: PlateSpec[] = [
  { value: 25, size: 1.0, tone: "carbon" },
  { value: 20, size: 0.94, tone: "slate" },
  { value: 15, size: 0.88, tone: "aqua" },
  { value: 10, size: 0.76, tone: "mint" },
  { value: 5, size: 0.6, tone: "violet" },
  { value: 2.5, size: 0.52, tone: "sun" },
  { value: 1.25, size: 0.46, tone: "ruby" },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundToStep(value: number, step: number) {
  const inv = 1 / step;
  return Math.round(value * inv) / inv;
}

function fmt(n: number) {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

function toneStops(tone: PlateSpec["tone"]) {
  switch (tone) {
    case "aqua":
      return ["rgba(54, 217, 255, 0.95)", "rgba(18, 119, 160, 0.95)"];
    case "mint":
      return ["rgba(102, 255, 203, 0.95)", "rgba(20, 140, 110, 0.95)"];
    case "violet":
      return ["rgba(186, 140, 255, 0.95)", "rgba(94, 60, 170, 0.95)"];
    case "sun":
      return ["rgba(255, 208, 112, 0.95)", "rgba(170, 110, 18, 0.95)"];
    case "ruby":
      return ["rgba(255, 124, 150, 0.95)", "rgba(160, 36, 70, 0.95)"];
    case "slate":
      return ["rgba(210, 224, 238, 0.92)", "rgba(90, 110, 128, 0.92)"];
    case "carbon":
    default:
      return ["rgba(60, 72, 90, 0.95)", "rgba(18, 24, 36, 0.95)"];
  }
}

function withAlpha(rgba: string, a: number) {
  const m = rgba.match(/rgba?\(([^)]+)\)/);
  if (!m) return rgba;
  const parts = m[1].split(",").map((s) => s.trim());
  if (parts.length < 3) return rgba;
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
}

function computeBreakdown({
  target,
  unit,
  barWeight,
  collarWeight,
  plates,
  clampBelowBar = true,
}: {
  target: number;
  unit: Unit;
  barWeight: number;
  collarWeight: number;
  plates: PlateSpec[];
  clampBelowBar?: boolean;
}): Breakdown {
  const bar = barWeight;
  const collars = collarWeight;
  const loadable = target - bar - 2 * collars;
  const safe = clampBelowBar ? Math.max(0, loadable) : loadable;
  const perSide = safe / 2;

  let remaining = perSide;
  const perSidePlates: PlateSpec[] = [];
  for (const p of plates) {
    const count = Math.floor((remaining + 1e-9) / p.value);
    if (count > 0) {
      for (let i = 0; i < count; i++) perSidePlates.push(p);
      remaining = Math.round((remaining - count * p.value) * 100000) / 100000;
      if (remaining <= 1e-9) break;
    }
  }

  return { target, perSide, bar, unit, collars, platesPerSide: perSidePlates };
}

export type WeightPlateStackerProps = {
  value: number;
  onChange: (next: number) => void;
  unit?: Unit;
  step?: number;
  min?: number;
  max?: number;
  barWeight?: number;
  collarWeightPerSide?: number;
  plates?: PlateSpec[];
  clampBelowBar?: boolean;
  title?: string;
  style?: ViewStyle;
  appearance?: "dark" | "light" | "auto";
  scale?: number;
};

export default function WeightPlateStacker({
  value,
  onChange,
  unit = "lb",
  step = unit === "lb" ? 5 : 2.5,
  min = 0,
  max = 1500,
  barWeight = unit === "lb" ? 45 : 20,
  collarWeightPerSide = 0,
  plates,
  clampBelowBar = true,
  title = "Weight",
  style,
  appearance = "auto",
  scale = 1,
}: WeightPlateStackerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const compact = screenWidth < 420;

  const sizing = useMemo(
    () => ({
      plateWidth: compact ? 118 : 140,
      plateHeight: compact ? 20 : 22,
      stackHeight: compact ? 150 : 170,
      centerWidth: compact ? 84 : 96,
      gap: compact ? 8 : 10,
      zSkew: compact ? 2 : 3,
    }),
    [compact]
  );

  const plateSet = useMemo(() => {
    const base =
      plates ?? (unit === "lb" ? DEFAULT_LB_PLATES : DEFAULT_KG_PLATES);
    return [...base].sort((a, b) => b.value - a.value);
  }, [plates, unit]);

  const theme = useMemo(() => {
    const isDark = appearance === "auto" ? true : appearance === "dark";
    const card = isDark ? "rgba(22,26,34,0.86)" : "rgba(255,255,255,0.82)";
    const text = isDark ? "rgba(240,244,250,0.98)" : "rgba(20,24,32,0.96)";
    const sub = isDark ? "rgba(200,210,225,0.72)" : "rgba(80,92,112,0.72)";
    const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(20,24,32,0.10)";
    const glow = isDark ? "rgba(120,210,255,0.16)" : "rgba(80,160,255,0.16)";
    return { isDark, card, text, sub, border, glow };
  }, [appearance]);

  const safeValue = useMemo(() => {
    const v = clamp(value, min, max);
    return roundToStep(v, step);
  }, [value, min, max, step]);

  const breakdown = useMemo(
    () =>
      computeBreakdown({
        target: clampBelowBar ? Math.max(safeValue, barWeight) : safeValue,
        unit,
        barWeight,
        collarWeight: collarWeightPerSide,
        plates: plateSet,
        clampBelowBar,
      }),
    [safeValue, clampBelowBar, unit, barWeight, collarWeightPerSide, plateSet]
  );

  const dec = useCallback(() => {
    const next = clamp(roundToStep(safeValue - step, step), min, max);
    onChange(next);
  }, [safeValue, step, min, max, onChange]);

  const inc = useCallback(() => {
    const next = clamp(roundToStep(safeValue + step, step), min, max);
    onChange(next);
  }, [safeValue, step, min, max, onChange]);

  const breathe = useSharedValue(0);
  React.useEffect(() => {
    breathe.value = withTiming(1, {
      duration: 900,
      easing: Easing.inOut(Easing.quad),
    });
    const id = setInterval(() => {
      breathe.value = withTiming(breathe.value === 1 ? 0 : 1, {
        duration: 900,
        easing: Easing.inOut(Easing.quad),
      });
    }, 950);
    return () => clearInterval(id);
  }, [breathe]);

  const breatheStyle = useAnimatedStyle(() => {
    const o = interpolate(breathe.value, [0, 1], [0.0, 1.0]);
    return {
      shadowOpacity: theme.isDark ? 0.28 + 0.08 * o : 0.12 + 0.06 * o,
      transform: [{ translateY: theme.isDark ? -0.5 * o : -0.25 * o }],
    };
  }, [theme.isDark]);

  const headerRight = useMemo(() => {
    const target = breakdown.target;
    const perSide = breakdown.perSide;
    const collars =
      collarWeightPerSide > 0
        ? ` + ${fmt(collarWeightPerSide)}${unit} collar/side`
        : "";
    return `${fmt(target)}${unit} • ${fmt(perSide)}${unit}/side${collars}`;
  }, [breakdown.target, breakdown.perSide, collarWeightPerSide, unit]);

  return (
    <View style={[styles.wrap, { transform: [{ scale }] }, style]}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <SheenOverlay glow={theme.glow} border={theme.border} />
        </View>

        <View style={styles.headerRow}>
          <View style={{ gap: 2 }}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text
              style={[styles.subtitle, { color: theme.sub }]}
              numberOfLines={1}
            >
              {headerRight}
            </Text>
          </View>

          {/* <View style={styles.controls}>
            <StepperButton label="−" onPress={dec} theme={theme} />
            <View style={styles.valuePill}>
              <Text style={[styles.valueText, { color: theme.text }]}>
                {fmt(safeValue)}
                <Text style={[styles.valueUnit, { color: theme.sub }]}>
                  {" "}
                  {unit}
                </Text>
              </Text>
            </View>
            <StepperButton label="+" onPress={inc} theme={theme} />
          </View> */}
        </View>

        <AView style={[styles.stackShell, breatheStyle]}>
          <StackVisualizer
            breakdown={breakdown}
            theme={theme}
            barWeight={barWeight}
            collarWeightPerSide={collarWeightPerSide}
            plateWidth={sizing.plateWidth}
            plateHeight={sizing.plateHeight}
            stackHeight={sizing.stackHeight}
            centerWidth={sizing.centerWidth}
            gap={sizing.gap}
            zSkew={sizing.zSkew}
          />
        </AView>

        <View style={styles.footerRow}>
          <Chip text={`Bar: ${fmt(barWeight)}${unit}`} theme={theme} />
          {collarWeightPerSide > 0 && (
            <Chip
              text={`Collar: ${fmt(collarWeightPerSide)}${unit}/side`}
              theme={theme}
            />
          )}
          <Chip text={`Step: ${fmt(step)}${unit}`} theme={theme} />
          <Chip
            text={`${breakdown.platesPerSide.length} plates/side`}
            theme={theme}
            emphasis
          />
        </View>
      </View>
    </View>
  );
}

function StackVisualizer({
  breakdown,
  theme,
  barWeight,
  collarWeightPerSide,
  plateWidth,
  plateHeight,
  stackHeight,
  centerWidth,
  gap,
  zSkew,
}: {
  breakdown: Breakdown;
  theme: {
    isDark: boolean;
    text: string;
    sub: string;
    border: string;
    glow: string;
  };
  barWeight: number;
  collarWeightPerSide: number;
  plateWidth: number;
  plateHeight: number;
  stackHeight: number;
  centerWidth: number;
  gap: number;
  zSkew: number;
}) {
  const platesPerSide = breakdown.platesPerSide;
  const maxVisible = 10;
  const overflow = Math.max(0, platesPerSide.length - maxVisible);
  const visible =
    overflow > 0 ? platesPerSide.slice(0, maxVisible) : platesPerSide;
  const compressed = platesPerSide.length > maxVisible;

  return (
    <View style={styles.stackRow}>
      <View style={styles.side}>
        <PlateStack
          plates={visible}
          theme={theme}
          direction="left"
          compressed={compressed}
          overflowCount={overflow}
          plateWidth={plateWidth}
          plateHeight={plateHeight}
          stackHeight={stackHeight}
          gap={gap}
          zSkew={zSkew}
        />
      </View>

      <View style={[styles.center, { width: centerWidth }]}>
        <BarCore
          theme={theme}
          barLabel={`${fmt(barWeight)}${breakdown.unit}`}
          styleOverride={{ width: centerWidth }}
        />
        {collarWeightPerSide > 0 ? (
          <Collar
            theme={theme}
            label={`${fmt(collarWeightPerSide)}${breakdown.unit}`}
          />
        ) : (
          <Spacer h={10} />
        )}
        <Text style={[styles.centerCaption, { color: theme.sub }]}>plates</Text>
      </View>

      <View style={styles.side}>
        <PlateStack
          plates={visible}
          theme={theme}
          direction="right"
          compressed={compressed}
          overflowCount={overflow}
          plateWidth={plateWidth}
          plateHeight={plateHeight}
          stackHeight={stackHeight}
          gap={gap}
          zSkew={zSkew}
        />
      </View>
    </View>
  );
}

function PlateStack({
  plates,
  theme,
  direction,
  compressed,
  overflowCount,
  plateWidth,
  plateHeight,
  stackHeight,
  gap,
  zSkew,
}: {
  plates: PlateSpec[];
  theme: {
    isDark: boolean;
    text: string;
    sub: string;
    border: string;
    glow: string;
  };
  direction: "left" | "right";
  compressed: boolean;
  overflowCount: number;
  plateWidth: number;
  plateHeight: number;
  stackHeight: number;
  gap: number;
  zSkew: number;
}) {
  const dir = direction === "right" ? 1 : -1;
  const baseW = plateWidth;
  const baseH = plateHeight;
  const gapSize = compressed ? Math.max(5, gap - 2) : gap;
  const skew = compressed ? Math.max(1, zSkew - 1) : zSkew;

  return (
    <View style={styles.stackCol}>
      {overflowCount > 0 && (
        <View style={[styles.overflowPill, { borderColor: theme.border }]}>
          <Text
            style={[styles.overflowText, { color: theme.sub }]}
          >{`+${overflowCount} more`}</Text>
        </View>
      )}

      <View
        style={{
          height: stackHeight,
          justifyContent: "flex-end",
          position: "relative",
          width: "100%",
        }}
      >
        {plates.map((p, idx) => {
          const w = baseW * (0.55 + 0.45 * p.size);
          const h = baseH * (0.65 + 0.35 * p.size);

          const baseX = 14; // resting position knob (try 0..24)
          const x = dir * (baseX + idx * skew); // outward stacking
          const y = -idx * gapSize;

          return (
            <AView
              key={`${p.value}-${idx}-${direction}`}
              entering={FadeInDown.springify().damping(18).stiffness(180)}
              exiting={FadeOutDown.duration(140)}
              layout={Layout.springify().damping(18).stiffness(170)}
              style={[
                styles.plateWrap,
                {
                  // anchor to center WITHOUT percentages
                  left: "50%",
                  marginLeft: -w / 2,
                  transform: [{ translateX: x }, { translateY: y }],
                },
              ]}
            >
              <PlateGloss
                width={w}
                height={h}
                tone={p.tone}
                theme={theme}
                label={p.label ?? fmt(p.value)}
                direction={direction}
              />
            </AView>
          );
        })}
      </View>
    </View>
  );
}

function PlateGloss({
  width,
  height,
  tone,
  theme,
  label,
  direction,
}: {
  width: number;
  height: number;
  tone: PlateSpec["tone"];
  theme: {
    isDark: boolean;
    text: string;
    sub: string;
    border: string;
    glow: string;
  };
  label: string;
  direction: "left" | "right";
}) {
  const [top, bottom] = toneStops(tone);
  const r = Math.min(14, height / 2);

  const notchW = Math.max(18, width * 0.14);
  const notchH = Math.max(8, height * 0.42);
  const notchX = direction === "right" ? width - notchW - 8 : 8;

  const rimStrong = theme.isDark
    ? "rgba(255,255,255,0.22)"
    : "rgba(0,0,0,0.10)";
  const rimInner = theme.isDark ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.40)";

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: r,
          // subtle shadow so plates separate from background AND from each other
          shadowColor: "#000",
          shadowOpacity: theme.isDark ? 0.28 : 0.14,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        },
      ]}
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient
            id={`g-${tone}-${width}-${height}`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>

          <LinearGradient
            id={`sheen-${tone}-${width}-${height}`}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <Stop
              offset="0"
              stopColor={withAlpha("#ffffff", theme.isDark ? 0.14 : 0.18)}
            />
            <Stop
              offset="0.55"
              stopColor={withAlpha("#ffffff", theme.isDark ? 0.04 : 0.08)}
            />
            <Stop offset="1" stopColor={withAlpha("#ffffff", 0)} />
          </LinearGradient>
        </Defs>

        {/* main body */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={r}
          fill={`url(#g-${tone}-${width}-${height})`}
        />

        {/* hard outer rim */}
        <Rect
          x={0.8}
          y={0.8}
          width={width - 1.6}
          height={height - 1.6}
          rx={r - 0.8}
          fill="none"
          stroke={rimStrong}
          strokeWidth={1.2}
        />

        {/* inner rim (adds depth + separation) */}
        <Rect
          x={2.2}
          y={2.2}
          width={width - 4.4}
          height={height - 4.4}
          rx={Math.max(6, r - 2.2)}
          fill="none"
          stroke={rimInner}
          strokeWidth={1}
          opacity={0.55}
        />

        {/* sheen */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={r}
          fill={`url(#sheen-${tone}-${width}-${height})`}
          opacity={theme.isDark ? 0.9 : 0.75}
        />

        {/* notch */}
        <Rect
          x={notchX}
          y={(height - notchH) / 2}
          width={notchW}
          height={notchH}
          rx={Math.min(10, notchH / 2)}
          fill={withAlpha("#0b0f18", theme.isDark ? 0.42 : 0.18)}
          stroke={withAlpha("#ffffff", theme.isDark ? 0.14 : 0.16)}
          strokeWidth={1}
        />

        {/* small separator edge line (helps plates not blend) */}
        <Rect
          x={1.5}
          y={height - 2.5}
          width={width - 3}
          height={1.2}
          rx={1}
          fill={withAlpha("#000", theme.isDark ? 0.3 : 0.12)}
        />
      </Svg>

      {/* readable label with its own pill */}
      <View style={styles.plateLabelPill} pointerEvents="none">
        <Text style={styles.plateLabelText}>{label}</Text>
      </View>
    </View>
  );
}

function BarCore({
  theme,
  barLabel,
  styleOverride,
}: {
  theme: any;
  barLabel: string;
  styleOverride?: ViewStyle;
}) {
  return (
    <View
      style={[styles.barCore, { borderColor: theme.border }, styleOverride]}
    >
      <View
        style={[
          styles.barMetal,
          { borderColor: withAlpha("#ffffff", theme.isDark ? 0.12 : 0.18) },
        ]}
      >
        <View style={styles.barSheen} />
      </View>
      <Text style={[styles.barText, { color: theme.sub }]}>{barLabel}</Text>
    </View>
  );
}

function Collar({ theme, label }: { theme: any; label: string }) {
  return (
    <View style={[styles.collar, { borderColor: theme.border }]}>
      <View
        style={[
          styles.collarTop,
          { borderColor: withAlpha("#ffffff", theme.isDark ? 0.12 : 0.18) },
        ]}
      />
      <Text style={[styles.collarText, { color: theme.sub }]}>{label}</Text>
    </View>
  );
}

function SheenOverlay({ glow, border }: { glow: string; border: string }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={{
          position: "absolute",
          left: -60,
          top: -70,
          width: 180,
          height: 180,
          borderRadius: 999,
          backgroundColor: glow,
          transform: [{ rotate: "-12deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: border,
          opacity: 0.6,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          top: 10,
          height: 54,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.06)",
          transform: [{ rotate: "-8deg" }],
          opacity: 0.8,
        }}
      />
    </View>
  );
}

function StepperButton({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: withAlpha("#ffffff", 0.08) }}
      style={({ pressed }) => [
        styles.stepBtn,
        {
          backgroundColor: theme.isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(20,24,32,0.06)",
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Text style={[styles.stepBtnText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function Chip({
  text,
  theme,
  emphasis,
}: {
  text: string;
  theme: any;
  emphasis?: boolean;
}) {
  return (
    <View
      style={[
        styles.chip,
        {
          borderColor: theme.border,
          backgroundColor: emphasis
            ? theme.isDark
              ? "rgba(120,210,255,0.10)"
              : "rgba(80,160,255,0.10)"
            : theme.isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(20,24,32,0.05)",
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: emphasis ? theme.text : theme.sub }]}
      >
        {text}
      </Text>
    </View>
  );
}

function Spacer({ h }: { h: number }) {
  return <View style={{ height: h }} />;
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: Platform.OS === "ios" ? -1 : 0,
  },
  valuePill: {
    minWidth: 92,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  valueText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  valueUnit: {
    fontSize: 12,
    fontWeight: "700",
  },
  stackShell: {
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  stackRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  side: {
    flex: 1,
    alignItems: "center",
  },
  center: {
    width: 96,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  centerCaption: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  stackCol: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  overflowPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  overflowText: {
    fontSize: 12,
    fontWeight: "800",
  },
  plateWrap: {
    position: "absolute",
    bottom: 0,
  },
  plateLabelPill: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    transform: [{ translateY: -12 }],
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 999,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)", // strong contrast
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  plateLabelText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  barCore: {
    width: 88,
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  barMetal: {
    width: 68,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(220,230,245,0.16)",
    overflow: "hidden",
  },
  barSheen: {
    position: "absolute",
    left: -12,
    top: -18,
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    transform: [{ rotate: "18deg" }],
  },
  barText: {
    fontSize: 12,
    fontWeight: "800",
  },
  collar: {
    width: 76,
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    paddingBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  collarTop: {
    width: 48,
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  collarText: {
    fontSize: 12,
    fontWeight: "800",
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
