// // app/(tabs)/nutrition.tsx
// import React, { useMemo, useRef, useState } from "react";
// import {
//   View,
//   Text,
//   Pressable,
//   Platform,
//   Animated,
//   TextInput,
//   Alert,
// } from "react-native";
// import { useFocusEffect, useRouter } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { MotiView } from "moti";

// import { useTheme } from "@/content/ThemeProvider";
// import { useAuth } from "@/content/AuthContext";
// import { useNutritionStreams } from "@/hooks/useNutritionStreams";
// import {
//   addFood,
//   updateFood,
//   deleteFood,
//   type FoodEntry,
// } from "@/services/nutrition";

// import { useNutritionHistory, isoAddDays } from "@/hooks/useNutritionHistory";
// import { AnimatedRing } from "@/components/nutrition/ui/AnimatedRing";
// import WaterBottleCardRealistic from "@/components/WaterBottleCardRealistic";

// function pad(n: number) {
//   return String(n).padStart(2, "0");
// }
// function isoToday() {
//   const d = new Date();
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// }
// function fmtNice(iso: string) {
//   const d = new Date(iso + "T12:00:00");
//   return d.toLocaleDateString(undefined, {
//     weekday: "short",
//     month: "short",
//     day: "numeric",
//   });
// }
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

// const softShadow = {
//   shadowColor: "#000",
//   shadowOpacity: 0.14,
//   shadowRadius: 18,
//   shadowOffset: { width: 0, height: 10 },
//   elevation: 8,
// };

// type MealKey = "breakfast" | "lunch" | "dinner" | "snacks";
// const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "snacks"];
// const MEAL_META: Record<
//   MealKey,
//   { icon: any; label: string; gradA: string; gradB: string }
// > = {
//   breakfast: {
//     icon: "sunny-outline",
//     label: "Breakfast",
//     gradA: "#7dd3fc",
//     gradB: "#a78bfa",
//   },
//   lunch: {
//     icon: "pizza-outline",
//     label: "Lunch",
//     gradA: "#34d399",
//     gradB: "#60a5fa",
//   },
//   dinner: {
//     icon: "restaurant-outline",
//     label: "Dinner",
//     gradA: "#fca5a5",
//     gradB: "#f59e0b",
//   },
//   snacks: {
//     icon: "ice-cream-outline",
//     label: "Snacks",
//     gradA: "#93c5fd",
//     gradB: "#22c55e",
//   },
// };

// function sumMacros(items: FoodEntry[]) {
//   return items.reduce(
//     (acc, x) => {
//       acc.calories += Number(x.calories || 0);
//       acc.protein += Number(x.protein || 0);
//       acc.carbs += Number(x.carbs || 0);
//       acc.fat += Number(x.fat || 0);
//       acc.sugar += Number((x as any).sugar || 0);
//       acc.fiber += Number((x as any).fiber || 0);
//       return acc;
//     },
//     { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0 }
//   );
// }

// function GlassCard({
//   children,
//   colors,
//   isDark,
//   radius = 22,
//   pad = 14,
//   style,
// }: React.PropsWithChildren<{
//   children: React.ReactNode;
//   colors: any;
//   isDark: boolean;
//   radius?: number;
//   pad?: number;
//   style?: any;
// }>) {
//   if (Platform.OS === "ios") {
//     return (
//       <View
//         style={[
//           {
//             borderRadius: radius,
//             overflow: "hidden",
//             borderWidth: 1,
//             borderColor: colors.border,
//           },
//           style,
//         ]}
//       >
//         <BlurView
//           intensity={22}
//           tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
//           style={{ padding: pad }}
//         >
//           <LinearGradient
//             colors={[
//               withAlpha(colors.card, 0.75),
//               withAlpha(colors.card, 0.35),
//             ]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={{ position: "absolute", inset: 0 }}
//           />
//           {children}
//         </BlurView>
//       </View>
//     );
//   }
//   return (
//     <View
//       style={[
//         {
//           borderRadius: radius,
//           borderWidth: 1,
//           borderColor: colors.border,
//           backgroundColor: withAlpha(colors.card, 0.95),
//           padding: pad,
//         },
//         style,
//       ]}
//     >
//       {children}
//     </View>
//   );
// }

// export default function NutritionScreen() {
//   const { colors, isDark } = useTheme() as any;
//   const { user } = useAuth();
//   const router = useRouter();

//   const [dateISO, setDateISO] = useState<string>(isoToday());
//   const [historyMode, setHistoryMode] = useState<"week" | "month">("week");
//   // ---------- Hydration (per-day, stored locally) ----------
//   const [waterMl, setWaterMl] = useState(0);

//   const waterGoalMl = 2400; // tweak later (profile-based, etc.)
//   const waterKey = useMemo(() => `@water:${dateISO}`, [dateISO]);

//   React.useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem(waterKey);
//         if (!mounted) return;
//         setWaterMl(raw ? Math.max(0, Number(raw) || 0) : 0);
//       } catch {
//         if (mounted) setWaterMl(0);
//       }
//     })();
//     return () => {
//       mounted = false;
//     };
//   }, [waterKey]);

//   const setWaterAndStore = (next: number) => {
//     const clamped = Math.max(0, Math.round(next));
//     setWaterMl(clamped);
//     AsyncStorage.setItem(waterKey, String(clamped)).catch(() => {});
//   };

//   const addWater = (ml: number) => setWaterAndStore(waterMl + ml);
//   const clearWater = () => setWaterAndStore(0);

//   const scrollY = useRef(new Animated.Value(0)).current;

//   const { foods, setFoods, mealsMap, totals } = useNutritionStreams(
//     user,
//     dateISO
//   );

//   // history
//   const historyDaysCount = historyMode === "week" ? 14 : 30;
//   const { days: historyDays } = useNutritionHistory(
//     user?.uid,
//     dateISO,
//     historyDaysCount
//   );

