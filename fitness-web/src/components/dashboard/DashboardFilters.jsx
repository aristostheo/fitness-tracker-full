// src/components/dashboard/DashboardFilters.jsx
import React from "react";

export default function DashboardFilters({
  preset,
  setPreset,
  from,
  setFrom,
  to,
  setTo,
}) {
  return (
    <div className="card p-6">
      <h2 className="h2 mb-3">Filter by date</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { k: "week", label: "This Week" },
          { k: "7", label: "Last 7 days" },
          { k: "month", label: "This Month" },
          { k: "30", label: "Last 30 days" },
          { k: "all", label: "All Time" },
        ].map((p) => (
          <button
            key={p.k}
            type="button"
            onClick={() => setPreset(p.k)}
            className={`px-3 py-1.5 rounded-xl text-sm border border-white/10 ${
              preset === p.k ? "bg-brand-400 text-white" : "button-ghost"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="input"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPreset("custom");
          }}
        />
        <input
          className="input"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPreset("custom");
          }}
        />
        <button
          type="button"
          className="button-ghost"
          onClick={() => {
            setFrom("");
            setTo("");
            setPreset("all");
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
