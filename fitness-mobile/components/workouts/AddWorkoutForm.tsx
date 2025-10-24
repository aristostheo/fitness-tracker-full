// components/workouts/AddWorkoutForm.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  Modal,
  StyleSheet, // <- add this
} from "react-native";

import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "./utils/withAlpha";
import { Field } from "./ui/Field";
import { GradientButton } from "./ui/GradientButton";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

// Optional native date picker (shown inside our modal)
let DateTimePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {}

/** Props unchanged — your logic stays the same. */
export default function AddWorkoutForm({
  unit,
  todayISO,
  suggested,
  safePresets,
  conflictWarning,
  nextWeightSuggestion,
  addDisabled,
  date,
  setDate,
  exercise,
  setExercise,
  sets,
  setSets,
  reps,
  setReps,
  weight,
  setWeight,
  notes,
  setNotes,
  onAdd,
  newPreset,
  setNewPreset,
  onSavePreset,
  onClear,
  onOpenSearch,
}: {
  unit: "kg" | "lb";
  todayISO: string;
  suggested: string[];
  safePresets: Array<{ id: string; name: string }>;
  conflictWarning: { alt?: string } | null;
  nextWeightSuggestion: { next: number; prev: number } | null;
  addDisabled: boolean;
  date: string;
  setDate: (v: string) => void;
  exercise: string;
  setExercise: (v: string) => void;
  sets: string;
  setSets: (v: string) => void;
  reps: string;
  setReps: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onAdd: () => void;
  newPreset: string;
  setNewPreset: (v: string) => void;
  onSavePreset: () => void;
  onClear: () => void;
  onOpenSearch: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [presetsOpen, setPresetsOpen] = useState(true);

  // calendar modal state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(parseISOToDate(date || todayISO));

  const hasSuggestion = !!(exercise.trim() && nextWeightSuggestion);
  const prevStr = hasSuggestion
    ? String((nextWeightSuggestion as any).prev)
    : "";
  const nextStr = hasSuggestion
    ? String((nextWeightSuggestion as any).next)
    : "";
  const canSavePreset = newPreset.trim().length > 0;

  const weightStep = unit === "lb" ? 5 : 2.5;

  const helper = useMemo(() => {
    if (!exercise.trim()) return "Pick a preset or type an exercise.";
    if (conflictWarning)
      return "This may aggravate an injury. Consider the alternative shown.";
    if (hasSuggestion) return `Suggested weight: ${nextStr} ${unit}`;
    return "Fill sets, reps, and weight, then tap Add.";
  }, [exercise, conflictWarning, hasSuggestion, nextStr, unit]);

  function incInt(v: string, d = 1, min = 0, max = 999) {
    const n = Number(v || 0);
    return String(Math.max(min, Math.min(max, n + d)));
  }
  function incDec(v: string, step: number) {
    const n = Number(v || 0);
    const out = Math.max(0, n + step);
    return String(Math.round(out * 10) / 10);
  }

  // date helpers
  function parseISOToDate(s: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return new Date();
    const [y, m, d] = s.split("-").map((x) => Number(x));
    return new Date(y, (m || 1) - 1, d || 1);
  }
  function toISO(d: Date) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function shiftISO(baseISO: string, days: number) {
    const base = parseISOToDate(baseISO);
    base.setDate(base.getDate() + days);
    return toISO(base);
  }
  const todayFromNow = toISO(new Date());
  const yesterdayFromNow = shiftISO(todayFromNow, -1);

  return (
    <Card style={{ gap: 12, paddingTop: 12, paddingBottom: 14 }}>
      {/* Header row */}
      <Row between>
        <Row gap={10}>
          <Badge
            tint={withAlpha(colors.primary, 0.15)}
            border={withAlpha(colors.primary, 0.35)}
          >
            <Ionicons
              name="add-circle-outline"
              size={14}
              color={colors.primary}
            />
          </Badge>
          <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>
            Add workout
          </Text>
        </Row>

        <Row gap={8}>
          <Chip onPress={() => setPresetsOpen((x) => !x)}>
            <Row gap={6}>
              <Ionicons
                name="bookmarks-outline"
                size={14}
                color={colors.text}
              />
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {presetsOpen ? "Hide presets" : "Show presets"}
              </Text>
            </Row>
          </Chip>
          <Chip onPress={onClear} subtle>
            <Text style={{ color: colors.muted, fontWeight: "700" }}>
              Clear
            </Text>
          </Chip>
        </Row>
      </Row>

      {/* PRESETS */}
      {presetsOpen && (
        <GlassPanel>
          <Row gap={8} style={{ marginBottom: 6 }}>
            <Ionicons name="sparkles-outline" size={14} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              Presets
            </Text>
          </Row>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {suggested.map((name) => (
              <Pill key={"sg-" + name} onPress={() => setExercise(name)} accent>
                {name}
              </Pill>
            ))}
            {safePresets.map((p) => (
              <Pill key={p.id} onPress={() => setExercise(p.name)}>
                {p.name}
              </Pill>
            ))}
          </ScrollView>
        </GlassPanel>
      )}

      {/* ROW 1: Exercise (full width, always readable) */}
      <GlassPanel>
        <View style={{ flex: 1 }}>
          <Field
            icon="barbell-outline"
            placeholder="Exercise"
            value={exercise}
            onChangeText={setExercise}
            autoCapitalize="words"
          />
        </View>

        {/* Secondary controls: Browse + Today + Yesterday + Calendar (compact) */}
        <Row gap={8} style={{ marginTop: 8, flexWrap: "wrap" }}>
          <IconChip
            icon="search-outline"
            label="Browse"
            onPress={onOpenSearch}
          />
        </Row>

        <Row gap={8} style={{ marginTop: 8, flexWrap: "wrap" }}>
          {DateTimePicker ? (
            <IconChip
              icon="calendar-outline"
              label="Calendar"
              onPress={() => {
                setTempDate(parseISOToDate(date || todayISO));
                setShowDatePicker(true);
              }}
            />
          ) : (
            <View style={{ width: 120 }}>
              <Field
                icon="calendar-outline"
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
                autoCapitalize="none"
              />
            </View>
          )}
          <QuickChip
            label="Today"
            onPress={() => setDate(todayFromNow)}
            active={(date || todayISO) === todayFromNow}
          />
          <QuickChip
            label="Yesterday"
            onPress={() => setDate(yesterdayFromNow)}
            active={(date || todayISO) === yesterdayFromNow}
          />
        </Row>

        {/* Selected date summary (tiny, never crowded) */}
        <Text style={{ marginTop: 6, color: colors.muted, fontSize: 12 }}>
          Selected: {date || todayISO}
        </Text>

        {!!helper && (
          <Row gap={8} style={{ marginTop: 8 }}>
            <Ionicons
              name={
                conflictWarning
                  ? "warning-outline"
                  : "information-circle-outline"
              }
              size={14}
              color={conflictWarning ? "#ef4444" : colors.muted}
            />
            <Text
              style={{
                color: conflictWarning ? "#ef4444" : colors.muted,
                fontSize: 12,
                flex: 1,
              }}
              numberOfLines={2}
            >
              {conflictWarning
                ? `This may aggravate an injury. Try${
                    conflictWarning.alt
                      ? `: ${conflictWarning.alt}`
                      : " a safer alternative"
                  }.`
                : helper}
            </Text>
          </Row>
        )}
      </GlassPanel>

      {/* ROW 2: Scheme + Weight */}
      <GlassPanel>
        <Row gap={8}>
          <StepperTile
            label="Sets"
            icon="layers-outline"
            value={sets}
            onChangeText={(t) => setSets(t.replace(/[^0-9]/g, ""))}
            onInc={() => setSets(incInt(sets, 1))}
            onDec={() => setSets(incInt(sets, -1))}
          />
          <StepperTile
            label="Reps"
            icon="repeat-outline"
            value={reps}
            onChangeText={(t) => setReps(t.replace(/[^0-9]/g, ""))}
            onInc={() => setReps(incInt(reps, 1))}
            onDec={() => setReps(incInt(reps, -1))}
          />
        </Row>

        <View style={{ marginTop: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
            Weight ({unit})
          </Text>
          <Row gap={8}>
            <BigIconButton
              icon="remove-outline"
              onPress={() => setWeight(incDec(weight, -weightStep))}
            />
            <Field
              icon="speedometer-outline"
              inputMode="decimal"
              value={weight}
              onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ""))}
              style={{ flex: 1, height: 54 }}
            />
            <BigIconButton
              icon="add-outline"
              onPress={() => setWeight(incDec(weight, weightStep))}
            />
          </Row>

          {hasSuggestion && (
            <Row gap={8} style={{ marginTop: 8, flexWrap: "wrap" }}>
              <MiniChip onPress={() => setWeight(prevStr)}>
                <Ionicons
                  name="refresh-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text style={{ color: colors.primary, fontWeight: "800" }}>
                  Use previous ({prevStr} {unit})
                </Text>
              </MiniChip>
              <MiniChip onPress={() => setWeight(nextStr)}>
                <Ionicons
                  name="flash-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text style={{ color: colors.primary, fontWeight: "800" }}>
                  Apply suggestion ({nextStr} {unit})
                </Text>
              </MiniChip>
            </Row>
          )}
        </View>
      </GlassPanel>

      {/* ROW 3: Notes + Save Preset */}
      <GlassPanel>
        <Field
          icon="document-text-outline"
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
        />

        <Row gap={8} style={{ marginTop: 8, flexWrap: "wrap" }}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Field
              icon="bookmark-outline"
              placeholder="Save exercise as preset (name)"
              value={newPreset}
              onChangeText={setNewPreset}
            />
          </View>
          <Chip onPress={onSavePreset} disabled={!canSavePreset}>
            <Text
              style={{
                color: colors.text,
                fontWeight: "700",
                opacity: canSavePreset ? 1 : 0.6,
              }}
            >
              Save
            </Text>
          </Chip>
        </Row>
      </GlassPanel>

      {/* Submit */}
      <Row gap={8} style={{ marginTop: 2 }}>
        <GradientButton label="Add" onPress={onAdd} disabled={addDisabled} />
      </Row>

      {/* Date modal (never changes layout height) */}
      <DateModal
        visible={!!DateTimePicker && showDatePicker}
        date={tempDate}
        onChange={setTempDate}
        onCancel={() => setShowDatePicker(false)}
        onConfirm={() => {
          setDate(toISO(tempDate));
          setShowDatePicker(false);
        }}
      />
    </Card>
  );
}

