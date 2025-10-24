// content/ThemeProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "system" | "light" | "dark";

type ThemeColors = {
  background: string;
  text: string;
  card: string;
  border: string;
  muted: string;
  placeholder: string;
  inputBg: string;
  inputBorder: string;
  chipActiveBg: string;
  chipActiveText: string;
  buttonBg: string;
  buttonText: string;

  // charts / extras (already used across the app)
  chartPrimary: string;
  chartSecondary: string;

  // primary & accent are user-tunable
  primary: string;
  accent: string;
};

type ThemeContextShape = {
  colors: ThemeColors;
  isDark: boolean;
  modeSetting: ThemeMode;
  setModeSetting: (m: ThemeMode) => void;

  // live accent setters so Settings can update immediately
  setAccents: (primary?: string, accent?: string) => void;
  resetAccents: () => void;
};

const ThemeContext = createContext<ThemeContextShape | null>(null);
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// defaults if user hasn't customized
const DEFAULT_PRIMARY = "#6366F1"; // indigo
const DEFAULT_ACCENT = "#8B5CF6"; // violet

const STORAGE_KEYS = {
  MODE: "@theme:mode", // "system" | "light" | "dark"
  PRIMARY: "@theme:primary", // hex
  ACCENT: "@theme:accent", // hex
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [modeSetting, setModeSetting] = useState<ThemeMode>("system");
  const sysScheme: ColorSchemeName = Appearance.getColorScheme();
  const isSystemDark = sysScheme === "dark";

  // accents are optional — fall back to defaults
  const [accentPrimary, setAccentPrimary] = useState<string | undefined>(
    undefined
  );
  const [accentAccent, setAccentAccent] = useState<string | undefined>(
    undefined
  );

  // hydrate once
  useEffect(() => {
    (async () => {
      try {
        const [m, p, a] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.MODE),
          AsyncStorage.getItem(STORAGE_KEYS.PRIMARY),
          AsyncStorage.getItem(STORAGE_KEYS.ACCENT),
        ]);
        if (m === "system" || m === "light" || m === "dark") setModeSetting(m);
        if (p) setAccentPrimary(p);
        if (a) setAccentAccent(a);
      } catch {}
    })();
  }, []);

  // expose setters that also persist
  const setModePersist = async (m: ThemeMode) => {
    setModeSetting(m);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODE, m);
    } catch {}
  };

  const setAccents = (primary?: string, accent?: string) => {
    setAccentPrimary(primary);
    setAccentAccent(accent);
    (async () => {
      try {
        if (primary) await AsyncStorage.setItem(STORAGE_KEYS.PRIMARY, primary);
        else await AsyncStorage.removeItem(STORAGE_KEYS.PRIMARY);
        if (accent) await AsyncStorage.setItem(STORAGE_KEYS.ACCENT, accent);
        else await AsyncStorage.removeItem(STORAGE_KEYS.ACCENT);
      } catch {}
    })();
  };

  const resetAccents = () => setAccents(undefined, undefined);

  // resolve dark vs light
  const isDark =
    modeSetting === "system" ? isSystemDark : modeSetting === "dark";

  const primary = accentPrimary ?? DEFAULT_PRIMARY;
  const accent = accentAccent ?? DEFAULT_ACCENT;

  const colors: ThemeColors = useMemo(() => {
    if (isDark) {
      return {
        background: "#0B0F1A",
        text: "#EEF2FF",
        card: "rgba(18,22,33,0.7)",
        border: "rgba(255,255,255,0.08)",
        muted: "rgba(255,255,255,0.6)",
        placeholder: "rgba(255,255,255,0.45)",
        inputBg: "rgba(255,255,255,0.06)",
        inputBorder: "rgba(255,255,255,0.12)",
        chipActiveBg: `${primary}33`,
        chipActiveText: "#fff",
        buttonBg: primary,
        buttonText: "#fff",
        chartPrimary: primary,
        chartSecondary: accent,
        primary,
        accent,
      };
    }
    return {
      background: "#F6F9FF",
      text: "#0B1220",
      card: "rgba(255,255,255,0.85)",
      border: "rgba(0,0,0,0.07)",
      muted: "rgba(0,0,0,0.55)",
      placeholder: "rgba(0,0,0,0.35)",
      inputBg: "rgba(0,0,0,0.035)",
      inputBorder: "rgba(0,0,0,0.085)",
      chipActiveBg: `${primary}1F`,
      chipActiveText: "#0B1220",
      buttonBg: primary,
      buttonText: "#fff",
      chartPrimary: primary,
      chartSecondary: accent,
      primary,
      accent,
    };
  }, [isDark, primary, accent]);

  const value: ThemeContextShape = {
    colors,
    isDark,
    modeSetting,
    setModeSetting: setModePersist,
    setAccents,
    resetAccents,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
