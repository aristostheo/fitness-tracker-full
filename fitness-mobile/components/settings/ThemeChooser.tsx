// // components/settings/ThemeChooser.tsx
// import React, { useMemo, useState } from "react";
// import { View, Text, Pressable, TextInput } from "react-native";
// import { LinearGradient } from "expo-linear-gradient";
// import { useTheme } from "@/content/ThemeProvider";

// const PALETTES = [
//   { name: "Indigo / Violet", primary: "#6366F1", accent: "#8B5CF6" },
//   { name: "Sky / Cyan", primary: "#0EA5E9", accent: "#06B6D4" },
//   { name: "Emerald / Teal", primary: "#10B981", accent: "#14B8A6" },
//   { name: "Amber / Orange", primary: "#F59E0B", accent: "#FB923C" },
//   { name: "Rose / Pink", primary: "#F43F5E", accent: "#EC4899" },
//   { name: "Slate / Blue", primary: "#64748B", accent: "#60A5FA" },
// ];

// function isHex(x: string) {
//   return /^#([0-9a-fA-F]{6})$/.test(x.trim());
// }

// export default function ThemeChooser({
//   primary,
//   accent,
//   onApply,
//   onReset,
// }: {
//   primary: string;
//   accent: string;
//   onApply: (primary: string, accent: string) => void;
//   onReset: () => void;
// }) {
//   const { colors } = useTheme();
//   const [pHex, setPHex] = useState(primary.toUpperCase());
//   const [aHex, setAHex] = useState(accent.toUpperCase());

//   const previewPrimary = useMemo(
//     () => (isHex(pHex) ? pHex : primary),
//     [pHex, primary]
//   );
//   const previewAccent = useMemo(
//     () => (isHex(aHex) ? aHex : accent),
//     [aHex, accent]
//   );

//   return (
//     <View style={{ gap: 12 }}>
//       {/* Live preview */}
//       <LinearGradient
//         colors={[previewPrimary, previewAccent]}
//         start={{ x: 0, y: 0.5 }}
//         end={{ x: 1, y: 0.5 }}
//         style={{
//           borderRadius: 14,
//           padding: 12,
//           borderWidth: 1,
//           borderColor: "rgba(0,0,0,0.07)",
//         }}
//       >
//         <Text style={{ color: "#fff", fontWeight: "800" }}>Live Preview</Text>
//         <View
//           style={{
//             marginTop: 8,
//             flexDirection: "row",
//             gap: 8,
//             flexWrap: "wrap",
//           }}
//         >
//           <View
//             style={{
//               paddingVertical: 8,
//               paddingHorizontal: 12,
//               borderRadius: 999,
//               backgroundColor: "rgba(255,255,255,0.18)",
//             }}
//           >
//             <Text style={{ color: "#fff", fontWeight: "800" }}>Primary</Text>
//           </View>
//           <View
//             style={{
//               paddingVertical: 8,
//               paddingHorizontal: 12,
//               borderRadius: 999,
//               backgroundColor: "rgba(0,0,0,0.18)",
//             }}
//           >
//             <Text style={{ color: "#fff", fontWeight: "800" }}>Accent</Text>
//           </View>
//         </View>
//       </LinearGradient>

//       {/* Presets */}
//       <View style={{ gap: 8 }}>
//         <Text style={{ color: colors.muted, fontSize: 12 }}>Presets</Text>
//         <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
//           {PALETTES.map((p) => (
//             <Pressable
//               key={p.name}
//               onPress={() => {
//                 setPHex(p.primary.toUpperCase());
//                 setAHex(p.accent.toUpperCase());
//                 onApply(p.primary, p.accent);
//               }}
//               style={{
//                 borderRadius: 12,
//                 borderWidth: 1,
//                 borderColor: colors.border,
//                 overflow: "hidden",
//               }}
//             >
//               <LinearGradient
//                 colors={[p.primary, p.accent]}
//                 start={{ x: 0, y: 0.5 }}
//                 end={{ x: 1, y: 0.5 }}
//                 style={{
//                   width: 120,
//                   height: 40,
//                   alignItems: "center",
//                   justifyContent: "center",
//                 }}
//               >
//                 <Text
//                   style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}
//                 >
//                   {p.name}
//                 </Text>
//               </LinearGradient>
//             </Pressable>
//           ))}
//         </View>
//       </View>

