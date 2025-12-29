// // app/(tabs)/nutrition.tsx
// import React, { useEffect, useRef, useState, useMemo } from "react";
// import {
//   ScrollView,
//   View,
//   Text,
//   Pressable,
//   Animated,
//   Easing,
//   Platform,
//   TextInput,
// } from "react-native";
// import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
// import { LinearGradient } from "expo-linear-gradient";
// import { Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";

// import { useAuth } from "@/content/AuthContext";
// import { useTheme } from "@/content/ThemeProvider";
// import { useNutritionStreams } from "@/hooks/useNutritionStreams";
// import { MotiView } from "moti";
// import {
//   addFood,
//   updateFood,
//   deleteFood,
//   addExercise,
//   deleteExercise,
//   type FoodEntry,
// } from "@/services/nutrition";
// import {
//   upsertFoodToCatalog,
//   foodIdFor,
//   bumpUse,
// } from "@/services/foodCatalog";

// import Header from "@/components/nutrition/Header";
// import MealSection from "@/components/nutrition/MealSection";
// import ExerciseCard from "@/components/nutrition/ExerciseCard";
// import EmptySuggestions from "@/components/ui/EmptySuggestions";
// import BottomTapSpacer from "@/components/ui/BottomTapSpacer";
// import { computeMealScore } from "@/utils/mealScore";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import WaterBottleCardRealistic from "@/components/WaterBottleCardRealistic";

// // NEW: profile + goals + auth
// import { auth } from "@/lib/firebase";
// import {
//   ensureProfile,
//   subscribeProfile,
//   type Profile,
// } from "@/services/profile";
// import { computeTargets } from "@/utils/macros";

// /** Badges */
// import BadgeCelebrate from "@/components/badges/BadgeCelebrate";
// import { evaluateBadges } from "@/services/badges";

// /** Firestore helpers for counts/streak */
// import {
//   collection,
//   getCountFromServer,
//   query as fbQuery,
//   where,
//   getFirestore,
// } from "firebase/firestore";
// import { app } from "@/lib/firebase";

// function withAlpha(color: string, alpha = 0.25) {
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

// const softShadow = {
//   shadowColor: "#000",
//   shadowOpacity: 0.12,
//   shadowRadius: 12,
//   shadowOffset: { width: 0, height: 6 },
//   elevation: 6,
// };

// const arcadeColors = {
//   neonPink: "#ff5ac8",
//   neonBlue: "#5ce1ff",
//   neonLime: "#8cfb9f",
//   amber: "#ffc857",
// };

// /* -------------------- small utils -------------------- */
// const pad = (n: number) => String(n).padStart(2, "0");
// const todayISO = () => {
//   const d = new Date();
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// };
// const dateAdd = (iso: string, deltaDays: number) => {
//   const d = new Date(iso);
//   d.setDate(d.getDate() + deltaDays);
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// };

// export const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;
// export type Meal = (typeof MEALS)[number];

// /* -------------------- strict macro types -------------------- */
// type MacroFields = {
//   calories: number;
//   protein: number;
//   carbs: number;
//   fat: number;
//   sugar?: number;
//   fiber?: number;
//   score?: number; // optional, saved from add-meal
// };

// /* -------------------- score badge -------------------- */
// function scoreColor(score: number) {
//   if (score >= 80) return { bg: "rgba(34,197,94,0.15)", fg: "#16a34a" }; // green
//   if (score >= 60) return { bg: "rgba(59,130,246,0.15)", fg: "#2563eb" }; // blue
//   if (score >= 40) return { bg: "rgba(245,158,11,0.18)", fg: "#d97706" }; // amber
//   return { bg: "rgba(239,68,68,0.15)", fg: "#dc2626" }; // red
// }

// function ScoreBadge({ score }: { score: number }) {
//   const v = Math.round(score);
//   const { bg, fg } = scoreColor(v);
//   return (
//     <View
//       style={{
//         paddingHorizontal: 10,
//         paddingVertical: 4,
//         borderRadius: 999,
//         backgroundColor: bg,
//         borderWidth: 1,
//         borderColor: fg + "33",
//         alignSelf: "flex-start",
//       }}
//     >
//       <Text style={{ color: fg, fontWeight: "900", fontSize: 12 }}>
//         Score {v}
//       </Text>
//     </View>
//   );
// }

// function QuestChip({
//   icon,
//   label,
//   progress,
//   detail,
//   delay = 0,
// }: {
//   icon: any;
//   label: string;
//   progress: number;
//   detail: string;
//   delay?: number;
// }) {
//   const { colors } = useTheme();
//   const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
//   return (
//     <MotiView
//       from={{ opacity: 0, translateY: 6 }}
//       animate={{ opacity: 1, translateY: 0 }}
//       transition={{ type: "timing", duration: 360, delay }}
//     >
//       <View
//         style={{
//           borderRadius: 14,
//           padding: 12,
//           borderWidth: 1,
//           borderColor: withAlpha(colors.border, 0.9),
//           backgroundColor: withAlpha(colors.card, 0.95),
//           ...softShadow,
//         }}
//       >
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             justifyContent: "space-between",
//             gap: 10,
//             marginBottom: 8,
//           }}
//         >
//           <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
//             <View
//               style={{
//                 width: 34,
//                 height: 34,
//                 borderRadius: 10,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 backgroundColor: withAlpha(colors.primary, 0.18),
//                 borderWidth: 1,
//                 borderColor: withAlpha(colors.primary, 0.35),
//               }}
//             >
//               <Ionicons name={icon} size={18} color={colors.primary} />
//             </View>
//             <View>
//               <Text
//                 style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}
//               >
//                 {label}
//               </Text>
//               <Text style={{ color: colors.muted }}>{detail}</Text>
//             </View>
//           </View>

//           <View
//             style={{
//               paddingVertical: 6,
//               paddingHorizontal: 10,
//               borderRadius: 10,
//               backgroundColor: withAlpha(
//                 pct >= 100 ? arcadeColors.neonLime : colors.primary,
//                 0.14
//               ),
//             }}
//           >
//             <Text
//               style={{
//                 color: pct >= 100 ? arcadeColors.neonLime : colors.primary,
//                 fontWeight: "800",
//               }}
//             >
//               {pct}%
//             </Text>
//           </View>
//         </View>
//         <View
//           style={{
//             height: 10,
//             borderRadius: 999,
//             backgroundColor: withAlpha(colors.border, 0.9),
//             overflow: "hidden",
//           }}
//         >
//           <View
//             style={{
//               width: `${pct}%`,
//               height: "100%",
//               borderRadius: 999,
//               backgroundColor:
//                 pct >= 100 ? arcadeColors.neonLime : colors.primary,
//               opacity: 0.9,
//             }}
//           />
//         </View>
//       </View>
//     </MotiView>
//   );
// }

// /* -------------------- micro-interactions -------------------- */
// function usePressScale(initial = 1) {
//   const a = useRef(new Animated.Value(initial)).current;
//   const pressIn = () =>
//     Animated.timing(a, {
//       toValue: 0.98,
//       duration: 80,
//       easing: Easing.out(Easing.quad),
//       useNativeDriver: true,
//     }).start();
//   const pressOut = () =>
//     Animated.timing(a, {
//       toValue: 1,
//       duration: 120,
//       easing: Easing.out(Easing.quad),
//       useNativeDriver: true,
//     }).start();
//   return { a, pressIn, pressOut };
// }

// function SoftPressable({
//   children,
//   onPress,
//   style,
//   disabled,
//   accessibilityLabel,
// }: React.PropsWithChildren<{
//   onPress?: () => void;
//   style?: any;
//   disabled?: boolean;
//   accessibilityLabel?: string;
// }>) {
//   const { a, pressIn, pressOut } = usePressScale(1);
//   return (
//     <Animated.View style={[{ transform: [{ scale: a }] }]}>
//       <Pressable
//         hitSlop={8}
//         onPress={onPress}
//         onPressIn={pressIn}
//         onPressOut={pressOut}
//         disabled={disabled}
//         accessibilityRole="button"
//         accessibilityLabel={accessibilityLabel}
//         style={style}
//       >
//         {children}
//       </Pressable>
//     </Animated.View>
//   );
// }

// const MEAL_ICONS: Record<Meal, keyof typeof Ionicons.glyphMap> = {
//   breakfast: "sunny-outline",
//   lunch: "pizza-outline",
//   dinner: "restaurant-outline",
//   snacks: "ice-cream-outline",
// };

// /* -------------------- new meal look helpers -------------------- */
// const MEAL_THEMES: Record<
//   Meal,
//   {
//     grad: [string, string];
//     chipBg: string;
//     icon: keyof typeof Ionicons.glyphMap;
//   }
// > = {
//   breakfast: {
//     grad: ["#f59e0b", "#f97316"],
//     chipBg: "rgba(245,158,11,0.12)",
//     icon: "sunny-outline",
//   },
//   lunch: {
//     grad: ["#06b6d4", "#3b82f6"],
//     chipBg: "rgba(59,130,246,0.12)",
//     icon: "pizza-outline",
//   },
//   dinner: {
//     grad: ["#a78bfa", "#8b5cf6"],
//     chipBg: "rgba(139,92,246,0.12)",
//     icon: "restaurant-outline",
//   },
//   snacks: {
//     grad: ["#22c55e", "#16a34a"],
//     chipBg: "rgba(34,197,94,0.12)",
//     icon: "ice-cream-outline",
//   },
// };

// function mealTotals(items: Array<Partial<MacroFields>>): MacroFields {
//   const initial: MacroFields = { calories: 0, protein: 0, carbs: 0, fat: 0 };
//   return items.reduce<MacroFields>(
//     (acc, x) => ({
//       calories: acc.calories + Number(x.calories ?? 0),
//       protein: acc.protein + Number(x.protein ?? 0),
//       carbs: acc.carbs + Number(x.carbs ?? 0),
//       fat: acc.fat + Number(x.fat ?? 0),
//     }),
//     initial
//   );
// }

// function MacroChip({
//   label,
//   value,
//   unit = "",
//   tint,
//   textColor,
// }: {
//   label: string;
//   value: number;
//   unit?: string;
//   tint: string;
//   textColor: string;
// }) {
//   return (
//     <View
//       style={{
//         backgroundColor: tint,
//         borderRadius: 999,
//         paddingHorizontal: 10,
//         paddingVertical: 6,
//         flexDirection: "row",
//         alignItems: "baseline",
//         gap: 6,
//       }}
//     >
//       <Text
//         style={{ fontSize: 11, fontWeight: "700", color: textColor + "AA" }}
//       >
//         {label}
//       </Text>
//       <Text style={{ fontSize: 13, fontWeight: "900", color: textColor }}>
//         {Math.round(value)}
//         {unit}
//       </Text>
//     </View>
//   );
// }

// /** Decorative progress for calories only (purely visual). */
// function SoftProgress({
//   value,
//   goal,
//   track,
//   fill,
// }: {
//   value: number;
//   goal: number;
//   track: string;
//   fill: string;
// }) {
//   const pct = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
//   return (
//     <View
//       style={{
//         height: 10,
//         borderRadius: 999,
//         backgroundColor: track,
//         overflow: "hidden",
//       }}
//     >
//       <View
//         style={{
//           width: `${pct * 100}%`,
//           height: "100%",
//           backgroundColor: fill,
//         }}
//       />
//     </View>
//   );
// }