//   const dayTotals = useMemo(() => {
//     if (totals && typeof totals === "object") {
//       return {
//         calories: Number((totals as any).calories || 0),
//         protein: Number((totals as any).protein || 0),
//         carbs: Number((totals as any).carbs || 0),
//         fat: Number((totals as any).fat || 0),
//         sugar: Number((totals as any).sugar || 0),
//         fiber: Number((totals as any).fiber || 0),
//       };
//     }
//     const all = [
//       ...(mealsMap?.breakfast || []),
//       ...(mealsMap?.lunch || []),
//       ...(mealsMap?.dinner || []),
//       ...(mealsMap?.snacks || []),
//     ] as FoodEntry[];
//     return sumMacros(all);
//   }, [totals, mealsMap]);

//   // goals: swap to your profile-based computeTargets if you want later
//   const goals = useMemo(
//     () => ({ calories: 2400, protein: 170, carbs: 260, fat: 80 }),
//     []
//   );

//   /** ---------- Add-meal modal result (keeps your contract) ---------- */
//   useFocusEffect(
//     React.useCallback(() => {
//       let cancelled = false;

//       (async () => {
//         if (!user?.uid) return;

//         const raw = await AsyncStorage.getItem("@pending_add_meal");
//         if (!raw) return;

//         await AsyncStorage.removeItem("@pending_add_meal");
//         if (cancelled) return;

//         try {
//           const data = JSON.parse(raw);

//           const base: Omit<FoodEntry, "id"> = {
//             date: (data.date || dateISO) as FoodEntry["date"],
//             meal: (data.meal || "breakfast") as FoodEntry["meal"],
//             name: String(data.name || "").trim(),
//             unit: (data.unit || "serving") as FoodEntry["unit"],
//             qty: Number(data.qty || 1) as FoodEntry["qty"],
//             calories: Number(data.calories || 0) as FoodEntry["calories"],
//             protein: Number(data.protein || 0) as FoodEntry["protein"],
//             carbs: Number(data.carbs || 0) as FoodEntry["carbs"],
//             fat: Number(data.fat || 0) as FoodEntry["fat"],
//             ...(data.sugar != null ? { sugar: Number(data.sugar) as any } : {}),
//             ...(data.fiber != null ? { fiber: Number(data.fiber) as any } : {}),
//           };

//           const tempId = `temp-${Date.now()}`;
//           const tempItem: FoodEntry = { ...(base as any), id: tempId };
//           setFoods((prev: FoodEntry[]) => [tempItem, ...prev]);

//           try {
//             const ref = await addFood(user.uid, { ...base });
//             setFoods((prev: FoodEntry[]) =>
//               prev.map((f) => (f.id === tempId ? { ...f, id: ref.id } : f))
//             );
//           } catch {
//             setFoods((prev: FoodEntry[]) =>
//               prev.filter((f) => f.id !== tempId)
//             );
//           }
//         } catch {}
//       })();

//       return () => {
//         cancelled = true;
//       };
//     }, [user?.uid, dateISO, setFoods])
//   );

//   function openAdd(meal: MealKey) {
//     router.push({
//       pathname: "/(modals)/add-meal",
//       params: { meal, date: dateISO },
//     });
//   }

//   /** ---------- editing ---------- */
//   const [editId, setEditId] = useState<string | null>(null);
//   const [editDraft, setEditDraft] = useState<any>(null);

//   function startEdit(item: FoodEntry) {
//     setEditId(item.id);
//     setEditDraft({
//       name: String(item.name || ""),
//       qty: String(item.qty ?? 1),
//       unit: String(item.unit || "serving"),
//       calories: String(item.calories ?? 0),
//       protein: String(item.protein ?? 0),
//       carbs: String(item.carbs ?? 0),
//       fat: String(item.fat ?? 0),
//     });
//   }

//   async function saveEdit(item: FoodEntry) {
//     if (!user?.uid || !editDraft || !editId || editId.startsWith("temp-")) {
//       setEditId(null);
//       setEditDraft(null);
//       return;
//     }

//     const patch: Partial<FoodEntry> = {
//       name: (editDraft.name || "").trim() || item.name,
//       qty: Number(editDraft.qty || item.qty || 1) as any,
//       unit: (editDraft.unit || item.unit || "serving") as any,
//       calories: Number(editDraft.calories || 0) as any,
//       protein: Number(editDraft.protein || 0) as any,
//       carbs: Number(editDraft.carbs || 0) as any,
//       fat: Number(editDraft.fat || 0) as any,
//     };

//     const prev = foods;
//     setFoods((curr: FoodEntry[]) =>
//       curr.map((f) => (f.id === item.id ? ({ ...f, ...patch } as any) : f))
//     );

//     try {
//       await updateFood(user.uid, item.id, patch as any);
//       setEditId(null);
//       setEditDraft(null);
//     } catch {
//       setFoods(prev);
//       Alert.alert("Couldn’t save", "Try again.");
//     }
//   }

//   async function removeItem(item: FoodEntry) {
//     if (!user?.uid) return;

//     Alert.alert("Delete item?", item.name || "This item", [
//       { text: "Cancel", style: "cancel" },
//       {
//         text: "Delete",
//         style: "destructive",
//         onPress: async () => {
//           const prev = foods;
//           setFoods((curr: FoodEntry[]) => curr.filter((f) => f.id !== item.id));
//           try {
//             await deleteFood(user.uid, item.id);
//           } catch {
//             setFoods(prev);
//           }
//         },
//       },
//     ]);
//   }

//   const timeline = useMemo(() => {
//     return MEALS.map((m) => {
//       const items = ((mealsMap as any)?.[m] || []) as FoodEntry[];
//       return { meal: m, items, totals: sumMacros(items) };
//     });
//   }, [mealsMap]);

//   const headerLift = scrollY.interpolate({
//     inputRange: [0, 140],
//     outputRange: [0, -12],
//     extrapolate: "clamp",
//   });

