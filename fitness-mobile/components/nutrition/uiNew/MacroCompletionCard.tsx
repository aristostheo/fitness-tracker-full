// components/nutrition/uiNew/MacroCompletionCard.tsx
// Drop-in ✅
// Depends on: expo-haptics, expo-blur, @expo/vector-icons
// Uses your ThemeProvider: { colors, isDark }

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useTheme } from "@/content/ThemeProvider";
import {
  fetchMacroCompletion,
  type DietPreferencesShape,
  type MacroCompletionResponse,
  type MacroCompletionSuggestion,
  type MacroTotals,
} from "@/services/nutrition/macroCompletion";

function withAlpha(color: string, alpha = 0.2) {
  if (!color) return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("rgb")) {
    const body = color.replace(/^rgba?\(|\)$/g, "");
    const [r, g, b] = body.split(",").map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const m = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return color;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(
    m[3],
    16
  )}, ${alpha})`;
}

function clamp0(n: number) {
  const x = Math.round(Number(n || 0));
  return Number.isFinite(x) ? Math.max(0, x) : 0;
}

function computeRemaining(goals: MacroTotals, totals: MacroTotals) {
  return {
    calories: clamp0((goals.calories || 0) - (totals.calories || 0)),
    protein: clamp0((goals.protein || 0) - (totals.protein || 0)),
    carbs: clamp0((goals.carbs || 0) - (totals.carbs || 0)),
    fat: clamp0((goals.fat || 0) - (totals.fat || 0)),
  };
}

function remainingLabel(rem: ReturnType<typeof computeRemaining>) {
  if (
    rem.calories <= 80 &&
    rem.protein <= 10 &&
    rem.carbs <= 15 &&
    rem.fat <= 6
  ) {
    return "You’re basically there.";
  }
  return "Based on what’s left.";
}

function prefsChips(p?: DietPreferencesShape | null) {
  const more = (p?.moreOf || []).slice(0, 2);
  const avoid = (p?.avoidLimit || []).slice(0, 1);
  const out = [
    ...more.map((x) => `More ${x.replace(/_/g, " ")}`),
    ...avoid.map((x) => `Less ${x.replace(/_/g, " ")}`),
  ];
  return out.slice(0, 3);
}

function fallbackSuggestions(
  rem: ReturnType<typeof computeRemaining>
): MacroCompletionSuggestion[] {
  // Calm + safe defaults (no allergies knowledge here; backend normally handles it)
  const k = rem.calories;
  const p = rem.protein;

  const s1: MacroCompletionSuggestion = {
    id: "fb1",
    label: "1 meal",
    foods: ["Chicken bowl (rice + chicken + light sauce)"],
    macros: {
      calories: Math.min(Math.max(420, k ? Math.round(k * 0.75) : 520), 720),
      protein: Math.min(Math.max(35, p ? Math.round(p * 0.75) : 45), 65),
      carbs: 55,
      fat: 14,
    },
    tags: ["high_protein", "simple"],
    notes: "If carbs still low, add fruit.",
  };

  const s2: MacroCompletionSuggestion = {
    id: "fb2",
    label: "1 snack",
    foods: ["Greek yogurt + berries", "Optional: honey (small)"],
    macros: { calories: 320, protein: 28, carbs: 38, fat: 6 },
    tags: ["high_protein", "quick"],
  };

  return [s1, s2].slice(0, k > 600 ? 2 : 2);
}

function Chip({ text }: { text: string }) {
  const { colors } = useTheme() as any;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.55),
        backgroundColor: withAlpha(colors.card, 0.45),
      }}
    >
      <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 11.5 }}>
        {text}
      </Text>
    </View>
  );
}

export function MacroCompletionCard(props: {
  dateISO: string;
  totals: MacroTotals;
  goals: MacroTotals;
  dietPreferences?: DietPreferencesShape | null;
  style?: any;
}) {
  const { colors, isDark } = useTheme() as any;
  const router = useRouter();

  const rem = useMemo(
    () => computeRemaining(props.goals, props.totals),
    [props.goals, props.totals]
  );
  const focus = useMemo(
    () => prefsChips(props.dietPreferences),
    [props.dietPreferences]
  );

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MacroCompletionResponse | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{
    used: number;
    limit: number;
  } | null>(null);

  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const pulse = useRef(new Animated.Value(0.35)).current;
  const macroChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeedRef = useRef(0);

  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loading, pulse]);

  const shouldAutoLoad = useMemo(() => {
    // Don’t auto-call AI when basically done
    return (
      rem.calories > 120 || rem.protein > 15 || rem.carbs > 25 || rem.fat > 8
    );
  }, [rem]);

  const macroKey = useMemo(
    () =>
      JSON.stringify({
        totals: props.totals,
        goals: props.goals,
        prefs: props.dietPreferences ?? null,
      }),
    [props.totals, props.goals, props.dietPreferences]
  );

  async function load(args?: {
    forceNew?: boolean;
    swapIndex?: number | null;
  }) {
    if (!shouldAutoLoad && !args?.forceNew) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nonce = `${Date.now()}_${requestSeedRef.current++}`;
      const seed = args?.forceNew ? undefined : `${props.dateISO}`;
      console.log("[MacroCompletion] backend request", {
        dateISO: props.dateISO,
        forceNew: !!args?.forceNew,
        swapIndex:
          typeof args?.swapIndex === "number" ? args?.swapIndex : null,
        seed,
      });
      const out = await fetchMacroCompletion({
        dateISO: props.dateISO,
        totals: props.totals,
        goals: props.goals,
        dietPreferences: props.dietPreferences ?? null,
        count: 3,
        forceNew: !!args?.forceNew,
        seed,
        nonce,
        lockedSuggestionIds: lockedIds,
        swapIndex: typeof args?.swapIndex === "number" ? args!.swapIndex : null,
      });

      setData(out);
      if (Number.isFinite(out.quotaUsed) && Number.isFinite(out.quotaLimit)) {
        setQuotaInfo({
          used: Number(out.quotaUsed),
          limit: Number(out.quotaLimit),
        });
      }
      Haptics.selectionAsync();
    } catch (e: any) {
      const errMsg = String(e?.message || "ai_failed");
      if (errMsg.includes("macro_completion_quota")) {
        Alert.alert(
          "Daily limit reached",
          "You’ve reached 3 macro suggestions today. Try again tomorrow."
        );
        setQuotaInfo({ used: 3, limit: 3 });
        setLoading(false);
        return;
      }
      setError(errMsg);
      console.log("[MacroCompletion] fallback", {
        dateISO: props.dateISO,
        error: errMsg,
      });
      // fallback is UI-side, calm
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setExpanded(false);
    setData(null);
    setError(null);
  }, [props.dateISO]);

  useEffect(() => {
    if (macroChangeTimer.current) clearTimeout(macroChangeTimer.current);
    setLockedIds([]);
    if (!expanded) {
      setData(null);
      setError(null);
      return;
    }
    macroChangeTimer.current = setTimeout(() => {
      void load({ forceNew: true });
    }, 220);
    return () => {
      if (macroChangeTimer.current) clearTimeout(macroChangeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, macroKey]);

  const openSuggestions = async () => {
    if (loading) return;
    setExpanded(true);
    if (!data) {
      await load({ forceNew: false });
    }
  };

  const suggestions: MacroCompletionSuggestion[] = useMemo(() => {
    if (data?.suggestions?.length) return data.suggestions;
    if (error) return fallbackSuggestions(rem);
    return [];
  }, [data, error, rem]);

  const title = "Finish the day";
  const subtitle = remainingLabel(rem);

  return (
    <View style={[styles.wrap, props.style]}>
      <View
        style={{
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: withAlpha(colors.border, isDark ? 0.42 : 0.55),
          backgroundColor: withAlpha(colors.card, isDark ? 0.35 : 0.82),
        }}
      >
        <BlurView
          intensity={18}
          tint={isDark ? "dark" : "light"}
          style={{ padding: 14 }}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: withAlpha(colors.primary, 0.16),
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.28),
              }}
            >
              <Ionicons name="sparkles-outline" size={18} color={colors.text} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 15 }}
              >
                {title}
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontWeight: "800",
                  fontSize: 12.5,
                  marginTop: 2,
                }}
              >
                {subtitle}
              </Text>
              {quotaInfo ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.border, 0.45),
                    backgroundColor: withAlpha(colors.surface, 0.55),
                  }}
                >
                  <Text
                    style={{
                      color: colors.muted,
                      fontWeight: "900",
                      fontSize: 11,
                    }}
                  >
                    {quotaInfo.used}/{quotaInfo.limit} today
                  </Text>
                </View>
              ) : null}
            </View>

            {expanded ? (
              <>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    void load({ forceNew: true });
                  }}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: withAlpha(colors.border, 0.55),
                    backgroundColor: pressed
                      ? colors.surface2
                      : withAlpha(colors.surface, 0.55),
                    opacity: loading ? 0.7 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh suggestions"
                  disabled={loading}
                >
                  <Ionicons name="refresh" size={18} color={colors.text} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push("/(modals)/diet-preferences");
                  }}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: withAlpha(colors.border, 0.55),
                    backgroundColor: pressed
                      ? colors.surface2
                      : withAlpha(colors.surface, 0.55),
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Open diet preferences"
                >
                  <Ionicons
                    name="options-outline"
                    size={18}
                    color={colors.text}
                  />
                </Pressable>
              </>
            ) : null}
          </View>

          {/* Remaining macros */}
          <View style={{ marginTop: 12, gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 22 }}
              >
                {rem.calories}{" "}
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "900",
                    fontSize: 13,
                  }}
                >
                  kcal left
                </Text>
              </Text>

              {props.dietPreferences &&
              ((props.dietPreferences.restrictions || []).length ||
                (props.dietPreferences.allergies || []).length ||
                (props.dietPreferences.moreOf || []).length ||
                (props.dietPreferences.avoidLimit || []).length) ? (
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  Personalized
                </Text>
              ) : (
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  Add prefs for tighter matches
                </Text>
              )}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Chip text={`${rem.protein}P`} />
              <Chip text={`${rem.carbs}C`} />
              <Chip text={`${rem.fat}F`} />
              {focus.map((t) => (
                <Chip key={t} text={t} />
              ))}
            </View>
          </View>

          {!expanded ? (
            <View style={{ marginTop: 12 }}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  void openSuggestions();
                }}
                style={({ pressed }) => ({
                  height: 44,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.35),
                  backgroundColor: withAlpha(
                    colors.primary,
                    pressed ? 0.22 : 0.14
                  ),
                })}
                accessibilityRole="button"
                accessibilityLabel="Show macro completion suggestions"
              >
                <Text
                  style={{ color: colors.text, fontWeight: "900", fontSize: 13 }}
                >
                  Show suggestions
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ marginTop: 12, gap: 10 }}>
              {loading ? (
                <View style={{ gap: 10 }}>
                  {[0, 1, 2].map((i) => (
                    <Animated.View
                      key={`sk_${i}`}
                      style={{
                        opacity: pulse,
                        height: 72,
                        borderRadius: 18,
                        backgroundColor: withAlpha(colors.surface, 0.7),
                        borderWidth: 1,
                        borderColor: withAlpha(colors.border, 0.5),
                      }}
                    />
                  ))}
                </View>
              ) : suggestions.length ? (
                <View style={{ gap: 10 }}>
                  {suggestions.slice(0, 4).map((s, idx) => {
                    const locked = lockedIds.includes(s.id);
                    return (
                      <View
                        key={s.id}
                        style={{
                          borderRadius: 18,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: locked
                            ? withAlpha(colors.primary, 0.42)
                            : withAlpha(colors.border, 0.55),
                          backgroundColor: withAlpha(colors.surface, 0.65),
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: "900",
                              fontSize: 13,
                              flex: 1,
                            }}
                          >
                            {s.label}
                          </Text>

                          <Pressable
                            onPress={() => {
                              Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light
                              );
                              setLockedIds((prev) =>
                                prev.includes(s.id)
                                  ? prev.filter((x) => x !== s.id)
                                  : [...prev, s.id]
                              );
                            }}
                            style={({ pressed }) => ({
                              width: 36,
                              height: 36,
                              borderRadius: 14,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor: withAlpha(colors.border, 0.55),
                              backgroundColor: pressed
                                ? colors.surface2
                                : withAlpha(colors.surface, 0.55),
                            })}
                            accessibilityRole="button"
                            accessibilityLabel={
                              locked ? "Unlock suggestion" : "Lock suggestion"
                            }
                          >
                            <Ionicons
                              name={locked ? "pin" : "pin-outline"}
                              size={16}
                              color={colors.text}
                            />
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              Haptics.selectionAsync();
                              void load({ forceNew: true, swapIndex: idx });
                            }}
                            disabled={locked}
                            style={({ pressed }) => ({
                              width: 36,
                              height: 36,
                              borderRadius: 14,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor: withAlpha(colors.border, 0.55),
                              backgroundColor: pressed
                                ? colors.surface2
                                : withAlpha(colors.surface, 0.55),
                              opacity: locked ? 0.45 : 1,
                            })}
                            accessibilityRole="button"
                            accessibilityLabel="Swap this suggestion"
                          >
                            <Ionicons
                              name="shuffle-outline"
                              size={16}
                              color={colors.text}
                            />
                          </Pressable>
                        </View>

                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "900",
                            fontSize: 13.5,
                            marginTop: 6,
                            lineHeight: 18,
                          }}
                        >
                          {s.foods.join(" + ")}
                        </Text>

                        <Text
                          style={{
                            color: colors.muted,
                            fontWeight: "800",
                            fontSize: 12.5,
                            marginTop: 6,
                          }}
                        >
                          ≈ {Math.round(s.macros.calories)} kcal •{" "}
                          {Math.round(s.macros.protein)}P /{" "}
                          {Math.round(s.macros.carbs)}C /{" "}
                          {Math.round(s.macros.fat)}F
                        </Text>

                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          {(s.tags || []).slice(0, 4).map((t) => (
                            <Chip
                              key={`${s.id}_${t}`}
                              text={String(t).replace(/_/g, " ")}
                            />
                          ))}
                          {locked ? <Chip text="locked" /> : null}
                        </View>

                        {s.notes ? (
                          <Text
                            style={{
                              color: colors.muted,
                              fontSize: 12.5,
                              lineHeight: 17,
                              marginTop: 8,
                            }}
                          >
                            {s.notes}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View
                  style={{
                    borderRadius: 18,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.border, 0.55),
                    backgroundColor: withAlpha(colors.surface, 0.6),
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "900",
                      fontSize: 13,
                    }}
                  >
                    {rem.calories <= 120
                      ? "Keep it light."
                      : "No suggestions yet."}
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontWeight: "800",
                      fontSize: 12.5,
                      marginTop: 6,
                    }}
                  >
                    {rem.calories <= 120
                      ? "If you want something: yogurt, fruit, or a small protein snack."
                      : "Tap refresh to generate meal + snack ideas."}
                  </Text>

                  <View
                    style={{ marginTop: 10, flexDirection: "row", gap: 10 }}
                  >
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        void load({ forceNew: true });
                      }}
                      style={({ pressed }) => ({
                        paddingHorizontal: 12,
                        height: 40,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: withAlpha(colors.primary, 0.35),
                        backgroundColor: withAlpha(
                          colors.primary,
                          pressed ? 0.22 : 0.14
                        ),
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="Generate suggestions"
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "900",
                          fontSize: 13,
                        }}
                      >
                        Generate
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        router.push("/(modals)/diet-preferences");
                      }}
                      style={({ pressed }) => ({
                        paddingHorizontal: 12,
                        height: 40,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: withAlpha(colors.border, 0.55),
                        backgroundColor: pressed
                          ? colors.surface2
                          : withAlpha(colors.surface, 0.55),
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="Set preferences"
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "900",
                          fontSize: 13,
                        }}
                      >
                        Preferences
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <Text
                style={{
                  color: colors.muted,
                  fontWeight: "800",
                  fontSize: 12.25,
                  lineHeight: 16,
                }}
              >
                Pick one. You can swap anything. We’ll avoid your restrictions
                and dislikes.
              </Text>
            </View>
          )}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
  },
});