// /* -------- typed props for the panel -------- */
// type FancyMealPanelProps = {
//   meal: Meal;
//   items: Array<Partial<MacroFields>>;
//   totalsColor?: { dayCalories?: number };
//   isDark: boolean;
//   colors: any;
//   onStartEdit: any;
//   editId: string | null;
//   edit: any;
//   setEdit: any;
//   onCancelEdit: () => void;
//   onSaveEdit: () => void;
//   onDeleteItem: (id: string) => void;
//   onQuickAdd?: () => void;
//   itemRight?: (it: Partial<MacroFields>) => React.ReactNode;
//   onSuggest?: () => void;
// };

// /** Collapsible, themed panel that wraps MealSection */
// function FancyMealPanel({
//   meal,
//   items,
//   totalsColor,
//   isDark,
//   colors,
//   onStartEdit,
//   editId,
//   edit,
//   setEdit,
//   onCancelEdit,
//   onSaveEdit,
//   onDeleteItem,
//   onQuickAdd,
//   onSuggest,
// }: FancyMealPanelProps) {
//   const [open, setOpen] = useState(true);
//   const rotate = useRef(new Animated.Value(1)).current;

//   useEffect(() => {
//     Animated.timing(rotate, {
//       toValue: open ? 1 : 0,
//       duration: 180,
//       easing: Easing.out(Easing.quad),
//       useNativeDriver: true,
//     }).start();
//   }, [open]);

//   const chevronSpin = rotate.interpolate({
//     inputRange: [0, 1],
//     outputRange: ["-90deg", "0deg"],
//   });

//   const sums = mealTotals(items);
//   const dayCals = Number(totalsColor?.dayCalories ?? 0);
//   const visualGoal = Math.max(300, Math.round(dayCals / 4));

//   const blurTint =
//     Platform.OS === "ios"
//       ? isDark
//         ? "systemThinMaterialDark"
//         : "systemThinMaterialLight"
//       : "default";

//   const mealEmoji =
//     meal === "breakfast"
//       ? "🍳"
//       : meal === "lunch"
//       ? "🥪"
//       : meal === "dinner"
//       ? "🍽️"
//       : "🍇";

//   return (
//     <View
//       style={{
//         borderRadius: 22,
//         overflow: "hidden",
//         borderColor: colors.border,
//         borderWidth: 1,
//         backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
//       }}
//     >
//       {/* Header */}
//       <View style={{ position: "relative" }}>
//         {Platform.OS === "ios" ? (
//           <BlurView
//             // @ts-ignore blur tint type
//             tint={blurTint}
//             intensity={28}
//             style={{ padding: 14, paddingHorizontal: 16 }}
//           >
//             <LinearGradient
//               start={{ x: 0, y: 0.5 }}
//               end={{ x: 1, y: 0.5 }}
//               colors={[
//                 MEAL_THEMES[meal].grad[0] + "99",
//                 MEAL_THEMES[meal].grad[1] + "99",
//               ]}
//               style={{ position: "absolute", inset: 0, opacity: 0.45 }}
//             />
//             <HeaderContent />
//           </BlurView>
//         ) : (
//           <LinearGradient
//             start={{ x: 0, y: 0.5 }}
//             end={{ x: 1, y: 0.5 }}
//             colors={MEAL_THEMES[meal].grad}
//             style={{ padding: 14, paddingHorizontal: 16 }}
//           >
//             <HeaderContent />
//           </LinearGradient>
//         )}
//       </View>

//       {/* Content */}
//       {open ? (
//         <View style={{ padding: 10, gap: 8 }}>
//           {onQuickAdd ? (
//             <Pressable
//               onPress={onQuickAdd}
//               style={{
//                 alignSelf: "flex-start",
//                 borderRadius: 999,
//                 paddingVertical: 8,
//                 paddingHorizontal: 12,
//                 backgroundColor: isDark
//                   ? "rgba(255,255,255,0.06)"
//                   : "rgba(0,0,0,0.04)",
//                 borderWidth: 1,
//                 borderColor: colors.border,
//                 flexDirection: "row",
//                 gap: 6,
//                 alignItems: "center",
//               }}
//             >
//               <Ionicons
//                 name="add-circle-outline"
//                 size={16}
//                 color={colors.text}
//               />
//               <Text
//                 style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}
//               >
//                 Add to {meal}
//               </Text>
//             </Pressable>
//           ) : null}

//           {/* Empty state vs items */}
//           {!items || items.length === 0 ? (
//             <View style={{ marginTop: 2 }}>
//               <EmptySuggestions
//                 emoji={mealEmoji}
//                 title="No foods yet"
//                 subtitle="Add a favorite or search the USDA database."
//                 actions={[
//                   {
//                     icon: "star-outline",
//                     label: "Favorites",
//                     onPress: onQuickAdd || (() => {}),
//                   },
//                   {
//                     icon: "search-outline",
//                     label: "Search foods",
//                     onPress: onQuickAdd || (() => {}),
//                   },
//                 ]}
//               />
//             </View>
//           ) : (
//             <MealSection
//               meal={meal}
//               items={items as any}
//               onStartEdit={onStartEdit}
//               editId={editId}
//               edit={edit}
//               setEdit={setEdit}
//               onCancelEdit={onCancelEdit}
//               onSaveEdit={onSaveEdit}
//               onDeleteItem={onDeleteItem}
//               itemRight={(it: any) => {
//                 const s =
//                   typeof it.score === "number"
//                     ? it.score
//                     : computeMealScore(it);
//                 return <ScoreBadge score={s} />;
//               }}
//             />
//           )}
//         </View>
//       ) : null}
//     </View>
//   );

//   function HeaderContent() {
//     return (
//       <View style={{ position: "relative" }}>
//         {/* Per-meal AI wand (top-right) */}
//         {onSuggest ? (
//           <Pressable
//             onPress={onSuggest}
//             accessibilityLabel={`Suggest ${meal} ideas to fit today's macros`}
//             style={{
//               position: "absolute",
//               right: 6,
//               top: 6,
//               zIndex: 10,
//               borderRadius: 999,
//               paddingVertical: 6,
//               paddingHorizontal: 10,
//               backgroundColor: "rgba(255,255,255,0.18)",
//               borderWidth: 1,
//               borderColor: "rgba(255,255,255,0.35)",
//               flexDirection: "row",
//               gap: 6,
//               alignItems: "center",
//             }}
//           >
//             <Ionicons name="sparkles-outline" size={14} color={"#fff"} />
//             <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>
//               Ideas
//             </Text>
//           </Pressable>
//         ) : null}
//         <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
//           <View
//             style={{
//               width: 36,
//               height: 36,
//               borderRadius: 12,
//               backgroundColor: "rgba(255,255,255,0.18)",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             <Ionicons name={MEAL_THEMES[meal].icon} size={18} color="#fff" />
//           </View>

//           <View style={{ flex: 1, gap: 6 }}>
//             <View
//               style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
//             >
//               <Text
//                 style={{
//                   color: "#fff",
//                   fontSize: 16,
//                   fontWeight: "900",
//                   textTransform: "capitalize",
//                 }}
//               >
//                 {meal}
//               </Text>
//               <Text
//                 style={{ color: "rgba(255,255,255,0.9)", fontWeight: "800" }}
//               >
//                 {Math.round(sums.calories)} kcal
//               </Text>
//             </View>

//             <SoftProgress
//               value={sums.calories}
//               goal={visualGoal}
//               track={"rgba(255,255,255,0.18)"}
//               fill={"rgba(255,255,255,0.85)"}
//             />
//           </View>

//           <Animated.View style={{ transform: [{ rotate: chevronSpin }] }}>
//             <Pressable hitSlop={8} onPress={() => setOpen((x) => !x)}>
//               <Ionicons name="chevron-forward" size={18} color="#fff" />
//             </Pressable>
//           </Animated.View>
//         </View>

//         <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
//           <MacroChip
//             label="P"
//             value={sums.protein}
//             unit="g"
//             tint={MEAL_THEMES[meal].chipBg}
//             textColor="#fff"
//           />
//           <MacroChip
//             label="C"
//             value={sums.carbs}
//             unit="g"
//             tint={MEAL_THEMES[meal].chipBg}
//             textColor="#fff"
//           />
//           <MacroChip
//             label="F"
//             value={sums.fat}
//             unit="g"
//             tint={MEAL_THEMES[meal].chipBg}
//             textColor="#fff"
//           />
//         </View>
//       </View>
//     );
//   }
// }

// /* -------------------- helpers: counts & streak -------------------- */
// const db = getFirestore(app);

// /** Total meals all-time (cheap server count) */
// async function getMealsAllTime(uid: string) {
//   const coll = collection(db, "users", uid, "nutritionEntries");
//   const snap = await getCountFromServer(coll);
//   return Number(snap.data().count || 0);
// }

// /** Compute simple day streak ending today by checking the last 7 days for any entry. */
// async function getDaysStreak(uid: string, todayIso: string) {
//   let streak = 0;
//   for (let i = 0; i < 7; i++) {
//     const d = dateAdd(todayIso, -i);
//     const q = fbQuery(
//       collection(db, "users", uid, "nutritionEntries"),
//       where("date", "==", d)
//     );
//     const c = await getCountFromServer(q as any);
//     const hasAny = Number(c.data().count || 0) > 0;
//     if (hasAny) streak += 1;
//     else break;
//   }
//   return streak || 1;
// }

// /* -------------------- main screen -------------------- */
// export default function NutritionScreen() {
//   const { colors, isDark } = useTheme() as any;
//   const { colors: themeColors } = useTheme() as any;
//   const { user } = useAuth();
//   const router = useRouter();
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // date & data streams
//   const [date, setDate] = useState(todayISO());
//   const { foods, setFoods, exercise, setExercise, mealsMap, totals } =
//     useNutritionStreams(user, date);
//   const [waterMl, setWaterMl] = useState(0);

//   // keep just selected meal locally so the modal knows where to file the result
//   const [selectedMeal, setSelectedMeal] = useState<Meal>("breakfast");

//   // celebration
//   const [celebrateIds, setCelebrateIds] = useState<string[]>([]);

//   /* ===== Profile + daily macro goals (for AI context) ===== */
//   const [profile, setProfile] = useState<Profile | null>(null);
//   useEffect(() => {
//     if (!user?.uid) return;
//     let unsub: undefined | (() => void);
//     (async () => {
//       await ensureProfile(user.uid, user?.email ? { email: user.email } : {});
//       unsub = subscribeProfile(user.uid, setProfile);
//     })();
//     return () => {
//       try {
//         unsub && unsub();
//       } catch {}
//     };
//   }, [user?.uid]);

//   const goals = React.useMemo(() => {
//     try {
//       // 👇 supply the required cfg argument (empty {} is fine if you don't have custom cfg)
//       const t = computeTargets(profile as any, {} as any) as any;
//       return {
//         calories: Number(t?.calories ?? 2200),
//         protein: Number(t?.protein ?? 140),
//         carbs: Number(t?.carbs ?? 220),
//         fat: Number(t?.fat ?? 70),
//       };
//     } catch {
//       return { calories: 2200, protein: 140, carbs: 220, fat: 70 };
//     }
//   }, [profile]);

