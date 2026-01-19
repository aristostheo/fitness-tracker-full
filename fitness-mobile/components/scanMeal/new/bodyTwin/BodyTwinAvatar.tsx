// components/profile/bodyTwin/BodyTwinAvatar.tsx
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type {
  BodyTwinBaseAvatar,
  ShapeParams,
} from "@/services/profile/bodyTwin/types";
import { withAlpha } from "@/lib/color"; // if you have it; otherwise replace with simple rgba helper.
import { useTheme } from "@/content/ThemeProvider";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function clamp(v: number, a: number, b: number) {
  "worklet";
  return Math.max(a, Math.min(b, v));
}

function lerp(a: number, b: number, t: number) {
  "worklet";
  return a + (b - a) * t;
}

function toneColor(tone: BodyTwinBaseAvatar["skinTone"]) {
  switch (tone) {
    case "porcelain":
      return "#F6E9DE";
    case "light":
      return "#F0D9C7";
    case "medium":
      return "#D7B28C";
    case "tan":
      return "#B98961";
    case "deep":
      return "#7A4C33";
    default:
      return "#D7B28C";
  }
}

/**
 * Body Twin avatar: premium silhouette with soft gradients.
 * We morph by changing a path built from shape params.
 * This is intentionally "stylized", not anatomically literal.
 */
