import React from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useTheme } from "../context/ThemeContext";

export default function NetCaloriesChart({ data, title = "Net Calories (7d)" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const bg = isDark ? "#0f1522" : "#ffffff";
  const axis = isDark ? "#CBD5E1" : "#334155";
  const grid = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const fill = "rgba(59,109,255,0.18)";
  const stroke = "#3b6dff";
  const tooltipBg = isDark ? "#111827" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tooltipText = isDark ? "#F9FAFB" : "#111827";

  return (
    <div className="card p-6" style={{ backgroundColor: bg }}>
      <h3 className="h2 mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={grid} strokeDasharray="4 4" />
            <XAxis dataKey="date" tick={{ fill: axis, fontSize: 12 }} stroke={axis} tickMargin={8} />
            <YAxis tick={{ fill: axis, fontSize: 12 }} stroke={axis} width={48} />
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
            <Area type="monotone" dataKey="net" stroke={stroke} fill={fill} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