//   /* ===== Hydration (local, per-day) ===== */
//   const waterGoal = useMemo(() => {
//     const fromProfile = (profile as any)?.waterGoalMl;
//     if (typeof fromProfile === "number" && fromProfile > 0) return fromProfile;
//     if (profile?.weightKg) return Math.round(profile.weightKg * 35); // 35ml per kg
//     return 2400;
//   }, [profile]);
//   const waterKey = useMemo(() => `water-${date}`, [date]);

//   useEffect(() => {
//     let active = true;
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem(waterKey);
//         if (active) setWaterMl(raw ? Number(raw) || 0 : 0);
//       } catch {
//         if (active) setWaterMl(0);
//       }
//     })();
//     return () => {
//       active = false;
//     };
//   }, [waterKey]);

//   const updateWater = (next: number) => {
//     const clamped = Math.max(0, Math.round(next));
//     setWaterMl(clamped);
//     AsyncStorage.setItem(waterKey, String(clamped)).catch(() => {});
//   };

//   const quickAddWater = (ml: number) => {
//     setWaterMl((prev) => {
//       const next = Math.max(0, Math.round((prev || 0) + ml));
//       AsyncStorage.setItem(waterKey, String(next)).catch(() => {});
//       return next;
//     });
//   };

//   /* ===== Inline AI meal ideas (like WorkoutGenerator) ===== */
//   const [genNotes, setGenNotes] = useState<string>("");
//   const [genLoading, setGenLoading] = useState<boolean>(false);
//   const [genIdeas, setGenIdeas] = useState<
//     {
//       name: string;
//       meal?: "breakfast" | "lunch" | "dinner" | "snacks";
//       calories: number;
//       protein: number;
//       carbs: number;
//       fat: number;
//       sugar?: number;
//       fiber?: number;
//       prep_min?: number;
//       difficulty?: string;
//       notes?: string;
//     }[]
//   >([]);

//   async function generateMealIdeas(mealOverride?: Meal) {
//     const url =
//       process.env.EXPO_PUBLIC_AI_DESCRIBE_URL ||
//       process.env.EXPO_PUBLIC_DESCRIBE_URL;
//     if (!url) {
//       alert("Missing AI describe URL");
//       return;
//     }
//     const idToken = await auth.currentUser?.getIdToken(true);
//     if (!idToken) {
//       alert("Sign in required");
//       return;
//     }

//     // Current day totals as context
//     const t = {
//       calories: Number(totals?.calories ?? 0),
//       protein: Number(totals?.protein ?? 0),
//       carbs: Number(totals?.carbs ?? 0),
//       fat: Number(totals?.fat ?? 0),
//     };

//     const payload = {
//       mode: "meal_suggest:v1",
//       date,
//       meal: (mealOverride || selectedMeal) as any,
//       goals,
//       totals: t,
//       notes: (genNotes || "").trim(),
//       profile: profile
//         ? {
//             dietType: (profile as any)?.dietType ?? undefined,
//             dislikes: (profile as any)?.dislikes ?? undefined,
//           }
//         : undefined,
//     };

//     try {
//       setGenLoading(true);
//       const res = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
//         },
//         body: JSON.stringify(payload),
//       });
//       const out = await ((res.headers.get("content-type") || "").includes(
//         "application/json"
//       )
//         ? res.json()
//         : res.text());

//       // keep the same error handling, now `out` is the resolved value
//       if (!res.ok) {
//         const msg =
//           typeof out === "string" ? out : (out as any)?.error || "AI error";
//         throw new Error(msg);
//       }

//       const ideas = Array.isArray((out as any)?.meals)
//         ? (out as any).meals
//         : Array.isArray(out)
//         ? out
//         : [];
//       setGenIdeas(ideas);
//     } catch (e: any) {
//       console.warn(e);
//       alert(e?.message || "Could not generate meal ideas");
//     } finally {
//       setGenLoading(false);
//     }
//   }

//   async function addIdeaToMeal(it: any) {
//     await AsyncStorage.setItem(
//       "@pending_add_meal",
//       JSON.stringify({
//         date,
//         meal: selectedMeal,
//         name: it?.name || "Meal",
//         qty: 1,
//         unit: "serving",
//         calories: Number(it?.calories || 0),
//         protein: Number(it?.protein || 0),
//         carbs: Number(it?.carbs || 0),
//         fat: Number(it?.fat || 0),
//         sugar: Number(it?.sugar || 0),
//         fiber: Number(it?.fiber || 0),
//       })
//     );
//     router.push({
//       pathname: "/(modals)/add-meal",
//       params: { meal: selectedMeal, date },
//     });
//   }

//   /* ============================================================ */
//   // Scroll + anchors
//   const scrollRef = useRef<ScrollView | null>(null);
//   const mealAnchors = useRef<Record<Meal, View | null>>({
//     breakfast: null,
//     lunch: null,
//     dinner: null,
//     snacks: null,
//   });

//   // ----- Handle add-meal modal result (and upsert to catalog) -----
//   const params = useLocalSearchParams<{ addFoodPayload?: string | string[] }>();

//   useFocusEffect(
//     React.useCallback(() => {
//       let cancelled = false;

//       (async () => {
//         if (!user?.uid) return;

//         const raw = await AsyncStorage.getItem("@pending_add_meal");
//         if (!raw) return;

//         // clear ASAP so it can't double-fire
//         await AsyncStorage.removeItem("@pending_add_meal");
//         if (cancelled) return;

//         try {
//           const data = JSON.parse(raw);

//           // Build the base entry (no id)
//           const base: Omit<FoodEntry, "id"> = {
//             date: (data.date || date) as FoodEntry["date"],
//             meal: (data.meal || selectedMeal) as FoodEntry["meal"],
//             name: String(data.name || "").trim(),
//             unit: (data.unit || "serving") as FoodEntry["unit"],
//             qty: Number(data.qty || 1) as FoodEntry["qty"],
//             calories: Number(data.calories || 0) as FoodEntry["calories"],
//             protein: Number(data.protein || 0) as FoodEntry["protein"],
//             carbs: Number(data.carbs || 0) as FoodEntry["carbs"],
//             fat: Number(data.fat || 0) as FoodEntry["fat"],
//             ...(data.sugar != null
//               ? { sugar: Number(data.sugar) as FoodEntry["sugar"] }
//               : {}),
//             ...(data.fiber != null
//               ? { fiber: Number(data.fiber) as FoodEntry["fiber"] }
//               : {}),
//             // createdAt omitted (service/back-end can set it)
//           };

//           // Optimistic temp item
//           const tempId = `temp-${Date.now()}`;
//           const tempItem: FoodEntry = { ...base, id: tempId };
//           setFoods((prev) => [tempItem, ...prev]);

//           try {
//             // Persist the food entry
//             const ref = await addFood(user.uid, { ...base });

//             // ---- Community Catalog (EXACT values; same unit & qty) ----
//             try {
//               await upsertFoodToCatalog({
//                 name: base.name,
//                 unit: base.unit || "serving",
//                 qty: Number(base.qty || 1),
//                 calories: Number(base.calories || 0),
//                 protein: Number(base.protein || 0),
//                 carbs: Number(base.carbs || 0),
//                 fat: Number(base.fat || 0),
//                 sugar: base.sugar != null ? Number(base.sugar) : undefined,
//                 fiber: base.fiber != null ? Number(base.fiber) : undefined,
//                 submitterUid: user.uid,
//               });

//               // Popularity bump for the (name|unit) doc
//               await bumpUse(foodIdFor(base.name, base.unit || "serving"));
//             } catch (e) {
//               console.warn("[catalog] upsert/bump skipped:", e);
//             }

//             // swap temp id for real id
//             setFoods((prev) =>
//               prev.map((f) => (f.id === tempId ? { ...f, id: ref.id } : f))
//             );

//             // ----- BADGES (unchanged logic) -----
//             const targetDate = base.date as string;
//             const todays = [
//               ...(mealsMap.breakfast || []),
//               ...(mealsMap.lunch || []),
//               ...(mealsMap.dinner || []),
//               ...(mealsMap.snacks || []),
//             ].filter((x: any) => x?.date === targetDate);

//             const dayTotals = todays.reduce(
//               (acc, x: any) => ({
//                 calories: acc.calories + Number(x.calories || 0),
//                 protein: acc.protein + Number(x.protein || 0),
//                 fiber: acc.fiber + Number(x.fiber || 0),
//                 sugar: acc.sugar + Number(x.sugar || 0),
//               }),
//               { calories: 0, protein: 0, fiber: 0, sugar: 0 }
//             );

//             // include the just-added entry
//             dayTotals.calories += Number(base.calories || 0);
//             dayTotals.protein += Number(base.protein || 0);
//             dayTotals.fiber += Number(base.fiber || 0);
//             dayTotals.sugar += Number(base.sugar || 0);

//             const [mealsAllTime, daysStreak] = await Promise.all([
//               getMealsAllTime(user.uid),
//               getDaysStreak(user.uid, targetDate),
//             ]);

//             const newly = await evaluateBadges(user.uid, {
//               type: "nutrition:add",
//               dayTotals,
//               counts: { mealsAllTime, daysStreak },
//             });

//             if (newly.length) {
//               setCelebrateIds((prev) => {
//                 const s = new Set(prev);
//                 newly.forEach((id) => s.add(id));
//                 return Array.from(s);
//               });
//             }
//           } catch (e) {
//             // If save failed, drop the temp item
//             setFoods((prev) => prev.filter((f) => f.id !== tempId));
//           }
//         } catch {
//           // ignore malformed payload
//         }
//       })();

//       return () => {
//         cancelled = true;
//       };
//     }, [user?.uid, date, selectedMeal, mealsMap])
//   );

//   // ----- Edit food state -----
//   const [editId, setEditId] = useState<string | null>(null);
//   const [edit, setEdit] = useState({
//     name: "",
//     qty: "1",
//     unit: "serving",
//     calories: "",
//     protein: "",
//     carbs: "",
//     fat: "",
//     sugar: "",
//     fiber: "",
//   });

//   async function saveFoodEdit() {
//     if (!user?.uid || !editId || editId.startsWith("temp-")) {
//       setEditId(null);
//       return;
//     }
//     const scaled = {
//       calories: Number(edit.calories || 0),
//       protein: Number(edit.protein || 0),
//       carbs: Number(edit.carbs || 0),
//       fat: Number(edit.fat || 0),
//       sugar: Number(edit.sugar || 0),
//       fiber: Number(edit.fiber || 0),
//     };
//     const newScore = computeMealScore(scaled);
//     const patch: any = {
//       name: (edit.name || "").trim(),
//       qty: Number(edit.qty || 1),
//       unit: edit.unit || "serving",
//       ...scaled,
//       score: newScore,
//     };
//     const prev = foods;
//     setFoods((curr) =>
//       curr.map((f) => (f.id === editId ? { ...f, ...patch } : f))
//     );
//     setEditId(null);
//     try {
//       await updateFood(user.uid, editId, patch);
//       // Optional: also upsert edited item to catalog
//       try {
//         await upsertFoodToCatalog({
//           name: patch.name,
//           unit: patch.unit,
//           qty: 1,
//           calories: patch.calories,
//           protein: patch.protein,
//           carbs: patch.carbs,
//           fat: patch.fat,
//           sugar: patch.sugar || 0,
//           fiber: patch.fiber || 0,
//           submitterUid: user.uid,
//         } as any);
//       } catch {}
//     } catch {
//       setFoods(prev);
//     }
//   }

