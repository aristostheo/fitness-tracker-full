// src/components/nutrition/SummaryCard.jsx
export default function SummaryCard({ label, value }) {
  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl p-4 bg-white dark:bg-black/20">
      <p className="text-xs uppercase text-gray-700 dark:text-gray-400">
        {label}
      </p>
      <p className="text-xl font-semibold text-black dark:text-white">
        {Math.round(Number(value || 0))}
      </p>
    </div>
  );
}
