import React from "react";

export default function GoalBar({ label, goal = 0, actual = 0, unit = "" }) {
  const g = Math.max(0, Number(goal || 0));
  const a = Math.max(0, Number(actual || 0));
  const pct = g > 0 ? Math.min(100, Math.round((a / g) * 100)) : 0;
  const over = a > g;

  return (
    <div className="border border-white/10 rounded-xl p-4 bg-white dark:bg-black/20">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
        <p className={`text-sm ${over ? "text-red-500" : "text-emerald-500"}`}>
          {Math.round(a)} / {Math.round(g)} {unit}
        </p>
      </div>
      <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