//   async function deleteFoodItem(id: string) {
//     if (id.startsWith("temp-")) {
//       setFoods((curr) => curr.filter((f) => f.id !== id));
//       return;
//     }
//     const prev = foods;
//     setFoods((curr) => curr.filter((f) => f.id !== id));
//     try {
//       await deleteFood(user!.uid, id);
//     } catch {
//       setFoods(prev);
//     }
//   }

//   // ----- Exercise (unchanged) -----
//   const [exName, setExName] = useState("");
//   const [exCalories, setExCalories] = useState("");
//   async function addExerciseSubmit() {
//     if (!user?.uid) return;
//     const entry = {
//       date,
//       name: exName.trim(),
//       calories: Number(exCalories || 0),
//       createdAt: Date.now(),
//     };
//     const tempId = "temp-x-" + Date.now();
//     setExercise((prev) => [{ id: tempId, ...entry }, ...prev]);
//     try {
//       await addExercise(user.uid, entry);
//     } finally {
//       setExercise((prev) => prev.filter((x) => x.id !== tempId));
//       setExName("");
//       setExCalories("");
//     }
//   }
//   async function deleteExerciseItem(id: string) {
//     try {
//       await deleteExercise(user!.uid, id);
//     } catch {}
//   }

//   const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
//   const borderC = themeColors.border;

//   // Day-level empty?
//   const dayIsEmpty =
//     !mealsMap.breakfast?.length &&
//     !mealsMap.lunch?.length &&
//     !mealsMap.dinner?.length &&
//     !mealsMap.snacks?.length;
//   const heroLift = scrollY.interpolate({
//     inputRange: [0, 140],
//     outputRange: [0, -14],
//     extrapolate: "clamp",
//   });
//   const heroScale = scrollY.interpolate({
//     inputRange: [-60, 0, 140],
//     outputRange: [1.03, 1, 0.97],
//     extrapolate: "clamp",
//   });
//   const ribbonTilt = scrollY.interpolate({
//     inputRange: [0, 220],
//     outputRange: ["0deg", "-7deg"],
//     extrapolate: "clamp",
//   });

//   const mealsLogged = foods?.length ?? 0;
//   const exerciseLogged = exercise?.length ?? 0;
//   const questList = useMemo(
//     () => [
//       {
//         icon: "flame-outline" as const,
//         label: "Calories",
//         progress: Math.min(
//           1,
//           goals.calories > 0 ? totals.calories / goals.calories : 0
//         ),
//         detail: `${Math.max(
//           0,
//           Math.round(goals.calories - totals.calories)
//         )} kcal left`,
//       },
//       {
//         icon: "barbell-outline" as const,
//         label: "Protein",
//         progress: Math.min(
//           1,
//           goals.protein > 0 ? totals.protein / goals.protein : 0
//         ),
//         detail: `${Math.max(
//           0,
//           Math.round(goals.protein - totals.protein)
//         )} g left`,
//       },
//       {
//         icon: "restaurant-outline" as const,
//         label: "Meals logged",
//         progress: Math.min(1, mealsLogged / 4),
//         detail: mealsLogged
//           ? `${mealsLogged} logged today`
//           : "Add your first meal",
//       },
//       {
//         icon: "sparkles-outline" as const,
//         label: "Movement",
//         progress: exerciseLogged > 0 ? 1 : 0.35,
//         detail: exerciseLogged ? "Exercise logged" : "Add a quick burn",
//       },
//     ],
//     [
//       goals.calories,
//       goals.protein,
//       mealsLogged,
//       exerciseLogged,
//       totals.calories,
//       totals.protein,
//     ]
//   );
//   const questXp = Math.round(
//     (questList.reduce((s, q) => s + q.progress, 0) /
//       Math.max(1, questList.length)) *
//       100
//   );

//   const statCards = useMemo(
//     () => [
//       {
//         icon: "pie-chart-outline" as const,
//         label: "Calories",
//         value: `${Math.round(totals.calories).toLocaleString()} / ${Math.round(
//           goals.calories
//         ).toLocaleString()} kcal`,
//       },
//       {
//         icon: "fitness-outline" as const,
//         label: "Protein",
//         value: `${Math.round(totals.protein)} / ${Math.round(goals.protein)} g`,
//       },
//       {
//         icon: "timer-outline" as const,
//         label: "Meals",
//         value: `${mealsLogged} logged`,
//       },
//       {
//         icon: "trending-up-outline" as const,
//         label: "Carbs / Fat",
//         value: `${Math.round(totals.carbs)}c · ${Math.round(totals.fat)}f`,
//       },
//     ],
//     [
//       goals.calories,
//       goals.protein,
//       mealsLogged,
//       totals.calories,
//       totals.carbs,
//       totals.fat,
//       totals.protein,
//     ]
//   );
//   const waterPills = useMemo(() => [150, 250, 350, 500, 750, 1000], []);
//   const waterPct = Math.min(
//     1,
//     waterGoal > 0 ? Math.max(0, waterMl) / waterGoal : 0
//   );

//   return (
//     <View style={{ flex: 1, backgroundColor: themeColors.background }}>
//       {/* Soft background tint */}
//       <LinearGradient
//         colors={[
//           isDark ? "rgba(74, 222, 128, 0.07)" : "rgba(59,130,246,0.06)",
//           "transparent",
//         ]}
//         style={{
//           position: "absolute",
//           top: -80,
//           left: -60,
//           right: -60,
//           height: 280,
//           transform: [{ rotate: "-6deg" }],
//         }}
//         pointerEvents="none"
//       />

//       <Animated.ScrollView
//         ref={scrollRef as any}
//         style={{ flex: 1 }}
//         contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
//         onScroll={Animated.event(
//           [{ nativeEvent: { contentOffset: { y: scrollY } } }],
//           { useNativeDriver: true }
//         )}
//         scrollEventThrottle={16}
//       >
//         {/* floating arcade ribbons */}
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: "absolute",
//             top: -70,
//             right: -60,
//             width: 220,
//             height: 220,
//             opacity: isDark ? 0.16 : 0.26,
//             transform: [
//               { translateY: Animated.multiply(scrollY, -0.08) },
//               { rotate: ribbonTilt },
//             ],
//           }}
//         >
//           <LinearGradient
//             colors={[arcadeColors.neonBlue, arcadeColors.neonPink]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={{
//               flex: 1,
//               borderRadius: 120,
//               transform: [{ rotate: "18deg" }],
//             }}
//           />
//         </Animated.View>
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: "absolute",
//             top: 220,
//             left: -80,
//             width: 200,
//             height: 200,
//             opacity: isDark ? 0.14 : 0.22,
//             transform: [
//               { translateY: Animated.multiply(scrollY, -0.04) },
//               { rotate: "-10deg" },
//             ],
//           }}
//         >
//           <LinearGradient
//             colors={[arcadeColors.neonLime, arcadeColors.amber]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={{
//               flex: 1,
//               borderRadius: 120,
//               transform: [{ rotate: "-12deg" }],
//             }}
//           />
//         </Animated.View>

//         <Animated.View
//           style={{
//             transform: [{ translateY: heroLift }, { scale: heroScale }],
//           }}
//         >
//           <Header date={date} onChangeDate={setDate} totals={totals} />
//         </Animated.View>

//         <MotiView
//           from={{ opacity: 0, translateY: 12 }}
//           animate={{ opacity: 1, translateY: 0 }}
//           transition={{ type: "timing", duration: 480, delay: 40 }}
//         >
//           <LinearGradient
//             colors={[withAlpha(arcadeColors.neonBlue, 0.28), colors.card]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={{
//               borderRadius: 22,
//               padding: 14,
//               borderWidth: 1,
//               borderColor: withAlpha(colors.primary, 0.35),
//               position: "relative",
//               overflow: "hidden",
//               ...softShadow,
//             }}
//           >
//             <Animated.View
//               pointerEvents="none"
//               style={{
//                 position: "absolute",
//                 right: -40,
//                 bottom: -30,
//                 width: 150,
//                 height: 150,
//                 opacity: 0.16,
//                 transform: [{ rotate: ribbonTilt }],
//               }}
//             >
//               <LinearGradient
//                 colors={[arcadeColors.neonPink, arcadeColors.neonLime]}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={{ flex: 1, borderRadius: 100 }}
//               />
//             </Animated.View>

//             <View
//               style={{
//                 flexDirection: "row",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//                 gap: 12,
//               }}
//             >
//               <View style={{ flex: 1, minWidth: 0 }}>
//                 <Text
//                   style={{
//                     color: colors.text,
//                     fontWeight: "900",
//                     fontSize: 18,
//                   }}
//                 >
//                   Nutrition quests
//                 </Text>
//                 <Text
//                   style={{
//                     color: withAlpha(colors.text, 0.7),
//                     marginTop: 2,
//                     fontWeight: "600",
//                   }}
//                 >
//                   Earn XP for calories, protein, logging meals, and movement.
//                 </Text>
//               </View>

//               <View
//                 style={{
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   borderRadius: 14,
//                   backgroundColor: withAlpha(colors.card, 0.94),
//                   borderWidth: 1,
//                   borderColor: withAlpha(colors.border, 0.9),
//                   alignItems: "center",
//                 }}
//               >
//                 <Text
//                   style={{
//                     color: withAlpha(colors.text, 0.7),
//                     fontSize: 11,
//                     fontWeight: "700",
//                   }}
//                 >
//                   XP today
//                 </Text>
//                 <Text
//                   style={{
//                     color: colors.text,
//                     fontSize: 20,
//                     fontWeight: "900",
//                   }}
//                 >
//                   {questXp}
//                 </Text>
//               </View>
//             </View>

//             <View style={{ marginTop: 12, gap: 10 }}>
//               {questList.map((q, i) => (
//                 <QuestChip key={q.label} delay={80 + i * 50} {...q} />
//               ))}
//             </View>
//           </LinearGradient>
//         </MotiView>

//         <MotiView
//           from={{ opacity: 0, translateY: 10 }}
//           animate={{ opacity: 1, translateY: 0 }}
//           transition={{ type: "timing", duration: 460, delay: 100 }}
//         >
//           <LinearGradient
//             colors={[withAlpha(arcadeColors.neonPink, 0.16), colors.card]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={{
//               borderRadius: 18,
//               padding: 12,
//               borderWidth: 1,
//               borderColor: withAlpha(colors.primary, 0.3),
//               ...softShadow,
//             }}
//           >
//             <View
//               style={{
//                 flexDirection: "row",
//                 flexWrap: "wrap",
//                 gap: 10,
//                 justifyContent: "space-between",
//               }}
//             >
//               {statCards.map((s, i) => (
//                 <MotiView
//                   key={s.label}
//                   from={{ opacity: 0, translateY: 6 }}
//                   animate={{ opacity: 1, translateY: 0 }}
//                   transition={{
//                     type: "timing",
//                     duration: 300,
//                     delay: 60 + i * 40,
//                   }}
//                   style={{
//                     flexGrow: 1,
//                     minWidth: 150,
//                     borderRadius: 14,
//                     padding: 12,
//                     borderWidth: 1,
//                     borderColor: withAlpha(colors.border, 0.8),
//                     backgroundColor: withAlpha(colors.card, 0.95),
//                   }}
//                 >
//                   <View
//                     style={{
//                       flexDirection: "row",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     <View
//                       style={{
//                         width: 32,
//                         height: 32,
//                         borderRadius: 10,
//                         alignItems: "center",
//                         justifyContent: "center",
//                         backgroundColor: withAlpha(colors.primary, 0.16),
//                         borderWidth: 1,
//                         borderColor: withAlpha(colors.primary, 0.35),
//                       }}
//                     >
//                       <Ionicons
//                         name={s.icon}
//                         size={18}
//                         color={colors.primary}
//                       />
//                     </View>
//                     <View>
//                       <Text style={{ color: colors.text, fontWeight: "800" }}>
//                         {s.value}
//                       </Text>
//                       <Text style={{ color: colors.muted, fontSize: 12 }}>
//                         {s.label}
//                       </Text>
//                     </View>
//                   </View>
//                 </MotiView>
//               ))}
//             </View>
//           </LinearGradient>
//         </MotiView>

