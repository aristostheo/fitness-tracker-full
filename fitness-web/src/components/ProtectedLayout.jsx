import React from "react";
import { Outlet } from "react-router-dom";

export default function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-blue-500">
      <main className="w-full h-full">
        <Outlet />
      </main>
    </div>
  );
}
