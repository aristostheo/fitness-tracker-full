// components/settings/ThemeChooser.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/content/ThemeProvider";

const PALETTES = [
  { name: "Indigo / Violet", primary: "#6366F1", accent: "#8B5CF6" },
  { name: "Sky / Cyan", primary: "#0EA5E9", accent: "#06B6D4" },
  { name: "Emerald / Teal", primary: "#10B981", accent: "#14B8A6" },
  { name: "Amber / Orange", primary: "#F59E0B", accent: "#FB923C" },
  { name: "Rose / Pink", primary: "#F43F5E", accent: "#EC4899" },
  { name: "Slate / Blue", primary: "#64748B", accent: "#60A5FA" },
];

function isHex(x: string) {
  return /^#([0-9a-fA-F]{6})$/.test(x.trim());
}

export default function ThemeChooser({
  primary,
  accent,
  onApply,
  onReset,
}: {
  primary: string;
  accent: string;
  onApply: (primary: string, accent: string) => void;
  onReset: () => void;
}) {
  const { colors } = useTheme();
  const [pHex, setPHex] = useState(primary.toUpperCase());
  const [aHex, setAHex] = useState(accent.toUpperCase());

  const previewPrimary = useMemo(
    () => (isHex(pHex) ? pHex : primary),
    [pHex, primary]
  );
  const previewAccent = useMemo(
    () => (isHex(aHex) ? aHex : accent),
    [aHex, accent]
  );

  return (
    <View style={{ gap: 12 }}>
      {/* Live preview */}
      <LinearGradient
        colors={[previewPrimary, previewAccent]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          borderRadius: 14,
          padding: 12,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.07)",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Live Preview</Text>
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <View
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.18)",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Primary</Text>
          </View>
          <View
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.18)",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Accent</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Presets */}
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Presets</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {PALETTES.map((p) => (
            <Pressable
              key={p.name}
              onPress={() => {
                setPHex(p.primary.toUpperCase());
                setAHex(p.accent.toUpperCase());
                onApply(p.primary, p.accent);
              }}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={[p.primary, p.accent]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  width: 120,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}
                >
                  {p.name}
                </Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Custom (hex) */}
      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Custom (hex)</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: previewPrimary,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <TextInput
            value={pHex}
            onChangeText={(t) => setPHex(t.toUpperCase())}
            placeholder="#RRGGBB"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: colors.inputBg,
              color: colors.text,
              fontWeight: "700",
            }}
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: previewAccent,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <TextInput
            value={aHex}
            onChangeText={(t) => setAHex(t.toUpperCase())}
            placeholder="#RRGGBB"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: colors.inputBg,
              color: colors.text,
              fontWeight: "700",
            }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => {
              if (!isHex(pHex) || !isHex(aHex)) {
                return; // keep it simple; settings page shows guidance
              }
              onApply(pHex, aHex);
            }}
            style={{
              borderRadius: 12,
              overflow: "hidden",
              flex: 1,
            }}
          >
            <LinearGradient
              colors={[previewPrimary, previewAccent]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                Apply colors
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={onReset}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: 12,
              paddingHorizontal: 14,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "800" }}>Reset</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
