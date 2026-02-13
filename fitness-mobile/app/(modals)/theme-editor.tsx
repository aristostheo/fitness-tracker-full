// app/(modals)/theme-editor.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  PanResponder,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme, GradientPairingStyle } from "@/content/ThemeProvider";
import {
  clamp,
  isHex6,
  normalizeHex,
  hexToHsl,
  hslToHex,
  contrastRatio,
} from "@/lib/themeColor";

type ModeTab = "light" | "dark";

const PRESETS = [
  { name: "Indigo / Violet", p: "#6366F1", a: "#8B5CF6" },
  { name: "Sky / Cyan", p: "#0EA5E9", a: "#06B6D4" },
  { name: "Emerald / Teal", p: "#10B981", a: "#14B8A6" },
  { name: "Amber / Orange", p: "#F59E0B", a: "#FB923C" },
  { name: "Rose / Pink", p: "#F43F5E", a: "#EC4899" },
  { name: "Slate / Blue", p: "#64748B", a: "#60A5FA" },
  { name: "Lime / Green", p: "#84CC16", a: "#22C55E" },
  { name: "Fuchsia / Purple", p: "#D946EF", a: "#7C3AED" },
];

type GradientStops = readonly [string, string, ...string[]];

function styleStops(
  style: GradientPairingStyle,
  primary: string,
  accent: string
): GradientStops {
  if (style === "subtle") return [primary, primary, accent] as const;
  if (style === "bold") return [primary, accent] as const;
  return [primary, accent, accent] as const;
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string; icon?: any }[];
}) {
  return (
    <View style={segStyles.wrap}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(o.key);
            }}
            style={[segStyles.item, active && segStyles.itemActive]}
          >
            {o.icon ? (
              <Ionicons
                name={o.icon}
                size={14}
                color={active ? "#fff" : "rgba(255,255,255,0.65)"}
              />
            ) : null}
            <Text
              style={[
                segStyles.txt,
                { color: active ? "#fff" : "rgba(255,255,255,0.70)" },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  item: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  itemActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  txt: { fontSize: 12, fontWeight: "900" },
});

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  left,
  right,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number, isEnd?: boolean) => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const width = 260;
  const barRef = useRef<View>(null);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          Haptics.selectionAsync();
        },
        onPanResponderMove: (_, g) => {
          const x = clamp(g.dx, -width / 2, width / 2) + width / 2;
          const t = x / width;
          const v = min + t * (max - min);
          onChange(v, false);
        },
        onPanResponderRelease: () => {
          Haptics.selectionAsync();
          onChange(value, true);
        },
      }),
    [min, max, onChange, value]
  );

  const t = (value - min) / (max - min);
  const knobX = clamp(t, 0, 1) * width;

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 12,
            fontWeight: "900",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 12,
            fontWeight: "900",
          }}
        >
          {Math.round(value)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {left}
        <View
          ref={barRef}
          {...pan.panHandlers}
          style={{
            width,
            height: 14,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.10)",
            overflow: "hidden",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              position: "absolute",
              left: 0,
              width: knobX,
              height: 14,
              backgroundColor: "rgba(255,255,255,0.18)",
            }}
          />
          <View
            style={{
              position: "absolute",
              left: knobX - 10,
              width: 20,
              height: 20,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.85)",
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.20)",
            }}
          />
        </View>
        {right}
      </View>
    </View>
  );
}

