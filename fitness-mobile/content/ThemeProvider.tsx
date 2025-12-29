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
  // existing (keep)
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
  chartPrimary: string;
  chartSecondary: string;
  primary: string;
  accent: string;

  // NEW (aliases + semantic tokens for sleek UI)
  bg: string; // alias of background
  surface: string;
  surface2: string;
  glass: string;
  glassBorder: string;
  shadow: string;
  success: string;
  warning: string;
  danger: string;
  ringTrack: string;
};

type ThemeContextShape = {
  colors: ThemeColors;
  isDark: boolean;
  modeSetting: ThemeMode;
  setModeSetting: (m: ThemeMode) => void;
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
  MODE: "@theme:mode",
  PRIMARY: "@theme:primary",
  ACCENT: "@theme:accent",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [modeSetting, setModeSetting] = useState<ThemeMode>("system");

  // ✅ IMPORTANT: keep system scheme in state and subscribe to changes
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => {
      // RN compatibility: newer returns { remove }, older returns unsubscribe function
      // @ts-ignore
      if (typeof sub?.remove === "function") sub.remove();
      // @ts-ignore
      else if (typeof sub === "function") sub();
    };
  }, []);

  const isSystemDark = systemScheme === "dark";

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

  const isDark =
    modeSetting === "system" ? isSystemDark : modeSetting === "dark";

  const primary = accentPrimary ?? DEFAULT_PRIMARY;
  const accent = accentAccent ?? DEFAULT_ACCENT;

  const colors: ThemeColors = useMemo(() => {
    if (isDark) {
      const background = "#0B0F1A";
      const text = "#EEF2FF";

      return {
        background,
        text,
        card: "rgba(18,22,33,0.72)",
        border: "rgba(255,255,255,0.08)",
        muted: "rgba(255,255,255,0.62)",
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

        bg: background,
        surface: "rgba(255,255,255,0.04)",
        surface2: "rgba(255,255,255,0.07)",
        glass: "rgba(18,22,33,0.55)",
        glassBorder: "rgba(255,255,255,0.10)",
        shadow: "#000",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        ringTrack: "rgba(255,255,255,0.10)",
      };
    }

    // Light mode tuned to feel “premium”
    const background = "#F6F9FF";
    const text = "#0B1220";

    return {
      background,
      text,
      card: "rgba(255,255,255,0.88)",
      border: "rgba(0,0,0,0.07)",
      muted: "rgba(11,18,32,0.56)",
      placeholder: "rgba(11,18,32,0.35)",
      inputBg: "rgba(11,18,32,0.035)",
      inputBorder: "rgba(11,18,32,0.10)",
      chipActiveBg: `${primary}1F`,
      chipActiveText: "#0B1220",
      buttonBg: primary,
      buttonText: "#fff",
      chartPrimary: primary,
      chartSecondary: accent,
      primary,
      accent,

      bg: background,
      surface: "rgba(255,255,255,0.70)",
      surface2: "rgba(255,255,255,0.92)",
      glass: "rgba(255,255,255,0.55)",
      glassBorder: "rgba(11,18,32,0.08)",
      shadow: "rgba(0,0,0,0.25)",
      success: "#16A34A",
      warning: "#D97706",
      danger: "#DC2626",
      ringTrack: "rgba(11,18,32,0.10)",
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
