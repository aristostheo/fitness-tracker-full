// components/scanMeal/EditFoodSheet.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";
import type {
  DetectedFood,
  PortionUnit,
} from "@/components/scanMeal/new/types";
import { DEFAULT_UNITS, clamp, roundTo } from "@/components/scanMeal/new/types";

function UnitPill({
  unit,
  active,
  onPress,
}: {
  unit: PortionUnit;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.unit,
        {
          backgroundColor: active
            ? colors.primary
            : isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.05)",
          borderColor: active ? "transparent" : colors.border,
        },
      ]}
    >
      <Text
        style={[styles.unitText, { color: active ? "white" : colors.text }]}
      >
        {unit}
      </Text>
    </Pressable>
  );
}

export default function EditFoodSheet({
  visible,
  food,
  onClose,
  onSave,
  onRemove,
}: {
  visible: boolean;
  food: DetectedFood | null;
  onClose: () => void;
  onSave: (f: DetectedFood) => void;
  onRemove?: () => void;
}) {
  const { colors, isDark } = useTheme();

  const [name, setName] = useState(food?.name ?? "");
  const [amt, setAmt] = useState(String(food?.portion.amount ?? 1));
  const [unit, setUnit] = useState<PortionUnit>(
    (food?.portion.unit ?? "g") as PortionUnit
  );

  const [cals, setCals] = useState(String(food?.macros.calories ?? 0));
  const [p, setP] = useState(String(food?.macros.protein ?? 0));
  const [c, setC] = useState(String(food?.macros.carbs ?? 0));
  const [f, setF] = useState(String(food?.macros.fat ?? 0));

  // Track the last committed numeric amount for ratio-scaling
  const lastAmtRef = useRef<number>(Number(food?.portion.amount ?? 1) || 1);

  // refresh local state whenever a new item opens
  React.useEffect(() => {
    if (!food) return;

    setName(food.name);
    setAmt(String(food.portion.amount));
    setUnit(food.portion.unit);

    setCals(String(food.macros.calories ?? 0));
    setP(String(food.macros.protein ?? 0));
    setC(String(food.macros.carbs ?? 0));
    setF(String(food.macros.fat ?? 0));

    lastAmtRef.current = Number(food.portion.amount ?? 1) || 1;
  }, [food?.id]);

  const canSave = useMemo(() => {
    if (!food) return false;
    if (!name.trim()) return false;

    const parsed = parseLooseNumber(amt);
    return parsed != null && parsed > 0;
  }, [food, name, amt]);

  // ✅ auto-scale macros when amount changes
  const onChangeAmt = (next: string) => {
    setAmt(next);

    // only scale when we can read a valid positive number
    const nextNumRaw = parseLooseNumber(next);
    if (nextNumRaw == null || nextNumRaw <= 0) return;

    const nextNum = clamp(roundTo(nextNumRaw, 0.1), 0.1, 5000);
    const prevNum = lastAmtRef.current;

    // guard division + noisy re-scaling
    if (!Number.isFinite(prevNum) || prevNum <= 0) {
      lastAmtRef.current = nextNum;
      return;
    }
    if (Math.abs(nextNum - prevNum) < 0.0001) return;

    const ratio = nextNum / prevNum;

    // scale current macro fields (treat them as totals for prevNum)
    setCals((prev) => formatMaybeInt(scaleField(prev, ratio, true)));
    setP((prev) => formatMaybeFloat(scaleField(prev, ratio, false)));
    setC((prev) => formatMaybeFloat(scaleField(prev, ratio, false)));
    setF((prev) => formatMaybeFloat(scaleField(prev, ratio, false)));

    lastAmtRef.current = nextNum;
  };

  const commit = () => {
    if (!food) return;

    const amountParsed = parseLooseNumber(amt) ?? 1;
    const amount = clamp(roundTo(amountParsed, 0.1), 0.1, 5000);

    onSave({
      ...food,
      name: name.trim(),
      portion: { amount, unit, multiplier: 1 }, // ✅ keep multiplier neutral
      macros: {
        // ✅ totals for this portion
        calories: Math.max(0, Math.round(parseLooseNumber(cals) ?? 0)),
        protein: Math.max(0, parseLooseNumber(p) ?? 0),
        carbs: Math.max(0, parseLooseNumber(c) ?? 0),
        fat: Math.max(0, parseLooseNumber(f) ?? 0),
      },
    });
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.wrap}>
        <BlurView
          tint={isDark ? "dark" : "light"}
          intensity={35}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
          style={styles.sheetWrap}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
            >
              <View style={styles.top}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Edit item
                </Text>
                <Pressable
                  onPress={onClose}
                  style={[styles.close, { borderColor: colors.border }]}
                >
                  <Ionicons name="close" size={16} color={colors.text} />
                </Pressable>
              </View>

              <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="E.g., chicken breast"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.muted }]}>
                    Portion
                  </Text>
                  <TextInput
                    value={amt}
                    onChangeText={onChangeAmt} // ✅ auto-scale hook
                    keyboardType="decimal-pad"
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.03)",
                      },
                    ]}
                  />
                </View>

                <View style={{ width: 10 }} />

                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.muted }]}>
                    Unit
                  </Text>
                  <View style={styles.unitsRow}>
                    {DEFAULT_UNITS.map((u) => (
                      <UnitPill
                        key={u}
                        unit={u}
                        active={u === unit}
                        onPress={() => setUnit(u)}
                      />
                    ))}
                  </View>
                </View>
              </View>

              <Text
                style={[styles.label, { color: colors.muted, marginTop: 8 }]}
              >
                Macros (for this portion)
              </Text>
              <View style={styles.macroGrid}>
                <MacroField label="kcal" value={cals} onChange={setCals} />
                <MacroField label="P (g)" value={p} onChange={setP} />
                <MacroField label="C (g)" value={c} onChange={setC} />
                <MacroField label="F (g)" value={f} onChange={setF} />
              </View>

              <View style={styles.actions}>
                {onRemove ? (
                  <Pressable
                    onPress={onRemove}
                    style={[styles.remove, { borderColor: colors.border }]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.text}
                    />
                    <Text style={[styles.removeText, { color: colors.text }]}>
                      Remove
                    </Text>
                  </Pressable>
                ) : (
                  <View style={{ flex: 1 }} />
                )}

                <Pressable
                  onPress={commit}
                  disabled={!canSave}
                  style={[
                    styles.save,
                    {
                      backgroundColor: canSave ? colors.primary : colors.border,
                      opacity: canSave ? 1 : 0.7,
                    },
                  ]}
                >
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function MacroField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.mLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={[
          styles.mInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.03)",
          },
        ]}
      />
    </View>
  );
}

