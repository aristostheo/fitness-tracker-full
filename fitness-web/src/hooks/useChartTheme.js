// src/hooks/useChartTheme.js
import { useEffect, useState } from "react";

export default function useChartTheme() {
  const [theme, setTheme] = useState({
    text: "#111827",
    grid: "#e5e7eb",
    bg: "#ffffff",
  });
  useEffect(() => {
    const apply = () => {
      const dark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
      setTheme(
        dark
          ? { text: "#e5e7eb", grid: "#374151", bg: "#111827" }
          : { text: "#111827", grid: "#e5e7eb", bg: "#ffffff" }
      );
    };
    apply();
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, []);
  return theme;
}
