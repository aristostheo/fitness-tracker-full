import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useTheme } from "../context/ThemeContext"; // <-- from earlier

export default function VolumeChart({ data }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Colors for both themes
  const bg = isDark ? "#0f1522" : "#ffffff";                // chart background
  const axis = isDark ? "#CBD5E1" : "#334155";              // tick/axis color
  const grid = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const line = "#3b6dff";                                   // brand accent
  const tooltipBg = isDark ? "#111827" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tooltipText = isDark ? "#F9FAFB" : "#111827";

  return (
    <div
      className="card p-6"
      style={{ backgroundColor: bg }}
    >
      <h2 className="h2 mb-4 text-gray-900 dark:text-white">Training Volume</h2>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={grid} strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              tick={{ fill: axis, fontSize: 12 }}
              stroke={axis}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: axis, fontSize: 12 }}
              stroke={axis}
              width={48}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                color: tooltipText,
                borderWidth: 1,
                borderStyle: "solid",
                borderRadius: 12,
              }}
              labelStyle={{ color: tooltipText }}
              cursor={{ stroke: grid }}
            />
            <Line
              type="monotone"
              dataKey="volume"
              stroke={line}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, stroke: line }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