//   return (
//     <View style={{ flex: 1, backgroundColor: colors.bg }}>
//       <Animated.ScrollView
//         onScroll={Animated.event(
//           [{ nativeEvent: { contentOffset: { y: scrollY } } }],
//           { useNativeDriver: true }
//         )}
//         scrollEventThrottle={16}
//         contentContainerStyle={{ paddingBottom: 120 }}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* HERO */}
//         <Animated.View style={{ transform: [{ translateY: headerLift }] }}>
//           <LinearGradient
//             colors={[
//               withAlpha(colors.primary, 0.42),
//               withAlpha(colors.card, isDark ? 0.12 : 0.22),
//               colors.bg,
//             ]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 0.6, y: 1 }}
//             style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 }}
//           >
//             {/* Top bar */}
//             <View
//               style={{
//                 flexDirection: "row",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//               }}
//             >
//               <View style={{ gap: 3 }}>
//                 <Text
//                   style={{
//                     color: colors.muted,
//                     fontWeight: "900",
//                     fontSize: 12,
//                   }}
//                 >
//                   Nutrition
//                 </Text>
//                 <Text
//                   style={{
//                     color: colors.text,
//                     fontWeight: "900",
//                     fontSize: 20,
//                   }}
//                 >
//                   {fmtNice(dateISO)}
//                 </Text>
//               </View>

//               <View style={{ flexDirection: "row", gap: 10 }}>
//                 <Pressable
//                   onPress={() => setDateISO((d) => isoAddDays(d, -1))}
//                   style={{
//                     width: 40,
//                     height: 40,
//                     borderRadius: 14,
//                     borderWidth: 1,
//                     borderColor: colors.border,
//                     alignItems: "center",
//                     justifyContent: "center",
//                     backgroundColor: withAlpha(colors.card, 0.5),
//                   }}
//                 >
//                   <Ionicons name="chevron-back" size={18} color={colors.text} />
//                 </Pressable>

//                 <Pressable
//                   onPress={() => setDateISO(isoToday())}
//                   style={{
//                     paddingHorizontal: 12,
//                     height: 40,
//                     borderRadius: 14,
//                     borderWidth: 1,
//                     borderColor: withAlpha(colors.primary, 0.35),
//                     alignItems: "center",
//                     justifyContent: "center",
//                     backgroundColor: withAlpha(colors.primary, 0.14),
//                   }}
//                 >
//                   <Text
//                     style={{
//                       color: colors.text,
//                       fontWeight: "900",
//                       fontSize: 13,
//                     }}
//                   >
//                     Today
//                   </Text>
//                 </Pressable>

//                 <Pressable
//                   onPress={() => setDateISO((d) => isoAddDays(d, +1))}
//                   style={{
//                     width: 40,
//                     height: 40,
//                     borderRadius: 14,
//                     borderWidth: 1,
//                     borderColor: colors.border,
//                     alignItems: "center",
//                     justifyContent: "center",
//                     backgroundColor: withAlpha(colors.card, 0.5),
//                   }}
//                 >
//                   <Ionicons
//                     name="chevron-forward"
//                     size={18}
//                     color={colors.text}
//                   />
//                 </Pressable>
//               </View>
//             </View>

//             {/* HISTORY STRIP */}
//             <View style={{ marginTop: 12 }}>
//               <View
//                 style={{
//                   flexDirection: "row",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                 }}
//               >
//                 <Text
//                   style={{
//                     color: colors.muted,
//                     fontWeight: "900",
//                     fontSize: 12,
//                     letterSpacing: 0.6,
//                   }}
//                 >
//                   HISTORY
//                 </Text>
//                 <Pressable
//                   onPress={() =>
//                     setHistoryMode((m) => (m === "week" ? "month" : "week"))
//                   }
//                   style={{
//                     paddingHorizontal: 12,
//                     paddingVertical: 8,
//                     borderRadius: 999,
//                     borderWidth: 1,
//                     borderColor: colors.border,
//                     backgroundColor: withAlpha(colors.card, 0.35),
//                   }}
//                 >
//                   <Text
//                     style={{
//                       color: colors.text,
//                       fontWeight: "900",
//                       fontSize: 12,
//                     }}
//                   >
//                     {historyMode === "week" ? "Month" : "2 weeks"}
//                   </Text>
//                 </Pressable>
//               </View>

//               <View
//                 style={{
//                   flexDirection: "row",
//                   gap: 10,
//                   marginTop: 10,
//                   flexWrap: "wrap",
//                 }}
//               >
//                 {historyDays.map((d) => {
//                   const active = d.date === dateISO;
//                   const hot = d.calories >= goals.calories * 0.9;
//                   return (
//                     <Pressable
//                       key={d.date}
//                       onPress={() => setDateISO(d.date)}
//                       style={{
//                         width: historyMode === "week" ? "13.3%" : "9.2%",
//                         minWidth: historyMode === "week" ? 44 : 34,
//                         paddingVertical: 10,
//                         borderRadius: 14,
//                         borderWidth: 1,
//                         borderColor: active
//                           ? withAlpha(colors.primary, 0.42)
//                           : colors.border,
//                         backgroundColor: active
//                           ? withAlpha(colors.primary, 0.16)
//                           : hot
//                           ? withAlpha("#22c55e", 0.1)
//                           : withAlpha(colors.card, 0.22),
//                         alignItems: "center",
//                       }}
//                     >
//                       <Text
//                         style={{
//                           color: colors.muted,
//                           fontWeight: "900",
//                           fontSize: 10,
//                         }}
//                       >
//                         {new Date(d.date + "T12:00:00").toLocaleDateString(
//                           undefined,
//                           { weekday: "narrow" }
//                         )}
//                       </Text>
//                       <Text
//                         style={{
//                           color: colors.text,
//                           fontWeight: "900",
//                           marginTop: 2,
//                         }}
//                       >
//                         {Number(d.date.slice(-2))}
//                       </Text>
//                       <Text
//                         style={{
//                           color: colors.muted,
//                           fontWeight: "900",
//                           fontSize: 10,
//                           marginTop: 2,
//                         }}
//                       >
//                         {Math.round(d.calories)}
//                       </Text>
//                     </Pressable>
//                   );
//                 })}
//               </View>
//             </View>

