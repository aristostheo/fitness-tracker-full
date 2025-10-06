// theme/ThemeProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ModeSetting = "system" | "light" | "dark";

export type ThemeColors = {
  success: string;
  // core
  background: string;
  text: string;
  muted: string;
  card: string;
  border: string;

  // navigation
  tabBar: string;
  tabActive: string;
  tabInactive: string;

  // inputs/buttons/chips
  inputBg: string;
  inputBorder: string;
  buttonBg: string;
  buttonText: string;
  chipActiveBg: string;
  chipActiveText: string;

  // misc
  placeholder: string;
  primary: string;

  chartPrimary: string;
  chartSecondary: string;

  danger: string;
};

const light: ThemeColors = {
  success: "#22C55E",
  background: "#f7f7fb",
  text: "#111827",
  muted: "#6b7280",
  card: "#ffffff",
  border: "rgba(0,0,0,0.12)",

  tabBar: "#ffffff",
  tabActive: "#111827",
  tabInactive: "#9ca3af",

  inputBg: "#ffffff",
  inputBorder: "rgba(0,0,0,0.12)",
  buttonBg: "#111827",
  buttonText: "#ffffff",
  chipActiveBg: "#111827",
  chipActiveText: "#ffffff",

  placeholder: "#9ca3af",
  primary: "#2563eb",

  chartPrimary: "#3B82F6", // consumed
  chartSecondary: "#F59E0B", //burned

  danger: "#EF4444",
};

const dark: ThemeColors = {
  success: "#34D399",
  background: "#0b1020",
  text: "#f3f4f6",
  muted: "#9ca3af",
  card: "#0f172a",
  border: "rgba(255,255,255,0.12)",

  tabBar: "#0b1020",
  tabActive: "#e5e7eb",
  tabInactive: "#64748b",

  inputBg: "#0f172a",
  inputBorder: "rgba(255,255,255,0.16)",
  buttonBg: "#2563eb",
  buttonText: "#ffffff",
  chipActiveBg: "#2563eb",
  chipActiveText: "#ffffff",

  placeholder: "#94a3b8",
  primary: "#2563eb",

  chartPrimary: "#60A5FA", // consumed
  chartSecondary: "#FBBF24", // burned

  danger: "#EF4444",
};

export type Theme = {
  colors: ThemeColors;
  isDark: boolean;
  modeSetting: ModeSetting;
  setModeSetting: (m: ModeSetting) => void;
};

const Ctx = createContext<Theme | null>(null);
export const THEME_STORAGE_KEY = "@app:themeSetting";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [modeSetting, setModeSetting] = useState<ModeSetting>("system");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // load saved choice
  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (v === "light" || v === "dark" || v === "system") setModeSetting(v);
    })();
  }, []);

  // watch system theme
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSystemScheme(colorScheme)
    );
    return () => sub.remove();
  }, []);

  // persist user choice
  useEffect(() => {
    AsyncStorage.setItem(THEME_STORAGE_KEY, modeSetting).catch(() => {});
  }, [modeSetting]);

  const isDark =
    modeSetting === "dark" ||
    (modeSetting === "system" && systemScheme === "dark");

  const value = useMemo<Theme>(
    () => ({
      colors: isDark ? dark : light,
      isDark,
      modeSetting,
      setModeSetting,
    }),
    [isDark, modeSetting]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
