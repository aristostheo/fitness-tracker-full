// src/components/nutrition/MealSection.jsx
import React from "react";

export default function MealSection({
  title,
  items,
  onEdit,
  onDelete,
  editingId,
  editData,
  setEditData,
  onSaveEdit,
  onCancel,
}) {
  const mealTotals = React.useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    items.forEach((i) => {
      t.calories += i.calories || 0;
      t.protein += i.protein || 0;
      t.carbs += i.carbs || 0;
      t.fat += i.fat || 0;
    });
    return t;
  }, [items]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold capitalize text-gray-800 dark:text-white">
          {title}
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {Math.round(mealTotals.calories)} kcal • P{" "}
          {Math.round(mealTotals.protein)} • C {Math.round(mealTotals.carbs)} •
          F {Math.round(mealTotals.fat)}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Nothing here yet — add your first item above.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const isTemp = it.id?.startsWith?.("temp-");
            return (
              <li
                key={it.id}
                className="border border-white/10 rounded-xl px-3 py-2"
              >
                {editingId === it.id ? (
                  <form
                    onSubmit={onSaveEdit}
                    className="grid grid-cols-1 md:grid-cols-6 gap-2"
                  >
                    <input
                      className="input md:col-span-2"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData((v) => ({ ...v, name: e.target.value }))
                      }
                    />
                    <input
                      className="input"
                      value={editData.qty}
                      inputMode="numeric"
                      onChange={(e) =>
                        setEditData((v) => ({ ...v, qty: e.target.value }))
                      }
                    />
                    <input
                      className="input"
                      value={editData.unit}
                      onChange={(e) =>
                        setEditData((v) => ({ ...v, unit: e.target.value }))
                      }
                    />
                    <input
                      className="input"
                      placeholder="kcal (base)"
                      value={editData.calories}
                      inputMode="numeric"
                      onChange={(e) =>
                        setEditData((v) => ({ ...v, calories: e.target.value }))
                      }
                    />
                    <div className="md:col-span-6 grid grid-cols-3 gap-2">
                      <input
                        className="input"
                        placeholder="P (base)"
                        value={editData.protein}
                        inputMode="numeric"
                        onChange={(e) =>
                          setEditData((v) => ({
                            ...v,
                            protein: e.target.value,
                          }))
                        }
                      />
                      <input
                        className="input"
                        placeholder="C (base)"
                        value={editData.carbs}
                        inputMode="numeric"
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, carbs: e.target.value }))
                        }
                      />
                      <input
                        className="input"
                        placeholder="F (base)"
                        value={editData.fat}
                        inputMode="numeric"
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, fat: e.target.value }))
                        }
                      />
                    </div>
                    <div className="md:col-span-6 grid grid-cols-2 gap-2">
                      <input
                        className="input"
                        placeholder="Sugar (base)"
                        value={editData.sugar}
                        inputMode="numeric"
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, sugar: e.target.value }))
                        }
                      />
                      <input
                        className="input"
                        placeholder="Fiber (base)"
                        value={editData.fiber}
                        inputMode="numeric"
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, fiber: e.target.value }))
                        }
                      />
                    </div>
                    <div className="md:col-span-6 text-xs text-gray-600 dark:text-gray-400">
                      {["g", "ml"].includes((editData.unit || "").toLowerCase())
                        ? "Enter base nutrients per 100 g/ml. They’ll be scaled by qty/100 when saved."
                        : "Enter base nutrients per 1 serving. They’ll be scaled by qty when saved."}
                    </div>
                    <div className="flex gap-2 md:col-span-6">
                      <button className="button">Save</button>
                      <button
                        type="button"
                        onClick={onCancel}
                        className="button-ghost"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white">
                        {it.name} — {it.qty || 1} {it.unit || "serving"} •{" "}
                        {Math.round(it.calories || 0)} kcal
                        {isTemp && (
                          <span className="ml-2 text-xs text-gray-400">
                            (saving…)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        P {Math.round(it.protein || 0)} • C{" "}
                        {Math.round(it.carbs || 0)} • F{" "}
                        {Math.round(it.fat || 0)}
                        {it.sugar ? ` • Sugar ${Math.round(it.sugar)}g` : ""}
                        {it.fiber ? ` • Fiber ${Math.round(it.fiber)}g` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => !isTemp && onEdit(it)}
                        disabled={isTemp}
                        className="button-ghost"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(it.id)}
                        className="button-ghost delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