/* ────────────────────── UI helpers (glassy + minimal) ───────────────────── */

function DateModal({
  visible,
  date,
  onChange,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  date: Date;
  onChange: (d: Date) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors, isDark } = useTheme();
  if (!DateTimePicker) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.25),
          }}
        >
          <BlurView
            tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
            intensity={20}
          >
            <View style={{ padding: 12, gap: 12 }}>
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                Pick a date
              </Text>

              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                onChange={(_: any, d?: Date) => {
                  if (d) onChange(d);
                }}
              />

              <Row gap={8} style={{ justifyContent: "flex-end" }}>
                <Chip onPress={onCancel} subtle>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>
                    Cancel
                  </Text>
                </Chip>
                <Chip onPress={onConfirm}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>
                    Set date
                  </Text>
                </Chip>
              </Row>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

function GlassPanel({ children }: React.PropsWithChildren) {
  const { colors, isDark } = useTheme();
  const content = (
    <View style={{ padding: 10, gap: 8, borderRadius: 16, overflow: "hidden" }}>
      {children}
    </View>
  );
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
          intensity={20}
        >
          <LinearGradient
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={[
              withAlpha(colors.primary, 0.08),
              withAlpha(colors.primary, 0.14),
            ]}
            style={StyleSheet.absoluteFillObject}
          />

          {content}
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
      style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border }}
    >
      {content}
    </LinearGradient>
  );
}