//         {/* Header action: day-level “complete my macros” */}
//         <Pressable
//           onPress={() =>
//             router.push({
//               pathname: "/(modals)/ai-meal-suggestions",
//               params: { date }, // no meal => suggest across the day
//             })
//           }
//           accessibilityLabel="Suggest meals to complete today's macros"
//           style={{
//             alignSelf: "flex-start",
//             marginTop: 4,
//             borderRadius: 999,
//             paddingVertical: 8,
//             paddingHorizontal: 12,
//             backgroundColor: isDark
//               ? "rgba(255,255,255,0.06)"
//               : "rgba(0,0,0,0.04)",
//             borderWidth: 1,
//             borderColor: borderC,
//             flexDirection: "row",
//             gap: 6,
//             alignItems: "center",
//           }}
//         >
//           <Ionicons
//             name="sparkles-outline"
//             size={16}
//             color={themeColors.text}
//           />
//           <Text
//             style={{ color: themeColors.text, fontWeight: "800", fontSize: 12 }}
//           >
//             Complete my macros
//           </Text>
//         </Pressable>

//         {/* Day empty suggestions */}
//         {dayIsEmpty && (
//           <EmptySuggestions
//             emoji="📅"
//             title="Nothing logged today"
//             subtitle="Stick to your streak! Add your first meal."
//             actions={[
//               {
//                 icon: "cafe-outline",
//                 label: "Add Breakfast",
//                 onPress: () =>
//                   router.push({
//                     pathname: "/(modals)/add-meal",
//                     params: { meal: "breakfast", date },
//                   }),
//               },
//               {
//                 icon: "search-outline",
//                 label: "Search foods",
//                 onPress: () =>
//                   router.push({
//                     pathname: "/(modals)/add-meal",
//                     params: { meal: selectedMeal, date },
//                   }),
//               },
//               {
//                 icon: "sparkles-outline",
//                 label: "Generate a plan for today",
//                 onPress: () =>
//                   router.push({
//                     pathname: "/(modals)/ai-meal-suggestions",
//                     params: { date },
//                   }),
//               },
//             ]}
//           />
//         )}

//         {/* Add Food launcher */}
//         <View
//           style={{
//             borderRadius: 20,
//             padding: 14,
//             backgroundColor: cardBg,
//             borderWidth: 1,
//             borderColor: borderC,
//             shadowColor: "#000",
//             shadowOpacity: isDark ? 0.2 : 0.06,
//             shadowRadius: 14,
//             shadowOffset: { width: 0, height: 4 },
//             gap: 14,
//           }}
//         >
//           <Text
//             style={{
//               fontWeight: "800",
//               color: themeColors.text,
//               fontSize: 18,
//               letterSpacing: 0.2,
//             }}
//           >
//             Add food
//           </Text>

//           {/* Segmented meal picker */}
//           <View
//             style={{
//               flexDirection: "row",
//               borderWidth: 1,
//               borderColor: borderC,
//               borderRadius: 999,
//               padding: 6,
//               backgroundColor: themeColors.card,
//               gap: 8,
//             }}
//           >
//             {MEALS.map((m) => {
//               const active = selectedMeal === m;
//               return (
//                 <SoftPressable
//                   key={m}
//                   onPress={() => setSelectedMeal(m)}
//                   accessibilityLabel={`Select ${m}`}
//                   style={{
//                     flex: 1,
//                     borderRadius: 999,
//                     alignItems: "center",
//                     justifyContent: "center",
//                     paddingVertical: 10,
//                     backgroundColor: active
//                       ? themeColors.chipActiveBg
//                       : "transparent",
//                     borderWidth: active ? 1 : 0,
//                     borderColor: active
//                       ? themeColors.chipActiveBg
//                       : "transparent",
//                     flexDirection: "row",
//                     gap: 6,
//                   }}
//                 >
//                   <Ionicons
//                     name={MEAL_ICONS[m]}
//                     size={16}
//                     color={
//                       active ? themeColors.chipActiveText : themeColors.text
//                     }
//                   />
//                   <Text
//                     style={{
//                       color: active
//                         ? themeColors.chipActiveText
//                         : themeColors.text,
//                       fontWeight: active ? "800" : "600",
//                       textTransform: "capitalize",
//                       fontSize: 13,
//                     }}
//                   >
//                     {m}
//                   </Text>
//                 </SoftPressable>
//               );
//             })}
//           </View>

//           {/* CTA: add meal */}
//           <SoftPressable
//             onPress={() =>
//               router.push({
//                 pathname: "/(modals)/add-meal",
//                 params: { meal: selectedMeal, date },
//               })
//             }
//             accessibilityLabel="Open add food"
//             style={{
//               borderRadius: 14,
//               overflow: "hidden",
//               shadowColor: "#000",
//               shadowOpacity: isDark ? 0.3 : 0.08,
//               shadowRadius: 12,
//               shadowOffset: { width: 0, height: 6 },
//             }}
//           >
//             <LinearGradient
//               start={{ x: 0, y: 0.5 }}
//               end={{ x: 1, y: 0.5 }}
//               colors={isDark ? ["#22c55e", "#16a34a"] : ["#3b82f6", "#60a5fa"]}
//               style={{
//                 height: 48,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 paddingHorizontal: 14,
//                 flexDirection: "row",
//                 gap: 8,
//               }}
//             >
//               <Ionicons
//                 name="add-circle-outline"
//                 size={20}
//                 color={themeColors.buttonText}
//               />
//               <Text
//                 style={{
//                   color: themeColors.buttonText,
//                   fontWeight: "900",
//                   letterSpacing: 0.3,
//                 }}
//               >
//                 Add food
//               </Text>
//             </LinearGradient>
//           </SoftPressable>

//           {/* Secondary CTA: AI meal ideas (scoped to selected tab – opens modal) */}
//           <SoftPressable
//             onPress={() =>
//               router.push({
//                 pathname: "/(modals)/ai-meal-suggestions",
//                 params: { date, meal: selectedMeal },
//               })
//             }
//             accessibilityLabel="Generate meal ideas for this meal"
//             style={{
//               borderRadius: 14,
//               overflow: "hidden",
//               shadowColor: "#000",
//               shadowOpacity: isDark ? 0.2 : 0.06,
//               shadowRadius: 12,
//               shadowOffset: { width: 0, height: 6 },
//             }}
//           >
//             <LinearGradient
//               start={{ x: 0, y: 0.5 }}
//               end={{ x: 1, y: 0.5 }}
//               colors={isDark ? ["#a78bfa", "#8b5cf6"] : ["#22c55e", "#16a34a"]}
//               style={{
//                 height: 44,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 paddingHorizontal: 14,
//                 flexDirection: "row",
//                 gap: 8,
//               }}
//             >
//               <Ionicons
//                 name="sparkles-outline"
//                 size={18}
//                 color={themeColors.buttonText}
//               />
//               <Text
//                 style={{
//                   color: themeColors.buttonText,
//                   fontWeight: "900",
//                   letterSpacing: 0.3,
//                 }}
//               >
//                 AI meal ideas
//               </Text>
//             </LinearGradient>
//           </SoftPressable>

//           {/* ───────── Inline AI Meal Ideas (calls Cloud Function directly) ───────── */}
//           <View
//             style={{
//               borderRadius: 20,
//               padding: 12,
//               backgroundColor: cardBg,
//               borderWidth: 1,
//               borderColor: borderC,
//               gap: 10,
//             }}
//           >
//             <View
//               style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
//             >
//               <Ionicons
//                 name="sparkles-outline"
//                 size={16}
//                 color={themeColors.text}
//               />
//               <Text style={{ fontWeight: "800", color: themeColors.text }}>
//                 AI meal ideas for {selectedMeal}
//               </Text>
//             </View>

//             {/* Notes / restrictions */}
//             <View
//               style={{
//                 borderRadius: 12,
//                 borderWidth: 1,
//                 borderColor: borderC,
//                 backgroundColor: isDark
//                   ? "rgba(255,255,255,0.03)"
//                   : "rgba(0,0,0,0.02)",
//                 padding: 10,
//                 gap: 6,
//               }}
//             >
//               <Text
//                 style={{
//                   fontWeight: "700",
//                   color: themeColors.text,
//                   fontSize: 12,
//                 }}
//               >
//                 Notes / restrictions (optional)
//               </Text>
//               <TextInput
//                 placeholder='e.g., "no pork, microwave only, under 15 min, Greek style"'
//                 placeholderTextColor={themeColors.muted}
//                 value={genNotes}
//                 onChangeText={setGenNotes}
//                 multiline
//                 style={{ color: themeColors.text, minHeight: 56 }}
//               />
//             </View>

//             <SoftPressable
//               onPress={() => generateMealIdeas()}
//               disabled={genLoading}
//               accessibilityLabel="Generate meal ideas to complete today's macros"
//               style={{
//                 borderRadius: 14,
//                 overflow: "hidden",
//                 opacity: genLoading ? 0.75 : 1,
//                 shadowColor: "#000",
//                 shadowOpacity: isDark ? 0.2 : 0.06,
//                 shadowRadius: 12,
//                 shadowOffset: { width: 0, height: 6 },
//               }}
//             >
//               <LinearGradient
//                 start={{ x: 0, y: 0.5 }}
//                 end={{ x: 1, y: 0.5 }}
//                 colors={
//                   isDark ? ["#a78bfa", "#8b5cf6"] : ["#22c55e", "#16a34a"]
//                 }
//                 style={{
//                   height: 44,
//                   alignItems: "center",
//                   justifyContent: "center",
//                   paddingHorizontal: 14,
//                   flexDirection: "row",
//                   gap: 8,
//                 }}
//               >
//                 <Ionicons
//                   name="sparkles-outline"
//                   size={18}
//                   color={themeColors.buttonText}
//                 />
//                 <Text
//                   style={{
//                     color: themeColors.buttonText,
//                     fontWeight: "900",
//                     letterSpacing: 0.3,
//                   }}
//                 >
//                   {genLoading ? "Generating..." : "Generate meal ideas"}
//                 </Text>
//               </LinearGradient>
//             </SoftPressable>

