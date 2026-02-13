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
export type GradientPairingStyle = "subtle" | "balanced" | "bold";

export type ThemeColors = {
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

  // NEW semantic tokens
  bg: string;
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

type ThemeAccents = {
  light: {
    primary?: string;
    accent?: string;
    gradientStyle?: GradientPairingStyle;
  };
  dark: {
    primary?: string;
    accent?: string;
    gradientStyle?: GradientPairingStyle;
  };
};

type ThemeContextShape = {
  colors: ThemeColors;
  isDark: boolean;
  modeSetting: ThemeMode;
  setModeSetting: (m: ThemeMode) => void;

  // existing API (kept): sets BOTH light+dark
  setAccents: (primary?: string, accent?: string) => void;
  resetAccents: () => void;

  // new API
  themeAccents: ThemeAccents;
  setAccentsFor: (
    target: "light" | "dark" | "both",
    primary?: string,
    accent?: string
  ) => void;
  setGradientStyleFor: (
    target: "light" | "dark" | "both",
    style?: GradientPairingStyle
  ) => void;
  resetAccentsFor: (target: "light" | "dark" | "both") => void;
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
const DEFAULT_STYLE: GradientPairingStyle = "balanced";

const STORAGE_KEYS = {
  MODE: "@theme:mode",

  // legacy keys (keep reading for migration)
  PRIMARY: "@theme:primary",
  ACCENT: "@theme:accent",

  // per-mode keys (new)
  LIGHT_PRIMARY: "@theme:light:primary",
  LIGHT_ACCENT: "@theme:light:accent",
  DARK_PRIMARY: "@theme:dark:primary",
  DARK_ACCENT: "@theme:dark:accent",

  LIGHT_STYLE: "@theme:light:gradientStyle",
  DARK_STYLE: "@theme:dark:gradientStyle",
};

function isStyle(x: any): x is GradientPairingStyle {
  return x === "subtle" || x === "balanced" || x === "bold";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [modeSetting, setModeSetting] = useState<ThemeMode>("system");

  // system scheme tracking
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => {
      // RN compatibility
      // @ts-ignore
      if (typeof sub?.remove === "function") sub.remove();
      // @ts-ignore
      else if (typeof sub === "function") sub();
    };
  }, []);

  const isSystemDark = systemScheme === "dark";

  const [themeAccents, setThemeAccentsState] = useState<ThemeAccents>({
    light: {
      primary: undefined,
      accent: undefined,
      gradientStyle: DEFAULT_STYLE,
    },
    dark: {
      primary: undefined,
      accent: undefined,
      gradientStyle: DEFAULT_STYLE,
    },
  });

  // hydrate once (with legacy migration)
  useEffect(() => {
    (async () => {
      try {
        const [m, legacyP, legacyA, lp, la, dp, da, ls, ds] = await Promise.all(
          [
            AsyncStorage.getItem(STORAGE_KEYS.MODE),
            AsyncStorage.getItem(STORAGE_KEYS.PRIMARY),
            AsyncStorage.getItem(STORAGE_KEYS.ACCENT),
            AsyncStorage.getItem(STORAGE_KEYS.LIGHT_PRIMARY),
            AsyncStorage.getItem(STORAGE_KEYS.LIGHT_ACCENT),
            AsyncStorage.getItem(STORAGE_KEYS.DARK_PRIMARY),
            AsyncStorage.getItem(STORAGE_KEYS.DARK_ACCENT),
            AsyncStorage.getItem(STORAGE_KEYS.LIGHT_STYLE),
            AsyncStorage.getItem(STORAGE_KEYS.DARK_STYLE),
          ]
        );

        if (m === "system" || m === "light" || m === "dark") setModeSetting(m);

        // If new per-mode exists, use it. Else migrate from legacy (apply to both).
        const migratedPrimary = legacyP ?? undefined;
        const migratedAccent = legacyA ?? undefined;

        const next: ThemeAccents = {
          light: {
            primary: lp ?? migratedPrimary,
            accent: la ?? migratedAccent,
            gradientStyle: isStyle(ls) ? ls : DEFAULT_STYLE,
          },
          dark: {
            primary: dp ?? migratedPrimary,
            accent: da ?? migratedAccent,
            gradientStyle: isStyle(ds) ? ds : DEFAULT_STYLE,
          },
        };

        setThemeAccentsState(next);

        // one-time migration persistence (non-destructive)
        if (!lp && migratedPrimary)
          await AsyncStorage.setItem(
            STORAGE_KEYS.LIGHT_PRIMARY,
            migratedPrimary
          );
        if (!la && migratedAccent)
          await AsyncStorage.setItem(STORAGE_KEYS.LIGHT_ACCENT, migratedAccent);
        if (!dp && migratedPrimary)
          await AsyncStorage.setItem(
            STORAGE_KEYS.DARK_PRIMARY,
            migratedPrimary
          );
        if (!da && migratedAccent)
          await AsyncStorage.setItem(STORAGE_KEYS.DARK_ACCENT, migratedAccent);

        // Optional: keep legacy keys in sync for older screens (write active values later on save)
      } catch {}
    })();
  }, []);

  const setModePersist = async (m: ThemeMode) => {
    setModeSetting(m);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODE, m);
    } catch {}
  };

  const setAccentsFor: ThemeContextShape["setAccentsFor"] = (
    target,
    primary,
    accent
  ) => {
    setThemeAccentsState((prev) => {
      const next: ThemeAccents = {
        ...prev,
        light: { ...prev.light },
        dark: { ...prev.dark },
      };
      const apply = (t: "light" | "dark") => {
        next[t].primary = primary;
        next[t].accent = accent;
      };
      if (target === "both") {
        apply("light");
        apply("dark");
      } else apply(target);

      (async () => {
        try {
          const tasks: Promise<any>[] = [];
          const write = async (key: string, value?: string) => {
            if (value) return AsyncStorage.setItem(key, value);
            return AsyncStorage.removeItem(key);
          };

          if (target === "light" || target === "both") {
            tasks.push(write(STORAGE_KEYS.LIGHT_PRIMARY, primary));
            tasks.push(write(STORAGE_KEYS.LIGHT_ACCENT, accent));
          }
          if (target === "dark" || target === "both") {
            tasks.push(write(STORAGE_KEYS.DARK_PRIMARY, primary));
            tasks.push(write(STORAGE_KEYS.DARK_ACCENT, accent));
          }

          // Keep legacy keys synced to "both" when applying both (helps old screens)
          if (target === "both") {
            tasks.push(write(STORAGE_KEYS.PRIMARY, primary));
            tasks.push(write(STORAGE_KEYS.ACCENT, accent));
          }

          await Promise.all(tasks);
        } catch {}
      })();

      return next;
    });
  };

  const setGradientStyleFor: ThemeContextShape["setGradientStyleFor"] = (
    target,
    style
  ) => {
    setThemeAccentsState((prev) => {
      const next: ThemeAccents = {
        ...prev,
        light: { ...prev.light },
        dark: { ...prev.dark },
      };
      const apply = (t: "light" | "dark") => {
        next[t].gradientStyle = style ?? DEFAULT_STYLE;
      };
      if (target === "both") {
        apply("light");
        apply("dark");
      } else apply(target);

      (async () => {
        try {
          const write = async (key: string, value?: string) => {
            if (value) return AsyncStorage.setItem(key, value);
            return AsyncStorage.removeItem(key);
          };
          const tasks: Promise<any>[] = [];
          if (target === "light" || target === "both")
            tasks.push(write(STORAGE_KEYS.LIGHT_STYLE, style));
          if (target === "dark" || target === "both")
            tasks.push(write(STORAGE_KEYS.DARK_STYLE, style));
          await Promise.all(tasks);
        } catch {}
      })();

      return next;
    });
  };

  const resetAccentsFor: ThemeContextShape["resetAccentsFor"] = (target) => {
    setAccentsFor(target, undefined, undefined);
    // styles reset separately if you want:
    setGradientStyleFor(target, DEFAULT_STYLE);
  };

  // existing API: sets BOTH
  const setAccents: ThemeContextShape["setAccents"] = (primary, accent) =>
    setAccentsFor("both", primary, accent);
  const resetAccents: ThemeContextShape["resetAccents"] = () =>
    resetAccentsFor("both");

  const isDark =
    modeSetting === "system" ? isSystemDark : modeSetting === "dark";

  const activeAccents = isDark ? themeAccents.dark : themeAccents.light;

  const primary = activeAccents.primary ?? DEFAULT_PRIMARY;
  const accent = activeAccents.accent ?? DEFAULT_ACCENT;

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

    themeAccents,
    setAccentsFor,
    setGradientStyleFor,
    resetAccentsFor,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
