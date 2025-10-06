import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTheme } from "../context/ThemeContext";

export default function WeeklyCaloriesChart({
  data,
  title = "Weekly Calories",
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bg = isDark ? "#0f1522" : "#ffffff";
  const axis = isDark ? "#CBD5E1" : "#334155";
  const grid = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const fillConsumed = "rgba(59,109,255,0.18)";
  const strokeNet = "#3b6dff";
  const barBurned = isDark ? "#ef4444" : "#dc2626";
  const tooltipBg = isDark ? "#111827" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tooltipText = isDark ? "#F9FAFB" : "#111827";

  return (
    <div className="card p-6" style={{ backgroundColor: bg }}>
      <h3 className="h2 mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
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
            <Area
              type="monotone"
              dataKey="consumed"
              name="Consumed"
              stroke="#3b6dff"
              fill={fillConsumed}
              strokeWidth={2}
            />
            <Bar dataKey="burned" name="Burned" barSize={24} fill={barBurned} />
            <Area
              type="monotone"
              dataKey="net"
              name="Net"
              stroke={strokeNet}
              fill="transparent"
              strokeWidth={2.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
