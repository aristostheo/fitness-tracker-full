// import React, { useEffect, useMemo, useState } from "react";
// import {
//   Modal,
//   Platform,
//   Pressable,
//   Text,
//   TextInput,
//   View,
//   KeyboardAvoidingView,
// } from "react-native";
// import { BlurView } from "expo-blur";
// import { Ionicons } from "@expo/vector-icons";
// import type { FoodEntry } from "@/services/nutrition";

// function withAlpha(color: string, alpha = 0.2) {
//   if (!color) return `rgba(0,0,0,${alpha})`;
//   if (color.startsWith("rgb")) {
//     const body = color.replace(/^rgba?\(|\)$/g, "");
//     const [r, g, b] = body.split(",").map((s) => s.trim());
//     return `rgba(${r}, ${g}, ${b}, ${alpha})`;
//   }
//   const m = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
//   if (!m) return color;
//   return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(
//     m[3],
//     16
//   )}, ${alpha})`;
// }

// export function EditFoodSheet({
//   open,
//   colors,
//   isDark,
//   item,
//   onClose,
//   onSave,
// }: {
//   open: boolean;
//   colors: any;
//   isDark: boolean;
//   item: FoodEntry | null;
//   onClose: () => void;
//   onSave: (patch: Partial<FoodEntry>) => void;
// }) {
//   const [draft, setDraft] = useState<any>(null);

//   useEffect(() => {
//     if (!open || !item) return;
//     setDraft({
//       name: String(item.name || ""),
//       qty: String(item.qty ?? 1),
//       unit: String(item.unit || "serving"),
//       calories: String(item.calories ?? 0),
//       protein: String(item.protein ?? 0),
//       carbs: String(item.carbs ?? 0),
//       fat: String(item.fat ?? 0),
//     });
//   }, [open, item]);

//   const canSave = useMemo(() => {
//     if (!item || !draft) return false;
//     const name = String(draft.name || "").trim();
//     return name.length > 0;
//   }, [draft, item]);

//   if (!item) return null;
//   if (!draft) return null;

//   return (
//     <Modal
//       visible={open}
//       transparent
//       animationType="slide"
//       onRequestClose={onClose}
//     >
//       <Pressable
//         onPress={onClose}
//         style={{ flex: 1, backgroundColor: withAlpha("#000", 0.35) }}
//       >
//         <View style={{ flex: 1, justifyContent: "flex-end" }}>
//           <Pressable
//             onPress={() => {}}
//             style={{ paddingHorizontal: 12, paddingBottom: 12 }}
//           >
//             <KeyboardAvoidingView
//               behavior={Platform.OS === "ios" ? "padding" : undefined}
//             >
//               <View
//                 style={{
//                   borderRadius: 26,
//                   overflow: "hidden",
//                   borderWidth: 1,
//                   borderColor: withAlpha(colors.border, 0.75),
//                 }}
//               >
//                 {Platform.OS === "ios" ? (
//                   <BlurView
//                     intensity={28}
//                     tint={
//                       isDark
//                         ? "systemThinMaterialDark"
//                         : "systemThinMaterialLight"
//                     }
//                     style={{ padding: 14 }}
//                   >
//                     <SheetInner />
//                   </BlurView>
//                 ) : (
//                   <View
//                     style={{
//                       padding: 14,
//                       backgroundColor: withAlpha(colors.card, 0.96),
//                     }}
//                   >
//                     <SheetInner />
//                   </View>
//                 )}
//               </View>
//             </KeyboardAvoidingView>
//           </Pressable>
//         </View>
//       </Pressable>
//     </Modal>
//   );

//   function SheetInner() {
//     return (
//       <View style={{ gap: 12 }}>
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             justifyContent: "space-between",
//           }}
//         >
//           <View style={{ gap: 2 }}>
//             <Text
//               style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}
//             >
//               Edit item
//             </Text>
//             <Text
//               style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
//             >
//               {item?.name || ""}
//             </Text>
//           </View>