//       {/* Custom (hex) */}
//       <View style={{ gap: 10 }}>
//         <Text style={{ color: colors.muted, fontSize: 12 }}>Custom (hex)</Text>
//         <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
//           <View
//             style={{
//               width: 28,
//               height: 28,
//               borderRadius: 6,
//               backgroundColor: previewPrimary,
//               borderWidth: 1,
//               borderColor: colors.border,
//             }}
//           />
//           <TextInput
//             value={pHex}
//             onChangeText={(t) => setPHex(t.toUpperCase())}
//             placeholder="#RRGGBB"
//             placeholderTextColor={colors.placeholder}
//             autoCapitalize="characters"
//             style={{
//               flex: 1,
//               borderWidth: 1,
//               borderColor: colors.inputBorder,
//               borderRadius: 12,
//               paddingHorizontal: 12,
//               paddingVertical: 10,
//               backgroundColor: colors.inputBg,
//               color: colors.text,
//               fontWeight: "700",
//             }}
//           />
//         </View>
//         <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
//           <View
//             style={{
//               width: 28,
//               height: 28,
//               borderRadius: 6,
//               backgroundColor: previewAccent,
//               borderWidth: 1,
//               borderColor: colors.border,
//             }}
//           />
//           <TextInput
//             value={aHex}
//             onChangeText={(t) => setAHex(t.toUpperCase())}
//             placeholder="#RRGGBB"
//             placeholderTextColor={colors.placeholder}
//             autoCapitalize="characters"
//             style={{
//               flex: 1,
//               borderWidth: 1,
//               borderColor: colors.inputBorder,
//               borderRadius: 12,
//               paddingHorizontal: 12,
//               paddingVertical: 10,
//               backgroundColor: colors.inputBg,
//               color: colors.text,
//               fontWeight: "700",
//             }}
//           />
//         </View>

//         <View style={{ flexDirection: "row", gap: 10 }}>
//           <Pressable
//             onPress={() => {
//               if (!isHex(pHex) || !isHex(aHex)) {
//                 return; // keep it simple; settings page shows guidance
//               }
//               onApply(pHex, aHex);
//             }}
//             style={{
//               borderRadius: 12,
//               overflow: "hidden",
//               flex: 1,
//             }}
//           >
//             <LinearGradient
//               colors={[previewPrimary, previewAccent]}
//               start={{ x: 0, y: 0.5 }}
//               end={{ x: 1, y: 0.5 }}
//               style={{
//                 paddingVertical: 12,
//                 alignItems: "center",
//                 justifyContent: "center",
//               }}
//             >
//               <Text style={{ color: "#fff", fontWeight: "900" }}>
//                 Apply colors
//               </Text>
//             </LinearGradient>
//           </Pressable>

//           <Pressable
//             onPress={onReset}
//             style={{
//               borderRadius: 12,
//               borderWidth: 1,
//               borderColor: colors.border,
//               paddingVertical: 12,
//               paddingHorizontal: 14,
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             <Text style={{ color: colors.text, fontWeight: "800" }}>Reset</Text>
//           </Pressable>
//         </View>
//       </View>
//     </View>
//   );
// }

// components/settings/premium/ThemeChooserCardPremium.tsx
// Drop-in ✅
// Premium Settings/Account card that previews Light + Dark accent sets.
// Tapping opens the Theme Editor modal.
//
// Depends on:
//   expo-router, expo-linear-gradient, expo-blur, expo-haptics
//   services/themePrefs
//   Your ThemeProvider: useTheme() -> { colors, isDark }
//
// If your ThemeProvider also supports applying accents globally,
// you can do that in the modal after saving (see theme-editor.tsx comments).

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/content/ThemeProvider";
import {
  getThemePrefs,
  subscribeThemePrefs,
  type ThemePrefs,
} from "@/services/themePrefs";
import { withAlpha, blendHex } from "./colorUtils";

function gradientFor(
  primary: string,
  secondary: string,
  style: "soft" | "punchy" | "mono"
) {
  if (style === "mono") return [primary, primary] as const;
  if (style === "punchy") return [primary, secondary] as const;
  // soft
  return [
    blendHex(primary, secondary, 0.25),
    blendHex(primary, secondary, 0.85),
  ] as const;
}

function PalettePill({
  title,
  primary,
  secondary,
  style,
  isDarkSurface,
}: {
  title: string;
  primary: string;
  secondary: string;
  style: "soft" | "punchy" | "mono";
  isDarkSurface: boolean;
}) {
  const g = gradientFor(primary, secondary, style);
  return (
    <View style={styles.pillWrap}>
      <LinearGradient
        colors={[withAlpha(g[0], 0.95), withAlpha(g[1], 0.95)]}
        start={{ x: 0.1, y: 0.5 }}
        end={{ x: 0.9, y: 0.5 }}
        style={[
          styles.pill,
          {
            borderColor: withAlpha(isDarkSurface ? "#FFFFFF" : "#000000", 0.12),
          },
        ]}
      >
        <View style={styles.pillDots}>
          <View style={[styles.dot, { backgroundColor: primary }]} />
          <View style={[styles.dot, { backgroundColor: secondary }]} />
        </View>
        <Text style={[styles.pillText, { color: "#FFFFFF" }]}>{title}</Text>
      </LinearGradient>
    </View>
  );
}