/** Accepts "", ".", "1.", "1.2" during typing. Returns null if not parseable yet. */
function parseLooseNumber(s: string): number | null {
  const t = String(s ?? "").trim();
  if (!t) return null;
  if (t === "." || t === "-" || t === "-.") return null;

  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function scaleField(raw: string, ratio: number, isInt: boolean): number {
  const n = parseLooseNumber(raw);
  const base = n == null ? 0 : n;
  const next = base * ratio;
  if (!Number.isFinite(next)) return 0;
  return isInt ? Math.round(next) : round1(next);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function formatMaybeInt(n: number) {
  return String(Math.max(0, Math.round(n)));
}

function formatMaybeFloat(n: number) {
  const v = Math.max(0, round1(n));
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  sheetWrap: { width: "100%" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    paddingBottom: 18,
  },
  sheetScroll: { paddingBottom: 6 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 15.5, fontWeight: "900" },
  close: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },

  label: { fontSize: 12, fontWeight: "800", marginBottom: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontWeight: "700",
  },

  row: { flexDirection: "row", marginTop: 10, alignItems: "flex-start" },
  unitsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  unit: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  unitText: { fontSize: 12, fontWeight: "900" },

  macroGrid: { flexDirection: "row", gap: 10, marginTop: 6 },
  mLabel: { fontSize: 11.5, fontWeight: "800", marginBottom: 6 },
  mInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontWeight: "800",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    alignItems: "center",
  },
  remove: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  removeText: { fontSize: 13.5, fontWeight: "900" },
  save: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "white", fontSize: 13.5, fontWeight: "900" },
});
