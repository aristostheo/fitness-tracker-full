// src/components/dashboard/Charts.jsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import useChartTheme from "../../hooks/useChartTheme";

export function CaloriesVsGoalCard({ daysCount, data }) {
  const t = useChartTheme();
  return (
    <div className="card p-4 xl:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="h2">Calories vs Goal (last {daysCount} days)</h2>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={t.text} />
            <YAxis stroke={t.text} />
            <Tooltip contentStyle={{ background: t.bg, border: "none" }} />
            <Legend />
            <Line
              type="monotone"
              dataKey="calories"
              name="Calories"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="goal"
              name="Goal"
              stroke="#10b981"
              dot={false}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="exercise"
              name="Exercise (kcal)"
              stroke="#f59e0b"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MacroDonutCard({ data }) {
  const t = useChartTheme();
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="h2">Today’s Macros</h2>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={"55%"}
              outerRadius={"80%"}
              paddingAngle={1}
              dataKey="value"
            >
              {data.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={["#3b82f6", "#10b981", "#f59e0b"][idx % 3]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: t.bg, border: "none" }}
              labelStyle={{ color: t.text }}
              itemStyle={{ color: t.text }}
            />
            <Legend wrapperStyle={{ color: t.text }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ExerciseBarCard({ daysCount, data }) {
  const t = useChartTheme();
  return (
    <div className="card p-4 xl:col-span-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="h2">Exercise Calories (last {daysCount} days)</h2>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={t.text} />
            <YAxis stroke={t.text} />
            <Tooltip contentStyle={{ background: t.bg, border: "none" }} />
            <Bar dataKey="kcal" name="kcal" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