//           <Pressable
//             accessibilityRole="button"
//             accessibilityLabel="Close edit"
//             onPress={onClose}
//             hitSlop={10}
//             style={{
//               width: 40,
//               height: 40,
//               borderRadius: 14,
//               borderWidth: 1,
//               borderColor: withAlpha(colors.border, 0.7),
//               alignItems: "center",
//               justifyContent: "center",
//               backgroundColor: withAlpha(colors.card, 0.35),
//             }}
//           >
//             <Ionicons name="close" size={18} color={colors.text} />
//           </Pressable>
//         </View>

//         <TextInput
//           value={draft?.name ?? ""}
//           onChangeText={(t) =>
//             setDraft((p: any) => (p ? { ...p, name: t } : p))
//           }
//           placeholder="Name"
//           placeholderTextColor={colors.placeholder}
//           style={inputStyle(colors)}
//         />

//         <View style={{ flexDirection: "row", gap: 10 }}>
//           <TextInput
//             value={draft?.qty ?? ""}
//             onChangeText={(t) =>
//               setDraft((p: any) =>
//                 p ? { ...p, qty: t.replace(/[^0-9.]/g, "") } : p
//               )
//             }
//             keyboardType="decimal-pad"
//             placeholder="Qty"
//             placeholderTextColor={colors.placeholder}
//             style={[inputStyle(colors), { flex: 1 }]}
//           />
//           <TextInput
//             value={draft?.unit ?? ""}
//             onChangeText={(t) =>
//               setDraft((p: any) => (p ? { ...p, unit: t } : p))
//             }
//             placeholder="Unit"
//             placeholderTextColor={colors.placeholder}
//             style={[inputStyle(colors), { flex: 1 }]}
//           />
//         </View>

//         <View style={{ flexDirection: "row", gap: 10 }}>
//           {[
//             ["Calories", "calories"],
//             ["Protein", "protein"],
//             ["Carbs", "carbs"],
//             ["Fat", "fat"],
//           ].map(([lbl, key]) => (
//             <TextInput
//               key={key}
//               value={String(draft?.[key] ?? "")}
//               onChangeText={(t) =>
//                 setDraft((p: any) =>
//                   p ? { ...p, [key]: t.replace(/[^0-9.]/g, "") } : p
//                 )
//               }
//               keyboardType="decimal-pad"
//               placeholder={lbl}
//               placeholderTextColor={colors.placeholder}
//               style={[
//                 inputStyle(colors),
//                 { flex: 1, fontSize: 12, fontWeight: "900" },
//               ]}
//             />
//           ))}
//         </View>

//         <View
//           style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}
//         >
//           <Pressable
//             accessibilityRole="button"
//             accessibilityLabel="Cancel edit"
//             onPress={onClose}
//             style={{
//               paddingHorizontal: 12,
//               paddingVertical: 10,
//               borderRadius: 999,
//               borderWidth: 1,
//               borderColor: colors.border,
//               backgroundColor: withAlpha(colors.card, 0.35),
//             }}
//           >
//             <Text style={{ color: colors.text, fontWeight: "900" }}>
//               Cancel
//             </Text>
//           </Pressable>

//           <Pressable
//             accessibilityRole="button"
//             accessibilityLabel="Save edit"
//             disabled={!canSave}
//             onPress={() => {
//               const patch: Partial<FoodEntry> = {
//                 name: String(draft?.name || "").trim(),
//                 qty: Number(draft?.qty || item?.qty || 1) as any,
//                 unit: String(draft?.unit || item?.unit || "serving") as any,
//                 calories: Number(draft?.calories || 0) as any,
//                 protein: Number(draft?.protein || 0) as any,
//                 carbs: Number(draft?.carbs || 0) as any,
//                 fat: Number(draft?.fat || 0) as any,
//               };
//               onSave(patch);
//             }}
//             style={{
//               paddingHorizontal: 12,
//               paddingVertical: 10,
//               borderRadius: 999,
//               borderWidth: 1,
//               borderColor: withAlpha(colors.primary, 0.35),
//               backgroundColor: withAlpha(colors.primary, canSave ? 0.16 : 0.08),
//               opacity: canSave ? 1 : 0.7,
//             }}
//           >
//             <Text style={{ color: colors.text, fontWeight: "900" }}>Save</Text>
//           </Pressable>
//         </View>
//       </View>
//     );
//   }
// }

