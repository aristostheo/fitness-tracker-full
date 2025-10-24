// app/(tabs)/nutrition.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import { useNutritionStreams } from "@/hooks/useNutritionStreams";
import {
  addFood,
  updateFood,
  deleteFood,
  addExercise,
  deleteExercise,
  type FoodEntry,
} from "@/services/nutrition";
import {
  upsertFoodToCatalog,
  foodIdFor,
  bumpUse,
} from "@/services/foodCatalog";

import Header from "@/components/nutrition/Header";
import MealSection from "@/components/nutrition/MealSection";
import ExerciseCard from "@/components/nutrition/ExerciseCard";
import EmptySuggestions from "@/components/ui/EmptySuggestions";
import BottomTapSpacer from "@/components/ui/BottomTapSpacer";
import { computeMealScore } from "@/utils/mealScore";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Badges */
import BadgeCelebrate from "@/components/badges/BadgeCelebrate";
import { evaluateBadges } from "@/services/badges";

/** Firestore helpers for counts/streak */
import {
  collection,
  getCountFromServer,
  query as fbQuery,
  where,
  getFirestore,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

/* -------------------- small utils -------------------- */
const pad = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dateAdd = (iso: string, deltaDays: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type Meal = (typeof MEALS)[number];

/* -------------------- strict macro types -------------------- */
type MacroFields = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  score?: number; // optional, saved from add-meal
};

/* -------------------- score badge -------------------- */
function scoreColor(score: number) {
  if (score >= 80) return { bg: "rgba(34,197,94,0.15)", fg: "#16a34a" }; // green
  if (score >= 60) return { bg: "rgba(59,130,246,0.15)", fg: "#2563eb" }; // blue
  if (score >= 40) return { bg: "rgba(245,158,11,0.18)", fg: "#d97706" }; // amber
  return { bg: "rgba(239,68,68,0.15)", fg: "#dc2626" }; // red
}

function ScoreBadge({ score }: { score: number }) {
  const v = Math.round(score);
  const { bg, fg } = scoreColor(v);
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: fg + "33",
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: fg, fontWeight: "900", fontSize: 12 }}>
        Score {v}
      </Text>
    </View>
  );
}

