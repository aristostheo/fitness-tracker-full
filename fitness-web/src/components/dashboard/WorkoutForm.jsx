// src/components/dashboard/WorkoutForm.jsx
import React from "react";
import { lbToKg } from "../../utils/units";
import { addWorkout } from "../../services/workouts";
import { addWorkoutPreset, deleteWorkoutPreset } from "../../services/presets";

export default function WorkoutForm({
  user,
  unit,
  date,
  setDate,
  exercise,
  setExercise,
  sets,
  setSets,
  reps,
  setReps,
  weight,
  setWeight,
  notes,
  setNotes,
  workoutPresets,
  setNewWOPresetName,
  newWOPresetName,
}) {
  const onAdd = async (e) => {
    e.preventDefault();
    if (!user) return;
    const weightKg =
      unit === "lb" ? lbToKg(Number(weight || 0)) : Number(weight || 0);
    await addWorkout(user.uid, {
      date,
      exercise,
      sets: Number(sets || 0),
      reps: Number(reps || 0),
      weight: weightKg,
      notes,
    });
    setExercise("");
    setSets("");
    setReps("");
    setWeight("");
    setNotes("");
  };

  return (
    <div className="card p-6">
      <h2 className="h2 mb-4">Add Workout</h2>
      <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <input
          className="input md:col-span-2"
          placeholder="Exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="Sets"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          inputMode="numeric"
        />
        <input
          className="input"
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          inputMode="numeric"
        />
        <input
          className="input"
          placeholder={`Weight (${unit})`}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          inputMode="numeric"
        />
        <input
          className="input md:col-span-5"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button className="button md:col-span-1">Save</button>

        {/* Presets */}
        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <input
            className="input max-w-xs"
            placeholder="Preset name (e.g., Bench 5x5)"
            value={newWOPresetName}
            onChange={(e) => setNewWOPresetName(e.target.value)}
          />
          <button
            type="button"
            className="button-ghost"
            onClick={async () => {
              if (!user || !newWOPresetName.trim() || !exercise.trim()) return;
              await addWorkoutPreset(user.uid, {
                exercise: newWOPresetName.trim(),
                sets: Number(sets || 0),
                reps: Number(reps || 0),
                weight: Number(weight || 0), // saved in current unit; applied as-is
                notes,
              });
              setNewWOPresetName("");
            }}
          >
            Save as Preset
          </button>
        </div>

        <div className="md:col-span-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick add from presets
          </h3>
          {workoutPresets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No workout presets yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {workoutPresets.map((p) => (
                <div
                  key={p.id}
                  className="border border-white/10 rounded-xl px-3 py-1.5"
                >
                  <button
                    type="button"
                    className="text-brand-600 dark:text-brand-300 hover:underline"
                    onClick={async () => {
                      if (!user) return;
                      const w =
                        unit === "lb"
                          ? lbToKg(Number(p.weight || 0))
                          : Number(p.weight || 0);
                      await addWorkout(user.uid, {
                        date,
                        exercise: p.exercise,
                        sets: Number(p.sets || 0),
                        reps: Number(p.reps || 0),
                        weight: w,
                        notes: p.notes || "",
                      });
                    }}
                  >
                    + {p.exercise}
                  </button>
                  <button
                    type="button"
                    className="ml-3 text-red-500 hover:underline"
                    onClick={() => deleteWorkoutPreset(user.uid, p.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