//             {/* GOAL RINGS CARD */}
//             <View style={{ marginTop: 14 }}>
//               <GlassCard
//                 colors={colors}
//                 isDark={isDark}
//                 style={{ ...softShadow }}
//               >
//                 <View
//                   style={{
//                     flexDirection: "row",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                   }}
//                 >
//                   <View
//                     style={{
//                       flexDirection: "row",
//                       gap: 14,
//                       alignItems: "center",
//                     }}
//                   >
//                     <View style={{ borderRadius: 999, overflow: "hidden" }}>
//                       <AnimatedRing
//                         size={96}
//                         stroke={10}
//                         value={dayTotals.calories}
//                         goal={goals.calories}
//                         trackColor={withAlpha(colors.border, 0.9)}
//                         fillColor={withAlpha(colors.primary, 0.95)}
//                         labelTop="Calories"
//                         labelBottom={`${Math.round(dayTotals.calories)}`}
//                       />
//                     </View>

//                     <View style={{ gap: 8 }}>
//                       <Text
//                         style={{
//                           color: colors.text,
//                           fontWeight: "900",
//                           fontSize: 16,
//                         }}
//                       >
//                         Daily goals
//                       </Text>
//                       <Text style={{ color: colors.muted, fontWeight: "800" }}>
//                         {Math.max(
//                           0,
//                           Math.round(goals.calories - dayTotals.calories)
//                         )}{" "}
//                         kcal remaining
//                       </Text>

//                       <View
//                         style={{ flexDirection: "row", gap: 10, marginTop: 6 }}
//                       >
//                         {[
//                           { k: "P", v: dayTotals.protein, g: goals.protein },
//                           { k: "C", v: dayTotals.carbs, g: goals.carbs },
//                           { k: "F", v: dayTotals.fat, g: goals.fat },
//                         ].map((x) => (
//                           <View key={x.k} style={{ alignItems: "center" }}>
//                             <AnimatedRing
//                               size={46}
//                               stroke={7}
//                               value={x.v}
//                               goal={x.g}
//                               trackColor={withAlpha(colors.border, 0.9)}
//                               fillColor={withAlpha(colors.primary, 0.85)}
//                             />
//                             <Text
//                               style={{
//                                 color: colors.muted,
//                                 fontWeight: "900",
//                                 fontSize: 11,
//                                 marginTop: 4,
//                               }}
//                             >
//                               {x.k} {Math.round(x.v)}/{x.g}
//                             </Text>
//                           </View>
//                         ))}
//                       </View>
//                     </View>
//                   </View>

//                   <Pressable
//                     onPress={() => openAdd("snacks")}
//                     style={{
//                       paddingHorizontal: 12,
//                       paddingVertical: 10,
//                       borderRadius: 999,
//                       borderWidth: 1,
//                       borderColor: withAlpha(colors.primary, 0.35),
//                       backgroundColor: withAlpha(colors.primary, 0.14),
//                       flexDirection: "row",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     <Ionicons name="add" size={18} color={colors.text} />
//                     <Text style={{ color: colors.text, fontWeight: "900" }}>
//                       Log
//                     </Text>
//                   </Pressable>
//                 </View>
//               </GlassCard>
//             </View>
//           </LinearGradient>
//           {/* HYDRATION */}
//           <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
//             <Text
//               style={{
//                 color: colors.muted,
//                 fontWeight: "900",
//                 fontSize: 12,
//                 letterSpacing: 0.6,
//                 marginBottom: 10,
//               }}
//             >
//               HYDRATION
//             </Text>

//             <MotiView
//               from={{ opacity: 0, translateY: 10 }}
//               animate={{ opacity: 1, translateY: 0 }}
//               transition={{ type: "timing", duration: 420, delay: 40 }}
//             >
//               <GlassCard
//                 colors={colors}
//                 isDark={isDark}
//                 style={{ ...softShadow }}
//               >
//                 {/* header row */}
//                 <View
//                   style={{
//                     flexDirection: "row",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                     marginBottom: 12,
//                   }}
//                 >
//                   <View style={{ gap: 2 }}>
//                     <Text
//                       style={{
//                         color: colors.text,
//                         fontWeight: "900",
//                         fontSize: 16,
//                       }}
//                     >
//                       Hydration
//                     </Text>
//                     <Text
//                       style={{
//                         color: colors.muted,
//                         fontWeight: "800",
//                         fontSize: 12,
//                       }}
//                     >
//                       {waterMl} / {waterGoalMl} ml •{" "}
//                       {Math.round((waterMl / waterGoalMl) * 100) || 0}%
//                     </Text>
//                   </View>

//                   <Pressable
//                     onPress={clearWater}
//                     style={{
//                       paddingHorizontal: 12,
//                       paddingVertical: 8,
//                       borderRadius: 999,
//                       borderWidth: 1,
//                       borderColor: withAlpha("#ef4444", 0.25),
//                       backgroundColor: withAlpha("#ef4444", 0.12),
//                       flexDirection: "row",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     <Ionicons
//                       name="trash-outline"
//                       size={16}
//                       color={colors.text}
//                     />
//                     <Text
//                       style={{
//                         color: colors.text,
//                         fontWeight: "900",
//                         fontSize: 12,
//                       }}
//                     >
//                       Clear
//                     </Text>
//                   </Pressable>
//                 </View>

//                 {/* content */}
//                 <View
//                   style={{
//                     flexDirection: "row",
//                     gap: 14,
//                     alignItems: "center",
//                   }}
//                 >
//                   <View
//                     style={{ width: 140, flexShrink: 0, overflow: "visible" }}
//                   >
//                     <WaterBottleCardRealistic
//                       currentMl={waterMl}
//                       goalMl={waterGoalMl}
//                       width={140}
//                       height={190}
//                       tint="aqua"
//                       onQuickAdd={(ml) => addWater(ml)}
//                     />
//                   </View>