//             {/* Results */}
//             {genIdeas.length > 0 && (
//               <View style={{ gap: 10 }}>
//                 {genIdeas.map((it, idx) => (
//                   <View
//                     key={idx}
//                     style={{
//                       borderRadius: 14,
//                       borderWidth: 1,
//                       borderColor: borderC,
//                       backgroundColor: isDark
//                         ? "rgba(255,255,255,0.03)"
//                         : "rgba(0,0,0,0.02)",
//                       padding: 12,
//                       gap: 6,
//                     }}
//                   >
//                     <Text
//                       style={{ color: themeColors.text, fontWeight: "900" }}
//                     >
//                       {it.name}
//                     </Text>
//                     <Text style={{ color: themeColors.muted }}>
//                       {Math.round(it.calories)} kcal • P{" "}
//                       {Math.round(it.protein)}g • C {Math.round(it.carbs)}g • F{" "}
//                       {Math.round(it.fat)}g
//                       {typeof it.sugar === "number"
//                         ? ` • S ${Math.round(it.sugar)}g`
//                         : ""}
//                       {typeof it.fiber === "number"
//                         ? ` • Fi ${Math.round(it.fiber)}g`
//                         : ""}
//                       {it.prep_min ? ` • ~${it.prep_min} min` : ""}
//                     </Text>
//                     {it.notes ? (
//                       <Text style={{ color: themeColors.muted, fontSize: 12 }}>
//                         {it.notes}
//                       </Text>
//                     ) : null}
//                     <Pressable
//                       onPress={() => addIdeaToMeal(it)}
//                       style={{
//                         alignSelf: "flex-start",
//                         borderRadius: 999,
//                         paddingVertical: 8,
//                         paddingHorizontal: 12,
//                         borderWidth: 1,
//                         borderColor: borderC,
//                       }}
//                     >
//                       <Text
//                         style={{ color: themeColors.text, fontWeight: "800" }}
//                       >
//                         Add to {selectedMeal}
//                       </Text>
//                     </Pressable>
//                   </View>
//                 ))}
//               </View>
//             )}
//           </View>
//         </View>

//         {/* Meals — hero panels */}
//         {MEALS.map((m) => (
//           <View
//             key={m}
//             ref={(el) => {
//               mealAnchors.current[m] = el;
//             }}
//             collapsable={false}
//           >
//             <FancyMealPanel
//               meal={m}
//               items={(mealsMap[m] || []).map((it: any) => ({
//                 ...it,
//                 score:
//                   typeof it.score === "number"
//                     ? it.score
//                     : typeof it.healthScore === "number"
//                     ? it.healthScore
//                     : computeMealScore(it),
//               }))}
//               onSuggest={() => generateMealIdeas(m)}
//               isDark={isDark}
//               colors={colors}
//               totalsColor={{ dayCalories: totals?.calories ?? 0 }}
//               onQuickAdd={() =>
//                 router.push({
//                   pathname: "/(modals)/add-meal",
//                   params: { meal: m, date },
//                 })
//               }
//               onStartEdit={(it: any) => {
//                 setEditId(it.id);
//                 setEdit({
//                   name: it.name || "",
//                   qty: String(it.qty ?? 1),
//                   unit: it.unit || "serving",
//                   calories: String(it.calories ?? ""),
//                   protein: String(it.protein ?? ""),
//                   carbs: String(it.carbs ?? ""),
//                   fat: String(it.fat ?? ""),
//                   sugar: String(it.sugar ?? ""),
//                   fiber: String(it.fiber ?? ""),
//                 });
//               }}
//               editId={editId}
//               edit={edit}
//               setEdit={setEdit}
//               onCancelEdit={() => setEditId(null)}
//               onSaveEdit={saveFoodEdit}
//               onDeleteItem={deleteFoodItem}
//               itemRight={(it) => <ScoreBadge score={it.score ?? 0} />}
//             />
//           </View>
//         ))}

//         {/* Exercise (optional section retained but commented previously)
//         <View
//           style={{
//             borderRadius: 18,
//             backgroundColor: isDark
//               ? "rgba(255,255,255,0.04)"
//               : "rgba(0,0,0,0.03)",
//             borderWidth: 1,
//             borderColor: colors.border,
//             padding: 6,
//             paddingTop: 10,
//           }}
//         >
//           <View
//             style={{
//               flexDirection: "row",
//               alignItems: "center",
//               gap: 8,
//               paddingHorizontal: 8,
//               paddingBottom: 6,
//             }}
//           >
//             <Ionicons
//               name="flame-outline"
//               size={14}
//               color={colors.text + "99"}
//             />
//             <Text
//               style={{
//                 fontSize: 12,
//                 fontWeight: "700",
//                 letterSpacing: 0.6,
//                 textTransform: "uppercase",
//                 color: colors.text + "99",
//               }}
//             >
//               Exercise
//             </Text>
//           </View>

//           <ExerciseCard
//             items={exercise}
//             exName={exName}
//             setExName={setExName}
//             exCalories={exCalories}
//             setExCalories={setExCalories}
//             onAdd={addExerciseSubmit}
//             onDelete={deleteExerciseItem}
//           />
//         </View> */}

//         {/* Hydration */}
//         <View
//           style={{
//             borderRadius: 18,
//             borderWidth: 1,
//             borderColor: colors.border,
//             backgroundColor: isDark
//               ? "rgba(255,255,255,0.04)"
//               : "rgba(0,0,0,0.03)",
//             padding: 12,
//             gap: 12,
//           }}
//         >
//           <View
//             style={{
//               flexDirection: "row",
//               alignItems: "center",
//               justifyContent: "space-between",
//             }}
//           >
//             <View
//               style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
//             >
//               <Ionicons
//                 name="water-outline"
//                 size={16}
//                 color={colors.text + "AA"}
//               />
//               <Text style={{ color: colors.text, fontWeight: "900" }}>
//                 Hydration
//               </Text>
//             </View>
//             <View
//               style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
//             >
//               <Text style={{ color: colors.muted, fontWeight: "700" }}>
//                 {Math.round(waterPct * 100)}% of goal
//               </Text>
//               <Pressable
//                 onPress={() => updateWater(0)}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 8,
//                   borderRadius: 12,
//                   borderWidth: 1,
//                   borderColor: colors.border,
//                   backgroundColor: withAlpha(colors.text, 0.04),
//                 }}
//               >
//                 <Text style={{ color: colors.text, fontWeight: "800" }}>
//                   Clear
//                 </Text>
//               </Pressable>
//             </View>
//           </View>

//           <WaterBottleCardRealistic
//             currentMl={waterMl}
//             goalMl={waterGoal}
//             onQuickAdd={quickAddWater}
//             tint="aqua"
//           />

//           <View style={{ gap: 10 }}>
//             <Text style={{ color: colors.muted, fontWeight: "700" }}>
//               Quick add
//             </Text>
//             <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
//               {waterPills.map((ml) => (
//                 <Pressable
//                   key={ml}
//                   onPress={() => quickAddWater(ml)}
//                   style={{
//                     paddingHorizontal: 12,
//                     paddingVertical: 10,
//                     borderRadius: 14,
//                     borderWidth: 1,
//                     borderColor: withAlpha(colors.primary, 0.35),
//                     backgroundColor: withAlpha(colors.primary, 0.12),
//                   }}
//                 >
//                   <Text
//                     style={{ color: colors.text, fontWeight: "900" }}
//                   >{`+${ml} ml`}</Text>
//                 </Pressable>
//               ))}
//             </View>

//             <View
//               style={{
//                 height: 10,
//                 borderRadius: 999,
//                 backgroundColor: withAlpha(colors.border, 0.9),
//                 overflow: "hidden",
//               }}
//             >
//               <View
//                 style={{
//                   width: `${Math.round(waterPct * 100)}%`,
//                   height: "100%",
//                   borderRadius: 999,
//                   backgroundColor: colors.primary,
//                   opacity: 0.9,
//                 }}
//               />
//             </View>
//             <Text style={{ color: colors.muted, fontSize: 12 }}>
//               Target: {waterGoal.toLocaleString()} ml
//             </Text>
//           </View>
//         </View>

//         <View style={{ height: 12 }} />
//         <BottomTapSpacer extra={16} />
//       </Animated.ScrollView>

//       {/* Celebration modal */}
//       <BadgeCelebrate
//         ids={celebrateIds as any}
//         open={celebrateIds.length > 0}
//         onClose={() => setCelebrateIds([])}
//       />
//     </View>
//   );
// }

// app/(tabs)/nutrition.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  Animated,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MotiView } from "moti";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { useNutritionStreams } from "@/hooks/useNutritionStreams";
import {
  addFood,
  updateFood,
  deleteFood,
  type FoodEntry,
} from "@/services/nutrition";

import { useNutritionHistory, isoAddDays } from "@/hooks/useNutritionHistory";
import { AnimatedRing } from "@/components/nutrition/ui/AnimatedRing";
import WaterBottleCardRealistic from "@/components/WaterBottleCardRealistic";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtNice(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
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

const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.14,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
};

type MealKey = "breakfast" | "lunch" | "dinner" | "snacks";
const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "snacks"];
const MEAL_META: Record<
  MealKey,
  { icon: any; label: string; gradA: string; gradB: string }
> = {
  breakfast: {
    icon: "sunny-outline",
    label: "Breakfast",
    gradA: "#7dd3fc",
    gradB: "#a78bfa",
  },
  lunch: {
    icon: "pizza-outline",
    label: "Lunch",
    gradA: "#34d399",
    gradB: "#60a5fa",
  },
  dinner: {
    icon: "restaurant-outline",
    label: "Dinner",
    gradA: "#fca5a5",
    gradB: "#f59e0b",
  },
  snacks: {
    icon: "ice-cream-outline",
    label: "Snacks",
    gradA: "#93c5fd",
    gradB: "#22c55e",
  },
};

function sumMacros(items: FoodEntry[]) {
  return items.reduce(
    (acc, x) => {
      acc.calories += Number(x.calories || 0);
      acc.protein += Number(x.protein || 0);
      acc.carbs += Number(x.carbs || 0);
      acc.fat += Number(x.fat || 0);
      acc.sugar += Number((x as any).sugar || 0);
      acc.fiber += Number((x as any).fiber || 0);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0 }
  );
}

