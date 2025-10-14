// components/workouts/GroupedWorkouts.tsx
import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import Card from "@/components/Card";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { kgToLb } from "@/utils/units";
import { withAlpha } from "./utils/withAlpha";
import { Field } from "./ui/Field";
import { IconButton } from "./ui/IconButton";
import { GradientButton } from "./ui/GradientButton";
import { SoftButton } from "./ui/SoftButton";
import { Badge } from "./ui/Badge";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import EmptySuggestions from "@/components/ui/EmptySuggestions";

export default function GroupedWorkouts({
  grouped,
  unit,
  colors,
  editId,
  edit,
  setEdit,
  startEdit,
  saveEdit,
  removeWorkout,
  onCancelEdit,
  prFlags,
}: {
  grouped: Array<{ date: string; items: any[] }>;
  unit: "kg" | "lb";
  colors: any;
  editId: string | null;
  edit: {
    date: string;
    exercise: string;
    sets: string;
    reps: string;
    weight: string;
    notes: string;
  };
  setEdit: React.Dispatch<React.SetStateAction<typeof edit>>;
  startEdit: (w: any) => void;
  saveEdit: () => void;
  removeWorkout: (id: string) => void;
  onCancelEdit: () => void;
  prFlags?: Record<string, { prWeight: boolean; prVolume: boolean }>;
}) {
  const theme = useTheme();
  const { isDark } = theme as any;

  // Empty-state for days with no workouts
  if (!grouped || grouped.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <EmptySuggestions
          emoji="🏖️"
          title="Rest day? Nothing logged yet."
          subtitle="Start with a favorite or browse exercises."
          actions={[]}
        />
      </View>
    );
  }

  return (
    <>
      {grouped.map(({ date, items }) => {
        const totalSets = items.reduce((s, it) => s + (it.sets || 0), 0);
        return (
          <Card key={date} style={{ gap: 10, paddingTop: 10 }}>
            {/* Glassy date header with quick stats */}
            <GlassHeader>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                }}
              >
                <Badge
                  tint={withAlpha(colors.primary, 0.18)}
                  border={withAlpha(colors.primary, 0.35)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: "700",
                      marginLeft: 4,
                    }}
                  >
                    {date}
                  </Text>
                </Badge>
              </View>

              <View style={{ flexDirection: "row", gap: 6 }}>
                <StatChip icon="layers-outline" label={`${totalSets} sets`} />
                <StatChip
                  icon="barbell-outline"
                  label={`${items.length} exercises`}
                />
              </View>
            </GlassHeader>

            {/* Rows or per-day empty hint */}
            {items.length === 0 ? (
              <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                <EmptySuggestions
                  emoji="💪"
                  title="No exercises here yet"
                  subtitle="Tap the Add workout form above to log your first set."
                  actions={[]}
                />
              </View>
            ) : (
              items.map((w, idx) => {
                const isTemp = w.id.startsWith?.("temp-");
                const isEditing = editId === w.id;
                const showDivider = idx !== items.length - 1 && !isEditing;

                return (
                  <View key={w.id} style={{ paddingTop: 6 }}>
                    {isEditing ? (
                      <GlassPanel>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Field
                            icon="today-outline"
                            value={edit.date}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, date: v }))
                            }
                          />
                          <Field
                            icon="barbell-outline"
                            value={edit.exercise}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, exercise: v }))
                            }
                          />
                        </View>
                        <View
                          style={{ flexDirection: "row", gap: 8, marginTop: 8 }}
                        >
                          <Field
                            icon="layers-outline"
                            placeholder="Sets"
                            value={edit.sets}
                            onChangeText={(v) =>
                              setEdit((e) => ({
                                ...e,
                                sets: v.replace(/[^0-9]/g, ""),
                              }))
                            }
                            inputMode="numeric"
                          />
                          <Field
                            icon="repeat-outline"
                            placeholder="Reps"
                            value={edit.reps}
                            onChangeText={(v) =>
                              setEdit((e) => ({
                                ...e,
                                reps: v.replace(/[^0-9]/g, ""),
                              }))
                            }
                            inputMode="numeric"
                          />
                          <Field
                            icon="speedometer-outline"
                            placeholder={`Weight (${unit})`}
                            value={edit.weight}
                            onChangeText={(v) =>
                              setEdit((e) => ({
                                ...e,
                                weight: v.replace(/[^0-9.]/g, ""),
                              }))
                            }
                            inputMode="decimal"
                          />
                        </View>
                        <Field
                          icon="document-text-outline"
                          placeholder="Notes"
                          value={edit.notes}
                          onChangeText={(v) =>
                            setEdit((e) => ({ ...e, notes: v }))
                          }
                        />

                        <View
                          style={{ flexDirection: "row", gap: 8, marginTop: 8 }}
                        >
                          <SoftButton
                            label="Cancel"
                            onPress={() => {
                              onCancelEdit();
                            }}
                          />
                          <GradientButton label="Save" onPress={saveEdit} />
                        </View>
                      </GlassPanel>
                    ) : (
                      <Pressable
                        onPress={() => startEdit(w)}
                        android_ripple={{
                          color: withAlpha(colors.primary, 0.12),
                        }}
                        style={({ pressed }) => [
                          {
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            borderRadius: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: pressed
                              ? withAlpha(colors.primary, 0.06)
                              : "transparent",
                          },
                        ]}
                      >
                        {/* Left block: accent bar + text */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            flex: 1,
                          }}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 40,
                              backgroundColor: withAlpha(colors.primary, 0.6),
                              borderRadius: 3,
                            }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ fontWeight: "800", color: colors.text }}
                              numberOfLines={1}
                            >
                              {w.exercise}
                              {isTemp && (
                                <Text style={{ color: colors.muted }}>
                                  {"  "}(saving…)
                                </Text>
                              )}
                            </Text>

                            {/* Chips row: scheme + weight */}
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 6,
                                marginTop: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <MiniChip
                                icon="grid-outline"
                                text={`${w.sets ?? 0}×${w.reps ?? 0}`}
                              />
                              <MiniChip
                                icon="speedometer-outline"
                                text={`${
                                  unit === "lb"
                                    ? Math.round(kgToLb(w.weight || 0))
                                    : Math.round(w.weight || 0)
                                } ${unit}`}
                              />
                              {!!w.notes && <NotePill text={w.notes} />}
                              {prFlags?.[w.id]?.prWeight && (
                                <PRBadge kind="weight" />
                              )}
                              {prFlags?.[w.id]?.prVolume && (
                                <PRBadge kind="volume" />
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Actions */}
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <IconButton
                            icon="create-outline"
                            onPress={() => !isTemp && startEdit(w)}
                            disabled={isTemp}
                          />
                          <IconButton
                            icon="trash-outline"
                            onPress={() => removeWorkout(w.id)}
                            danger
                          />
                        </View>
                      </Pressable>
                    )}

                    {showDivider && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: colors.border,
                          marginLeft: 18,
                          marginTop: 8,
                        }}
                      />
                    )}
                  </View>
                );
              })
            )}
          </Card>
        );
      })}
    </>
  );
}