// function inputStyle(colors: any) {
//   return {
//     borderWidth: 1,
//     borderColor: colors.inputBorder,
//     backgroundColor: colors.inputBg,
//     color: colors.text,
//     borderRadius: 14,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     fontWeight: "800" as const,
//   };
// }

// components/nutrition/EditFoodSheet.tsx
// Glossy “Apple-ish” edit food bottom sheet ✅
// - Drop-in component: UI-only (you wire onSave/onDelete to Firestore/services)
// - Keyboard-friendly: smart scroll into view + KeyboardAvoidingView
// - Supports basic + advanced nutrition fields (for better MealHealth confidence)

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/content/ThemeProvider";
import type { FoodEntry } from "@/services/nutrition";

type EditValues = {
  name: string;
  qty: string;
  unit: string;

  calories: string;
  protein: string;
  carbs: string;
  fat: string;

  sugar?: string;
  fiber?: string;

  // advanced (optional)
  addedSugar?: string;
  satFat?: string;
  sodium?: string;

  wholeFoodRatio?: string; // 0..1
  veggieFruitServings?: string; // 0..6+
  unsatFatRatio?: string; // 0..1
  alcoholCalories?: string; // kcal

  // base values for qty scaling
  _baseQty?: string;
  _baseCalories?: string;
  _baseProtein?: string;
  _baseCarbs?: string;
  _baseFat?: string;
  _baseSugar?: string;
  _baseFiber?: string;
  _baseAddedSugar?: string;
  _baseSatFat?: string;
  _baseSodium?: string;
  _baseAlcoholCalories?: string;
  _baseVeggieFruitServings?: string;
};

export type EditableFoodEntry = {
  id: string;
  name: string;
  qty?: number;
  unit?: string;

  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;

  sugar?: number;
  fiber?: number;

  // advanced (if you store them)
  addedSugar?: number;
  satFat?: number;
  sodium?: number;

  wholeFoodRatio?: number;
  veggieFruitServings?: number;
  unsatFatRatio?: number;
  alcoholCalories?: number;
};

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

function numOnly(t: string) {
  return t.replace(/[^0-9.]/g, "");
}
function toNum(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function toNumOr(s: string, fallback: number) {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}
function formatScaled(n: number) {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 10) / 10;
  return String(rounded);
}
function clamp0(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}
function emptyToUndef(s?: string) {
  if (s == null) return undefined;
  const t = String(s).trim();
  return t.length ? t : undefined;
}

