// src/components/dashboard/TodayVsGoal.jsx
import React from "react";
import GoalBar from "./GoalBar";

export default function TodayVsGoal({
  calGoal,
  profile,
  todayFoods,
  todayExercise,
}) {
  return (
    <div className="card p-4">
      <h2 className="h2 mb-3">Today vs Goal</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <GoalBar
          label="Calories"
          goal={calGoal}
          actual={(todayFoods.calories || 0) - (todayExercise || 0)}
          unit="kcal"
        />
        <GoalBar
          label="Protein"
          goal={profile?.proteinGoal}
          actual={todayFoods.protein}
          unit="g"
        />
        <GoalBar
          label="Carbs"
          goal={profile?.carbGoal}
          actual={todayFoods.carbs}
          unit="g"
        />
        <GoalBar
          label="Fat"
          goal={profile?.fatGoal}
          actual={todayFoods.fat}
          unit="g"
        />
      </div>
    </div>
  );
}