//                   <View style={{ flex: 1, gap: 10, minWidth: 0 }}>
//                     <View
//                       style={{
//                         flexDirection: "row",
//                         flexWrap: "wrap",
//                         gap: 10,
//                       }}
//                     >
//                       {[150, 250, 350, 500].map((ml) => (
//                         <Pressable
//                           key={ml}
//                           onPress={() => addWater(ml)}
//                           style={{
//                             width: "48%",
//                             minWidth: 120,
//                             height: 42,
//                             borderRadius: 14,
//                             borderWidth: 1,
//                             borderColor: withAlpha(colors.primary, 0.32),
//                             backgroundColor: withAlpha(colors.primary, 0.14),
//                             alignItems: "center",
//                             justifyContent: "center",
//                             flexDirection: "row",
//                             gap: 6,
//                           }}
//                         >
//                           <Ionicons
//                             name="add-circle-outline"
//                             size={16}
//                             color={colors.text}
//                           />
//                           <Text
//                             style={{
//                               color: colors.text,
//                               fontWeight: "900",
//                               fontSize: 12,
//                             }}
//                           >
//                             {ml} ml
//                           </Text>
//                         </Pressable>
//                       ))}
//                     </View>

//                     <Pressable
//                       onPress={() => addWater(1000)}
//                       style={{
//                         height: 44,
//                         borderRadius: 14,
//                         borderWidth: 1,
//                         borderColor: withAlpha(colors.primary, 0.35),
//                         backgroundColor: withAlpha(colors.card, 0.35),
//                         alignItems: "center",
//                         justifyContent: "center",
//                         flexDirection: "row",
//                         gap: 8,
//                       }}
//                     >
//                       <Ionicons
//                         name="water-outline"
//                         size={18}
//                         color={colors.text}
//                       />
//                       <Text style={{ color: colors.text, fontWeight: "900" }}>
//                         +1000 ml (bottle)
//                       </Text>
//                     </Pressable>

//                     <View
//                       style={{
//                         height: 10,
//                         borderRadius: 999,
//                         backgroundColor: withAlpha(colors.border, 0.9),
//                         overflow: "hidden",
//                         marginTop: 2,
//                       }}
//                     >
//                       <View
//                         style={{
//                           width: `${
//                             Math.min(
//                               1,
//                               waterGoalMl > 0 ? waterMl / waterGoalMl : 0
//                             ) * 100
//                           }%`,
//                           height: "100%",
//                           backgroundColor: withAlpha(colors.primary, 0.95),
//                         }}
//                       />
//                     </View>
//                   </View>
//                 </View>
//               </GlassCard>
//             </MotiView>
//           </View>
//         </Animated.View>

//         {/* MEAL TIMELINE */}
//         <View style={{ paddingHorizontal: 16, gap: 12 }}>
//           <Text
//             style={{
//               color: colors.muted,
//               fontWeight: "900",
//               fontSize: 12,
//               letterSpacing: 0.6,
//             }}
//           >
//             MEAL TIMELINE
//           </Text>

//           {timeline.map((g, idx) => {
//             const meta = MEAL_META[g.meal];

//             return (
//               <MotiView
//                 key={g.meal}
//                 from={{ opacity: 0, translateY: 10 }}
//                 animate={{ opacity: 1, translateY: 0 }}
//                 transition={{
//                   type: "timing",
//                   duration: 380,
//                   delay: 60 + idx * 60,
//                 }}
//               >
//                 <View
//                   style={{
//                     borderRadius: 22,
//                     overflow: "hidden",
//                     borderWidth: 1,
//                     borderColor: colors.border,
//                   }}
//                 >
//                   <LinearGradient
//                     colors={[
//                       withAlpha(meta.gradA, 0.26),
//                       withAlpha(meta.gradB, 0.12),
//                     ]}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 1 }}
//                     style={{ padding: 14 }}
//                   >
//                     <View
//                       style={{
//                         flexDirection: "row",
//                         alignItems: "center",
//                         justifyContent: "space-between",
//                       }}
//                     >
//                       <View
//                         style={{
//                           flexDirection: "row",
//                           alignItems: "center",
//                           gap: 10,
//                         }}
//                       >
//                         <View
//                           style={{
//                             width: 40,
//                             height: 40,
//                             borderRadius: 14,
//                             alignItems: "center",
//                             justifyContent: "center",
//                             backgroundColor: withAlpha(colors.card, 0.45),
//                             borderWidth: 1,
//                             borderColor: withAlpha(colors.border, 0.9),
//                           }}
//                         >
//                           <Ionicons
//                             name={meta.icon}
//                             size={18}
//                             color={colors.text}
//                           />
//                         </View>
//                         <View style={{ gap: 2 }}>
//                           <Text
//                             style={{
//                               color: colors.text,
//                               fontWeight: "900",
//                               fontSize: 16,
//                             }}
//                           >
//                             {meta.label}
//                           </Text>
//                           <Text
//                             style={{
//                               color: colors.muted,
//                               fontWeight: "800",
//                               fontSize: 12,
//                             }}
//                           >
//                             {g.items.length
//                               ? `${Math.round(g.totals.calories)} kcal`
//                               : "No items yet"}
//                           </Text>
//                         </View>
//                       </View>

//                       <Pressable
//                         onPress={() => openAdd(g.meal)}
//                         style={{
//                           paddingVertical: 10,
//                           paddingHorizontal: 12,
//                           borderRadius: 999,
//                           borderWidth: 1,
//                           borderColor: withAlpha(colors.primary, 0.35),
//                           backgroundColor: withAlpha(colors.primary, 0.14),
//                           flexDirection: "row",
//                           alignItems: "center",
//                           gap: 8,
//                         }}
//                       >
//                         <Ionicons name="add" size={18} color={colors.text} />
//                         <Text
//                           style={{
//                             color: colors.text,
//                             fontWeight: "900",
//                             fontSize: 13,
//                           }}
//                         >
//                           Add
//                         </Text>
//                       </Pressable>
//                     </View>