/* chips & buttons */

function IconChip({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={!disabled ? onPress : undefined}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: disabled ? colors.border : withAlpha(colors.primary, 0.35),
        backgroundColor: disabled
          ? withAlpha(colors.text, 0.06)
          : withAlpha(colors.primary, 0.12),
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Ionicons
        name={icon}
        size={14}
        color={disabled ? colors.muted : colors.text}
      />
      <Text
        style={{
          color: disabled ? colors.muted : colors.text,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function QuickChip({
  label,
  onPress,
  active,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? withAlpha(colors.primary, 0.5) : colors.border,
        backgroundColor: active
          ? withAlpha(colors.primary, 0.18)
          : withAlpha(colors.text, 0.06),
      }}
    >
      <Text
        style={{
          color: active ? colors.primary : colors.text,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Pill({
  children,
  onPress,
  accent = false,
}: React.PropsWithChildren<{ onPress: () => void; accent?: boolean }>) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: accent ? withAlpha(colors.primary, 0.3) : colors.border,
        backgroundColor: accent
          ? withAlpha(colors.primary, 0.12)
          : withAlpha(colors.text, 0.06),
      }}
    >
      <Text style={{ color: colors.text }}>{children}</Text>
    </Pressable>
  );
}

function MiniChip({
  children,
  onPress,
}: React.PropsWithChildren<{ onPress: () => void }>) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.35),
        backgroundColor: withAlpha(colors.primary, 0.12),
      }}
    >
      <Row gap={6}>{children}</Row>
    </Pressable>
  );
}

function Chip({
  children,
  onPress,
  subtle,
  disabled,
}: React.PropsWithChildren<{
  onPress: () => void;
  subtle?: boolean;
  disabled?: boolean;
}>) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={!disabled ? onPress : undefined}
      hitSlop={8}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: subtle ? colors.border : withAlpha(colors.primary, 0.35),
        backgroundColor: subtle
          ? "transparent"
          : withAlpha(colors.primary, 0.12),
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </Pressable>
  );
}

function Badge({
  children,
  tint,
  border,
}: {
  children: React.ReactNode;
  tint: string;
  border: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: tint,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      {children}
    </View>
  );
}

/* layout primitives */

function Row({
  children,
  gap = 0,
  between = false,
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

function StepperTile({
  label,
  icon,
  value,
  onChangeText,
  onInc,
  onDec,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  onInc: () => void;
  onDec: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
        <Text
          style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {value || "0"}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <SmallIconButton icon="remove-outline" onPress={onDec} />
        <SmallIconButton icon="add-outline" onPress={onInc} />
      </View>
    </View>
  );
}

function SmallIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        height: 40,
        width: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: withAlpha(colors.primary, 0.06),
      }}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

function BigIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        height: 54,
        width: 54,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: withAlpha(colors.primary, 0.06),
      }}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}
