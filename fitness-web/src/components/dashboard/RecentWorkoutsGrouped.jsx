// src/components/dashboard/RecentWorkoutsGrouped.jsx
import React from "react";
import { kgToLb } from "../../utils/units";

export default function RecentWorkoutsGrouped({
  groupedRecent,
  unit,
  editId,
  editData,
  startEdit,
  setEditId,
  setEditData,
  saveEdit,
  onDelete,
  user,
}) {
  return (
    <div className="card p-6">
      <h2 className="h2 mb-4">Recent Workouts</h2>

      {groupedRecent.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          No workouts yet — add your first workout above.
        </p>
      ) : (
        <ul className="space-y-4">
          {groupedRecent.map(({ date, items }) => (
            <li key={date} className="border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {date}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {items.length} exercise{items.length !== 1 ? "s" : ""}
                </p>
              </div>

              <ul className="space-y-2">
                {items.map((w) => (
                  <li
                    key={w.id}
                    className="border border-white/10 rounded-xl p-3"
                  >
                    {editId === w.id ? (
                      <form
                        onSubmit={saveEdit}
                        className="grid grid-cols-1 md:grid-cols-6 gap-3"
                      >
                        <input
                          className="input"
                          type="date"
                          value={editData.date}
                          onChange={(e) =>
                            setEditData((v) => ({ ...v, date: e.target.value }))
                          }
                        />
                        <input
                          className="input md:col-span-2"
                          value={editData.exercise}
                          onChange={(e) =>
                            setEditData((v) => ({
                              ...v,
                              exercise: e.target.value,
                            }))
                          }
                        />
                        <input
                          className="input"
                          value={editData.sets}
                          onChange={(e) =>
                            setEditData((v) => ({ ...v, sets: e.target.value }))
                          }
                          inputMode="numeric"
                        />
                        <input
                          className="input"
                          value={editData.reps}
                          onChange={(e) =>
                            setEditData((v) => ({ ...v, reps: e.target.value }))
                          }
                          inputMode="numeric"
                        />
                        <input
                          className="input"
                          value={editData.weight}
                          onChange={(e) =>
                            setEditData((v) => ({
                              ...v,
                              weight: e.target.value,
                            }))
                          }
                          inputMode="numeric"
                        />
                        <div className="flex gap-2 md:col-span-1">
                          <button className="button">Save</button>
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => setEditId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {w.exercise} • {w.sets || 0} x {w.reps || 0} @{" "}
                            {Math.round(
                              (unit === "lb" ? kgToLb(w.weight) : w.weight) || 0
                            )}
                            {unit}
                          </p>
                          <p className="subtle">
                            {w.notes ? w.notes : "\u00A0"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="button-ghost"
                            onClick={() => startEdit(w)}
                          >
                            Edit
                          </button>
                          <button
                            className="button-ghost delete"
                            onClick={() => onDelete(user.uid, w.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