//                     <View style={{ marginTop: 12, gap: 8 }}>
//                       {g.items.length === 0 ? (
//                         <View
//                           style={{
//                             padding: 12,
//                             borderRadius: 16,
//                             borderWidth: 1,
//                             borderColor: withAlpha(colors.border, 0.9),
//                             backgroundColor: withAlpha(colors.card, 0.35),
//                           }}
//                         >
//                           <Text
//                             style={{ color: colors.muted, fontWeight: "800" }}
//                           >
//                             Tap “Add” to log. Your recents will be one tap.
//                           </Text>
//                         </View>
//                       ) : (
//                         g.items.slice(0, 8).map((it) => {
//                           const isEditing = editId === it.id;
//                           return (
//                             <View
//                               key={it.id}
//                               style={{
//                                 borderRadius: 16,
//                                 borderWidth: 1,
//                                 borderColor: withAlpha(colors.border, 0.9),
//                                 backgroundColor: withAlpha(colors.card, 0.4),
//                                 padding: 12,
//                               }}
//                             >
//                               {!isEditing ? (
//                                 <Pressable
//                                   onPress={() => startEdit(it)}
//                                   style={{
//                                     flexDirection: "row",
//                                     alignItems: "center",
//                                     justifyContent: "space-between",
//                                   }}
//                                 >
//                                   <View style={{ flex: 1, paddingRight: 10 }}>
//                                     <Text
//                                       style={{
//                                         color: colors.text,
//                                         fontWeight: "900",
//                                         fontSize: 14,
//                                       }}
//                                       numberOfLines={1}
//                                     >
//                                       {it.name}
//                                     </Text>
//                                     <Text
//                                       style={{
//                                         color: colors.muted,
//                                         fontWeight: "800",
//                                         fontSize: 12,
//                                       }}
//                                     >
//                                       {Math.round(Number(it.qty || 1))}{" "}
//                                       {it.unit || "serving"} •{" "}
//                                       {Math.round(Number(it.calories || 0))}{" "}
//                                       kcal
//                                     </Text>
//                                   </View>

//                                   <View
//                                     style={{
//                                       flexDirection: "row",
//                                       gap: 10,
//                                       alignItems: "center",
//                                     }}
//                                   >
//                                     <View
//                                       style={{
//                                         paddingHorizontal: 10,
//                                         paddingVertical: 6,
//                                         borderRadius: 999,
//                                         backgroundColor: withAlpha(
//                                           colors.primary,
//                                           0.12
//                                         ),
//                                         borderWidth: 1,
//                                         borderColor: withAlpha(
//                                           colors.primary,
//                                           0.25
//                                         ),
//                                       }}
//                                     >
//                                       <Text
//                                         style={{
//                                           color: colors.text,
//                                           fontWeight: "900",
//                                           fontSize: 12,
//                                         }}
//                                       >
//                                         P {Math.round(Number(it.protein || 0))}g
//                                       </Text>
//                                     </View>

//                                     <Pressable
//                                       onPress={() => removeItem(it)}
//                                       style={{
//                                         width: 34,
//                                         height: 34,
//                                         borderRadius: 12,
//                                         alignItems: "center",
//                                         justifyContent: "center",
//                                         backgroundColor: withAlpha(
//                                           "#ef4444",
//                                           0.12
//                                         ),
//                                         borderWidth: 1,
//                                         borderColor: withAlpha("#ef4444", 0.25),
//                                       }}
//                                     >
//                                       <Ionicons
//                                         name="trash-outline"
//                                         size={16}
//                                         color={colors.text}
//                                       />
//                                     </Pressable>
//                                   </View>
//                                 </Pressable>
//                               ) : (
//                                 <View style={{ gap: 10 }}>
//                                   <Text
//                                     style={{
//                                       color: colors.muted,
//                                       fontWeight: "900",
//                                       fontSize: 12,
//                                     }}
//                                   >
//                                     Edit item
//                                   </Text>

//                                   <TextInput
//                                     value={editDraft?.name ?? ""}
//                                     onChangeText={(t) =>
//                                       setEditDraft((p: any) =>
//                                         p ? { ...p, name: t } : p
//                                       )
//                                     }
//                                     placeholder="Name"
//                                     placeholderTextColor={colors.placeholder}
//                                     style={{
//                                       borderWidth: 1,
//                                       borderColor: colors.inputBorder,
//                                       backgroundColor: colors.inputBg,
//                                       color: colors.text,
//                                       borderRadius: 14,
//                                       paddingHorizontal: 12,
//                                       paddingVertical: 10,
//                                       fontWeight: "800",
//                                     }}
//                                   />

//                                   <View
//                                     style={{ flexDirection: "row", gap: 10 }}
//                                   >
//                                     <TextInput
//                                       value={editDraft?.qty ?? ""}
//                                       onChangeText={(t) =>
//                                         setEditDraft((p: any) =>
//                                           p
//                                             ? {
//                                                 ...p,
//                                                 qty: t.replace(/[^0-9.]/g, ""),
//                                               }
//                                             : p
//                                         )
//                                       }
//                                       keyboardType="decimal-pad"
//                                       placeholder="Qty"
//                                       placeholderTextColor={colors.placeholder}
//                                       style={{
//                                         flex: 1,
//                                         borderWidth: 1,
//                                         borderColor: colors.inputBorder,
//                                         backgroundColor: colors.inputBg,
//                                         color: colors.text,
//                                         borderRadius: 14,
//                                         paddingHorizontal: 12,
//                                         paddingVertical: 10,
//                                         fontWeight: "800",
//                                       }}
//                                     />
//                                     <TextInput
//                                       value={editDraft?.unit ?? ""}
//                                       onChangeText={(t) =>
//                                         setEditDraft((p: any) =>
//                                           p ? { ...p, unit: t } : p
//                                         )
//                                       }
//                                       placeholder="Unit"
//                                       placeholderTextColor={colors.placeholder}
//                                       style={{
//                                         flex: 1,
//                                         borderWidth: 1,
//                                         borderColor: colors.inputBorder,
//                                         backgroundColor: colors.inputBg,
//                                         color: colors.text,
//                                         borderRadius: 14,
//                                         paddingHorizontal: 12,
//                                         paddingVertical: 10,
//                                         fontWeight: "800",
//                                       }}
//                                     />
//                                   </View>

