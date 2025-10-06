import React from "react";

export const ToastCtx = React.createContext({ push: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = React.useState([]);
  const push = (msg, type = "info", ms = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, msg, type }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), ms);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {items.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-lg shadow-lg text-sm ${
              t.type === "error"
                ? "bg-red-600 text-white"
                : t.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-gray-800 text-white"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
