// components/insights/TrendMiniChart.tsx
import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, {
  Polyline,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  Circle,
} from "react-native-svg";
import { useTheme } from "@/content/ThemeProvider";

type Pt = { x: number; y: number };

function normalize(points: Pt[], w: number, h: number) {
  if (!points.length) return [] as Pt[];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  return points.map((p) => ({
    x: ((p.x - minX) / spanX) * w,
    y: h - ((p.y - minY) / spanY) * h,
  }));
}

export default function TrendMiniChart({
  seriesA,
  seriesB,
  colorA = "#3B82F6",
  colorB = "#10B981",
  height = 56,
  strokeWidth = 2,
}: {
  seriesA: Pt[];
  seriesB?: Pt[];
  colorA?: string;
  colorB?: string;
  height?: number;
  strokeWidth?: number;
}) {
  const { colors } = useTheme();
  const width = 280;

  const a = useMemo(
    () => normalize(seriesA, width, height),
    [seriesA, width, height]
  );
  const b = useMemo(
    () => normalize(seriesB || [], width, height),
    [seriesB, width, height]
  );

  const aPts = a.map((p) => `${p.x},${p.y}`).join(" ");
  const bPts = b.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <View
      style={{
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgGrad id="gradA" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colorA} stopOpacity="1" />
            <Stop offset="1" stopColor={colorA} stopOpacity="0.8" />
          </SvgGrad>
          <SvgGrad id="gradB" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colorB} stopOpacity="1" />
            <Stop offset="1" stopColor={colorB} stopOpacity="0.8" />
          </SvgGrad>
        </Defs>

        {/* A */}
        {a.length >= 2 && (
          <>
            <Polyline
              points={aPts}
              fill="none"
              stroke="url(#gradA)"
              strokeWidth={strokeWidth}
            />
            {/* end cap */}
            <Circle
              cx={a[a.length - 1].x}
              cy={a[a.length - 1].y}
              r={3}
              fill={colorA}
            />
          </>
        )}

        {/* B (optional) */}
        {b.length >= 2 && (
          <>
            <Polyline
              points={bPts}
              fill="none"
              stroke="url(#gradB)"
              strokeWidth={strokeWidth}
            />
            <Circle
              cx={b[b.length - 1].x}
              cy={b[b.length - 1].y}
              r={3}
              fill={colorB}
            />
          </>
        )}
      </Svg>
    </View>
  );
}