export default function EditFoodSheet({
  open,
  item,
  onClose,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  open: boolean;
  item: FoodEntry | null;
  onSave: (patch: Partial<FoodEntry>) => void;

  onClose: () => void;
  // onSave: (updated: {
  //   id: string;
  //   name: string;
  //   qty: number;
  //   unit: string;

  //   calories: number;
  //   protein: number;
  //   carbs: number;
  //   fat: number;

  //   sugar?: number;
  //   fiber?: number;

  //   addedSugar?: number;
  //   satFat?: number;
  //   sodium?: number;

  //   wholeFoodRatio?: number;
  //   veggieFruitServings?: number;
  //   unsatFatRatio?: number;
  //   alcoholCalories?: number;
  // }) => void;

  // onSave: (patch: Partial<EditableFoodEntry>) => void;

  onDelete?: (id: string) => void;

  saving?: boolean;
  deleting?: boolean;
}) {
  const { colors, isDark } = useTheme() as any;

  const scrollRef = useRef<ScrollView>(null as any);
  const [advOpen, setAdvOpen] = useState(false);

  const [edits, setEdits] = useState<EditValues>({
    name: "",
    qty: "1",
    unit: "serving",
    calories: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
    sugar: "",
    fiber: "",
    addedSugar: "",
    satFat: "",
    sodium: "",
    wholeFoodRatio: "",
    veggieFruitServings: "",
    unsatFatRatio: "",
    alcoholCalories: "",

    _baseQty: "1",
    _baseCalories: "0",
    _baseProtein: "0",
    _baseCarbs: "0",
    _baseFat: "0",
    _baseSugar: "",
    _baseFiber: "",
    _baseAddedSugar: "",
    _baseSatFat: "",
    _baseSodium: "",
    _baseAlcoholCalories: "",
    _baseVeggieFruitServings: "",
  });

  useEffect(() => {
    if (!open) return;
    if (!item) return;

    const baseQty = String(item.qty ?? 1);
    const baseCalories = String(item.calories ?? 0);
    const baseProtein = String(item.protein ?? 0);
    const baseCarbs = String(item.carbs ?? 0);
    const baseFat = String(item.fat ?? 0);
    const baseSugar = item.sugar != null ? String(item.sugar) : "";
    const baseFiber = item.fiber != null ? String(item.fiber) : "";
    const baseAddedSugar =
      item.addedSugar != null ? String(item.addedSugar) : "";
    const baseSatFat = item.satFat != null ? String(item.satFat) : "";
    const baseSodium = item.sodium != null ? String(item.sodium) : "";
    const baseAlcoholCalories =
      item.alcoholCalories != null ? String(item.alcoholCalories) : "";
    const baseVeggieFruitServings =
      item.veggieFruitServings != null
        ? String(item.veggieFruitServings)
        : "";

    setAdvOpen(false);
    setEdits({
      name: item.name ?? "",
      qty: baseQty,
      unit: String(item.unit ?? "serving"),

      calories: baseCalories,
      protein: baseProtein,
      carbs: baseCarbs,
      fat: baseFat,

      sugar: baseSugar,
      fiber: baseFiber,

      addedSugar: baseAddedSugar,
      satFat: baseSatFat,
      sodium: baseSodium,

      wholeFoodRatio:
        item.wholeFoodRatio != null ? String(item.wholeFoodRatio) : "",
      veggieFruitServings: baseVeggieFruitServings,
      unsatFatRatio:
        item.unsatFatRatio != null ? String(item.unsatFatRatio) : "",
      alcoholCalories: baseAlcoholCalories,

      _baseQty: baseQty,
      _baseCalories: baseCalories,
      _baseProtein: baseProtein,
      _baseCarbs: baseCarbs,
      _baseFat: baseFat,
      _baseSugar: baseSugar,
      _baseFiber: baseFiber,
      _baseAddedSugar: baseAddedSugar,
      _baseSatFat: baseSatFat,
      _baseSodium: baseSodium,
      _baseAlcoholCalories: baseAlcoholCalories,
      _baseVeggieFruitServings: baseVeggieFruitServings,
    });
  }, [open, item]);

  const canDelete = !!onDelete && !!item?.id;
  const canSave = !!item?.id && !saving && !deleting;

  const scrollIntoView = useCallback((e: any) => {
    // “smart lift”
    const target = e?.target;
    if (!target?.measureInWindow) return;

    target.measureInWindow((x: number, y: number, w: number, h: number) => {
      const desiredTopY = 170;
      const delta = y - desiredTopY;
      if (delta > 22) {
        scrollRef.current?.scrollTo({ y: delta, animated: true });
      }
    });
  }, []);

  const scaleQtyMacros = useCallback((prev: EditValues, nextQtyRaw: string) => {
    const nextQty = toNumOr(nextQtyRaw, 0);
    const baseQty = toNumOr(prev._baseQty || prev.qty, 0);
    if (baseQty <= 0 || nextQty <= 0) {
      return { ...prev, qty: nextQtyRaw };
    }
    const ratio = nextQty / baseQty;
    const scaleField = (baseKey?: string) => {
      const raw = String((baseKey && (prev as any)[baseKey]) ?? "");
      if (!raw.trim().length) return raw;
      const val = Number(raw);
      if (!Number.isFinite(val)) return raw;
      return formatScaled(val * ratio);
    };
    return {
      ...prev,
      qty: nextQtyRaw,
      calories: scaleField("_baseCalories"),
      protein: scaleField("_baseProtein"),
      carbs: scaleField("_baseCarbs"),
      fat: scaleField("_baseFat"),
      sugar: scaleField("_baseSugar"),
      fiber: scaleField("_baseFiber"),
      addedSugar: scaleField("_baseAddedSugar"),
      satFat: scaleField("_baseSatFat"),
      sodium: scaleField("_baseSodium"),
      alcoholCalories: scaleField("_baseAlcoholCalories"),
      veggieFruitServings: scaleField("_baseVeggieFruitServings"),
    };
  }, []);

  const Field = useMemo(() => {
    return function FieldInner({
      label,
      value,
      keyName,
      placeholder = "0",
      isText,
      suffix,
    }: {
      label: string;
      value: string;
      keyName: keyof EditValues;
      placeholder?: string;
      isText?: boolean;
      suffix?: string;
    }) {
      return (
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}
          >
            {label}
          </Text>
          <View style={{ position: "relative" }}>
            <TextInput
              value={value}
              onFocus={scrollIntoView}
              onChangeText={(t) =>
                setEdits((p) => {
                  if (!isText && keyName === "qty") {
                    return scaleQtyMacros(p, numOnly(t));
                  }
                  return {
                    ...p,
                    [keyName]: isText ? t : numOnly(t),
                  };
                })
              }
              keyboardType={isText ? "default" : "decimal-pad"}
              placeholder={placeholder}
              placeholderTextColor={colors.placeholder}
              style={{
                height: 46,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                backgroundColor: colors.inputBg,
                color: colors.text,
                paddingHorizontal: 12,
                paddingRight: suffix ? 34 : 12,
                fontWeight: "900",
              }}
            />
            {suffix ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  right: 10,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.muted, fontWeight: "900" }}>
                  {suffix}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      );
    };
  }, [colors, scrollIntoView]);

  const buildPayload = useCallback(() => {
    if (!item?.id) return null;

    const sugar = emptyToUndef(edits.sugar);
    const fiber = emptyToUndef(edits.fiber);

    const addedSugar = emptyToUndef(edits.addedSugar);
    const satFat = emptyToUndef(edits.satFat);
    const sodium = emptyToUndef(edits.sodium);

    const wholeFoodRatio = emptyToUndef(edits.wholeFoodRatio);
    const veggieFruitServings = emptyToUndef(edits.veggieFruitServings);
    const unsatFatRatio = emptyToUndef(edits.unsatFatRatio);
    const alcoholCalories = emptyToUndef(edits.alcoholCalories);

    return {
      name: (edits.name || item.name || "Food").trim(),
      qty: clamp0(toNum(edits.qty)) || 1,
      unit: (edits.unit || item.unit || "serving").trim(),

      calories: clamp0(toNum(edits.calories)),
      protein: clamp0(toNum(edits.protein)),
      carbs: clamp0(toNum(edits.carbs)),
      fat: clamp0(toNum(edits.fat)),

      ...(sugar != null ? { sugar: clamp0(toNum(sugar)) } : {}),
      ...(fiber != null ? { fiber: clamp0(toNum(fiber)) } : {}),

      ...(addedSugar != null ? { addedSugar: clamp0(toNum(addedSugar)) } : {}),
      ...(satFat != null ? { satFat: clamp0(toNum(satFat)) } : {}),
      ...(sodium != null ? { sodium: clamp0(toNum(sodium)) } : {}),

      ...(wholeFoodRatio != null
        ? { wholeFoodRatio: Math.min(1, Math.max(0, toNum(wholeFoodRatio))) }
        : {}),
      ...(veggieFruitServings != null
        ? { veggieFruitServings: clamp0(toNum(veggieFruitServings)) }
        : {}),
      ...(unsatFatRatio != null
        ? { unsatFatRatio: Math.min(1, Math.max(0, toNum(unsatFatRatio))) }
        : {}),
      ...(alcoholCalories != null
        ? { alcoholCalories: clamp0(toNum(alcoholCalories)) }
        : {}),
    };
  }, [edits, item]);

  const sheetBg = isDark
    ? withAlpha("#0b0f18", 0.88)
    : withAlpha("#ffffff", 0.92);
  const stroke = isDark
    ? withAlpha("#ffffff", 0.12)
    : withAlpha("#0b0f18", 0.1);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Backdrop */}
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.35)" },
          ]}
        />

        {/* Sheet */}
        <View
          style={{
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: stroke,
            backgroundColor: sheetBg,
            height: "82%",
            maxHeight: "92%",
            zIndex: 2,
            elevation: 20,
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
            style={{ flex: 1 }}
          >
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={28}
                tint={
                  isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"
                }
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={[
                    withAlpha(colors.primary, isDark ? 0.18 : 0.16),
                    withAlpha(colors.card, isDark ? 0.22 : 0.18),
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: "absolute", inset: 0 }}
                />
                <SheetContent
                  colors={colors}
                  isDark={isDark}
                  scrollRef={scrollRef}
                  Field={Field}
                  edits={edits}
                  setEdits={setEdits}
                  advOpen={advOpen}
                  setAdvOpen={setAdvOpen}
                  canSave={canSave}
                  canDelete={canDelete}
                  saving={!!saving}
                  deleting={!!deleting}
                  onClose={onClose}
                  onDelete={() => item?.id && onDelete?.(item.id)}
                  onSave={() => {
                    const payload = buildPayload();
                    if (!payload) return;
                    Keyboard.dismiss();
                    onSave(payload);
                  }}
                />
              </BlurView>
            ) : (
              <SheetContent
                colors={colors}
                isDark={isDark}
                scrollRef={scrollRef}
                Field={Field}
                edits={edits}
                setEdits={setEdits}
                advOpen={advOpen}
                setAdvOpen={setAdvOpen}
                canSave={canSave}
                canDelete={canDelete}
                saving={!!saving}
                deleting={!!deleting}
                onClose={onClose}
                onDelete={() => item?.id && onDelete?.(item.id)}
                onSave={() => {
                  const payload = buildPayload();
                  if (!payload) return;
                  Keyboard.dismiss();
                  onSave(payload);
                }}
              />
            )}
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