//                                   <View
//                                     style={{ flexDirection: "row", gap: 10 }}
//                                   >
//                                     {[
//                                       ["Calories", "calories"],
//                                       ["Protein", "protein"],
//                                       ["Carbs", "carbs"],
//                                       ["Fat", "fat"],
//                                     ].map(([lbl, key]) => (
//                                       <TextInput
//                                         key={key}
//                                         value={String(editDraft?.[key] ?? "")}
//                                         onChangeText={(t) =>
//                                           setEditDraft((p: any) =>
//                                             p
//                                               ? {
//                                                   ...p,
//                                                   [key]: t.replace(
//                                                     /[^0-9.]/g,
//                                                     ""
//                                                   ),
//                                                 }
//                                               : p
//                                           )
//                                         }
//                                         keyboardType="decimal-pad"
//                                         placeholder={lbl}
//                                         placeholderTextColor={
//                                           colors.placeholder
//                                         }
//                                         style={{
//                                           flex: 1,
//                                           borderWidth: 1,
//                                           borderColor: colors.inputBorder,
//                                           backgroundColor: colors.inputBg,
//                                           color: colors.text,
//                                           borderRadius: 14,
//                                           paddingHorizontal: 10,
//                                           paddingVertical: 10,
//                                           fontWeight: "900",
//                                           fontSize: 12,
//                                         }}
//                                       />
//                                     ))}
//                                   </View>

//                                   <View
//                                     style={{
//                                       flexDirection: "row",
//                                       gap: 10,
//                                       justifyContent: "flex-end",
//                                     }}
//                                   >
//                                     <Pressable
//                                       onPress={() => {
//                                         setEditId(null);
//                                         setEditDraft(null);
//                                       }}
//                                       style={{
//                                         paddingHorizontal: 12,
//                                         paddingVertical: 10,
//                                         borderRadius: 999,
//                                         borderWidth: 1,
//                                         borderColor: colors.border,
//                                         backgroundColor: withAlpha(
//                                           colors.card,
//                                           0.35
//                                         ),
//                                       }}
//                                     >
//                                       <Text
//                                         style={{
//                                           color: colors.text,
//                                           fontWeight: "900",
//                                         }}
//                                       >
//                                         Cancel
//                                       </Text>
//                                     </Pressable>
//                                     <Pressable
//                                       onPress={() => saveEdit(it)}
//                                       style={{
//                                         paddingHorizontal: 12,
//                                         paddingVertical: 10,
//                                         borderRadius: 999,
//                                         borderWidth: 1,
//                                         borderColor: withAlpha(
//                                           colors.primary,
//                                           0.35
//                                         ),
//                                         backgroundColor: withAlpha(
//                                           colors.primary,
//                                           0.14
//                                         ),
//                                       }}
//                                     >
//                                       <Text
//                                         style={{
//                                           color: colors.text,
//                                           fontWeight: "900",
//                                         }}
//                                       >
//                                         Save
//                                       </Text>
//                                     </Pressable>
//                                   </View>
//                                 </View>
//                               )}
//                             </View>
//                           );
//                         })
//                       )}
//                     </View>
//                   </LinearGradient>
//                 </View>
//               </MotiView>
//             );
//           })}
//         </View>
//       </Animated.ScrollView>

//       {/* Floating add */}
//       <View
//         pointerEvents="box-none"
//         style={{
//           position: "absolute",
//           left: 0,
//           right: 0,
//           bottom: 18,
//           alignItems: "center",
//         }}
//       >
//         <Pressable
//           onPress={() => openAdd("snacks")}
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             gap: 10,
//             paddingHorizontal: 16,
//             height: 54,
//             borderRadius: 999,
//             borderWidth: 1,
//             borderColor: withAlpha(colors.primary, 0.35),
//             backgroundColor:
//               Platform.OS === "ios"
//                 ? withAlpha(colors.card, 0.45)
//                 : withAlpha(colors.card, 0.9),
//             ...softShadow,
//           }}
//         >
//           <View
//             style={{
//               width: 34,
//               height: 34,
//               borderRadius: 14,
//               alignItems: "center",
//               justifyContent: "center",
//               backgroundColor: withAlpha(colors.primary, 0.18),
//               borderWidth: 1,
//               borderColor: withAlpha(colors.primary, 0.25),
//             }}
//           >
//             <Ionicons name="add" size={18} color={colors.text} />
//           </View>
//           <Text style={{ color: colors.text, fontWeight: "900" }}>
//             Log food
//           </Text>
//           <Text style={{ color: colors.muted, fontWeight: "800" }}>
//             • recents + search
//           </Text>
//         </Pressable>
//       </View>
//     </View>
//   );
// }

// import React from "react";
// import NutritionScreen from "@/components/nutrition/new/NutritionScreen";

// export default function NutritionTab() {
//   return <NutritionScreen />;
// }

import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  Animated,
  Alert,
  StatusBar,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

import { NutritionSummaryCard } from "@/components/nutrition/uiNew/NutritionSummaryCard";
import { HydrationCard } from "@/components/nutrition/uiNew/HydrationCard";
import { DayStrip } from "@/components/nutrition/uiNew/DayStrip";
import { SectionHeader } from "@/components/nutrition/uiNew/SectionHeader";
import { MealCard, MealKey } from "@/components/nutrition/uiNew/MealCard";
import { EditFoodSheet } from "@/components/nutrition/uiNew/EditFoodSheet";

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

const MEALS: MealKey[] = ["breakfast", "lunch", "dinner", "snacks"];

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

