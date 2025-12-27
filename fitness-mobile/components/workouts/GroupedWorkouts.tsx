// components/workouts/GroupedWorkouts.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import Card from "@/components/Card";
import EmptySuggestions from "@/components/ui/EmptySuggestions";
import { useTheme } from "@/content/ThemeProvider";
import { kgToLb } from "@/utils/units";
import { withAlpha } from "./utils/withAlpha";
import { Field } from "./ui/Field";
import { IconButton } from "./ui/IconButton";
import { GradientButton } from "./ui/GradientButton";
import { SoftButton } from "./ui/SoftButton";
import { Badge } from "./ui/Badge";

type WorkoutRow = {
  id: string;
  date: string;
  exercise: string;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
  sessionId?: string;
  sessionTitle?: string;
  sessionStartedAt?: number;
};

type Session = {
  sessionId: string;
  title?: string;
  items: WorkoutRow[];
};

type Grouped = {
  date: string;
  items: (WorkoutRow | Session)[];
};

type PRFlags = Record<string, { prWeight: boolean; prVolume: boolean }>;

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
  grouped: Grouped[];
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
  prFlags?: PRFlags;
}) {
  const { isDark } = useTheme() as any;
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>(
    {}
  );
  const [collapsedSessions, setCollapsedSessions] = useState<
    Record<string, boolean>
  >({});

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
    <View style={{ paddingHorizontal: 12 }}>
      {grouped.map((block) => {
        const date = block.date;
        const isCollapsed = collapsedDates[date] ?? false;
        const sessions: Session[] = (() => {
          const first = block.items[0] as any;
          if (first && Array.isArray((first as Session).items)) {
            return block.items as Session[];
          }
          return [
            {
              sessionId: `${date}-solo`,
              title: "Workouts",
              items: block.items as WorkoutRow[],
            },
          ];
        })();

        const totals = sessions.reduce(
          (acc, sess) => {
            const sets = sess.items.reduce((s, it) => s + (it.sets || 0), 0);
            const prs = sess.items.reduce((n, it) => {
              const f = prFlags?.[it.id];
              return n + (f?.prWeight || f?.prVolume ? 1 : 0);
            }, 0);
            return {
              sets: acc.sets + sets,
              exercises: acc.exercises + sess.items.length,
              prs: acc.prs + prs,
            };
          },
          { sets: 0, exercises: 0, prs: 0 }
        );

        return (
          <LinearGradient
            key={date}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={[
              withAlpha(colors.card, 0.96),
              withAlpha(colors.card, 0.9),
            ]}
            style={{
              marginTop: 12,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: withAlpha(colors.border, 0.9),
              overflow: "hidden",
            }}
          >
            <Pressable
              onPress={() =>
                setCollapsedDates((prev) => ({
                  ...prev,
                  [date]: !isCollapsed,
                }))
              }
            >
              <GlassHeader colors={colors} isDark={isDark}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Badge
                    tint={withAlpha(colors.primary, 0.16)}
                    border={withAlpha(colors.primary, 0.32)}
                  >
                    <Ionicons
                      name={isCollapsed ? "chevron-forward" : "chevron-down"}
                      size={12}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "900",
                        marginLeft: 6,
                      }}
                    >
                      {date}
                    </Text>
                  </Badge>
                  <Text
                    style={{
                      color: withAlpha(colors.text, 0.72),
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {totals.sets} sets • {totals.exercises} exercises
                    {totals.prs ? ` • ${totals.prs} PRs` : ""}
                  </Text>
                </View>

                {totals.prs > 0 && (
                  <StatChip icon="ribbon-outline" label={`${totals.prs} PRs`} />
                )}
              </GlassHeader>
            </Pressable>

            {isCollapsed ? null : (
              <View style={{ padding: 12, gap: 10 }}>
                {sessions.map((session) => {
                  const sessCollapsed =
                    collapsedSessions[session.sessionId] ?? false;
                  const sessSets = session.items.reduce(
                    (s, it) => s + (it.sets || 0),
                    0
                  );
                  const sessPRs = session.items.reduce((n, it) => {
                    const f = prFlags?.[it.id];
                    return n + (f?.prWeight || f?.prVolume ? 1 : 0);
                  }, 0);

                  return (
                    <View
                      key={session.sessionId}
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: withAlpha(colors.border, 0.9),
                        overflow: "hidden",
                        backgroundColor: withAlpha(colors.card, 0.6),
                      }}
                    >
                      <Pressable
                        onPress={() =>
                          setCollapsedSessions((prev) => ({
                            ...prev,
                            [session.sessionId]: !sessCollapsed,
                          }))
                        }
                      >
                        <LinearGradient
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          colors={[
                            withAlpha(colors.card, 0.92),
                            withAlpha(colors.card, 0.8),
                          ]}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <Badge
                            tint={withAlpha(colors.primary, 0.12)}
                            border={withAlpha(colors.primary, 0.28)}
                          >
                            <Ionicons
                              name={
                                sessCollapsed
                                  ? "chevron-forward"
                                  : "chevron-down"
                              }
                              size={12}
                              color={colors.primary}
                            />
                            <Text
                              style={{
                                color: colors.text,
                                fontWeight: "900",
                                marginLeft: 6,
                              }}
                              numberOfLines={1}
                            >
                              {session.title || "Workout"}
                            </Text>
                          </Badge>

                          <View style={{ flex: 1 }} />

                          <View style={{ flexDirection: "row", gap: 6 }}>
                            <StatChip
                              icon="layers-outline"
                              label={`${sessSets} sets`}
                              compact
                            />
                            <StatChip
                              icon="list-outline"
                              label={`${session.items.length} ex`}
                              compact
                            />
                            {sessPRs > 0 && (
                              <StatChip
                                icon="ribbon-outline"
                                label={`${sessPRs} PRs`}
                                compact
                              />
                            )}
                          </View>
                        </LinearGradient>
                      </Pressable>

                      {sessCollapsed ? null : (
                        <View style={{ padding: 10, gap: 8 }}>
                          <Text
                            style={{
                              color: withAlpha(colors.muted, 0.9),
                              fontSize: 12,
                            }}
                          >
                            Tip: tap to edit, long-press to delete. PR badges mark
                            weight/volume bests.
                          </Text>

                          {session.items.map((w, idx) => {
                            const isTemp = w.id?.startsWith?.("temp-");
                            const isEditing = editId === w.id;
                            const showDivider =
                              idx !== session.items.length - 1 && !isEditing;
                            const badge = prFlags?.[w.id];

                            return (
                              <View key={w.id} style={{ gap: 6 }}>
                                {isEditing ? (
                                  <Card>
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
                                      style={{
                                        flexDirection: "row",
                                        gap: 8,
                                        marginTop: 8,
                                      }}
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
                                      style={{ marginTop: 8 }}
                                    />
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        gap: 8,
                                        marginTop: 10,
                                      }}
                                    >
                                      <SoftButton
                                        label="Cancel"
                                        onPress={onCancelEdit}
                                      />
                                      <GradientButton
                                        label="Save"
                                        onPress={saveEdit}
                                      />
                                    </View>
                                  </Card>
                                ) : (
                                  <Pressable
                                    onPress={() => startEdit(w)}
                                    onLongPress={() =>
                                      Alert.alert(
                                        "Delete workout?",
                                        "Remove this entry?",
                                        [
                                          { text: "Cancel", style: "cancel" },
                                          {
                                            text: "Delete",
                                            style: "destructive",
                                            onPress: () => removeWorkout(w.id),
                                          },
                                        ]
                                      )
                                    }
                                    style={({ pressed }) => ({
                                      borderRadius: 12,
                                      padding: 12,
                                      backgroundColor: pressed
                                        ? withAlpha(colors.primary, 0.08)
                                        : withAlpha(colors.card, 0.6),
                                      borderWidth: 1,
                                      borderColor: withAlpha(colors.border, 0.8),
                                    })}
                                  >
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 10,
                                      }}
                                    >
                                      <LinearGradient
                                        start={{ x: 0, y: 0.5 }}
                                        end={{ x: 0, y: 1 }}
                                        colors={[
                                          withAlpha(colors.primary, 0.16),
                                          withAlpha(colors.primary, 0.08),
                                        ]}
                                        style={{
                                          width: 6,
                                          height: 44,
                                          borderRadius: 4,
                                        }}
                                      />

                                      <View style={{ flex: 1 }}>
                                        <Text
                                          style={{
                                            fontWeight: "900",
                                            color: colors.text,
                                          }}
                                          numberOfLines={1}
                                        >
                                          {w.exercise}
                                          {isTemp && (
                                            <Text style={{ color: colors.muted }}>
                                              {"  "}(saving…)
                                            </Text>
                                          )}
                                        </Text>
                                        <View
                                          style={{
                                            flexDirection: "row",
                                            gap: 8,
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
                                          {badge?.prWeight && (
                                            <PRBadge kind="weight" />
                                          )}
                                          {badge?.prVolume && (
                                            <PRBadge kind="volume" />
                                          )}
                                        </View>
                                      </View>

                                      <IconButton
                                        icon="create-outline"
                                        onPress={() => !isTemp && startEdit(w)}
                                        disabled={isTemp}
                                      />
                                    </View>
                                  </Pressable>
                                )}

                                {showDivider && (
                                  <View
                                    style={{
                                      height: 1,
                                      backgroundColor: colors.border,
                                      marginLeft: 16,
                                    }}
                                  />
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </LinearGradient>
        );
      })}
    </View>
  );
}

function GlassHeader({
  children,
  colors,
  isDark,
}: React.PropsWithChildren<{ colors: any; isDark: boolean }>) {
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
              padding: 12,
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
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {children}
    </LinearGradient>
  );
}

function StatChip({
  icon,
  label,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 6 : 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.3),
        backgroundColor: withAlpha(colors.primary, 0.12),
      }}
    >
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

function MiniChip({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.9),
        backgroundColor: withAlpha(colors.text, 0.06),
      }}
    >
      <Ionicons name={icon} size={12} color={colors.text} />
      <Text style={{ color: colors.text, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

function NotePill({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.2),
        backgroundColor: withAlpha(colors.primary, 0.1),
      }}
    >
      <Text style={{ color: colors.primary, fontWeight: "700" }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function PRBadge({ kind }: { kind: "weight" | "volume" }) {
  const { colors } = useTheme();
  const isWeight = kind === "weight";
  return (
    <View
      style={{
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: isWeight
          ? "rgba(255,207,64,0.18)"
          : "rgba(154,114,255,0.2)",
        borderWidth: 1,
        borderColor: isWeight
          ? "rgba(255,207,64,0.4)"
          : "rgba(154,114,255,0.5)",
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "800" }}>
        {isWeight ? "PR • Weight" : "PR • Volume"}
      </Text>
    </View>
  );
}