function GlassCard({
  children,
  colors,
  isDark,
  radius = 22,
  pad = 14,
  style,
}: React.PropsWithChildren<{
  children: React.ReactNode;
  colors: any;
  isDark: boolean;
  radius?: number;
  pad?: number;
  style?: any;
}>) {
  if (Platform.OS === "ios") {
    return (
      <View
        style={[
          {
            borderRadius: radius,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <BlurView
          intensity={22}
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          style={{ padding: pad }}
        >
          <LinearGradient
            colors={[
              withAlpha(colors.card, 0.75),
              withAlpha(colors.card, 0.35),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", inset: 0 }}
          />
          {children}
        </BlurView>
      </View>
    );
  }
  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: withAlpha(colors.card, 0.95),
          padding: pad,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default function NutritionScreen() {
  const { colors, isDark } = useTheme() as any;
  const { user } = useAuth();
  const router = useRouter();

  const [dateISO, setDateISO] = useState<string>(isoToday());
  const [historyMode, setHistoryMode] = useState<"week" | "month">("week");
  // ---------- Hydration (per-day, stored locally) ----------
  const [waterMl, setWaterMl] = useState(0);

  const waterGoalMl = 2400; // tweak later (profile-based, etc.)
  const waterKey = useMemo(() => `@water:${dateISO}`, [dateISO]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(waterKey);
        if (!mounted) return;
        setWaterMl(raw ? Math.max(0, Number(raw) || 0) : 0);
      } catch {
        if (mounted) setWaterMl(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [waterKey]);

  const setWaterAndStore = (next: number) => {
    const clamped = Math.max(0, Math.round(next));
    setWaterMl(clamped);
    AsyncStorage.setItem(waterKey, String(clamped)).catch(() => {});
  };

  const addWater = (ml: number) => setWaterAndStore(waterMl + ml);
  const clearWater = () => setWaterAndStore(0);

  const scrollY = useRef(new Animated.Value(0)).current;

  const { foods, setFoods, mealsMap, totals } = useNutritionStreams(
    user,
    dateISO
  );

  // history
  const historyDaysCount = historyMode === "week" ? 14 : 30;
  const { days: historyDays } = useNutritionHistory(
    user?.uid,
    dateISO,
    historyDaysCount
  );

  const dayTotals = useMemo(() => {
    if (totals && typeof totals === "object") {
      return {
        calories: Number((totals as any).calories || 0),
        protein: Number((totals as any).protein || 0),
        carbs: Number((totals as any).carbs || 0),
        fat: Number((totals as any).fat || 0),
        sugar: Number((totals as any).sugar || 0),
        fiber: Number((totals as any).fiber || 0),
      };
    }
    const all = [
      ...(mealsMap?.breakfast || []),
      ...(mealsMap?.lunch || []),
      ...(mealsMap?.dinner || []),
      ...(mealsMap?.snacks || []),
    ] as FoodEntry[];
    return sumMacros(all);
  }, [totals, mealsMap]);

  // goals: swap to your profile-based computeTargets if you want later
  const goals = useMemo(
    () => ({ calories: 2400, protein: 170, carbs: 260, fat: 80 }),
    []
  );

  /** ---------- Add-meal modal result (keeps your contract) ---------- */
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      (async () => {
        if (!user?.uid) return;

        const raw = await AsyncStorage.getItem("@pending_add_meal");
        if (!raw) return;

        await AsyncStorage.removeItem("@pending_add_meal");
        if (cancelled) return;

        try {
          const data = JSON.parse(raw);

          const base: Omit<FoodEntry, "id"> = {
            date: (data.date || dateISO) as FoodEntry["date"],
            meal: (data.meal || "breakfast") as FoodEntry["meal"],
            name: String(data.name || "").trim(),
            unit: (data.unit || "serving") as FoodEntry["unit"],
            qty: Number(data.qty || 1) as FoodEntry["qty"],
            calories: Number(data.calories || 0) as FoodEntry["calories"],
            protein: Number(data.protein || 0) as FoodEntry["protein"],
            carbs: Number(data.carbs || 0) as FoodEntry["carbs"],
            fat: Number(data.fat || 0) as FoodEntry["fat"],
            ...(data.sugar != null ? { sugar: Number(data.sugar) as any } : {}),
            ...(data.fiber != null ? { fiber: Number(data.fiber) as any } : {}),
          };

          const tempId = `temp-${Date.now()}`;
          const tempItem: FoodEntry = { ...(base as any), id: tempId };
          setFoods((prev: FoodEntry[]) => [tempItem, ...prev]);

          try {
            const ref = await addFood(user.uid, { ...base });
            setFoods((prev: FoodEntry[]) =>
              prev.map((f) => (f.id === tempId ? { ...f, id: ref.id } : f))
            );
          } catch {
            setFoods((prev: FoodEntry[]) =>
              prev.filter((f) => f.id !== tempId)
            );
          }
        } catch {}
      })();

      return () => {
        cancelled = true;
      };
    }, [user?.uid, dateISO, setFoods])
  );

  function openAdd(meal: MealKey) {
    router.push({
      pathname: "/(modals)/add-meal",
      params: { meal, date: dateISO },
    });
  }

  /** ---------- editing ---------- */
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);

  function startEdit(item: FoodEntry) {
    setEditId(item.id);
    setEditDraft({
      name: String(item.name || ""),
      qty: String(item.qty ?? 1),
      unit: String(item.unit || "serving"),
      calories: String(item.calories ?? 0),
      protein: String(item.protein ?? 0),
      carbs: String(item.carbs ?? 0),
      fat: String(item.fat ?? 0),
    });
  }

  async function saveEdit(item: FoodEntry) {
    if (!user?.uid || !editDraft || !editId || editId.startsWith("temp-")) {
      setEditId(null);
      setEditDraft(null);
      return;
    }

    const patch: Partial<FoodEntry> = {
      name: (editDraft.name || "").trim() || item.name,
      qty: Number(editDraft.qty || item.qty || 1) as any,
      unit: (editDraft.unit || item.unit || "serving") as any,
      calories: Number(editDraft.calories || 0) as any,
      protein: Number(editDraft.protein || 0) as any,
      carbs: Number(editDraft.carbs || 0) as any,
      fat: Number(editDraft.fat || 0) as any,
    };

    const prev = foods;
    setFoods((curr: FoodEntry[]) =>
      curr.map((f) => (f.id === item.id ? ({ ...f, ...patch } as any) : f))
    );

    try {
      await updateFood(user.uid, item.id, patch as any);
      setEditId(null);
      setEditDraft(null);
    } catch {
      setFoods(prev);
      Alert.alert("Couldn’t save", "Try again.");
    }
  }

  async function removeItem(item: FoodEntry) {
    if (!user?.uid) return;

    Alert.alert("Delete item?", item.name || "This item", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const prev = foods;
          setFoods((curr: FoodEntry[]) => curr.filter((f) => f.id !== item.id));
          try {
            await deleteFood(user.uid, item.id);
          } catch {
            setFoods(prev);
          }
        },
      },
    ]);
  }

  const timeline = useMemo(() => {
    return MEALS.map((m) => {
      const items = ((mealsMap as any)?.[m] || []) as FoodEntry[];
      return { meal: m, items, totals: sumMacros(items) };
    });
  }, [mealsMap]);

  const headerLift = scrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [0, -12],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <Animated.View style={{ transform: [{ translateY: headerLift }] }}>
          <LinearGradient
            colors={[
              withAlpha(colors.primary, 0.42),
              withAlpha(colors.card, isDark ? 0.12 : 0.22),
              colors.bg,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 }}
          >
            {/* Top bar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ gap: 3 }}>
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Nutrition
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 20,
                  }}
                >
                  {fmtNice(dateISO)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => setDateISO((d) => isoAddDays(d, -1))}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: withAlpha(colors.card, 0.5),
                  }}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </Pressable>

                <Pressable
                  onPress={() => setDateISO(isoToday())}
                  style={{
                    paddingHorizontal: 12,
                    height: 40,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.primary, 0.35),
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: withAlpha(colors.primary, 0.14),
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "900",
                      fontSize: 13,
                    }}
                  >
                    Today
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setDateISO((d) => isoAddDays(d, +1))}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: withAlpha(colors.card, 0.5),
                  }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.text}
                  />
                </Pressable>
              </View>
            </View>

            {/* HISTORY STRIP */}
            <View style={{ marginTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "900",
                    fontSize: 12,
                    letterSpacing: 0.6,
                  }}
                >
                  HISTORY
                </Text>
                <Pressable
                  onPress={() =>
                    setHistoryMode((m) => (m === "week" ? "month" : "week"))
                  }
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: withAlpha(colors.card, 0.35),
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    {historyMode === "week" ? "Month" : "2 weeks"}
                  </Text>
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                {historyDays.map((d) => {
                  const active = d.date === dateISO;
                  const hot = d.calories >= goals.calories * 0.9;
                  return (
                    <Pressable
                      key={d.date}
                      onPress={() => setDateISO(d.date)}
                      style={{
                        width: historyMode === "week" ? "13.3%" : "9.2%",
                        minWidth: historyMode === "week" ? 44 : 34,
                        paddingVertical: 10,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: active
                          ? withAlpha(colors.primary, 0.42)
                          : colors.border,
                        backgroundColor: active
                          ? withAlpha(colors.primary, 0.16)
                          : hot
                          ? withAlpha("#22c55e", 0.1)
                          : withAlpha(colors.card, 0.22),
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: colors.muted,
                          fontWeight: "900",
                          fontSize: 10,
                        }}
                      >
                        {new Date(d.date + "T12:00:00").toLocaleDateString(
                          undefined,
                          { weekday: "narrow" }
                        )}
                      </Text>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "900",
                          marginTop: 2,
                        }}
                      >
                        {Number(d.date.slice(-2))}
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontWeight: "900",
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      >
                        {Math.round(d.calories)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* GOAL RINGS CARD */}
            <View style={{ marginTop: 14 }}>
              <GlassCard
                colors={colors}
                isDark={isDark}
                style={{ ...softShadow }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <View style={{ borderRadius: 999, overflow: "hidden" }}>
                      <AnimatedRing
                        size={96}
                        stroke={10}
                        value={dayTotals.calories}
                        goal={goals.calories}
                        trackColor={withAlpha(colors.border, 0.9)}
                        fillColor={withAlpha(colors.primary, 0.95)}
                        labelTop="Calories"
                        labelBottom={`${Math.round(dayTotals.calories)}`}
                      />
                    </View>

                    <View style={{ gap: 8 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "900",
                          fontSize: 16,
                        }}
                      >
                        Daily goals
                      </Text>
                      <Text style={{ color: colors.muted, fontWeight: "800" }}>
                        {Math.max(
                          0,
                          Math.round(goals.calories - dayTotals.calories)
                        )}{" "}
                        kcal remaining
                      </Text>

                      <View
                        style={{ flexDirection: "row", gap: 10, marginTop: 6 }}
                      >
                        {[
                          { k: "P", v: dayTotals.protein, g: goals.protein },
                          { k: "C", v: dayTotals.carbs, g: goals.carbs },
                          { k: "F", v: dayTotals.fat, g: goals.fat },
                        ].map((x) => (
                          <View key={x.k} style={{ alignItems: "center" }}>
                            <AnimatedRing
                              size={46}
                              stroke={7}
                              value={x.v}
                              goal={x.g}
                              trackColor={withAlpha(colors.border, 0.9)}
                              fillColor={withAlpha(colors.primary, 0.85)}
                            />
                            <Text
                              style={{
                                color: colors.muted,
                                fontWeight: "900",
                                fontSize: 11,
                                marginTop: 4,
                              }}
                            >
                              {x.k} {Math.round(x.v)}/{x.g}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => openAdd("snacks")}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: withAlpha(colors.primary, 0.35),
                      backgroundColor: withAlpha(colors.primary, 0.14),
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="add" size={18} color={colors.text} />
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                      Log
                    </Text>
                  </Pressable>
                </View>
              </GlassCard>
            </View>
          </LinearGradient>
          {/* HYDRATION */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text
              style={{
                color: colors.muted,
                fontWeight: "900",
                fontSize: 12,
                letterSpacing: 0.6,
                marginBottom: 10,
              }}
            >
              HYDRATION
            </Text>

            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 420, delay: 40 }}
            >
              <GlassCard
                colors={colors}
                isDark={isDark}
                style={{ ...softShadow }}
              >
                {/* header row */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <View style={{ gap: 2 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "900",
                        fontSize: 16,
                      }}
                    >
                      Hydration
                    </Text>
                    <Text
                      style={{
                        color: colors.muted,
                        fontWeight: "800",
                        fontSize: 12,
                      }}
                    >
                      {waterMl} / {waterGoalMl} ml •{" "}
                      {Math.round((waterMl / waterGoalMl) * 100) || 0}%
                    </Text>
                  </View>

                  <Pressable
                    onPress={clearWater}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: withAlpha("#ef4444", 0.25),
                      backgroundColor: withAlpha("#ef4444", 0.12),
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.text}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "900",
                        fontSize: 12,
                      }}
                    >
                      Clear
                    </Text>
                  </Pressable>
                </View>

                {/* content */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{ width: 140, flexShrink: 0, overflow: "visible" }}
                  >
                    <WaterBottleCardRealistic
                      currentMl={waterMl}
                      goalMl={waterGoalMl}
                      width={140}
                      height={190}
                      tint="aqua"
                      onQuickAdd={(ml) => addWater(ml)}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 10, minWidth: 0 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      {[150, 250, 350, 500].map((ml) => (
                        <Pressable
                          key={ml}
                          onPress={() => addWater(ml)}
                          style={{
                            width: "48%",
                            minWidth: 120,
                            height: 42,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: withAlpha(colors.primary, 0.32),
                            backgroundColor: withAlpha(colors.primary, 0.14),
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "row",
                            gap: 6,
                          }}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={16}
                            color={colors.text}
                          />
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: "900",
                              fontSize: 12,
                            }}
                          >
                            {ml} ml
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Pressable
                      onPress={() => addWater(1000)}
                      style={{
                        height: 44,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: withAlpha(colors.primary, 0.35),
                        backgroundColor: withAlpha(colors.card, 0.35),
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name="water-outline"
                        size={18}
                        color={colors.text}
                      />
                      <Text style={{ color: colors.text, fontWeight: "900" }}>
                        +1000 ml (bottle)
                      </Text>
                    </Pressable>

                    <View
                      style={{
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: withAlpha(colors.border, 0.9),
                        overflow: "hidden",
                        marginTop: 2,
                      }}
                    >
                      <View
                        style={{
                          width: `${
                            Math.min(
                              1,
                              waterGoalMl > 0 ? waterMl / waterGoalMl : 0
                            ) * 100
                          }%`,
                          height: "100%",
                          backgroundColor: withAlpha(colors.primary, 0.95),
                        }}
                      />
                    </View>
                  </View>
                </View>
              </GlassCard>
            </MotiView>
          </View>
        </Animated.View>

        {/* MEAL TIMELINE */}
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Text
            style={{
              color: colors.muted,
              fontWeight: "900",
              fontSize: 12,
              letterSpacing: 0.6,
            }}
          >
            MEAL TIMELINE
          </Text>

          {timeline.map((g, idx) => {
            const meta = MEAL_META[g.meal];

            return (
              <MotiView
                key={g.meal}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: "timing",
                  duration: 380,
                  delay: 60 + idx * 60,
                }}
              >
                <View
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <LinearGradient
                    colors={[
                      withAlpha(meta.gradA, 0.26),
                      withAlpha(meta.gradB, 0.12),
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 14 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 14,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: withAlpha(colors.card, 0.45),
                            borderWidth: 1,
                            borderColor: withAlpha(colors.border, 0.9),
                          }}
                        >
                          <Ionicons
                            name={meta.icon}
                            size={18}
                            color={colors.text}
                          />
                        </View>
                        <View style={{ gap: 2 }}>
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: "900",
                              fontSize: 16,
                            }}
                          >
                            {meta.label}
                          </Text>
                          <Text
                            style={{
                              color: colors.muted,
                              fontWeight: "800",
                              fontSize: 12,
                            }}
                          >
                            {g.items.length
                              ? `${Math.round(g.totals.calories)} kcal`
                              : "No items yet"}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => openAdd(g.meal)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: withAlpha(colors.primary, 0.35),
                          backgroundColor: withAlpha(colors.primary, 0.14),
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Ionicons name="add" size={18} color={colors.text} />
                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "900",
                            fontSize: 13,
                          }}
                        >
                          Add
                        </Text>
                      </Pressable>
                    </View>

                    <View style={{ marginTop: 12, gap: 8 }}>
                      {g.items.length === 0 ? (
                        <View
                          style={{
                            padding: 12,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: withAlpha(colors.border, 0.9),
                            backgroundColor: withAlpha(colors.card, 0.35),
                          }}
                        >
                          <Text
                            style={{ color: colors.muted, fontWeight: "800" }}
                          >
                            Tap “Add” to log. Your recents will be one tap.
                          </Text>
                        </View>
                      ) : (
                        g.items.slice(0, 8).map((it) => {
                          const isEditing = editId === it.id;
                          return (
                            <View
                              key={it.id}
                              style={{
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: withAlpha(colors.border, 0.9),
                                backgroundColor: withAlpha(colors.card, 0.4),
                                padding: 12,
                              }}
                            >
                              {!isEditing ? (
                                <Pressable
                                  onPress={() => startEdit(it)}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text
                                      style={{
                                        color: colors.text,
                                        fontWeight: "900",
                                        fontSize: 14,
                                      }}
                                      numberOfLines={1}
                                    >
                                      {it.name}
                                    </Text>
                                    <Text
                                      style={{
                                        color: colors.muted,
                                        fontWeight: "800",
                                        fontSize: 12,
                                      }}
                                    >
                                      {Math.round(Number(it.qty || 1))}{" "}
                                      {it.unit || "serving"} •{" "}
                                      {Math.round(Number(it.calories || 0))}{" "}
                                      kcal
                                    </Text>
                                  </View>

                                  <View
                                    style={{
                                      flexDirection: "row",
                                      gap: 10,
                                      alignItems: "center",
                                    }}
                                  >
                                    <View
                                      style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 999,
                                        backgroundColor: withAlpha(
                                          colors.primary,
                                          0.12
                                        ),
                                        borderWidth: 1,
                                        borderColor: withAlpha(
                                          colors.primary,
                                          0.25
                                        ),
                                      }}
                                    >
                                      <Text
                                        style={{
                                          color: colors.text,
                                          fontWeight: "900",
                                          fontSize: 12,
                                        }}
                                      >
                                        P {Math.round(Number(it.protein || 0))}g
                                      </Text>
                                    </View>

                                    <Pressable
                                      onPress={() => removeItem(it)}
                                      style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 12,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: withAlpha(
                                          "#ef4444",
                                          0.12
                                        ),
                                        borderWidth: 1,
                                        borderColor: withAlpha("#ef4444", 0.25),
                                      }}
                                    >
                                      <Ionicons
                                        name="trash-outline"
                                        size={16}
                                        color={colors.text}
                                      />
                                    </Pressable>
                                  </View>
                                </Pressable>
                              ) : (
                                <View style={{ gap: 10 }}>
                                  <Text
                                    style={{
                                      color: colors.muted,
                                      fontWeight: "900",
                                      fontSize: 12,
                                    }}
                                  >
                                    Edit item
                                  </Text>

                                  <TextInput
                                    value={editDraft?.name ?? ""}
                                    onChangeText={(t) =>
                                      setEditDraft((p: any) =>
                                        p ? { ...p, name: t } : p
                                      )
                                    }
                                    placeholder="Name"
                                    placeholderTextColor={colors.placeholder}
                                    style={{
                                      borderWidth: 1,
                                      borderColor: colors.inputBorder,
                                      backgroundColor: colors.inputBg,
                                      color: colors.text,
                                      borderRadius: 14,
                                      paddingHorizontal: 12,
                                      paddingVertical: 10,
                                      fontWeight: "800",
                                    }}
                                  />

                                  <View
                                    style={{ flexDirection: "row", gap: 10 }}
                                  >
                                    <TextInput
                                      value={editDraft?.qty ?? ""}
                                      onChangeText={(t) =>
                                        setEditDraft((p: any) =>
                                          p
                                            ? {
                                                ...p,
                                                qty: t.replace(/[^0-9.]/g, ""),
                                              }
                                            : p
                                        )
                                      }
                                      keyboardType="decimal-pad"
                                      placeholder="Qty"
                                      placeholderTextColor={colors.placeholder}
                                      style={{
                                        flex: 1,
                                        borderWidth: 1,
                                        borderColor: colors.inputBorder,
                                        backgroundColor: colors.inputBg,
                                        color: colors.text,
                                        borderRadius: 14,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        fontWeight: "800",
                                      }}
                                    />
                                    <TextInput
                                      value={editDraft?.unit ?? ""}
                                      onChangeText={(t) =>
                                        setEditDraft((p: any) =>
                                          p ? { ...p, unit: t } : p
                                        )
                                      }
                                      placeholder="Unit"
                                      placeholderTextColor={colors.placeholder}
                                      style={{
                                        flex: 1,
                                        borderWidth: 1,
                                        borderColor: colors.inputBorder,
                                        backgroundColor: colors.inputBg,
                                        color: colors.text,
                                        borderRadius: 14,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        fontWeight: "800",
                                      }}
                                    />
                                  </View>

                                  <View
                                    style={{ flexDirection: "row", gap: 10 }}
                                  >
                                    {[
                                      ["Calories", "calories"],
                                      ["Protein", "protein"],
                                      ["Carbs", "carbs"],
                                      ["Fat", "fat"],
                                    ].map(([lbl, key]) => (
                                      <TextInput
                                        key={key}
                                        value={String(editDraft?.[key] ?? "")}
                                        onChangeText={(t) =>
                                          setEditDraft((p: any) =>
                                            p
                                              ? {
                                                  ...p,
                                                  [key]: t.replace(
                                                    /[^0-9.]/g,
                                                    ""
                                                  ),
                                                }
                                              : p
                                          )
                                        }
                                        keyboardType="decimal-pad"
                                        placeholder={lbl}
                                        placeholderTextColor={
                                          colors.placeholder
                                        }
                                        style={{
                                          flex: 1,
                                          borderWidth: 1,
                                          borderColor: colors.inputBorder,
                                          backgroundColor: colors.inputBg,
                                          color: colors.text,
                                          borderRadius: 14,
                                          paddingHorizontal: 10,
                                          paddingVertical: 10,
                                          fontWeight: "900",
                                          fontSize: 12,
                                        }}
                                      />
                                    ))}
                                  </View>

                                  <View
                                    style={{
                                      flexDirection: "row",
                                      gap: 10,
                                      justifyContent: "flex-end",
                                    }}
                                  >
                                    <Pressable
                                      onPress={() => {
                                        setEditId(null);
                                        setEditDraft(null);
                                      }}
                                      style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: withAlpha(
                                          colors.card,
                                          0.35
                                        ),
                                      }}
                                    >
                                      <Text
                                        style={{
                                          color: colors.text,
                                          fontWeight: "900",
                                        }}
                                      >
                                        Cancel
                                      </Text>
                                    </Pressable>
                                    <Pressable
                                      onPress={() => saveEdit(it)}
                                      style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: withAlpha(
                                          colors.primary,
                                          0.35
                                        ),
                                        backgroundColor: withAlpha(
                                          colors.primary,
                                          0.14
                                        ),
                                      }}
                                    >
                                      <Text
                                        style={{
                                          color: colors.text,
                                          fontWeight: "900",
                                        }}
                                      >
                                        Save
                                      </Text>
                                    </Pressable>
                                  </View>
                                </View>
                              )}
                            </View>
                          );
                        })
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </MotiView>
            );
          })}
        </View>
      </Animated.ScrollView>

      {/* Floating add */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 18,
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => openAdd("snacks")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            height: 54,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.35),
            backgroundColor:
              Platform.OS === "ios"
                ? withAlpha(colors.card, 0.45)
                : withAlpha(colors.card, 0.9),
            ...softShadow,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(colors.primary, 0.18),
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.25),
            }}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </View>
          <Text style={{ color: colors.text, fontWeight: "900" }}>
            Log food
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "800" }}>
            • recents + search
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