export function BodyTwinAvatar(props: {
  base: BodyTwinBaseAvatar;
  shape: ShapeParams;
  futureShape?: ShapeParams; // optional overlay
  size?: number;
  breathing?: boolean;
  showAura?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const size = props.size ?? 168;

  // Reanimated values (simple: we time the path inputs)
  const s = useSharedValue(props.shape);

  React.useEffect(() => {
    s.value = withTiming(props.shape, { duration: 520 });
  }, [props.shape]);

  const future = useSharedValue(props.futureShape ?? null);

  React.useEffect(() => {
    future.value = props.futureShape
      ? withTiming(props.futureShape as any, { duration: 520 })
      : (null as any);
  }, [props.futureShape]);

  const skin = toneColor(props.base.skinTone);
  const outfit = props.base.outfitColorHex;

  const bg = isDark ? withAlpha("#FFFFFF", 0.06) : withAlpha("#000000", 0.04);

  const defsId = useMemo(() => `bt_${Math.random().toString(16).slice(2)}`, []);

  const animatedBodyProps = useAnimatedProps(() => {
    const sh = s.value;

    // Canvas coordinates
    const cx = size / 2;
    const top = size * 0.16;

    // scale affects overall width
    const w = lerp(size * 0.28, size * 0.42, sh.scale);

    // proportions
    const shoulderW = w * lerp(0.92, 1.18, sh.shoulder);
    const chestW = w * lerp(0.88, 1.12, sh.chest);
    const waistW = w * lerp(0.62, 1.05, sh.waist);
    const hipsW = w * lerp(0.76, 1.16, sh.hips);

    const torsoH = size * lerp(0.5, 0.56, sh.scale);
    const hipY = top + torsoH;

    const stance = lerp(0.0, 1.0, sh.stance);
    const softness = lerp(0.0, 1.0, sh.softness);

    // gentle posture curve
    const sway = lerp(-size * 0.01, size * 0.01, stance);

    // Arms
    const armW = w * lerp(0.22, 0.38, sh.arm);
    const armDrop = size * lerp(0.22, 0.26, softness);

    // Legs
    const legW = w * lerp(0.28, 0.4, sh.thigh);
    const legH = size * lerp(0.34, 0.3, sh.scale);

    // Build a smooth silhouette path
    const y0 = top;
    const y1 = top + size * 0.1;
    const y2 = top + size * 0.22;
    const y3 = top + size * 0.36;
    const y4 = hipY;
    const y5 = hipY + legH;

    const xL_sh = cx - shoulderW;
    const xR_sh = cx + shoulderW;

    const xL_ch = cx - chestW;
    const xR_ch = cx + chestW;

    const xL_wa = cx - waistW;
    const xR_wa = cx + waistW;

    const xL_hi = cx - hipsW;
    const xR_hi = cx + hipsW;

    const xL_leg = cx - legW;
    const xR_leg = cx + legW;

    const armX = lerp(shoulderW * 0.96, shoulderW * 1.08, stance);

    const d = [
      `M ${cx} ${y0}`, // start at neck center
      // Right shoulder to chest
      `C ${cx + shoulderW * 0.55} ${
        y0 + size * 0.02
      } ${xR_sh} ${y1} ${xR_ch} ${y2}`,
      // Right side to waist
      `C ${xR_ch + sway} ${y2 + size * 0.06} ${
        xR_wa + sway
      } ${y3} ${xR_hi} ${y4}`,
      // Right hip to right leg
      `C ${xR_hi} ${y4 + size * 0.04} ${xR_leg} ${
        y4 + size * 0.08
      } ${xR_leg} ${y5}`,
      // Bottom to left leg
      `C ${cx + legW * 0.22} ${y5 + size * 0.02} ${cx - legW * 0.22} ${
        y5 + size * 0.02
      } ${xL_leg} ${y5}`,
      // Left leg to hip
      `C ${xL_leg} ${y4 + size * 0.08} ${xL_hi} ${
        y4 + size * 0.04
      } ${xL_hi} ${y4}`,
      // Left hip to waist/chest
      `C ${xL_wa - sway} ${y3} ${xL_ch - sway} ${
        y2 + size * 0.06
      } ${xL_ch} ${y2}`,
      // Left chest to shoulder back to neck
      `C ${xL_sh} ${y1} ${cx - shoulderW * 0.55} ${
        y0 + size * 0.02
      } ${cx} ${y0}`,
      "Z",
    ].join(" ");

    return { d };
  });

  const animatedOutfitProps = useAnimatedProps(() => {
    const sh = s.value;
    const cx = size / 2;
    const top = size * 0.2;

    const w = lerp(size * 0.26, size * 0.4, sh.scale);
    const chestW = w * lerp(0.86, 1.1, sh.chest);
    const waistW = w * lerp(0.6, 1.02, sh.waist);
    const hipsW = w * lerp(0.72, 1.12, sh.hips);

    const y2 = top + size * 0.18;
    const y3 = top + size * 0.32;
    const y4 = top + size * 0.44;

    const d = [
      `M ${cx - chestW} ${y2}`,
      `C ${cx - chestW * 0.86} ${y3} ${cx - waistW} ${y3} ${cx - hipsW} ${y4}`,
      `L ${cx + hipsW} ${y4}`,
      `C ${cx + waistW} ${y3} ${cx + chestW * 0.86} ${y3} ${cx + chestW} ${y2}`,
      `C ${cx + chestW * 0.4} ${y2 - size * 0.06} ${cx - chestW * 0.4} ${
        y2 - size * 0.06
      } ${cx - chestW} ${y2}`,
      "Z",
    ].join(" ");

    return { d };
  });

  const animatedHeadProps = useAnimatedProps(() => {
    const sh = s.value;
    const cx = size / 2;
    const cy = size * 0.12;
    const r = clamp(
      lerp(size * 0.06, size * 0.07, sh.scale),
      size * 0.055,
      size * 0.078
    );
    return { cx, cy, r };
  });

  // Future overlay (ghost)
  const futureBodyProps = useAnimatedProps(() => {
    const f = future.value as any as ShapeParams | null;
    if (!f) return { d: "" };

    const cx = size / 2;
    const top = size * 0.16;

    const w = lerp(size * 0.28, size * 0.42, f.scale);
    const shoulderW = w * lerp(0.92, 1.18, f.shoulder);
    const chestW = w * lerp(0.88, 1.12, f.chest);
    const waistW = w * lerp(0.62, 1.05, f.waist);
    const hipsW = w * lerp(0.76, 1.16, f.hips);

    const torsoH = size * lerp(0.5, 0.56, f.scale);
    const hipY = top + torsoH;

    const stance = lerp(0.0, 1.0, f.stance);
    const sway = lerp(-size * 0.01, size * 0.01, stance);

    const armW = w * lerp(0.22, 0.38, f.arm);
    void armW;

    const softness = lerp(0.0, 1.0, f.softness);
    const legW = w * lerp(0.28, 0.4, f.thigh);
    const legH = size * lerp(0.34, 0.3, f.scale);

    const y0 = top;
    const y1 = top + size * 0.1;
    const y2 = top + size * 0.22;
    const y3 = top + size * 0.36;
    const y4 = hipY;
    const y5 = hipY + legH;

    const xL_sh = cx - shoulderW;
    const xR_sh = cx + shoulderW;

    const xL_ch = cx - chestW;
    const xR_ch = cx + chestW;

    const xL_wa = cx - waistW;
    const xR_wa = cx + waistW;

    const xL_hi = cx - hipsW;
    const xR_hi = cx + hipsW;

    const xL_leg = cx - legW;
    const xR_leg = cx + legW;

    const d = [
      `M ${cx} ${y0}`,
      `C ${cx + shoulderW * 0.55} ${
        y0 + size * 0.02
      } ${xR_sh} ${y1} ${xR_ch} ${y2}`,
      `C ${xR_ch + sway} ${y2 + size * 0.06} ${
        xR_wa + sway
      } ${y3} ${xR_hi} ${y4}`,
      `C ${xR_hi} ${y4 + size * 0.04} ${xR_leg} ${
        y4 + size * 0.08
      } ${xR_leg} ${y5}`,
      `C ${cx + legW * 0.22} ${y5 + size * 0.02} ${cx - legW * 0.22} ${
        y5 + size * 0.02
      } ${xL_leg} ${y5}`,
      `C ${xL_leg} ${y4 + size * 0.08} ${xL_hi} ${
        y4 + size * 0.04
      } ${xL_hi} ${y4}`,
      `C ${xL_wa - sway} ${y3} ${xL_ch - sway} ${
        y2 + size * 0.06
      } ${xL_ch} ${y2}`,
      `C ${xL_sh} ${y1} ${cx - shoulderW * 0.55} ${
        y0 + size * 0.02
      } ${cx} ${y0}`,
      "Z",
    ].join(" ");

    return { d };
  });

  return (
    <View
      style={[styles.wrap, { width: size, height: size, backgroundColor: bg }]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={`${defsId}_body`} x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={withAlpha(skin, isDark ? 0.95 : 0.92)}
            />
            <Stop
              offset="1"
              stopColor={withAlpha(skin, isDark ? 0.76 : 0.82)}
            />
          </LinearGradient>

          <LinearGradient id={`${defsId}_outfit`} x1="0" y1="0" x2="1" y2="1">
            <Stop
              offset="0"
              stopColor={withAlpha(outfit, isDark ? 0.95 : 0.92)}
            />
            <Stop
              offset="1"
              stopColor={withAlpha(outfit, isDark ? 0.55 : 0.72)}
            />
          </LinearGradient>

          <LinearGradient id={`${defsId}_aura`} x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={withAlpha(colors.primary ?? "#4B8DFF", 0.4)}
            />
            <Stop
              offset="1"
              stopColor={withAlpha(colors.primary ?? "#4B8DFF", 0.08)}
            />
          </LinearGradient>
        </Defs>

        {/* Aura */}
        {props.showAura !== false && props.base.aura !== "none" ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.44}
            fill={`url(#${defsId}_aura)`}
            opacity={props.base.aura === "sparkle" ? 0.9 : 0.7}
          />
        ) : null}

        {/* Future overlay silhouette */}
        {props.futureShape ? (
          <AnimatedPath
            animatedProps={futureBodyProps}
            fill={withAlpha(colors.primary ?? "#4B8DFF", isDark ? 0.12 : 0.1)}
            stroke={withAlpha(
              colors.primary ?? "#4B8DFF",
              isDark ? 0.35 : 0.22
            )}
            strokeWidth={1.5}
          />
        ) : null}

        {/* Body silhouette */}
        <AnimatedPath
          animatedProps={animatedBodyProps}
          fill={`url(#${defsId}_body)`}
        />

        {/* Outfit overlay */}
        <AnimatedPath
          animatedProps={animatedOutfitProps}
          fill={`url(#${defsId}_outfit)`}
          opacity={props.base.outfit === "minimal" ? 0.55 : 0.82}
        />

        {/* Head */}
        <AnimatedCircle
          animatedProps={animatedHeadProps}
          fill={`url(#${defsId}_body)`}
        />

        {/* Simple hair cap */}
        <Path
          d={`M ${size / 2 - size * 0.06} ${size * 0.11} C ${
            size / 2 - size * 0.02
          } ${size * 0.06} ${size / 2 + size * 0.02} ${size * 0.06} ${
            size / 2 + size * 0.06
          } ${size * 0.11}`}
          stroke={withAlpha("#000000", isDark ? 0.35 : 0.22)}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={props.base.hair === "buzz" ? 0.35 : 0.55}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
