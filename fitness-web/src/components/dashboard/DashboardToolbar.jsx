// src/components/dashboard/DashboardToolbar.jsx
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useNavigate } from "react-router-dom";

export default function DashboardToolbar({
  unit,
  onToggleUnit,
  date,
  setDate,
}) {
  const navigate = useNavigate();
  async function logout() {
    await signOut(auth);
    navigate("/login");
  }
  return (
    <div className="card p-6 flex items-center justify-between gap-4">
      <div>
        <h1 className="h1">Workouts</h1>
        <p className="subtle">Track volume and progress</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm text-gray-400">Weight:</span>
          <button
            type="button"
            className="button-ghost"
            onClick={onToggleUnit}
            title="Toggle weight unit"
          >
            {unit.toUpperCase()}
          </button>
        </div>
        <input
          className="input w-44"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button onClick={logout} className="button">
          Log out
        </button>
      </div>
    </div>
  );
}