function PreviewCard({
  primary,
  accent,
  style,
  isDarkPreview,
}: {
  primary: string;
  accent: string;
  style: GradientPairingStyle;
  isDarkPreview: boolean;
}) {
  const bg = isDarkPreview ? "#0B0F1A" : "#F6F9FF";
  const txt = isDarkPreview ? "#EEF2FF" : "#0B1220";
  const muted = isDarkPreview
    ? "rgba(255,255,255,0.62)"
    : "rgba(11,18,32,0.56)";
  const surface = isDarkPreview
    ? "rgba(255,255,255,0.06)"
    : "rgba(11,18,32,0.04)";
  const border = isDarkPreview
    ? "rgba(255,255,255,0.10)"
    : "rgba(11,18,32,0.10)";

  return (
    <View
      style={{
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <LinearGradient
        colors={styleStops(style, primary, accent)}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ padding: 14 }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.9)",
            fontWeight: "900",
            fontSize: 12,
          }}
        >
          Live UI Preview
        </Text>

        <View style={{ marginTop: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={{
                flex: 1,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.16)",
                padding: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                Primary Action
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color: "rgba(255,255,255,0.82)",
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                Button / CTA feel
              </Text>
            </View>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                backgroundColor: "rgba(0,0,0,0.18)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <View
              style={{
                paddingVertical: 7,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                Chip
              </Text>
            </View>
            <View
              style={{
                paddingVertical: 7,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.16)",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                Secondary
              </Text>
            </View>
            <View
              style={{
                paddingVertical: 7,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.14)",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                Focus
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={{ backgroundColor: bg, padding: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: txt, fontWeight: "900" }}>Card Surface</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 6,
                backgroundColor: primary,
              }}
            />
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 6,
                backgroundColor: accent,
              }}
            />
          </View>
        </View>

        <View
          style={{
            marginTop: 10,
            borderRadius: 16,
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            padding: 12,
          }}
        >
          <Text style={{ color: txt, fontWeight: "900" }}>Progress</Text>
          <View
            style={{
              marginTop: 8,
              height: 10,
              borderRadius: 999,
              backgroundColor: isDarkPreview
                ? "rgba(255,255,255,0.10)"
                : "rgba(11,18,32,0.10)",
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={[primary, accent]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: "66%", height: 10, borderRadius: 999 }}
            />
          </View>
          <Text
            style={{
              marginTop: 8,
              color: muted,
              fontWeight: "800",
              fontSize: 12,
            }}
          >
            Accent readability + polish check
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ThemeEditorModal() {
  const router = useRouter();
  const {
    colors,
    isDark,
    themeAccents,
    setAccentsFor,
    setGradientStyleFor,
    resetAccentsFor,
  } = useTheme();

  const [tab, setTab] = useState<ModeTab>(isDark ? "dark" : "light");

  const initial = useMemo(() => {
    const t = tab === "dark" ? themeAccents.dark : themeAccents.light;
    return {
      primary: (t.primary ?? "#6366F1").toUpperCase(),
      accent: (t.accent ?? "#8B5CF6").toUpperCase(),
      style: (t.gradientStyle ?? "balanced") as GradientPairingStyle,
    };
  }, [tab, themeAccents]);

  const [primary, setPrimary] = useState(initial.primary);
  const [accent, setAccent] = useState(initial.accent);
  const [pairStyle, setPairStyle] = useState<GradientPairingStyle>(
    initial.style
  );

  // when switching tabs, reset local editor to that tab values
  React.useEffect(() => {
    setPrimary(initial.primary);
    setAccent(initial.accent);
    setPairStyle(initial.style);
  }, [initial.primary, initial.accent, initial.style]);

  // advanced controls state (HSL) per selected target
  const [editing, setEditing] = useState<"primary" | "accent">("primary");

  const activeHex = editing === "primary" ? primary : accent;

  const hsl = useMemo(() => {
    if (!isHex6(activeHex)) return { h: 260, s: 70, l: 55 };
    return hexToHsl(activeHex);
  }, [activeHex]);

  const [h, setH] = useState(hsl.h);
  const [s, setS] = useState(hsl.s);
  const [l, setL] = useState(hsl.l);

  React.useEffect(() => {
    setH(hsl.h);
    setS(hsl.s);
    setL(hsl.l);
  }, [hsl.h, hsl.s, hsl.l]);

  const setHexForEditing = (hex: string) => {
    const up = hex.toUpperCase();
    if (editing === "primary") setPrimary(up);
    else setAccent(up);
  };

  const updateFromHsl = (nextH: number, nextS: number, nextL: number) => {
    const hex = hslToHex(nextH, nextS, nextL);
    setHexForEditing(hex);
  };

  const gradientStops = styleStops(pairStyle, primary, accent);

  const contrastInfo = useMemo(() => {
    // simple checks: contrast against light/dark card backgrounds
    const bg = tab === "dark" ? "#0B0F1A" : "#F6F9FF";
    const rP = contrastRatio(primary, bg);
    const rA = contrastRatio(accent, bg);
    // 3.0 is okay-ish for large UI accents; warn if very low
    return { rP, rA, warn: rP < 2.2 || rA < 2.2 };
  }, [primary, accent, tab]);

  const applyPreset = (p: string, a: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrimary(p.toUpperCase());
    setAccent(a.toUpperCase());
  };

  const onSave = () => {
    const p = normalizeHex(primary);
    const a = normalizeHex(accent);

    if (!isHex6(p) || !isHex6(a)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAccentsFor(tab, p, a);
    setGradientStyleFor(tab, pairStyle);
    router.back();
  };

  const onResetTab = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetAccentsFor(tab);
    // reset local too (will be picked up by effect on themeAccents changes next open;
    // for immediate feel, set defaults now)
    setPrimary("#6366F1");
    setAccent("#8B5CF6");
    setPairStyle("balanced");
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.06)",
          "rgba(255,255,255,0.00)",
          "rgba(255,255,255,0.04)",
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Close theme editor"
        >
          <Ionicons name="close" size={18} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={[styles.hTitle, { color: colors.text }]}>
            Theme Editor
          </Text>
          <Text style={[styles.hSub, { color: colors.muted }]}>
            Tune accents for Light and Dark separately
          </Text>
        </View>

        <Pressable
          onPress={onSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save theme changes"
        >
          <LinearGradient
            colors={gradientStops}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.saveBtnInner}
          >
            <Text style={styles.saveTxt}>Save</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top mode switch + preview */}
        <View style={{ gap: 12 }}>
          <BlurView
            intensity={22}
            tint={isDark ? "dark" : "light"}
            style={[styles.block, { borderColor: colors.glassBorder }]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Segmented
                value={tab}
                onChange={(v) => setTab(v as ModeTab)}
                options={[
                  { key: "light", label: "Light", icon: "sunny" },
                  { key: "dark", label: "Dark", icon: "moon" },
                ]}
              />
              <Pressable
                onPress={onResetTab}
                style={({ pressed }) => [
                  {
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Reset
                </Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 12 }}>
              <PreviewCard
                primary={normalizeHex(primary)}
                accent={normalizeHex(accent)}
                style={pairStyle}
                isDarkPreview={tab === "dark"}
              />
            </View>

            {contrastInfo.warn ? (
              <View style={[styles.warnRow, { borderColor: colors.border }]}>
                <Ionicons name="warning" size={16} color={colors.warning} />
                <Text style={[styles.warnTxt, { color: colors.muted }]}>
                  Low contrast detected. Some text/icons may be harder to read.
                </Text>
              </View>
            ) : null}
          </BlurView>
        </View>

        {/* Picker */}
        <BlurView
          intensity={22}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.block,
            { borderColor: colors.glassBorder, marginTop: 14 },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Accents
          </Text>
          <Text style={[styles.sectionSub, { color: colors.muted }]}>
            Choose a palette quickly, or fine-tune precisely.
          </Text>

          {/* Primary / Secondary selector */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setEditing("primary");
              }}
              style={[
                styles.swatchCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface2,
                },
                editing === "primary" && { borderColor: normalizeHex(primary) },
              ]}
            >
              <View
                style={[
                  styles.bigSwatch,
                  { backgroundColor: normalizeHex(primary) },
                ]}
              />
              <Text style={[styles.swatchLabel, { color: colors.text }]}>
                Primary
              </Text>
              <Text style={[styles.swatchHex, { color: colors.muted }]}>
                {normalizeHex(primary)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setEditing("accent");
              }}
              style={[
                styles.swatchCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface2,
                },
                editing === "accent" && { borderColor: normalizeHex(accent) },
              ]}
            >
              <View
                style={[
                  styles.bigSwatch,
                  { backgroundColor: normalizeHex(accent) },
                ]}
              />
              <Text style={[styles.swatchLabel, { color: colors.text }]}>
                Secondary
              </Text>
              <Text style={[styles.swatchHex, { color: colors.muted }]}>
                {normalizeHex(accent)}
              </Text>
            </Pressable>
          </View>

          {/* Presets */}
          <View style={{ marginTop: 14, gap: 10 }}>
            <Text
              style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}
            >
              Preset palettes
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {PRESETS.map((x) => (
                <Pressable
                  key={x.name}
                  onPress={() => applyPreset(x.p, x.a)}
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Apply preset ${x.name}`}
                >
                  <LinearGradient
                    colors={[x.p, x.a]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{
                      width: 156,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}
                    >
                      {x.name}
                    </Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Gradient style */}
          <View style={{ marginTop: 16, gap: 10 }}>
            <Text
              style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}
            >
              Gradient pairing
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {(["subtle", "balanced", "bold"] as GradientPairingStyle[]).map(
                (sOpt) => {
                  const active = pairStyle === sOpt;
                  return (
                    <Pressable
                      key={sOpt}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPairStyle(sOpt);
                      }}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: active
                          ? normalizeHex(primary)
                          : colors.border,
                        overflow: "hidden",
                      }}
                    >
                      <LinearGradient
                        colors={styleStops(
                          sOpt,
                          normalizeHex(primary),
                          normalizeHex(accent)
                        )}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{ paddingVertical: 10, alignItems: "center" }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontWeight: "900",
                            fontSize: 12,
                          }}
                        >
                          {sOpt === "subtle"
                            ? "Subtle"
                            : sOpt === "balanced"
                            ? "Balanced"
                            : "Bold"}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  );
                }
              )}
            </View>
          </View>

          {/* Advanced controls */}
          <View style={{ marginTop: 16, gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                Fine tune
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons name="options" size={16} color={colors.muted} />
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Editing {editing === "primary" ? "Primary" : "Secondary"}
                </Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Slider
                label="Hue"
                value={h}
                min={0}
                max={360}
                onChange={(v) => {
                  setH(v);
                  updateFromHsl(v, s, l);
                }}
                left={
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    0
                  </Text>
                }
                right={
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    360
                  </Text>
                }
              />
              <Slider
                label="Saturation"
                value={s}
                min={0}
                max={100}
                onChange={(v) => {
                  setS(v);
                  updateFromHsl(h, v, l);
                }}
                left={
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    0
                  </Text>
                }
                right={
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    100
                  </Text>
                }
              />
              <Slider
                label="Lightness"
                value={l}
                min={0}
                max={100}
                onChange={(v) => {
                  setL(v);
                  updateFromHsl(h, s, v);
                }}
                left={
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    0
                  </Text>
                }
                right={
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    100
                  </Text>
                }
              />
            </View>

            <View style={{ gap: 10 }}>
              <Text
                style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}
              >
                Hex (precise)
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={[
                    styles.hexSwatch,
                    {
                      backgroundColor: isHex6(activeHex) ? activeHex : "#000",
                      borderColor: colors.border,
                    },
                  ]}
                />
                <TextInput
                  value={editing === "primary" ? primary : accent}
                  onChangeText={(t) => {
                    const up = t.trim().toUpperCase();
                    if (editing === "primary") setPrimary(up);
                    else setAccent(up);
                  }}
                  autoCapitalize="characters"
                  placeholder="#RRGGBB"
                  placeholderTextColor={colors.placeholder}
                  style={[
                    styles.hexInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                />
                <Pressable
                  onPress={() => {
                    const hex = normalizeHex(
                      editing === "primary" ? primary : accent
                    );
                    if (!isHex6(hex)) {
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Error
                      );
                      return;
                    }
                    Haptics.selectionAsync();
                    // sync sliders to this hex
                    const next = hexToHsl(hex);
                    setH(next.h);
                    setS(next.s);
                    setL(next.l);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    Sync
                  </Text>
                </Pressable>
              </View>

              <Text
                style={{
                  color: colors.muted,
                  fontWeight: "800",
                  fontSize: 12,
                  lineHeight: 16,
                }}
              >
                Tip: presets get you 90% there. Fine tune for that “perfect
                Apple glow”.
              </Text>
            </View>
          </View>
        </BlurView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingTop: Platform.select({ ios: 54, android: 22, default: 22 }),
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  hTitle: { fontSize: 16, fontWeight: "900" },
  hSub: { marginTop: 2, fontSize: 12, fontWeight: "800" },

  saveBtn: { borderRadius: 14, overflow: "hidden" },
  saveBtnInner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  saveTxt: { color: "#fff", fontWeight: "900" },

  block: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
  },
  sectionTitle: { fontSize: 14, fontWeight: "900" },
  sectionSub: { marginTop: 4, fontSize: 12, fontWeight: "800", lineHeight: 16 },

  swatchCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  bigSwatch: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  swatchLabel: { marginTop: 10, fontWeight: "900" },
  swatchHex: { marginTop: 4, fontWeight: "900", fontSize: 12 },

  warnRow: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(245,158,11,0.10)",
  },
  warnTxt: { flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 16 },

  hexSwatch: { width: 34, height: 34, borderRadius: 12, borderWidth: 1 },
  hexInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