export default function NutritionScreen() {
  const { colors, isDark } = useTheme() as any;
  const { user } = useAuth();
  const router = useRouter();

  const [dateISO, setDateISO] = useState<string>(isoToday());
  const [historyMode, setHistoryMode] = useState<"week" | "month">("week");

  // ---------- Hydration (per-day, stored locally) ----------
  const [waterMl, setWaterMl] = useState(0);
  const waterGoalMl = 2400;
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

  // ---------- Streams ----------
  const { foods, setFoods, mealsMap, totals } = useNutritionStreams(
    user,
    dateISO
  );

  // ---------- History ----------
  const historyDaysCount = historyMode === "week" ? 14 : 30;
  const { days: historyDays } = useNutritionHistory(
    user?.uid,
    dateISO,
    historyDaysCount
  );

  // ---------- Goals (keep your placeholder) ----------
  const goals = useMemo(
    () => ({ calories: 2400, protein: 170, carbs: 260, fat: 80 }),
    []
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

  // ---------- Add-meal modal result (keeps your contract) ----------
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

  // ---------- Editing (sheet) ----------
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<FoodEntry | null>(null);

  function startEdit(item: FoodEntry) {
    setEditItem(item);
    setEditOpen(true);
  }

  async function saveEdit(patch: Partial<FoodEntry>) {
    if (!user?.uid || !editItem?.id || editItem.id.startsWith("temp-")) {
      setEditOpen(false);
      setEditItem(null);
      return;
    }

    const prev = foods;
    setFoods((curr: FoodEntry[]) =>
      curr.map((f) => (f.id === editItem.id ? ({ ...f, ...patch } as any) : f))
    );

    try {
      await updateFood(user.uid, editItem.id, patch as any);
      setEditOpen(false);
      setEditItem(null);
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

  // ---------- Scroll polish ----------
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerLift = scrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });

  const stickyBarOpacity = scrollY.interpolate({
    inputRange: [0, 60, 120],
    outputRange: [0, 0.35, 1],
    extrapolate: "clamp",
  });

  // ---------- Derived per-meal groups ----------
  const timeline = useMemo(() => {
    return MEALS.map((m) => {
      const items = ((mealsMap as any)?.[m] || []) as FoodEntry[];
      return { meal: m, items, totals: sumMacros(items) };
    });
  }, [mealsMap]);

  const a11yDateLabel = `Selected day: ${fmtNice(dateISO)}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {Platform.OS === "ios" && (
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      )}

      {/* Sticky mini date bar (calm, supportive, always reachable) */}
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          zIndex: 20,
          opacity: stickyBarOpacity,
        }}
      >
        <View
          style={{
            paddingTop: Platform.OS === "ios" ? 54 : 16,
            paddingBottom: 10,
            paddingHorizontal: 16,
            backgroundColor: withAlpha(colors.bg, isDark ? 0.65 : 0.85),
            borderBottomWidth: 1,
            borderBottomColor: withAlpha(colors.border, 0.6),
          }}
          accessibilityLabel={a11yDateLabel}
        >
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
                Nutrition
              </Text>
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
              >
                {fmtNice(dateISO)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous day"
                onPress={() => setDateISO((d) => isoAddDays(d, -1))}
                hitSlop={10}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(colors.card, 0.35),
                }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go to today"
                onPress={() => setDateISO(isoToday())}
                hitSlop={10}
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
                accessibilityRole="button"
                accessibilityLabel="Next day"
                onPress={() => setDateISO((d) => isoAddDays(d, +1))}
                hitSlop={10}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(colors.card, 0.35),
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
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 140,
          paddingTop: Platform.OS === "ios" ? 12 : 8,
        }}
      >
        {/* HERO (calm gradient wash) */}
        <Animated.View style={{ transform: [{ translateY: headerLift }] }}>
          <View style={{ paddingTop: Platform.OS === "ios" ? 54 : 18 }}>
            <View style={{ paddingHorizontal: 16 }}>
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
                  fontSize: 24,
                  marginTop: 2,
                }}
                accessibilityLabel={a11yDateLabel}
              >
                {fmtNice(dateISO)}
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontWeight: "800",
                  marginTop: 6,
                  lineHeight: 18,
                }}
              >
                Keep it simple today. Small wins add up.
              </Text>
            </View>

            <View style={{ marginTop: 14 }}>
              <DayStrip
                colors={colors}
                isDark={isDark}
                days={historyDays}
                activeISO={dateISO}
                goals={goals}
                mode={historyMode}
                onPressDay={(d) => setDateISO(d)}
                onToggleMode={() =>
                  setHistoryMode((m) => (m === "week" ? "month" : "week"))
                }
              />
            </View>

            <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
              <NutritionSummaryCard
                colors={colors}
                isDark={isDark}
                goals={goals}
                totals={dayTotals}
                onPressLog={() => openAdd("snacks")}
              />
            </View>
          </View>

          {/* HYDRATION */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <SectionHeader
              title="Hydration"
              subtitle="Quick add, no friction."
              colors={colors}
            />
            <HydrationCard
              colors={colors}
              isDark={isDark}
              currentMl={waterMl}
              goalMl={waterGoalMl}
              onAdd={(ml) => addWater(ml)}
              onClear={clearWater}
              style={{ marginTop: 10, ...softShadow }}
            />
          </View>
        </Animated.View>

        {/* MEALS */}
        <View style={{ paddingHorizontal: 16, marginTop: 18, gap: 12 }}>
          <SectionHeader
            title="Meals"
            subtitle="Tap an item to edit. Add is always one tap."
            colors={colors}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Log food"
                onPress={() => openAdd("snacks")}
                hitSlop={10}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.35),
                  backgroundColor: withAlpha(colors.primary, 0.14),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="add" size={16} color={colors.text} />
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Log
                </Text>
              </Pressable>
            }
          />

          {timeline.map((g) => (
            <MealCard
              key={g.meal}
              meal={g.meal}
              items={g.items}
              totals={g.totals}
              colors={colors}
              isDark={isDark}
              onPressAdd={() => openAdd(g.meal)}
              onPressItem={(it) => startEdit(it)}
              onDeleteItem={(it) => removeItem(it)}
            />
          ))}
        </View>
      </Animated.ScrollView>

      {/* Floating “Log food” (calm pill) */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 18,
          alignItems: "center",
          zIndex: 30,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log food"
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
                ? withAlpha(colors.card, 0.5)
                : withAlpha(colors.card, 0.92),
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

      {/* Edit Sheet */}
      <EditFoodSheet
        open={editOpen}
        colors={colors}
        isDark={isDark}
        item={editItem}
        onClose={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
        onSave={(patch) => saveEdit(patch)}
      />
    </View>
  );
}