function SheetContent({
  colors,
  isDark,
  scrollRef,
  Field,
  edits,
  setEdits,
  advOpen,
  setAdvOpen,
  canSave,
  canDelete,
  saving,
  deleting,
  onClose,
  onSave,
  onDelete,
}: {
  colors: any;
  isDark: boolean;
  scrollRef: React.RefObject<ScrollView>;
  Field: any;
  edits: EditValues;
  setEdits: any;
  advOpen: boolean;
  setAdvOpen: (v: boolean) => void;
  canSave: boolean;
  canDelete: boolean;
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 140, flexGrow: 1 }}
    >
      <View style={{ gap: 12 }}>
        {/* grabber */}
        <View style={{ alignItems: "center", marginTop: 2 }}>
          <View
            style={{
              width: 42,
              height: 5,
              borderRadius: 999,
              backgroundColor: withAlpha(colors.text, isDark ? 0.18 : 0.12),
            }}
          />
        </View>

        {/* header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
            >
              Edit food
            </Text>
            <Text
              style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}
            >
              Update anything — changes apply instantly after save.
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: withAlpha(colors.card, 0.35),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* name */}
        <Field
          label="Name"
          value={edits.name}
          keyName="name"
          placeholder="Food name"
          isText
        />

        {/* qty + unit */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="Qty" value={edits.qty} keyName="qty" placeholder="1" />
          <Field
            label="Unit"
            value={edits.unit}
            keyName="unit"
            placeholder="serving"
            isText
          />
        </View>

        {/* macros */}
        <Text
          style={{
            color: colors.muted,
            fontWeight: "900",
            fontSize: 12,
            letterSpacing: 0.5,
            marginTop: 2,
          }}
        >
          MACROS
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field
            label="Calories"
            value={edits.calories}
            keyName="calories"
            placeholder="0"
            suffix="kcal"
          />
          <Field
            label="Protein"
            value={edits.protein}
            keyName="protein"
            placeholder="0"
            suffix="g"
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field
            label="Carbs"
            value={edits.carbs}
            keyName="carbs"
            placeholder="0"
            suffix="g"
          />
          <Field
            label="Fat"
            value={edits.fat}
            keyName="fat"
            placeholder="0"
            suffix="g"
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field
            label="Sugar (optional)"
            value={edits.sugar || ""}
            keyName="sugar"
            placeholder="—"
            suffix="g"
          />
          <Field
            label="Fiber (optional)"
            value={edits.fiber || ""}
            keyName="fiber"
            placeholder="—"
            suffix="g"
          />
        </View>

        {/* advanced toggle */}
        <Pressable
          onPress={() => setAdvOpen(!advOpen)}
          style={{
            marginTop: 4,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: withAlpha(colors.border, 0.95),
            backgroundColor: withAlpha(colors.card, 0.28),
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.25),
                backgroundColor: withAlpha(colors.primary, 0.12),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="options-outline" size={16} color={colors.text} />
            </View>
            <View style={{ gap: 2 }}>
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                Advanced macros
              </Text>
              <Text
                style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}
              >
                Improves Meal Health confidence & accuracy.
              </Text>
            </View>
          </View>
          <Ionicons
            name={advOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.text}
          />
        </Pressable>

        {advOpen ? (
          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: colors.muted,
                fontWeight: "900",
                fontSize: 12,
                letterSpacing: 0.5,
              }}
            >
              ADVANCED
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label="Added sugar (optional)"
                value={edits.addedSugar || ""}
                keyName="addedSugar"
                placeholder="—"
                suffix="g"
              />
              <Field
                label="Sat fat (optional)"
                value={edits.satFat || ""}
                keyName="satFat"
                placeholder="—"
                suffix="g"
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label="Sodium (optional)"
                value={edits.sodium || ""}
                keyName="sodium"
                placeholder="—"
                suffix="mg"
              />
              <Field
                label="Alcohol calories (optional)"
                value={edits.alcoholCalories || ""}
                keyName="alcoholCalories"
                placeholder="—"
                suffix="kcal"
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label="Whole food ratio (0..1)"
                value={edits.wholeFoodRatio || ""}
                keyName="wholeFoodRatio"
                placeholder="e.g. 0.7"
              />
              <Field
                label="Unsat fat ratio (0..1)"
                value={edits.unsatFatRatio || ""}
                keyName="unsatFatRatio"
                placeholder="e.g. 0.6"
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label="Veggie/fruit servings"
                value={edits.veggieFruitServings || ""}
                keyName="veggieFruitServings"
                placeholder="e.g. 2"
              />
              <View style={{ flex: 1 }} />
            </View>

            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: withAlpha(colors.border, 0.9),
                backgroundColor: withAlpha(colors.card, 0.22),
                padding: 12,
              }}
            >
              <Text
                style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}
              >
                Tip: only fill what you know. Leaving fields blank is fine.
              </Text>
            </View>
          </View>
        ) : null}

        {/* actions */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          {canDelete ? (
            <Pressable
              onPress={onDelete}
              disabled={deleting || saving}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: withAlpha("#ef4444", 0.25),
                backgroundColor: withAlpha("#ef4444", 0.12),
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 10,
                opacity: deleting || saving ? 0.6 : 1,
              }}
            >
              {deleting ? (
                <ActivityIndicator />
              ) : (
                <Ionicons name="trash-outline" size={18} color={colors.text} />
              )}
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                {deleting ? "Deleting…" : "Delete"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: withAlpha(colors.card, 0.35),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                Cancel
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={{
              flex: 1.3,
              height: 52,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              backgroundColor: withAlpha(colors.primary, 0.18),
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 10,
              opacity: canSave ? 1 : 0.6,
            }}
          >
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={colors.text}
              />
            )}
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              {saving ? "Saving…" : "Save changes"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
