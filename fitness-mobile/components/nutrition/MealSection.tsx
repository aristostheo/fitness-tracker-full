// components/nutrition/MealSection.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import Field from "./ui/Field";
import IconButton from "./ui/IconButton";
import withAlpha from "./utils/withAlpha";

export default function MealSection({
  meal,
  items,
  onStartEdit,
  editId,
  edit,
  setEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteItem,
}: {
  meal: "breakfast" | "lunch" | "dinner" | "snacks";
  items: Array<any>;
  onStartEdit: (it: any) => void;
  editId: string | null;
  edit: any;
  setEdit: React.Dispatch<React.SetStateAction<any>>;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDeleteItem: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();

  const hasItems = (items?.length ?? 0) > 0;

  return (
    <View style={{ gap: 10 }}>
      {!hasItems ? (
        <EmptyState colors={colors} isDark={isDark} />
      ) : (
        items.map((it: any) => {
          const isEditing = editId === it.id;
          const isTemp = it.id?.startsWith?.("temp-");
          return (
            <View
              key={it.id}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                padding: 12,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(0,0,0,0.02)",
              }}
            >
              {isEditing ? (
                <EditRow
                  edit={edit}
                  setEdit={setEdit}
                  colors={colors}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                />
              ) : (
                <ItemRow
                  it={it}
                  isTemp={isTemp}
                  colors={colors}
                  mealColor={dotForMeal(meal, colors)}
                  onStartEdit={() => !isTemp && onStartEdit(it)}
                  onDelete={() => onDeleteItem(it.id)}
                />
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

/* ---------------- UI bits ---------------- */

function EmptyState({ colors, isDark }: any) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 14,
        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        No foods here yet — add your first item.
      </Text>
    </View>
  );
}

function ItemRow({
  it,
  isTemp,
  colors,
  mealColor,
  onStartEdit,
  onDelete,
}: {
  it: any;
  isTemp: boolean;
  colors: any;
  mealColor: string;
  onStartEdit: () => void;
  onDelete: () => void;
}) {
  const qty = Number(it.qty ?? 1);
  const unit = it.unit || "serving";
  const kcal = Math.round(Number(it.calories ?? 0));
  const p = Math.round(Number(it.protein ?? 0));
  const c = Math.round(Number(it.carbs ?? 0));
  const f = Math.round(Number(it.fat ?? 0));
  const sugar = it.sugar != null ? Math.round(Number(it.sugar)) : null;
  const fiber = it.fiber != null ? Math.round(Number(it.fiber)) : null;

  return (
    <View style={{ gap: 10 }}>
      {/* top row: name + actions */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: mealColor,
            marginTop: 2,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: colors.text }}>
            {it.name || "Unnamed food"}
            {isTemp && <Text style={{ color: colors.muted }}> (saving…)</Text>}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>
            {qty} {unit} • {kcal} kcal
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <IconButton
            icon="create-outline"
            onPress={onStartEdit}
            disabled={isTemp}
          />
          <IconButton icon="trash-outline" onPress={onDelete} />
        </View>
      </View>

      {/* macro chips */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Chip label="P" value={p} colors={colors} />
        <Chip label="C" value={c} colors={colors} />
        <Chip label="F" value={f} colors={colors} />
        {sugar != null && (
          <Chip label="Sugar" value={sugar} suffix="g" colors={colors} muted />
        )}
        {fiber != null && (
          <Chip label="Fiber" value={fiber} suffix="g" colors={colors} muted />
        )}
      </View>
    </View>
  );
}

function EditRow({
  edit,
  setEdit,
  colors,
  onCancelEdit,
  onSaveEdit,
}: {
  edit: any;
  setEdit: React.Dispatch<React.SetStateAction<any>>;
  colors: any;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Field
          icon="restaurant-outline"
          value={edit.name}
          onChangeText={(v) => setEdit((e: any) => ({ ...e, name: v }))}
        />
        <Field
          icon="pricetag-outline"
          value={edit.qty}
          inputMode="numeric"
          onChangeText={(v) => setEdit((e: any) => ({ ...e, qty: v }))}
        />
        <Field
          icon="cube-outline"
          value={edit.unit}
          onChangeText={(v) => setEdit((e: any) => ({ ...e, unit: v }))}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Field
          icon="flame-outline"
          placeholder="kcal (base)"
          value={edit.calories}
          inputMode="numeric"
          onChangeText={(v) => setEdit((e: any) => ({ ...e, calories: v }))}
        />
        <Field
          icon="fitness-outline"
          placeholder="P (base)"
          value={edit.protein}
          inputMode="numeric"
          onChangeText={(v) => setEdit((e: any) => ({ ...e, protein: v }))}
        />
        <Field
          icon="leaf-outline"
          placeholder="C (base)"
          value={edit.carbs}
          inputMode="numeric"
          onChangeText={(v) => setEdit((e: any) => ({ ...e, carbs: v }))}
        />
        <Field
          icon="water-outline"
          placeholder="F (base)"
          value={edit.fat}
          inputMode="numeric"
          onChangeText={(v) => setEdit((e: any) => ({ ...e, fat: v }))}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Field
          icon="ice-cream-outline"
          placeholder="Sugar (base)"
          value={edit.sugar}
          inputMode="numeric"
          onChangeText={(v) => setEdit((e: any) => ({ ...e, sugar: v }))}
        />
        <Field
          icon="trail-sign-outline"
          placeholder="Fiber (base)"
          value={edit.fiber}
          inputMode="numeric"
          onChangeText={(v) => setEdit((e: any) => ({ ...e, fiber: v }))}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          style={{
            height: 42,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={onCancelEdit}
        >
          <Text style={{ color: colors.text }}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onSaveEdit}
          style={{
            height: 42,
            paddingHorizontal: 14,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#16a34a",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Chip({
  label,
  value,
  suffix = "g",
  colors,
  muted = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  colors: any;
  muted?: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: muted
          ? withAlpha(colors.text, 0.06)
          : withAlpha(colors.primary, 0.12),
        borderWidth: 1,
        borderColor: muted
          ? withAlpha(colors.text, 0.12)
          : withAlpha(colors.primary, 0.25),
      }}
    >
      <Text
        style={{
          color: muted ? colors.text : colors.primary,
          fontSize: 12,
          fontWeight: "800",
        }}
      >
        {label} {value}
        {suffix}
      </Text>
    </View>
  );
}

function dotForMeal(
  meal: "breakfast" | "lunch" | "dinner" | "snacks",
  colors: any
) {
  switch (meal) {
    case "breakfast":
      return withAlpha(colors.primary, 0.85);
    case "lunch":
      return withAlpha("#22c55e", 0.85);
    case "dinner":
      return withAlpha("#eab308", 0.85);
    default:
      return withAlpha("#8b5cf6", 0.85);
  }
}