/* -------------------- micro-interactions -------------------- */
function usePressScale(initial = 1) {
  const a = useRef(new Animated.Value(initial)).current;
  const pressIn = () =>
    Animated.timing(a, {
      toValue: 0.98,
      duration: 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.timing(a, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  return { a, pressIn, pressOut };
}

function SoftPressable({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
}: React.PropsWithChildren<{
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
  accessibilityLabel?: string;
}>) {
  const { a, pressIn, pressOut } = usePressScale(1);
  return (
    <Animated.View style={[{ transform: [{ scale: a }] }]}>
      <Pressable
        hitSlop={8}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const MEAL_ICONS: Record<Meal, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "pizza-outline",
  dinner: "restaurant-outline",
  snacks: "ice-cream-outline",
};

/* -------------------- new meal look helpers -------------------- */
const MEAL_THEMES: Record<
  Meal,
  {
    grad: [string, string];
    chipBg: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  breakfast: {
    grad: ["#f59e0b", "#f97316"],
    chipBg: "rgba(245,158,11,0.12)",
    icon: "sunny-outline",
  },
  lunch: {
    grad: ["#06b6d4", "#3b82f6"],
    chipBg: "rgba(59,130,246,0.12)",
    icon: "pizza-outline",
  },
  dinner: {
    grad: ["#a78bfa", "#8b5cf6"],
    chipBg: "rgba(139,92,246,0.12)",
    icon: "restaurant-outline",
  },
  snacks: {
    grad: ["#22c55e", "#16a34a"],
    chipBg: "rgba(34,197,94,0.12)",
    icon: "ice-cream-outline",
  },
};

function mealTotals(items: Array<Partial<MacroFields>>): MacroFields {
  const initial: MacroFields = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  return items.reduce<MacroFields>(
    (acc, x) => ({
      calories: acc.calories + Number(x.calories ?? 0),
      protein: acc.protein + Number(x.protein ?? 0),
      carbs: acc.carbs + Number(x.carbs ?? 0),
      fat: acc.fat + Number(x.fat ?? 0),
    }),
    initial
  );
}

function MacroChip({
  label,
  value,
  unit = "",
  tint,
  textColor,
}: {
  label: string;
  value: number;
  unit?: string;
  tint: string;
  textColor: string;
}) {
  return (
    <View
      style={{
        backgroundColor: tint,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: "row",
        alignItems: "baseline",
        gap: 6,
      }}
    >
      <Text
        style={{ fontSize: 11, fontWeight: "700", color: textColor + "AA" }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: "900", color: textColor }}>
        {Math.round(value)}
        {unit}
      </Text>
    </View>
  );
}

/** Decorative progress for calories only (purely visual). */
function SoftProgress({
  value,
  goal,
  track,
  fill,
}: {
  value: number;
  goal: number;
  track: string;
  fill: string;
}) {
  const pct = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
  return (
    <View
      style={{
        height: 10,
        borderRadius: 999,
        backgroundColor: track,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          backgroundColor: fill,
        }}
      />
    </View>
  );
}

/* -------- typed props for the panel -------- */
type FancyMealPanelProps = {
  meal: Meal;
  items: Array<Partial<MacroFields>>;
  totalsColor?: { dayCalories?: number };
  isDark: boolean;
  colors: any;
  onStartEdit: any;
  editId: string | null;
  edit: any;
  setEdit: any;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDeleteItem: (id: string) => void;
  onQuickAdd?: () => void;
  itemRight?: (it: Partial<MacroFields>) => React.ReactNode;
};

/** Collapsible, themed panel that wraps MealSection */
function FancyMealPanel({
  meal,
  items,
  totalsColor,
  isDark,
  colors,
  onStartEdit,
  editId,
  edit,
  setEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteItem,
  onQuickAdd,
}: FancyMealPanelProps) {
  const [open, setOpen] = useState(true);
  const rotate = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: open ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [open]);

  const chevronSpin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-90deg", "0deg"],
  });

  const sums = mealTotals(items);
  const dayCals = Number(totalsColor?.dayCalories ?? 0);
  const visualGoal = Math.max(300, Math.round(dayCals / 4));

  const blurTint =
    Platform.OS === "ios"
      ? isDark
        ? "systemThinMaterialDark"
        : "systemThinMaterialLight"
      : "default";

  const mealEmoji =
    meal === "breakfast"
      ? "🍳"
      : meal === "lunch"
      ? "🥪"
      : meal === "dinner"
      ? "🍽️"
      : "🍇";

  return (
    <View
      style={{
        borderRadius: 22,
        overflow: "hidden",
        borderColor: colors.border,
        borderWidth: 1,
        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      }}
    >
      {/* Header */}
      <View style={{ position: "relative" }}>
        {Platform.OS === "ios" ? (
          <BlurView
            // @ts-ignore blur tint type
            tint={blurTint}
            intensity={28}
            style={{ padding: 14, paddingHorizontal: 16 }}
          >
            <LinearGradient
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              colors={[
                MEAL_THEMES[meal].grad[0] + "99",
                MEAL_THEMES[meal].grad[1] + "99",
              ]}
              style={{ position: "absolute", inset: 0, opacity: 0.45 }}
            />
            <HeaderContent />
          </BlurView>
        ) : (
          <LinearGradient
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={MEAL_THEMES[meal].grad}
            style={{ padding: 14, paddingHorizontal: 16 }}
          >
            <HeaderContent />
          </LinearGradient>
        )}
      </View>

      {/* Content */}
      {open ? (
        <View style={{ padding: 10, gap: 8 }}>
          {onQuickAdd ? (
            <Pressable
              onPress={onQuickAdd}
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                gap: 6,
                alignItems: "center",
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={colors.text}
              />
              <Text
                style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}
              >
                Add to {meal}
              </Text>
            </Pressable>
          ) : null}

          {/* Empty state vs items */}
          {!items || items.length === 0 ? (
            <View style={{ marginTop: 2 }}>
              <EmptySuggestions
                emoji={mealEmoji}
                title="No foods yet"
                subtitle="Add a favorite or search the USDA database."
                actions={[
                  {
                    icon: "star-outline",
                    label: "Favorites",
                    onPress: onQuickAdd || (() => {}),
                  },
                  {
                    icon: "search-outline",
                    label: "Search foods",
                    onPress: onQuickAdd || (() => {}),
                  },
                ]}
              />
            </View>
          ) : (
            <MealSection
              meal={meal}
              items={items as any}
              onStartEdit={onStartEdit}
              editId={editId}
              edit={edit}
              setEdit={setEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onDeleteItem={onDeleteItem}
              itemRight={(it: any) => {
                const s =
                  typeof it.score === "number"
                    ? it.score
                    : computeMealScore(it);
                return <ScoreBadge score={s} />;
              }}
            />
          )}
        </View>
      ) : null}
    </View>
  );

  function HeaderContent() {
    return (
      <View style={{ position: "relative" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={MEAL_THEMES[meal].icon} size={18} color="#fff" />
          </View>

          <View style={{ flex: 1, gap: 6 }}>
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "900",
                  textTransform: "capitalize",
                }}
              >
                {meal}
              </Text>
              <Text
                style={{ color: "rgba(255,255,255,0.9)", fontWeight: "800" }}
              >
                {Math.round(sums.calories)} kcal
              </Text>
            </View>

            <SoftProgress
              value={sums.calories}
              goal={visualGoal}
              track={"rgba(255,255,255,0.18)"}
              fill={"rgba(255,255,255,0.85)"}
            />
          </View>

          <Animated.View style={{ transform: [{ rotate: chevronSpin }] }}>
            <Pressable hitSlop={8} onPress={() => setOpen((x) => !x)}>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>
          </Animated.View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <MacroChip
            label="P"
            value={sums.protein}
            unit="g"
            tint={MEAL_THEMES[meal].chipBg}
            textColor="#fff"
          />
          <MacroChip
            label="C"
            value={sums.carbs}
            unit="g"
            tint={MEAL_THEMES[meal].chipBg}
            textColor="#fff"
          />
          <MacroChip
            label="F"
            value={sums.fat}
            unit="g"
            tint={MEAL_THEMES[meal].chipBg}
            textColor="#fff"
          />
        </View>
      </View>
    );
  }
}

