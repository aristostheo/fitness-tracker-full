// src/components/nutrition/ReviewAIModal.jsx
import { useEffect, useState } from "react";
import { searchUsdaFoods } from "../../services/fooddb";

export default function ReviewAIModal({ open, data, onApply, onClose }) {
  const [local, setLocal] = useState(() => data || null);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [usdaErr, setUsdaErr] = useState("");
  const [usda, setUsda] = useState([]);

  useEffect(() => {
    setLocal(data || null);
    setUsda([]);
    setUsdaErr("");
  }, [data]);

  if (!open || !local) return null;

  async function handleCompare() {
    setUsdaErr("");
    setUsda([]);
    setUsdaLoading(true);
    try {
      const q =
        (local.suggestedName && local.suggestedName.split("(")[0]) ||
        local.suggestedName ||
        "";
      const results = await searchUsdaFoods(q || "sandwich", { limit: 6 });
      setUsda(results);
    } catch (e) {
      console.error(e);
      setUsdaErr("Couldn’t fetch USDA matches");
    } finally {
      setUsdaLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="card w-full max-w-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="h2">Review AI suggestion</h3>
          <button className="button-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1 subtle">Name</label>
            <input
              className="input"
              value={local.suggestedName}
              onChange={(e) =>
                setLocal((v) => ({ ...v, suggestedName: e.target.value }))
              }
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm mb-1 subtle">Qty</label>
              <input
                className="input"
                value={local.qty}
                inputMode="numeric"
                onChange={(e) =>
                  setLocal((v) => ({ ...v, qty: e.target.value }))
                }
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1 subtle">Unit</label>
              <input
                className="input"
                value={local.unit}
                onChange={(e) =>
                  setLocal((v) => ({ ...v, unit: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            ["Calories", "calories"],
            ["Protein", "protein"],
            ["Carbs", "carbs"],
            ["Fat", "fat"],
            ["Sugar", "sugar"],
            ["Fiber", "fiber"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-sm mb-1 subtle">{label}</label>
              <input
                className="input"
                value={local.totals[key]}
                inputMode="numeric"
                onChange={(e) =>
                  setLocal((v) => ({
                    ...v,
                    totals: { ...v.totals, [key]: Number(e.target.value || 0) },
                  }))
                }
              />
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Compare with USDA
            </h4>
            <button
              type="button"
              onClick={handleCompare}
              className="button-ghost"
              disabled={usdaLoading}
            >
              {usdaLoading ? "Searching…" : "Compare (USDA)"}
            </button>
          </div>

          {usdaErr && <p className="text-sm text-red-500 mt-2">{usdaErr}</p>}

          {usda.length > 0 && (
            <ul className="mt-3 space-y-2 max-h-56 overflow-auto">
              {usda.map((r) => (
                <li
                  key={r.id}
                  className="border border-white/10 rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {r.name}
                    </div>
                    <div className="subtle">
                      {Math.round(r.calories || 0)} kcal • P
                      {Math.round(r.protein || 0)} | C{Math.round(r.carbs || 0)}{" "}
                      | F{Math.round(r.fat || 0)}
                      {r.unit ? ` • ${r.qty || 100}${r.unit}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button-ghost"
                    onClick={() =>
                      setLocal((v) => ({
                        ...v,
                        suggestedName: r.name,
                        qty: r.qty || v.qty,
                        unit: r.unit || v.unit,
                        totals: {
                          calories: Math.round(r.calories || 0),
                          protein: Math.round(r.protein || 0),
                          carbs: Math.round(r.carbs || 0),
                          fat: Math.round(r.fat || 0),
                          sugar: Math.round(r.sugar || 0),
                          fiber: Math.round(r.fiber || 0),
                        },
                      }))
                    }
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button className="button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button" onClick={() => onApply(local)}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
