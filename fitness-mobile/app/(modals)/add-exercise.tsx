// app/(modals)/add-exercise.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert as RNAlert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { withAlpha } from "@/components/workouts/utils/withAlpha";
import ExerciseSearchSheet from "@/components/workouts/ExerciseSearchSheet";
import {
  subscribeWorkoutPresets,
  deleteWorkoutPreset,
  type WorkoutPreset,
} from "@/services/presets";

type PresetCard = {
  id: string;
  name: string;
  exercise?: string;
  sets: number;
  reps: number;
  weight: number; // kg
  notes?: string;
};

export default function AddExerciseModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ hint?: string }>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [presets, setPresets] = useState<WorkoutPreset[]>([]);

  const safePresets: PresetCard[] = useMemo(
    () =>
      (presets || [])
        .filter((p) => p?.name)
        .map((p) => ({
          id: p.id,
          name: p.name,
          exercise: (p as any).exercise,
          sets: Number((p as any).sets || 0),
          reps: Number((p as any).reps || 0),
          weight: Number((p as any).weight || 0),
          notes: (p as any).notes || "",
        })),
    [presets]
  );

  React.useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeWorkoutPresets(user.uid, (rows) =>
      setPresets(rows || [])
    );
    return () => unsub?.();
  }, [user?.uid]);

  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return safePresets.slice(0, 8);
    return safePresets
      .filter((p) => {
        const ex = (p.exercise || "").toLowerCase();
        const nm = (p.name || "").toLowerCase();
        return ex.includes(q) || nm.includes(q);
      })
      .slice(0, 12);
  }, [safePresets, query]);

  function close() {
    router.back();
  }

  async function chooseExercise(name: string) {
    const ex = (name || "").trim();
    if (!ex) return;
    try {
      await Haptics.selectionAsync();
    } catch {}
    router.replace({
      pathname: "/workouts/session",
      params: { pickedExercise: ex, pickedFrom: "manual" },
    } as any);
  }

  async function choosePreset(p: PresetCard) {
    const ex = (p.exercise || p.name || "").trim();
    if (!ex) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.replace({
      pathname: "/workouts/session",
      params: {
        pickedExercise: ex,
        pickedFrom: "preset",
        presetId: p.id,
        presetSets: String(p.sets || 1),
        presetReps: String(p.reps || 10),
        presetWeightKg: String(p.weight || 0),
      },
    } as any);
  }

  async function deletePreset(p: PresetCard) {
    if (!user?.uid) return;
    RNAlert.alert("Delete preset?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteWorkoutPreset(user.uid!, p.id);
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch {}
        },
      },
    ]);
  }

  return (
    <Modal animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, padding: 14, paddingTop: 26 }}>
            <GlassCard>
              <Row between>
                <Row gap={10}>
                  <Pressable
                    onPress={close}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: withAlpha(colors.text, 0.06),
                    }}
                  >
                    <Ionicons
                      name="close-outline"
                      size={22}
                      color={colors.text}
                    />
                  </Pressable>
                  <View>
                    <Text
                      style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
                    >
                      Add exercise
                    </Text>
                    <Text style={{ color: colors.muted, marginTop: 4 }}>
                      Search or pick a preset
                    </Text>
                  </View>
                </Row>
              </Row>

              <View style={{ marginTop: 12 }}>
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.primary, 0.2),
                    backgroundColor: withAlpha(colors.text, 0.06),
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Ionicons
                      name="barbell-outline"
                      size={18}
                      color={colors.muted}
                    />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder={
                        params.hint ? `e.g., ${params.hint}` : "e.g., Lat Pulldown"
                      }
                      placeholderTextColor={colors.muted}
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontWeight: "900",
                        fontSize: 15,
                        paddingVertical: 4,
                      }}
                      returnKeyType="done"
                      onSubmitEditing={() => chooseExercise(query)}
                    />
                    {query.trim().length > 0 && (
                      <Pressable onPress={() => setQuery("")} hitSlop={10}>
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={colors.muted}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <Pressable
                    onPress={() => chooseExercise(query)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 46,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: withAlpha(colors.primary, 0.18),
                      borderWidth: 1,
                      borderColor: withAlpha(colors.primary, 0.4),
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Row gap={8}>
                      <Ionicons name="flash-outline" size={16} color={colors.text} />
                      <Text style={{ color: colors.text, fontWeight: "900" }}>
                        Add exercise
                      </Text>
                    </Row>
                  </Pressable>

                  <Pressable
                    onPress={() => setSearchOpen(true)}
                    style={({ pressed }) => ({
                      width: 46,
                      height: 46,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: withAlpha(colors.text, 0.06),
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Ionicons name="search-outline" size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            </GlassCard>

            <View style={{ height: 14 }} />

            <GlassCard>
              <Row between>
                <Row gap={10}>
                  <Ionicons name="bookmarks-outline" size={16} color={colors.text} />
                  <View>
                    <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
                      Presets
                    </Text>
                    <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>
                      Quick add from your saved presets
                    </Text>
                  </View>
                </Row>
              </Row>

              <ScrollView
                style={{ marginTop: 10, maxHeight: 320 }}
                contentContainerStyle={{ gap: 10 }}
                keyboardShouldPersistTaps="handled"
              >
                {filteredPresets.length === 0 ? (
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: withAlpha(colors.text, 0.06),
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                      No presets found
                    </Text>
                    <Text style={{ color: colors.muted, marginTop: 6 }}>
                      Try a different search, or add manually.
                    </Text>
                  </View>
                ) : (
                  filteredPresets.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => choosePreset(p)}
                      onLongPress={() => deletePreset(p)}
                      style={({ pressed }) => ({
                        padding: 12,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: withAlpha(colors.primary, 0.18),
                        backgroundColor: withAlpha(
                          colors.text,
                          isDark ? 0.08 : 0.06
                        ),
                        opacity: pressed ? 0.92 : 1,
                      })}
                    >
                      <Row between>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: "1000" as any,
                            }}
                          >
                            {p.name}
                          </Text>
                          <Text style={{ color: colors.muted, marginTop: 4 }}>
                            {(p.exercise || "").trim() ? `${p.exercise} • ` : ""}
                            {p.sets}×{p.reps} • {Math.round(p.weight * 100) / 100} kg
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: withAlpha(colors.text, 0.06),
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name="arrow-forward-outline"
                            size={18}
                            color={colors.muted}
                          />
                        </View>
                      </Row>
                    </Pressable>
                  ))
                )}

                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Tip: long-press a preset to delete.
                </Text>
              </ScrollView>
            </GlassCard>

            <ExerciseSearchSheet
              open={searchOpen}
              onClose={() => setSearchOpen(false)}
              suggested={safePresets.map((p) => p.name)}
              onPick={(name) => {
                setSearchOpen(false);
                chooseExercise(name);
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Row({
  children,
  gap = 0,
  between,
  style,
}: React.PropsWithChildren<{ gap?: number; between?: boolean; style?: any }>) {
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap },
        between && { justifyContent: "space-between" },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function GlassCard({
  children,
  accent = true,
}: React.PropsWithChildren<{ accent?: boolean }>) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={{
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.9),
        backgroundColor: colors.card,
        shadowColor: "#000",
        shadowOpacity: isDark ? 0.22 : 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      <LinearGradient
        colors={
          accent
            ? [
                withAlpha(colors.primary, isDark ? 0.16 : 0.11),
                withAlpha(colors.text, 0.03),
              ]
            : [withAlpha(colors.text, 0.02), withAlpha(colors.text, 0.01)]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <BlurView
        intensity={isDark ? 24 : 18}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={{ padding: 14 }}>{children}</View>
    </View>
  );
}
