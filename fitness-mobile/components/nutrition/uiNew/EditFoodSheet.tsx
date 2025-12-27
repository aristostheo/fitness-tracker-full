import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import type { FoodEntry } from "@/services/nutrition";

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

export function EditFoodSheet({
  open,
  colors,
  isDark,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  colors: any;
  isDark: boolean;
  item: FoodEntry | null;
  onClose: () => void;
  onSave: (patch: Partial<FoodEntry>) => void;
}) {
  const [draft, setDraft] = useState<any>(null);

  useEffect(() => {
    if (!open || !item) return;
    setDraft({
      name: String(item.name || ""),
      qty: String(item.qty ?? 1),
      unit: String(item.unit || "serving"),
      calories: String(item.calories ?? 0),
      protein: String(item.protein ?? 0),
      carbs: String(item.carbs ?? 0),
      fat: String(item.fat ?? 0),
    });
  }, [open, item]);

  const canSave = useMemo(() => {
    if (!item || !draft) return false;
    const name = String(draft.name || "").trim();
    return name.length > 0;
  }, [draft, item]);

  if (!item) return null;
  if (!draft) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: withAlpha("#000", 0.35) }}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => {}}
            style={{ paddingHorizontal: 12, paddingBottom: 12 }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View
                style={{
                  borderRadius: 26,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: withAlpha(colors.border, 0.75),
                }}
              >
                {Platform.OS === "ios" ? (
                  <BlurView
                    intensity={28}
                    tint={
                      isDark
                        ? "systemThinMaterialDark"
                        : "systemThinMaterialLight"
                    }
                    style={{ padding: 14 }}
                  >
                    <SheetInner />
                  </BlurView>
                ) : (
                  <View
                    style={{
                      padding: 14,
                      backgroundColor: withAlpha(colors.card, 0.96),
                    }}
                  >
                    <SheetInner />
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );

  function SheetInner() {
    return (
      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}
            >
              Edit item
            </Text>
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
            >
              {item?.name || ""}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close edit"
            onPress={onClose}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: withAlpha(colors.border, 0.7),
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(colors.card, 0.35),
            }}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>

        <TextInput
          value={draft?.name ?? ""}
          onChangeText={(t) =>
            setDraft((p: any) => (p ? { ...p, name: t } : p))
          }
          placeholder="Name"
          placeholderTextColor={colors.placeholder}
          style={inputStyle(colors)}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={draft?.qty ?? ""}
            onChangeText={(t) =>
              setDraft((p: any) =>
                p ? { ...p, qty: t.replace(/[^0-9.]/g, "") } : p
              )
            }
            keyboardType="decimal-pad"
            placeholder="Qty"
            placeholderTextColor={colors.placeholder}
            style={[inputStyle(colors), { flex: 1 }]}
          />
          <TextInput
            value={draft?.unit ?? ""}
            onChangeText={(t) =>
              setDraft((p: any) => (p ? { ...p, unit: t } : p))
            }
            placeholder="Unit"
            placeholderTextColor={colors.placeholder}
            style={[inputStyle(colors), { flex: 1 }]}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            ["Calories", "calories"],
            ["Protein", "protein"],
            ["Carbs", "carbs"],
            ["Fat", "fat"],
          ].map(([lbl, key]) => (
            <TextInput
              key={key}
              value={String(draft?.[key] ?? "")}
              onChangeText={(t) =>
                setDraft((p: any) =>
                  p ? { ...p, [key]: t.replace(/[^0-9.]/g, "") } : p
                )
              }
              keyboardType="decimal-pad"
              placeholder={lbl}
              placeholderTextColor={colors.placeholder}
              style={[
                inputStyle(colors),
                { flex: 1, fontSize: 12, fontWeight: "900" },
              ]}
            />
          ))}
        </View>

        <View
          style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel edit"
            onPress={onClose}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: withAlpha(colors.card, 0.35),
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              Cancel
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save edit"
            disabled={!canSave}
            onPress={() => {
              const patch: Partial<FoodEntry> = {
                name: String(draft?.name || "").trim(),
                qty: Number(draft?.qty || item?.qty || 1) as any,
                unit: String(draft?.unit || item?.unit || "serving") as any,
                calories: Number(draft?.calories || 0) as any,
                protein: Number(draft?.protein || 0) as any,
                carbs: Number(draft?.carbs || 0) as any,
                fat: Number(draft?.fat || 0) as any,
              };
              onSave(patch);
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              backgroundColor: withAlpha(colors.primary, canSave ? 0.16 : 0.08),
              opacity: canSave ? 1 : 0.7,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "900" }}>Save</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

function inputStyle(colors: any) {
  return {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "800" as const,
  };
}