/* -------------------- helpers: counts & streak -------------------- */
const db = getFirestore(app);

/** Total meals all-time (cheap server count) */
async function getMealsAllTime(uid: string) {
  const coll = collection(db, "users", uid, "nutritionEntries");
  const snap = await getCountFromServer(coll);
  return Number(snap.data().count || 0);
}

/** Compute simple day streak ending today by checking the last 7 days for any entry. */
async function getDaysStreak(uid: string, todayIso: string) {
  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const d = dateAdd(todayIso, -i);
    const q = fbQuery(
      collection(db, "users", uid, "nutritionEntries"),
      where("date", "==", d)
    );
    const c = await getCountFromServer(q as any);
    const hasAny = Number(c.data().count || 0) > 0;
    if (hasAny) streak += 1;
    else break;
  }
  return streak || 1;
}

/* -------------------- main screen -------------------- */
export default function NutritionScreen() {
  const { colors, isDark } = useTheme() as any;
  const { user } = useAuth();
  const router = useRouter();

  // date & data streams
  const [date, setDate] = useState(todayISO());
  const { foods, setFoods, exercise, setExercise, mealsMap, totals } =
    useNutritionStreams(user, date);

  // keep just selected meal locally so the modal knows where to file the result
  const [selectedMeal, setSelectedMeal] = useState<Meal>("breakfast");

  // celebration
  const [celebrateIds, setCelebrateIds] = useState<string[]>([]);

  /* ============================================================ */
  // Scroll + anchors
  const scrollRef = useRef<ScrollView | null>(null);
  const mealAnchors = useRef<Record<Meal, View | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    snacks: null,
  });

  // ----- Handle add-meal modal result (and upsert to catalog) -----
  const params = useLocalSearchParams<{ addFoodPayload?: string | string[] }>();

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      (async () => {
        if (!user?.uid) return;

        const raw = await AsyncStorage.getItem("@pending_add_meal");
        if (!raw) return;

        // clear ASAP so it can't double-fire
        await AsyncStorage.removeItem("@pending_add_meal");
        if (cancelled) return;

        try {
          const data = JSON.parse(raw);

          // Build the base entry (no id)
          const base: Omit<FoodEntry, "id"> = {
            date: (data.date || date) as FoodEntry["date"],
            meal: (data.meal || selectedMeal) as FoodEntry["meal"],
            name: String(data.name || "").trim(),
            unit: (data.unit || "serving") as FoodEntry["unit"],
            qty: Number(data.qty || 1) as FoodEntry["qty"],
            calories: Number(data.calories || 0) as FoodEntry["calories"],
            protein: Number(data.protein || 0) as FoodEntry["protein"],
            carbs: Number(data.carbs || 0) as FoodEntry["carbs"],
            fat: Number(data.fat || 0) as FoodEntry["fat"],
            ...(data.sugar != null
              ? { sugar: Number(data.sugar) as FoodEntry["sugar"] }
              : {}),
            ...(data.fiber != null
              ? { fiber: Number(data.fiber) as FoodEntry["fiber"] }
              : {}),
            // createdAt omitted (service/back-end can set it)
          };

          // Optimistic temp item
          const tempId = `temp-${Date.now()}`;
          const tempItem: FoodEntry = { ...base, id: tempId };
          setFoods((prev) => [tempItem, ...prev]);

          try {
            // Persist the food entry
            const ref = await addFood(user.uid, { ...base });

            // ---- Community Catalog (EXACT values; same unit & qty) ----
            try {
              await upsertFoodToCatalog({
                name: base.name,
                unit: base.unit || "serving",
                qty: Number(base.qty || 1),
                calories: Number(base.calories || 0),
                protein: Number(base.protein || 0),
                carbs: Number(base.carbs || 0),
                fat: Number(base.fat || 0),
                sugar: base.sugar != null ? Number(base.sugar) : undefined,
                fiber: base.fiber != null ? Number(base.fiber) : undefined,
                submitterUid: user.uid,
              });

              // Popularity bump for the (name|unit) doc
              await bumpUse(foodIdFor(base.name, base.unit || "serving"));
            } catch (e) {
              console.warn("[catalog] upsert/bump skipped:", e);
            }

            // swap temp id for real id
            setFoods((prev) =>
              prev.map((f) => (f.id === tempId ? { ...f, id: ref.id } : f))
            );

            // ----- BADGES (unchanged logic) -----
            const targetDate = base.date as string;
            const todays = [
              ...(mealsMap.breakfast || []),
              ...(mealsMap.lunch || []),
              ...(mealsMap.dinner || []),
              ...(mealsMap.snacks || []),
            ].filter((x: any) => x?.date === targetDate);

            const dayTotals = todays.reduce(
              (acc, x: any) => ({
                calories: acc.calories + Number(x.calories || 0),
                protein: acc.protein + Number(x.protein || 0),
                fiber: acc.fiber + Number(x.fiber || 0),
                sugar: acc.sugar + Number(x.sugar || 0),
              }),
              { calories: 0, protein: 0, fiber: 0, sugar: 0 }
            );

            // include the just-added entry
            dayTotals.calories += Number(base.calories || 0);
            dayTotals.protein += Number(base.protein || 0);
            dayTotals.fiber += Number(base.fiber || 0);
            dayTotals.sugar += Number(base.sugar || 0);

            const [mealsAllTime, daysStreak] = await Promise.all([
              getMealsAllTime(user.uid),
              getDaysStreak(user.uid, targetDate),
            ]);

            const newly = await evaluateBadges(user.uid, {
              type: "nutrition:add",
              dayTotals,
              counts: { mealsAllTime, daysStreak },
            });

            if (newly.length) {
              setCelebrateIds((prev) => {
                const s = new Set(prev);
                newly.forEach((id) => s.add(id));
                return Array.from(s);
              });
            }
          } catch (e) {
            // If save failed, drop the temp item
            setFoods((prev) => prev.filter((f) => f.id !== tempId));
          }
        } catch {
          // ignore malformed payload
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [user?.uid, date, selectedMeal, mealsMap])
  );

  // ----- Edit food state -----
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    qty: "1",
    unit: "serving",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    sugar: "",
    fiber: "",
  });

  async function saveFoodEdit() {
    if (!user?.uid || !editId || editId.startsWith("temp-")) {
      setEditId(null);
      return;
    }
    const scaled = {
      calories: Number(edit.calories || 0),
      protein: Number(edit.protein || 0),
      carbs: Number(edit.carbs || 0),
      fat: Number(edit.fat || 0),
      sugar: Number(edit.sugar || 0),
      fiber: Number(edit.fiber || 0),
    };
    const newScore = computeMealScore(scaled);
    const patch: any = {
      name: (edit.name || "").trim(),
      qty: Number(edit.qty || 1),
      unit: edit.unit || "serving",
      ...scaled,
      score: newScore,
    };
    const prev = foods;
    setFoods((curr) =>
      curr.map((f) => (f.id === editId ? { ...f, ...patch } : f))
    );
    setEditId(null);
    try {
      await updateFood(user.uid, editId, patch);
      // Optionally: also upsert edited item to catalog to keep it fresh
      try {
        await upsertFoodToCatalog({
          name: patch.name,
          unit: patch.unit,
          per: 1,
          nutrients: {
            calories: patch.calories,
            protein: patch.protein,
            carbs: patch.carbs,
            fat: patch.fat,
            sugar: patch.sugar || 0,
            fiber: patch.fiber || 0,
          },
          brand: null,
          fdcId: null,
        } as any);
      } catch {}
    } catch {
      setFoods(prev);
    }
  }

  async function deleteFoodItem(id: string) {
    if (id.startsWith("temp-")) {
      setFoods((curr) => curr.filter((f) => f.id !== id));
      return;
    }
    const prev = foods;
    setFoods((curr) => curr.filter((f) => f.id !== id));
    try {
      await deleteFood(user!.uid, id);
    } catch {
      setFoods(prev);
    }
  }

  // ----- Exercise (unchanged) -----
  const [exName, setExName] = useState("");
  const [exCalories, setExCalories] = useState("");
  async function addExerciseSubmit() {
    if (!user?.uid) return;
    const entry = {
      date,
      name: exName.trim(),
      calories: Number(exCalories || 0),
      createdAt: Date.now(), // numeric for service type compatibility
    };
    const tempId = "temp-x-" + Date.now();
    setExercise((prev) => [{ id: tempId, ...entry }, ...prev]);
    try {
      await addExercise(user.uid, entry);
    } finally {
      // replace temp with actual list from stream or keep optimistic only if streams refresh automatically
      setExercise((prev) => prev.filter((x) => x.id !== tempId));
      setExName("");
      setExCalories("");
    }
  }
  async function deleteExerciseItem(id: string) {
    try {
      await deleteExercise(user!.uid, id);
    } catch {}
  }

  const { colors: themeColors } = useTheme() as any;
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const borderC = themeColors.border;

  // Day-level empty?
  const dayIsEmpty =
    !mealsMap.breakfast?.length &&
    !mealsMap.lunch?.length &&
    !mealsMap.dinner?.length &&
    !mealsMap.snacks?.length;

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {/* Soft background tint */}
      <LinearGradient
        colors={[
          isDark ? "rgba(74, 222, 128, 0.07)" : "rgba(59,130,246,0.06)",
          "transparent",
        ]}
        style={{
          position: "absolute",
          top: -80,
          left: -60,
          right: -60,
          height: 280,
          transform: [{ rotate: "-6deg" }],
        }}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
      >
        <Header date={date} onChangeDate={setDate} totals={totals} />

        {/* Day empty suggestions */}
        {dayIsEmpty && (
          <EmptySuggestions
            emoji="📅"
            title="Nothing logged today"
            subtitle="Stick to your streak! Add your first meal."
            actions={[
              {
                icon: "cafe-outline",
                label: "Add Breakfast",
                onPress: () =>
                  router.push({
                    pathname: "/(modals)/add-meal",
                    params: { meal: "breakfast", date },
                  }),
              },
              {
                icon: "search-outline",
                label: "Search foods",
                onPress: () =>
                  router.push({
                    pathname: "/(modals)/add-meal",
                    params: { meal: selectedMeal, date },
                  }),
              },
            ]}
          />
        )}

        {/* Add Food launcher */}
        <View
          style={{
            borderRadius: 20,
            padding: 14,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: borderC,
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.2 : 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
            gap: 14,
          }}
        >
          <Text
            style={{
              fontWeight: "800",
              color: themeColors.text,
              fontSize: 18,
              letterSpacing: 0.2,
            }}
          >
            Add food
          </Text>

          {/* Segmented meal picker */}
          <View
            style={{
              flexDirection: "row",
              borderWidth: 1,
              borderColor: borderC,
              borderRadius: 999,
              padding: 6,
              backgroundColor: themeColors.card,
              gap: 8,
            }}
          >
            {MEALS.map((m) => {
              const active = selectedMeal === m;
              return (
                <SoftPressable
                  key={m}
                  onPress={() => setSelectedMeal(m)}
                  accessibilityLabel={`Select ${m}`}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    backgroundColor: active
                      ? themeColors.chipActiveBg
                      : "transparent",
                    borderWidth: active ? 1 : 0,
                    borderColor: active
                      ? themeColors.chipActiveBg
                      : "transparent",
                    flexDirection: "row",
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={MEAL_ICONS[m]}
                    size={16}
                    color={
                      active ? themeColors.chipActiveText : themeColors.text
                    }
                  />
                  <Text
                    style={{
                      color: active
                        ? themeColors.chipActiveText
                        : themeColors.text,
                      fontWeight: active ? "800" : "600",
                      textTransform: "capitalize",
                      fontSize: 13,
                    }}
                  >
                    {m}
                  </Text>
                </SoftPressable>
              );
            })}
          </View>

          {/* CTA */}
          <SoftPressable
            onPress={() =>
              router.push({
                pathname: "/(modals)/add-meal",
                params: { meal: selectedMeal, date },
              })
            }
            accessibilityLabel="Open add food"
            style={{
              borderRadius: 14,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <LinearGradient
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              colors={isDark ? ["#22c55e", "#16a34a"] : ["#3b82f6", "#60a5fa"]}
              style={{
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 14,
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={themeColors.buttonText}
              />
              <Text
                style={{
                  color: themeColors.buttonText,
                  fontWeight: "900",
                  letterSpacing: 0.3,
                }}
              >
                Add food
              </Text>
            </LinearGradient>
          </SoftPressable>
        </View>

        {/* Meals — hero panels */}
        {MEALS.map((m) => (
          <View
            key={m}
            ref={(el) => {
              mealAnchors.current[m] = el;
            }}
            collapsable={false}
          >
            <FancyMealPanel
              meal={m}
              items={(mealsMap[m] || []).map((it: any) => ({
                ...it,
                score:
                  typeof it.score === "number"
                    ? it.score
                    : typeof it.healthScore === "number"
                    ? it.healthScore
                    : computeMealScore(it),
              }))}
              isDark={isDark}
              colors={colors}
              totalsColor={{ dayCalories: totals?.calories ?? 0 }}
              onQuickAdd={() =>
                router.push({
                  pathname: "/(modals)/add-meal",
                  params: { meal: m, date },
                })
              }
              onStartEdit={(it: any) => {
                setEditId(it.id);
                setEdit({
                  name: it.name || "",
                  qty: String(it.qty ?? 1),
                  unit: it.unit || "serving",
                  calories: String(it.calories ?? ""),
                  protein: String(it.protein ?? ""),
                  carbs: String(it.carbs ?? ""),
                  fat: String(it.fat ?? ""),
                  sugar: String(it.sugar ?? ""),
                  fiber: String(it.fiber ?? ""),
                });
              }}
              editId={editId}
              edit={edit}
              setEdit={setEdit}
              onCancelEdit={() => setEditId(null)}
              onSaveEdit={saveFoodEdit}
              onDeleteItem={deleteFoodItem}
              itemRight={(it) => <ScoreBadge score={it.score ?? 0} />}
            />
          </View>
        ))}

        {/* Exercise
        <View
          style={{
            borderRadius: 18,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)",
            borderWidth: 1,
            borderColor: colors.border,
            padding: 6,
            paddingTop: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 8,
              paddingBottom: 6,
            }}
          >
            <Ionicons
              name="flame-outline"
              size={14}
              color={colors.text + "99"}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: colors.text + "99",
              }}
            >
              Exercise
            </Text>
          </View>

          <ExerciseCard
            items={exercise}
            exName={exName}
            setExName={setExName}
            exCalories={exCalories}
            setExCalories={setExCalories}
            onAdd={addExerciseSubmit}
            onDelete={deleteExerciseItem}
          />
        </View> */}

        <View style={{ height: 12 }} />
        <BottomTapSpacer extra={16} />
      </ScrollView>

      {/* Celebration modal */}
      <BadgeCelebrate
        ids={celebrateIds as any}
        open={celebrateIds.length > 0}
        onClose={() => setCelebrateIds([])}
      />
    </View>
  );
}