export default function ThemeChooserCardPremium() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [prefs, setPrefs] = useState<ThemePrefs | null>(null);

  useEffect(() => {
    let mounted = true;
    getThemePrefs().then((p) => mounted && setPrefs(p));
    const unsub = subscribeThemePrefs((p) => setPrefs(p));
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const light = prefs?.light;
  const dark = prefs?.dark;

  const surfaceBorder = useMemo(
    () => withAlpha(isDark ? "#FFFFFF" : "#000000", isDark ? 0.1 : 0.08),
    [isDark]
  );

  const surfaceBg = useMemo(
    () => (isDark ? withAlpha("#0B0F1A", 0.55) : withAlpha("#FFFFFF", 0.7)),
    [isDark]
  );

  const glow = useMemo(() => {
    const p = (isDark ? dark?.primary : light?.primary) || "#6366F1";
    const s = (isDark ? dark?.secondary : light?.secondary) || "#8B5CF6";
    return [withAlpha(p, 0.25), withAlpha(s, 0.18)];
  }, [
    isDark,
    light?.primary,
    light?.secondary,
    dark?.primary,
    dark?.secondary,
  ]);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(modals)/theme-editor");
      }}
      style={({ pressed }) => [
        styles.card,
        { borderColor: surfaceBorder },
        pressed && { transform: [{ scale: 0.992 }], opacity: 0.98 },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Theme Chooser"
      accessibilityHint="Opens theme editor to customize accent colors."
    >
      <LinearGradient
        colors={[glow[0], glow[1]]}
        start={{ x: 0.1, y: 0.2 }}
        end={{ x: 0.9, y: 0.8 }}
        style={StyleSheet.absoluteFillObject}
      />
      <BlurView
        intensity={22}
        tint={isDark ? "dark" : "light"}
        style={[styles.blur, { backgroundColor: surfaceBg }]}
      />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            Theme Chooser
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Primary + secondary accents with a live palette preview.
          </Text>
        </View>

        <View style={styles.chev}>
          <Ionicons
            name="color-palette-outline"
            size={18}
            color={colors.text}
          />
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.muted}
            style={{ marginLeft: 6 }}
          />
        </View>
      </View>

      <View style={styles.previewRow}>
        <PalettePill
          title="Light"
          primary={light?.primary ?? "#0EA5E9"}
          secondary={light?.secondary ?? "#06B6D4"}
          style={light?.gradientStyle ?? "soft"}
          isDarkSurface={false}
        />
        <PalettePill
          title="Dark"
          primary={dark?.primary ?? "#6366F1"}
          secondary={dark?.secondary ?? "#8B5CF6"}
          style={dark?.gradientStyle ?? "soft"}
          isDarkSurface={true}
        />
      </View>

      <View style={styles.miniPreview}>
        <Text style={[styles.miniLabel, { color: colors.muted }]}>Preview</Text>
        <View style={styles.miniRow}>
          <View
            style={[
              styles.chip,
              {
                backgroundColor: withAlpha(
                  (isDark ? dark?.primary : light?.primary) ?? "#6366F1",
                  0.2
                ),
                borderColor: surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.text }]}>
              Primary
            </Text>
          </View>
          <View
            style={[
              styles.chip,
              {
                backgroundColor: withAlpha(
                  (isDark ? dark?.secondary : light?.secondary) ?? "#8B5CF6",
                  0.18
                ),
                borderColor: surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.text }]}>
              Secondary
            </Text>
          </View>

          <LinearGradient
            colors={gradientFor(
              (isDark ? dark?.primary : light?.primary) ?? "#6366F1",
              (isDark ? dark?.secondary : light?.secondary) ?? "#8B5CF6",
              (isDark ? dark?.gradientStyle : light?.gradientStyle) ?? "soft"
            )}
            start={{ x: 0.1, y: 0.5 }}
            end={{ x: 0.9, y: 0.5 }}
            style={[styles.cta, { borderColor: surfaceBorder }]}
          >
            <Text style={styles.ctaText}>Edit</Text>
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    padding: 16,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
  chev: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  pillWrap: { flex: 1 },
  pill: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pillDots: { flexDirection: "row", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 6 },
  pillText: { fontWeight: "900", fontSize: 12, letterSpacing: 0.2 },
  miniPreview: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  miniLabel: { fontSize: 12, fontWeight: "800", marginBottom: 8 },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontWeight: "900", fontSize: 12 },
  cta: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  ctaText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
