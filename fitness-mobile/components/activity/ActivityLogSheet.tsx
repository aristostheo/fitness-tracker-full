// components/activity/ActivityLogSheet.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  AccessibilityInfo,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { MotiView, AnimatePresence } from "moti";

import type {
  ActivityEntry,
  ActivityGoal,
  ActivityIntensity,
  ActivityType,
} from "./activityTypes";
import {
  emojiForType,
  intensityLabel,
  labelForType,
  uid,
  clamp,
} from "./activityUtils";

// If you already have these in your app, keep them.
// Otherwise this file still works with simple inline styles.
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

type Props = {
  visible: boolean;
  onClose: () => void;

  goal?: ActivityGoal;

  // If provided -> edit mode
  editing?: ActivityEntry | null;

  onCreate: (entry: ActivityEntry) => void;
  onUpdate: (entry: ActivityEntry) => void;
  onDelete: (id: string) => void;

  // Optional presets to match your brand (can omit)
  presets?: Array<{
    type: ActivityType;
    minutes: number;
    intensity: ActivityIntensity;
    label?: string;
  }>;
};

type Tab = "quick" | "log";

export default function ActivityLogSheet({
  visible,
  onClose,
  editing,
  onCreate,
  onUpdate,
  onDelete,
  presets,
}: Props) {
  const { colors, isDark } = useTheme();

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  const defaultPresets =
    presets ??
    ([
      { type: "walk", minutes: 10, intensity: "easy", label: "Walk 10" },
      { type: "run", minutes: 20, intensity: "moderate", label: "Run 20" },
      { type: "bike", minutes: 20, intensity: "moderate", label: "Bike 20" },
      { type: "stretch", minutes: 10, intensity: "easy", label: "Stretch 10" },
    ] as const);

  const [tab, setTab] = useState<Tab>("quick");

  // form state
  const [type, setType] = useState<ActivityType>("walk");
  const [minutes, setMinutes] = useState<string>("20");
  const [intensity, setIntensity] = useState<ActivityIntensity>("moderate");
  const [calories, setCalories] = useState<string>("");
  const [steps, setSteps] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setTab("log");
      setType(editing.type);
      setMinutes(String(editing.minutes ?? 0));
      setIntensity(editing.intensity ?? "moderate");
      setCalories(editing.calories != null ? String(editing.calories) : "");
      setSteps(editing.steps != null ? String(editing.steps) : "");
      setNote(editing.note ?? "");
    } else {
      setTab("quick");
      setType("walk");
      setMinutes("20");
      setIntensity("moderate");
      setCalories("");
      setSteps("");
      setNote("");
    }
  }, [visible, editing]);

  const softCard = useMemo(
    () => ({
      backgroundColor: isDark
        ? withAlpha("#0b1220", 0.72)
        : withAlpha("#ffffff", 0.82),
      borderColor: withAlpha(colors.border, isDark ? 0.25 : 0.6),
      borderWidth: 1,
      borderRadius: 22,
    }),
    [colors.border, isDark]
  );

  const hairline = useMemo(
    () => ({
      height: 1,
      backgroundColor: withAlpha(colors.border, isDark ? 0.22 : 0.6),
    }),
    [colors.border, isDark]
  );

  function hapticLight() {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }
  function hapticSuccess() {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
  }

  function parseNum(v: string) {
    const n = Number(String(v).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function saveFromForm() {
    const m = clamp(Math.round(parseNum(minutes)), 1, 600);
    const c = calories.trim()
      ? clamp(Math.round(parseNum(calories)), 0, 5000)
      : undefined;
    const s = steps.trim()
      ? clamp(Math.round(parseNum(steps)), 0, 200000)
      : undefined;

    const entry: ActivityEntry = {
      id: editing?.id ?? uid(),
      type,
      minutes: m,
      intensity,
      calories: c,
      steps: s,
      note: note.trim() ? note.trim() : undefined,
      timestamp: editing?.timestamp ?? Date.now(),
    };

    if (editing) onUpdate(entry);
    else onCreate(entry);

    hapticSuccess();
    onClose();
  }

  function quickAdd(p: {
    type: ActivityType;
    minutes: number;
    intensity: ActivityIntensity;
  }) {
    hapticLight();
    const entry: ActivityEntry = {
      id: uid(),
      type: p.type,
      minutes: p.minutes,
      intensity: p.intensity,
      timestamp: Date.now(),
    };
    onCreate(entry);
    hapticSuccess();
    onClose();
  }

  function confirmDelete() {
    if (!editing) return;
    hapticLight();
    Alert.alert("Delete activity?", "This removes it from your log.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete(editing.id);
          onClose();
        },
      },
    ]);
  }

  const types: ActivityType[] = [
    "walk",
    "run",
    "bike",
    "stairs",
    "sport",
    "yoga",
    "stretch",
    "other",
  ];
  const intensities: ActivityIntensity[] = ["easy", "moderate", "hard"];

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? "none" : "slide"}
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: withAlpha("#000", 0.42),
          padding: 16,
          justifyContent: "flex-end",
        }}
        accessibilityRole="button"
        accessibilityLabel="Close activity logging"
      >
        <Pressable
          onPress={() => {}}
          style={[softCard, { padding: 14, maxHeight: "86%" }]}
          accessibilityRole="summary"
          accessibilityLabel={editing ? "Edit activity" : "Log activity"}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(
                    colors.primary,
                    isDark ? 0.18 : 0.12
                  ),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, isDark ? 0.25 : 0.2),
                }}
              >
                <Text style={{ fontSize: 18 }}>{emojiForType(type)}</Text>
              </View>
              <View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "800",
                  }}
                >
                  {editing ? "Edit Activity" : "Log Activity"}
                </Text>
                <Text
                  style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}
                >
                  Optional • quick wins add up
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {/* Segmented */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: withAlpha(colors.card, isDark ? 0.35 : 0.75),
              borderRadius: 14,
              padding: 4,
              borderWidth: 1,
              borderColor: withAlpha(colors.border, isDark ? 0.22 : 0.55),
              marginBottom: 12,
            }}
            accessible
            accessibilityRole="tablist"
          >
            {(["quick", "log"] as Tab[]).map((k) => {
              const active = tab === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => {
                    hapticLight();
                    setTab(k);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: active
                      ? withAlpha(colors.primary, isDark ? 0.22 : 0.16)
                      : "transparent",
                    borderWidth: active ? 1 : 0,
                    borderColor: active
                      ? withAlpha(colors.primary, isDark ? 0.28 : 0.22)
                      : "transparent",
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={
                    k === "quick" ? "Quick add tab" : "Log tab"
                  }
                >
                  <Text
                    style={{
                      color: active ? colors.text : colors.muted,
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    {k === "quick" ? "Quick Add" : "Log"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={hairline} />

          <ScrollView
            style={{ marginTop: 12 }}
            contentContainerStyle={{ paddingBottom: 14 }}
            showsVerticalScrollIndicator={false}
          >
            <AnimatePresence>
              {tab === "quick" ? (
                <MotiView
                  key="quick"
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: 8 }}
                  transition={{
                    type: "timing",
                    duration: reduceMotion ? 0 : 220,
                  }}
                >
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      fontWeight: "900",
                      letterSpacing: 0.6,
                    }}
                  >
                    SUGGESTED
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    {defaultPresets.map((p, idx) => (
                      <Pressable
                        key={`${p.type}-${p.minutes}-${idx}`}
                        onPress={() => quickAdd(p)}
                        style={{
                          flexBasis: "48%",
                          padding: 12,
                          borderRadius: 16,
                          backgroundColor: withAlpha(
                            colors.card,
                            isDark ? 0.28 : 0.7
                          ),
                          borderWidth: 1,
                          borderColor: withAlpha(
                            colors.border,
                            isDark ? 0.22 : 0.55
                          ),
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Quick add ${labelForType(
                          p.type
                        )} ${p.minutes} minutes ${intensityLabel(p.intensity)}`}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text
                            style={{ color: colors.text, fontWeight: "900" }}
                          >
                            {p.label ?? `${labelForType(p.type)} ${p.minutes}`}
                          </Text>
                          <Text style={{ fontSize: 16 }}>
                            {emojiForType(p.type)}
                          </Text>
                        </View>
                        <Text
                          style={{
                            color: colors.muted,
                            marginTop: 6,
                            fontSize: 12,
                          }}
                        >
                          {intensityLabel(p.intensity)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setTab("log");
                    }}
                    style={{
                      marginTop: 14,
                      paddingVertical: 12,
                      borderRadius: 16,
                      alignItems: "center",
                      backgroundColor: withAlpha(
                        colors.primary,
                        isDark ? 0.18 : 0.12
                      ),
                      borderWidth: 1,
                      borderColor: withAlpha(
                        colors.primary,
                        isDark ? 0.25 : 0.2
                      ),
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Switch to full logging form"
                  >
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                      More options
                    </Text>
                  </Pressable>
                </MotiView>
              ) : (
                <MotiView
                  key="log"
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: 8 }}
                  transition={{
                    type: "timing",
                    duration: reduceMotion ? 0 : 220,
                  }}
                >
                  {/* Type */}
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      fontWeight: "900",
                      letterSpacing: 0.6,
                    }}
                  >
                    TYPE
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 10,
                    }}
                  >
                    {types.map((t) => {
                      const active = type === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => {
                            hapticLight();
                            setType(t);
                          }}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 999,
                            backgroundColor: active
                              ? withAlpha(colors.primary, isDark ? 0.22 : 0.16)
                              : withAlpha(colors.card, isDark ? 0.22 : 0.72),
                            borderWidth: 1,
                            borderColor: active
                              ? withAlpha(colors.primary, isDark ? 0.28 : 0.22)
                              : withAlpha(colors.border, isDark ? 0.22 : 0.55),
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${labelForType(t)}`}
                          accessibilityState={{ selected: active }}
                        >
                          <Text style={{ fontSize: 14 }}>
                            {emojiForType(t)}
                          </Text>
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: "800",
                              fontSize: 13,
                            }}
                          >
                            {labelForType(t)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Duration + Intensity */}
                  <View
                    style={{ flexDirection: "row", gap: 10, marginTop: 14 }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 12,
                          fontWeight: "900",
                          letterSpacing: 0.6,
                        }}
                      >
                        MINUTES
                      </Text>
                      <View
                        style={{
                          marginTop: 8,
                          borderRadius: 16,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: withAlpha(
                            colors.card,
                            isDark ? 0.22 : 0.72
                          ),
                          borderWidth: 1,
                          borderColor: withAlpha(
                            colors.border,
                            isDark ? 0.22 : 0.55
                          ),
                        }}
                      >
                        <TextInput
                          value={minutes}
                          onChangeText={(v) =>
                            setMinutes(v.replace(/[^\d]/g, ""))
                          }
                          keyboardType="number-pad"
                          placeholder="20"
                          placeholderTextColor={withAlpha(colors.muted, 0.6)}
                          style={{
                            color: colors.text,
                            fontWeight: "900",
                            fontSize: 16,
                          }}
                          accessibilityLabel="Minutes"
                        />
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 12,
                          fontWeight: "900",
                          letterSpacing: 0.6,
                        }}
                      >
                        INTENSITY
                      </Text>
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 8 }}
                      >
                        {intensities.map((i) => {
                          const active = intensity === i;
                          return (
                            <Pressable
                              key={i}
                              onPress={() => {
                                hapticLight();
                                setIntensity(i);
                              }}
                              style={{
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: 14,
                                alignItems: "center",
                                backgroundColor: active
                                  ? withAlpha(
                                      colors.primary,
                                      isDark ? 0.22 : 0.16
                                    )
                                  : withAlpha(
                                      colors.card,
                                      isDark ? 0.22 : 0.72
                                    ),
                                borderWidth: 1,
                                borderColor: active
                                  ? withAlpha(
                                      colors.primary,
                                      isDark ? 0.28 : 0.22
                                    )
                                  : withAlpha(
                                      colors.border,
                                      isDark ? 0.22 : 0.55
                                    ),
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={`Set intensity ${intensityLabel(
                                i
                              )}`}
                              accessibilityState={{ selected: active }}
                            >
                              <Text
                                style={{
                                  color: colors.text,
                                  fontWeight: "900",
                                  fontSize: 12,
                                }}
                              >
                                {intensityLabel(i)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  {/* Optional fields */}
                  <View
                    style={{ flexDirection: "row", gap: 10, marginTop: 14 }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 12,
                          fontWeight: "900",
                          letterSpacing: 0.6,
                        }}
                      >
                        CALORIES (OPTIONAL)
                      </Text>
                      <View
                        style={{
                          marginTop: 8,
                          borderRadius: 16,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: withAlpha(
                            colors.card,
                            isDark ? 0.22 : 0.72
                          ),
                          borderWidth: 1,
                          borderColor: withAlpha(
                            colors.border,
                            isDark ? 0.22 : 0.55
                          ),
                        }}
                      >
                        <TextInput
                          value={calories}
                          onChangeText={(v) =>
                            setCalories(v.replace(/[^\d]/g, ""))
                          }
                          keyboardType="number-pad"
                          placeholder="—"
                          placeholderTextColor={withAlpha(colors.muted, 0.6)}
                          style={{
                            color: colors.text,
                            fontWeight: "800",
                            fontSize: 14,
                          }}
                          accessibilityLabel="Calories optional"
                        />
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 12,
                          fontWeight: "900",
                          letterSpacing: 0.6,
                        }}
                      >
                        STEPS (OPTIONAL)
                      </Text>
                      <View
                        style={{
                          marginTop: 8,
                          borderRadius: 16,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: withAlpha(
                            colors.card,
                            isDark ? 0.22 : 0.72
                          ),
                          borderWidth: 1,
                          borderColor: withAlpha(
                            colors.border,
                            isDark ? 0.22 : 0.55
                          ),
                        }}
                      >
                        <TextInput
                          value={steps}
                          onChangeText={(v) =>
                            setSteps(v.replace(/[^\d]/g, ""))
                          }
                          keyboardType="number-pad"
                          placeholder="—"
                          placeholderTextColor={withAlpha(colors.muted, 0.6)}
                          style={{
                            color: colors.text,
                            fontWeight: "800",
                            fontSize: 14,
                          }}
                          accessibilityLabel="Steps optional"
                        />
                      </View>
                    </View>
                  </View>

                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      fontWeight: "900",
                      letterSpacing: 0.6,
                      marginTop: 14,
                    }}
                  >
                    NOTES (OPTIONAL)
                  </Text>
                  <View
                    style={{
                      marginTop: 8,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: withAlpha(
                        colors.card,
                        isDark ? 0.22 : 0.72
                      ),
                      borderWidth: 1,
                      borderColor: withAlpha(
                        colors.border,
                        isDark ? 0.22 : 0.55
                      ),
                    }}
                  >
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="Felt easy. Fresh air. Nice."
                      placeholderTextColor={withAlpha(colors.muted, 0.6)}
                      style={{
                        color: colors.text,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                      accessibilityLabel="Notes optional"
                      multiline
                    />
                  </View>

                  {/* Actions */}
                  <View
                    style={{ flexDirection: "row", gap: 10, marginTop: 16 }}
                  >
                    {editing ? (
                      <Pressable
                        onPress={confirmDelete}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 16,
                          alignItems: "center",
                          backgroundColor: withAlpha(
                            "#ff3b30",
                            isDark ? 0.14 : 0.1
                          ),
                          borderWidth: 1,
                          borderColor: withAlpha(
                            "#ff3b30",
                            isDark ? 0.22 : 0.2
                          ),
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Delete activity"
                      >
                        <Text style={{ color: colors.text, fontWeight: "900" }}>
                          Delete
                        </Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      onPress={saveFromForm}
                      style={{
                        flex: 2,
                        paddingVertical: 12,
                        borderRadius: 16,
                        alignItems: "center",
                        backgroundColor: withAlpha(
                          colors.primary,
                          isDark ? 0.22 : 0.16
                        ),
                        borderWidth: 1,
                        borderColor: withAlpha(
                          colors.primary,
                          isDark ? 0.28 : 0.22
                        ),
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        editing ? "Save changes" : "Save activity"
                      }
                    >
                      <Text style={{ color: colors.text, fontWeight: "900" }}>
                        {editing ? "Save changes" : "Save"}
                      </Text>
                    </Pressable>
                  </View>
                </MotiView>
              )}
            </AnimatePresence>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
