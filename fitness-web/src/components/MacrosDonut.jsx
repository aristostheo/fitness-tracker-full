import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useTheme } from "../context/ThemeContext";

const COLORS = ["#22c55e", "#eab308", "#ef4444"]; // Protein, Carbs, Fat

export default function MacrosDonut({ protein = 0, carbs = 0, fat = 0, title = "Macros" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bg = isDark ? "#0f1522" : "#ffffff";
  const tooltipBg = isDark ? "#111827" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tooltipText = isDark ? "#F9FAFB" : "#111827";

  const data = [
    { name: "Protein (g)", value: protein },
    { name: "Carbs (g)", value: carbs },
    { name: "Fat (g)", value: fat },
  ];

  const total = (protein || 0) + (carbs || 0) + (fat || 0);

  return (
    <div className="card p-6" style={{ backgroundColor: bg }}>
      <h3 className="h2 mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div style={{ width: "100%", height: 220 }} className="grid grid-cols-5 items-center">
        <div className="col-span-3">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
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
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-2 space-y-2 text-sm">
          <LegendRow label="Protein" value={protein} color={COLORS[0]} />
          <LegendRow label="Carbs" value={carbs} color={COLORS[1]} />
          <LegendRow label="Fat" value={fat} color={COLORS[2]} />
          <div className="pt-2 text-gray-700 dark:text-gray-300">
            <span className="text-xs uppercase">Total</span>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{Math.round(total)} g</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-gray-800 dark:text-gray-200">{label}</span>
      </div>
      <span className="font-medium text-gray-900 dark:text-white">{Math.round(value || 0)} g</span>
    </div>
  );
}