/* ───────────────────────────── UI helpers ───────────────────────────── */

function GlassHeader({ children }: React.PropsWithChildren) {
  const { colors, isDark } = useTheme() as any;
  if (Platform.OS === "ios") {
    return (
      <View
        style={{
          borderRadius: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <BlurView
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          intensity={18}
        >
          <LinearGradient
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={[
              withAlpha(colors.primary, 0.08),
              withAlpha(colors.primary, 0.14),
            ]}
            style={{ position: "absolute", inset: 0 }}
          />
          <View
            style={{
              padding: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {children}
          </View>
        </BlurView>
      </View>
    );
  }
  return (
    <LinearGradient
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      colors={[
        withAlpha(colors.primary, 0.06),
        withAlpha(colors.primary, 0.12),
      ]}
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {children}
    </LinearGradient>
  );
}

function GlassPanel({ children }: React.PropsWithChildren) {
  const { colors, isDark } = useTheme() as any;
  if (Platform.OS === "ios") {
    return (
      <View
        style={{
          borderRadius: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <BlurView
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          intensity={18}
        >
          <LinearGradient
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={[
              withAlpha(colors.primary, 0.06),
              withAlpha(colors.primary, 0.1),
            ]}
            style={{ position: "absolute", inset: 0 }}
          />
          <View style={{ padding: 10, gap: 8 }}>{children}</View>
        </BlurView>
      </View>
    );
  }
  return (
    <LinearGradient
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      colors={[withAlpha(colors.primary, 0.05), withAlpha(colors.primary, 0.1)]}
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
      }}
    >
      <View style={{ gap: 8 }}>{children}</View>
    </LinearGradient>
  );
}

function StatChip({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: withAlpha(colors.primary, 0.12),
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.28),
      }}
    >
      <Ionicons name={icon} size={13} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

function MiniChip({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: withAlpha(colors.text, 0.06),
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name={icon} size={12} color={colors.muted} />
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>
        {text}
      </Text>
    </View>
  );
}

function NotePill({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        maxWidth: "60%",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: withAlpha(colors.primary, 0.08),
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.2),
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
        {text}
      </Text>
    </View>
  );
}
function PRBadge({
  kind, // "weight" | "volume"
}: {
  kind: "weight" | "volume";
}) {
  const { colors, isDark } = useTheme() as any;

  // gold for weight PR, royal for volume PR
  const palette =
    kind === "weight"
      ? { a: "#F7C948", b: "#F59E0B", border: "#EAB308" } // gold → amber
      : { a: "#C084FC", b: "#8B5CF6", border: "#7C3AED" }; // lilac → violet

  return (
    <View
      style={{
        borderRadius: 999,
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor: palette.border,
      }}
    >
      <LinearGradient
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        colors={[palette.a, palette.b]}
        style={{
          paddingVertical: 7, // a tad bigger than your MiniChip
          paddingHorizontal: 12, // comfy touch target
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Ionicons
          name={kind === "weight" ? "trophy-outline" : "trophy"}
          size={14}
          color={isDark ? "#1f2937" : "#111827"} // dark ink for contrast on the gradient
        />
        <Text
          style={{
            fontWeight: "900",
            fontSize: 12.5,
            color: isDark ? "#111827" : "#0b0f18",
            letterSpacing: 0.2,
          }}
        >
          {kind === "weight" ? "PR • Weight" : "PR • Volume"}
        </Text>
      </LinearGradient>
    </View>
  );
}
