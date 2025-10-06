// import React, {
//   useEffect,
//   useMemo,
//   useState,
//   useMemo as useMemoHook,
// } from "react";
// import { ScrollView, View, Text, TextInput, Pressable } from "react-native";
// import Card from "../../components/Card";
// import { useAuth } from "@/content/AuthContext";
// import {
//   ensureProfile,
//   subscribeProfile,
//   updateProfile,
//   type Profile,
// } from "@/services/profile";
// import { computeTargets } from "@/utils/macros";
// import { kgToLb, lbToKg } from "@/utils/units";
// import ThemeToggle from "@/components/ThemeToggle";
// import { useTheme } from "@/content/ThemeProvider";

// /* ---------- helpers ---------- */

// const clamp01 = (x: number) => Math.max(0, Math.min(1, Number(x) || 0));
// const pctToNum = (v: number | string) => clamp01((Number(v) || 0) / 100);

// function toISO(d: Date) {
//   const pad = (n: number) => String(n).padStart(2, "0");
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// }

// function commaSplit(s: string) {
//   return s
//     .split(",")
//     .map((x) => x.trim())
//     .filter(Boolean);
// }

// function joinComma(arr?: string[]) {
//   return (arr || []).join(", ");
// }

// /* ---------- screen ---------- */

// export default function ProfileScreen() {
//   const { colors } = useTheme();
//   const { user } = useAuth();
//   const [profile, setProfile] = useState<Profile | null>(null);

//   // local editable state (seeded from profile in hydrate)
//   const [sex, setSex] = useState<"male" | "female">("male");
//   const [age, setAge] = useState<string>("25");
//   const [heightCm, setHeightCm] = useState<string>("175");

//   const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
//   const [weightInput, setWeightInput] = useState<string>("75"); // in unit
//   const [targetWeight, setTargetWeight] = useState<string>("70"); // in unit
//   const [targetDate, setTargetDate] = useState<string>(toISO(new Date()));

//   const [activityLevel, setActivityLevel] = useState<
//     "sedentary" | "light" | "moderate" | "active" | "athlete"
//   >("moderate");
//   const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<string>("3");
//   const [stepsGoal, setStepsGoal] = useState<string>("8000");

//   // macro method
//   const [macroMethod, setMacroMethod] = useState<
//     "proteinPerKg" | "percent" | "cycling"
//   >("proteinPerKg");

//   // method: protein per kg
//   const [proteinPerKg, setProteinPerKg] = useState<string>("1.8");

//   // method: percent (base)
//   const [proteinPct, setProteinPct] = useState<number>(0.3);
//   const [carbPct, setCarbPct] = useState<number>(0.4);
//   const [fatPct, setFatPct] = useState<number>(0.3);

//   // method: cycling (we’ll vary carbs; protein fixed, fat = 1 - p - c)
//   const [trainCarbPct, setTrainCarbPct] = useState<number>(0.45);
//   const [restCarbPct, setRestCarbPct] = useState<number>(0.35);

//   // diet & cooking prefs
//   const [dietType, setDietType] = useState<
//     | "balanced"
//     | "mediterranean"
//     | "high-protein"
//     | "vegetarian"
//     | "vegan"
//     | "keto"
//   >("balanced");
//   const [allergies, setAllergies] = useState<string>("");
//   const [dislikes, setDislikes] = useState<string>("");
//   const [cookMins, setCookMins] = useState<string>("20");
//   const [cookSkill, setCookSkill] = useState<
//     "beginner" | "intermediate" | "advanced"
//   >("beginner");
//   const [budgetPerMeal, setBudgetPerMeal] = useState<string>("5");

//   // meals schedule
//   const DEFAULT_MEALS = [
//     { label: "breakfast", time: "08:00" },
//     { label: "lunch", time: "12:30" },
//     { label: "dinner", time: "19:00" },
//     { label: "snacks", time: "" },
//   ] as const;
//   type MealLabel = (typeof DEFAULT_MEALS)[number]["label"];
//   type Meal = { label: MealLabel; time?: string };

//   const [meals, setMeals] = useState<Meal[]>([...DEFAULT_MEALS]);

//   // equipment / place / injuries
//   const EQUIP = [
//     "none",
//     "bands",
//     "dumbbells",
//     "barbell",
//     "kettlebells",
//     "machines",
//     "cable",
//     "pullupbar",
//   ] as const;
//   const [equipment, setEquipment] = useState<string[]>([]);
//   const [workoutPlace, setWorkoutPlace] = useState<"home" | "gym">("home");
//   const [injuries, setInjuries] = useState<string>("");

//   /* ---------- themed styles ---------- */

//   const styles = useMemoHook(
//     () => ({
//       screen: { backgroundColor: colors.background },
//       input: {
//         flex: 1,
//         borderWidth: 1,
//         borderColor: colors.inputBorder,
//         borderRadius: 12,
//         paddingHorizontal: 12,
//         paddingVertical: 10,
//         backgroundColor: colors.inputBg,
//         color: colors.text,
//       },
//       button: {
//         backgroundColor: colors.buttonBg,
//         borderRadius: 12,
//         paddingVertical: 12,
//         paddingHorizontal: 16,
//       },
//       buttonText: { color: colors.buttonText, fontWeight: "700" as const },
//       ghost: {
//         borderWidth: 1,
//         borderColor: colors.border,
//         borderRadius: 12,
//         paddingVertical: 10,
//         paddingHorizontal: 12,
//         backgroundColor: "transparent",
//       },
//       chip: {
//         borderWidth: 1,
//         borderColor: colors.border,
//         borderRadius: 999,
//         paddingVertical: 6,
//         paddingHorizontal: 12,
//         backgroundColor: "transparent",
//       },
//       chipActive: {
//         backgroundColor: colors.chipActiveBg,
//         borderColor: colors.chipActiveBg,
//       },
//       chipText: { color: colors.text },
//       chipActiveText: { color: colors.chipActiveText },
//       muted: { color: colors.muted },
//       text: { color: colors.text },
//       cardTitle: {
//         fontWeight: "700" as const,
//         fontSize: 16,
//         color: colors.text,
//       },
//       sectionGap: { padding: 16, gap: 12 },
//       row: { flexDirection: "row" as const, gap: 8 },
//       wrap: {
//         flexDirection: "row" as const,
//         flexWrap: "wrap" as const,
//         gap: 8,
//       },
//       smallHint: { color: colors.muted, fontSize: 12 },
//     }),
//     [colors]
//   );

//   /* ---------- percentage auto-balance (percent method) ---------- */

//   function setSplit(
//     which: "proteinPct" | "carbPct" | "fatPct",
//     nextVal: number
//   ) {
//     const next = clamp01(nextVal);
//     const current = { proteinPct, carbPct, fatPct };
//     const others = Object.entries(current)
//       .filter(([k]) => k !== which)
//       .map(([key, val]) => ({ key, val: val as number }));
//     const sumOthers = others[0].val + others[1].val;
//     const targetOthers = 1 - next;

//     let n1: number, n2: number;
//     if (sumOthers <= 0) {
//       n1 = targetOthers / 2;
//       n2 = targetOthers / 2;
//     } else {
//       const scale = targetOthers / sumOthers;
//       n1 = others[0].val * scale;
//       n2 = others[1].val * scale;
//     }

//     if (which === "proteinPct") {
//       setProteinPct(next);
//       if (others[0].key === "carbPct") setCarbPct(n1);
//       else setFatPct(n1);
//       if (others[1].key === "fatPct") setFatPct(n2);
//       else setCarbPct(n2);
//     } else if (which === "carbPct") {
//       setCarbPct(next);
//       if (others[0].key === "proteinPct") setProteinPct(n1);
//       else setFatPct(n1);
//       if (others[1].key === "fatPct") setFatPct(n2);
//       else setProteinPct(n2);
//     } else {
//       setFatPct(next);
//       if (others[0].key === "proteinPct") setProteinPct(n1);
//       else setCarbPct(n1);
//       if (others[1].key === "carbPct") setCarbPct(n2);
//       else setProteinPct(n2);
//     }
//   }

//   /* ---------- hydrate ---------- */
//   useEffect(() => {
//     if (!user?.uid) return;
//     let unsub: undefined | (() => void);

//     (async () => {
//       await ensureProfile(user.uid, user.email ? { email: user.email } : {});
//       unsub = subscribeProfile(user.uid, (p) => {
//         setProfile(p);

//         const unit = p?.weightUnit === "lb" ? "lb" : "kg";

//         setSex((p?.sex as any) || "male");
//         setAge(String(p?.age ?? 25));
//         setHeightCm(String(p?.heightCm ?? 175));

//         setWeightUnit(unit);
//         const wkg = Number(p?.weightKg ?? 75);
//         const tkg = Number(p?.targetWeightKg ?? 70);
//         setWeightInput(
//           unit === "lb"
//             ? String(Math.round(kgToLb(wkg)))
//             : String(Math.round(wkg))
//         );
//         setTargetWeight(
//           unit === "lb"
//             ? String(Math.round(kgToLb(tkg)))
//             : String(Math.round(tkg))
//         );
//         setTargetDate(p?.targetDate || toISO(new Date()));

//         setActivityLevel((p?.activityLevel as any) || "moderate");
//         setTrainingDaysPerWeek(String((p as any)?.trainingDaysPerWeek ?? 3));
//         setStepsGoal(String((p as any)?.stepsGoal ?? 8000));

//         setMacroMethod((p?.macroMethod as any) || "proteinPerKg");
//         setProteinPerKg(String(p?.proteinPerKg ?? 1.8));
//         setProteinPct(p?.proteinPct ?? 0.3);
//         setCarbPct(p?.carbPct ?? 0.4);
//         setFatPct(p?.fatPct ?? 0.3);
//         setTrainCarbPct((p as any)?.cycling?.trainingCarbPct ?? 0.45);
//         setRestCarbPct((p as any)?.cycling?.restCarbPct ?? 0.35);

//         setDietType((p as any)?.diet?.type ?? "balanced");
//         setAllergies(joinComma((p as any)?.diet?.allergies));
//         setDislikes(joinComma((p as any)?.diet?.dislikes));
//         setCookMins(String((p as any)?.cooking?.minutes ?? 20));
//         setCookSkill(((p as any)?.cooking?.skill as any) || "beginner");
//         setBudgetPerMeal(String((p as any)?.cooking?.budgetPerMealUSD ?? 5));

//         // ---- normalize meals ----
//         const ALLOWED: readonly MealLabel[] = [
//           "breakfast",
//           "lunch",
//           "dinner",
//           "snacks",
//         ] as const;

//         const rawSched = Array.isArray((p as any)?.meals?.schedule)
//           ? (p as any).meals.schedule
//           : DEFAULT_MEALS;

//         const sched: Meal[] = rawSched.map((m: any) => {
//           const lbl: MealLabel = ALLOWED.includes(m?.label)
//             ? (m.label as MealLabel)
//             : "snacks";
//           return { label: lbl, time: (m?.time || "").trim() || undefined };
//         });

//         setMeals(sched);

//         setEquipment((p as any)?.equipment ?? []);
//         setWorkoutPlace((p as any)?.workoutPlace ?? "home");
//         setInjuries(((p as any)?.injuries || []).join(", "));
//       });
//     })();

//     return () => {
//       try {
//         unsub && unsub();
//       } catch {}
//     };
//   }, [user?.uid]);

//   /* ---------- derived ---------- */

//   const weightKg = useMemo(() => {
//     const w = Number(weightInput || 0);
//     return weightUnit === "lb" ? lbToKg(w) : w;
//   }, [weightInput, weightUnit]);
//   const targetWeightKg = useMemo(() => {
//     const w = Number(targetWeight || 0);
//     return weightUnit === "lb" ? lbToKg(w) : w;
//   }, [targetWeight, weightUnit]);

//   // preview(s)
//   const baseParams = useMemo(
//     () => ({
//       sex,
//       weightKg: Number(weightKg || 0),
//       heightCm: Number(heightCm || 0),
//       age: Number(age || 0),
//       activityLevel,
//       goal: (profile?.goal as any) || "maintain",
//     }),
//     [sex, weightKg, heightCm, age, activityLevel, profile?.goal]
//   );

//   const preview = useMemo(() => {
//     if (!baseParams.weightKg || !baseParams.heightCm || !baseParams.age)
//       return null;

//     if (macroMethod === "proteinPerKg") {
//       return computeTargets(baseParams, {
//         mode: "proteinPerKg",
//         proteinPerKg: Number(proteinPerKg || 0),
//       });
//     }

//     if (macroMethod === "percent") {
//       return computeTargets(baseParams, {
//         mode: "percent",
//         proteinPct,
//         carbPct,
//         fatPct,
//       });
//     }

//     // cycling: show two previews (training/rest)
//     const trainingFat = clamp01(1 - proteinPct - trainCarbPct);
//     const restFat = clamp01(1 - proteinPct - restCarbPct);
//     const training = computeTargets(baseParams, {
//       mode: "percent",
//       proteinPct,
//       carbPct: trainCarbPct,
//       fatPct: trainingFat,
//     });
//     const rest = computeTargets(baseParams, {
//       mode: "percent",
//       proteinPct,
//       carbPct: restCarbPct,
//       fatPct: restFat,
//     });
//     return { training, rest };
//   }, [
//     baseParams,
//     macroMethod,
//     proteinPerKg,
//     proteinPct,
//     carbPct,
//     fatPct,
//     trainCarbPct,
//     restCarbPct,
//   ]);

//   /* ---------- UI bits ---------- */

//   const Chip = ({
//     active,
//     onPress,
//     children,
//   }: {
//     active: boolean;
//     onPress: () => void;
//     children: React.ReactNode;
//   }) => (
//     <Pressable
//       onPress={onPress}
//       style={[styles.chip, active && styles.chipActive]}
//     >
//       <Text style={active ? styles.chipActiveText : styles.chipText}>
//         {children}
//       </Text>
//     </Pressable>
//   );

//   const Field = (props: any) => (
//     <TextInput
//       {...props}
//       placeholderTextColor={colors.placeholder}
//       style={[styles.input, props.style]}
//     />
//   );

//   /* ---------- render ---------- */

//   if (!profile) {
//     return (
//       <ScrollView
//         style={{ flex: 1, backgroundColor: colors.background }}
//         contentContainerStyle={{ padding: 16, gap: 16 }}
//       >
//         <Card style={{ padding: 16 }}>
//           <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text }}>
//             Profile
//           </Text>
//           <Text style={[styles.muted, { marginTop: 6 }]}>Loading…</Text>
//         </Card>
//       </ScrollView>
//     );
//   }

//   return (
//     <ScrollView
//       style={styles.screen}
//       contentContainerStyle={{ padding: 16, gap: 16 }}
//     >
//       {/* Header */}
//       <View
//         style={{
//           flexDirection: "row",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         <Text style={{ fontSize: 28, fontWeight: "700", color: colors.text }}>
//           Profile & Personalization
//         </Text>
//         <View style={{ alignItems: "flex-end", gap: 6 }}>
//           <ThemeToggle />
//           <Text style={styles.muted}>{user?.email}</Text>
//         </View>
//       </View>

//       {/* Basics */}
//       <Card style={styles.sectionGap}>
//         <Text style={styles.cardTitle}>Basics</Text>

//         <View style={styles.wrap}>
//           <Chip active={sex === "male"} onPress={() => setSex("male")}>
//             Male
//           </Chip>
//           <Chip active={sex === "female"} onPress={() => setSex("female")}>
//             Female
//           </Chip>
//         </View>

//         <View style={styles.row}>
//           <Field
//             value={age}
//             onChangeText={setAge}
//             placeholder="Age (years)"
//             inputMode="numeric"
//           />
//           <Field
//             value={heightCm}
//             onChangeText={setHeightCm}
//             placeholder="Height (cm)"
//             inputMode="numeric"
//           />
//         </View>

//         <View style={[styles.row, { alignItems: "center" }]}>
//           <Field
//             value={weightInput}
//             onChangeText={setWeightInput}
//             placeholder={`Weight (${weightUnit})`}
//             inputMode="decimal"
//             style={{ flex: 1 }}
//           />
//           <Pressable
//             style={styles.ghost}
//             onPress={() => {
//               if (weightUnit === "kg") {
//                 setWeightInput(
//                   String(Math.round(kgToLb(Number(weightInput || 0))))
//                 );
//                 setWeightUnit("lb");
//               } else {
//                 setWeightInput(
//                   String(Math.round(lbToKg(Number(weightInput || 0))))
//                 );
//                 setWeightUnit("kg");
//               }
//             }}
//           >
//             <Text style={styles.text}>{weightUnit.toUpperCase()}</Text>
//           </Pressable>
//         </View>
//       </Card>

//       {/* Goals & Activity */}
//       <Card style={styles.sectionGap}>
//         <Text style={styles.cardTitle}>Goals & Activity</Text>

//         <View style={styles.row}>
//           <Field
//             value={targetWeight}
//             onChangeText={setTargetWeight}
//             placeholder={`Target weight (${weightUnit})`}
//             inputMode="decimal"
//           />
//           <Field
//             value={targetDate}
//             onChangeText={setTargetDate}
//             placeholder="Target date (YYYY-MM-DD)"
//           />
//         </View>

//         <View style={styles.wrap}>
//           {(
//             ["sedentary", "light", "moderate", "active", "athlete"] as const
//           ).map((lvl) => (
//             <Chip
//               key={lvl}
//               active={activityLevel === lvl}
//               onPress={() => setActivityLevel(lvl)}
//             >
//               {lvl[0].toUpperCase() + lvl.slice(1)}
//             </Chip>
//           ))}
//         </View>

//         <View style={styles.row}>
//           <Field
//             value={trainingDaysPerWeek}
//             onChangeText={setTrainingDaysPerWeek}
//             inputMode="numeric"
//             placeholder="Training days / week"
//           />
//           <Field
//             value={stepsGoal}
//             onChangeText={setStepsGoal}
//             inputMode="numeric"
//             placeholder="Steps goal / day"
//           />
//         </View>
//       </Card>

//       {/* Macros */}
//       <Card style={styles.sectionGap}>
//         <View
//           style={{
//             flexDirection: "row",
//             justifyContent: "space-between",
//             alignItems: "center",
//           }}
//         >
//           <Text style={styles.cardTitle}>Macros</Text>
//           <View style={styles.wrap}>
//             <Chip
//               active={macroMethod === "proteinPerKg"}
//               onPress={() => setMacroMethod("proteinPerKg")}
//             >
//               g/kg
//             </Chip>
//             <Chip
//               active={macroMethod === "percent"}
//               onPress={() => setMacroMethod("percent")}
//             >
//               %
//             </Chip>
//             <Chip
//               active={macroMethod === "cycling"}
//               onPress={() => setMacroMethod("cycling")}
//             >
//               Cycling
//             </Chip>
//           </View>
//         </View>

//         {macroMethod === "proteinPerKg" && (
//           <View style={styles.row}>
//             <Field
//               value={proteinPerKg}
//               onChangeText={setProteinPerKg}
//               placeholder="Protein (g/kg)"
//               inputMode="decimal"
//             />
//           </View>
//         )}

//         {macroMethod === "percent" && (
//           <View style={{ gap: 8 }}>
//             <PctField
//               label="Protein %"
//               value={proteinPct}
//               onChange={(v) => setSplit("proteinPct", v)}
//             />
//             <PctField
//               label="Carbs %"
//               value={carbPct}
//               onChange={(v) => setSplit("carbPct", v)}
//             />
//             <PctField
//               label="Fat %"
//               value={fatPct}
//               onChange={(v) => setSplit("fatPct", v)}
//             />
//             <Text style={styles.smallHint}>Values auto-balance to 100%.</Text>
//           </View>
//         )}

//         {macroMethod === "cycling" && (
//           <View style={{ gap: 10 }}>
//             <Text style={styles.smallHint}>
//               Protein stays fixed. Carbs vary by day; Fat adjusts automatically.
//             </Text>
//             <PctField
//               label="Protein % (both days)"
//               value={proteinPct}
//               onChange={(v) => setProteinPct(clamp01(v))}
//             />
//             <PctField
//               label="Training day Carbs %"
//               value={trainCarbPct}
//               onChange={(v) => setTrainCarbPct(clamp01(v))}
//             />
//             <PctField
//               label="Rest day Carbs %"
//               value={restCarbPct}
//               onChange={(v) => setRestCarbPct(clamp01(v))}
//             />
//           </View>
//         )}

//         {/* Live preview */}
//         {preview && (
//           <>
//             {macroMethod !== "cycling" ? (
//               <View style={styles.wrap}>
//                 <SummaryCard
//                   label="Calories"
//                   value={(preview as any).calorieGoal}
//                 />
//                 <SummaryCard
//                   label="Protein (g)"
//                   value={(preview as any).proteinGoal}
//                 />
//                 <SummaryCard
//                   label="Carbs (g)"
//                   value={(preview as any).carbGoal}
//                 />
//                 <SummaryCard label="Fat (g)" value={(preview as any).fatGoal} />
//               </View>
//             ) : (
//               <>
//                 <Text style={[styles.muted, { marginTop: 4 }]}>
//                   Training day
//                 </Text>
//                 <View style={styles.wrap}>
//                   <SummaryCard
//                     label="Calories"
//                     value={(preview as any).training.calorieGoal}
//                   />
//                   <SummaryCard
//                     label="Protein (g)"
//                     value={(preview as any).training.proteinGoal}
//                   />
//                   <SummaryCard
//                     label="Carbs (g)"
//                     value={(preview as any).training.carbGoal}
//                   />
//                   <SummaryCard
//                     label="Fat (g)"
//                     value={(preview as any).training.fatGoal}
//                   />
//                 </View>
//                 <Text style={[styles.muted, { marginTop: 4 }]}>Rest day</Text>
//                 <View style={styles.wrap}>
//                   <SummaryCard
//                     label="Calories"
//                     value={(preview as any).rest.calorieGoal}
//                   />
//                   <SummaryCard
//                     label="Protein (g)"
//                     value={(preview as any).rest.proteinGoal}
//                   />
//                   <SummaryCard
//                     label="Carbs (g)"
//                     value={(preview as any).rest.carbGoal}
//                   />
//                   <SummaryCard
//                     label="Fat (g)"
//                     value={(preview as any).rest.fatGoal}
//                   />
//                 </View>
//               </>
//             )}
//           </>
//         )}
//       </Card>

//       {/* Diet & Cooking */}
//       <Card style={styles.sectionGap}>
//         <Text style={styles.cardTitle}>Diet & Cooking</Text>

//         <View style={styles.wrap}>
//           {(
//             [
//               "balanced",
//               "mediterranean",
//               "high-protein",
//               "vegetarian",
//               "vegan",
//               "keto",
//             ] as const
//           ).map((v) => (
//             <Chip
//               key={v}
//               active={dietType === v}
//               onPress={() => setDietType(v)}
//             >
//               {v.replace("-", " ")}
//             </Chip>
//           ))}
//         </View>

//         <Field
//           value={allergies}
//           onChangeText={setAllergies}
//           placeholder="Allergies/intolerances (comma separated)"
//         />
//         <Field
//           value={dislikes}
//           onChangeText={setDislikes}
//           placeholder="Dislikes (comma separated)"
//         />

//         <View style={styles.row}>
//           <Field
//             value={cookMins}
//             onChangeText={setCookMins}
//             placeholder="Cooking time (min)"
//             inputMode="numeric"
//           />
//           <Field
//             value={budgetPerMeal}
//             onChangeText={setBudgetPerMeal}
//             placeholder="Budget per meal (USD)"
//             inputMode="decimal"
//           />
//         </View>

//         <View style={styles.wrap}>
//           {(["beginner", "intermediate", "advanced"] as const).map((s) => (
//             <Chip
//               key={s}
//               active={cookSkill === s}
//               onPress={() => setCookSkill(s)}
//             >
//               {s}
//             </Chip>
//           ))}
//         </View>
//       </Card>

//       {/* Meal schedule */}
//       <Card style={styles.sectionGap}>
//         <Text style={styles.cardTitle}>Meal Schedule</Text>
//         <View style={{ gap: 8 }}>
//           {meals.map((m, idx) => (
//             <View key={m.label} style={styles.row}>
//               <View
//                 style={{
//                   flex: 1,
//                   borderWidth: 1,
//                   borderColor: colors.border,
//                   borderRadius: 12,
//                   paddingHorizontal: 12,
//                   paddingVertical: 10,
//                   backgroundColor: colors.card,
//                 }}
//               >
//                 <Text
//                   style={{ color: colors.text, textTransform: "capitalize" }}
//                 >
//                   {m.label}
//                 </Text>
//               </View>
//               <Field
//                 value={m.time || ""}
//                 onChangeText={(t: string) => {
//                   const arr = meals.slice();
//                   arr[idx] = { ...arr[idx], time: t };
//                   setMeals(arr);
//                 }}
//                 placeholder="HH:MM (optional)"
//               />
//             </View>
//           ))}
//         </View>
//         <Text style={styles.smallHint}>
//           Used for smart reminders & default meal sections.
//         </Text>
//       </Card>

//       {/* Equipment & Constraints */}
//       <Card style={styles.sectionGap}>
//         <Text style={styles.cardTitle}>Equipment & Constraints</Text>

//         <View style={styles.wrap}>
//           {EQUIP.map((e) => {
//             const active = equipment.includes(e);
//             return (
//               <Chip
//                 key={e}
//                 active={active}
//                 onPress={() =>
//                   setEquipment((prev) =>
//                     active ? prev.filter((x) => x !== e) : [...prev, e]
//                   )
//                 }
//               >
//                 {e}
//               </Chip>
//             );
//           })}
//         </View>

//         <View style={styles.wrap}>
//           {(["home", "gym"] as const).map((p) => (
//             <Chip
//               key={p}
//               active={workoutPlace === p}
//               onPress={() => setWorkoutPlace(p)}
//             >
//               {p}
//             </Chip>
//           ))}
//         </View>

//         <Field
//           value={injuries}
//           onChangeText={setInjuries}
//           placeholder="Injuries / movements to avoid (comma separated, optional)"
//         />
//         <Text style={styles.smallHint}>
//           Used to tailor exercise selection and substitutions.
//         </Text>
//       </Card>

//       {/* Save */}
//       <Card style={{ padding: 12, alignItems: "flex-end" }}>
//         <Pressable
//           style={styles.button}
//           onPress={async () => {
//             if (!user?.uid) return;
//             // compute fat% for cycling snapshots (for storage)
//             const trainingFat = clamp01(1 - proteinPct - trainCarbPct);
//             const restFat = clamp01(1 - proteinPct - restCarbPct);

//             const patch: Partial<Profile> & Record<string, any> = {
//               email: user.email || undefined,
//               sex,
//               age: Number(age || 0),
//               heightCm: Number(heightCm || 0),
//               weightUnit,
//               weightKg: Number(weightKg || 0),
//               targetWeightKg: Number(targetWeightKg || 0),
//               targetDate: targetDate || undefined,

//               activityLevel,
//               trainingDaysPerWeek: Number(trainingDaysPerWeek || 0),
//               stepsGoal: Number(stepsGoal || 0),

//               macroMethod,
//               proteinPerKg: Number(proteinPerKg || 0),
//               proteinPct,
//               carbPct,
//               fatPct,
//               cycling: {
//                 trainingCarbPct: trainCarbPct,
//                 restCarbPct: restCarbPct,
//                 trainingFatPct: trainingFat,
//                 restFatPct: restFat,
//               },

//               diet: {
//                 type: dietType,
//                 allergies: commaSplit(allergies),
//                 dislikes: commaSplit(dislikes),
//               },
//               meals: {
//                 schedule: meals.map((m) => ({
//                   label: m.label,
//                   time: (m.time || "").trim() || undefined,
//                 })),
//               },
//               cooking: {
//                 minutes: Number(cookMins || 0),
//                 skill: cookSkill,
//                 budgetPerMealUSD: Number(budgetPerMeal || 0),
//               },

//               equipment,
//               workoutPlace,
//               injuries: commaSplit(injuries),

//               updatedAt: Date.now(),
//             };

//             // also compute + store daily targets to keep Home in sync
//             let targets: null | {
//               calorieGoal: number;
//               proteinGoal: number;
//               carbGoal: number;
//               fatGoal: number;
//             } = null;

//             if (macroMethod === "proteinPerKg") {
//               targets = computeTargets(
//                 {
//                   sex,
//                   weightKg: Number(weightKg || 0),
//                   heightCm: Number(heightCm || 0),
//                   age: Number(age || 0),
//                   activityLevel,
//                   goal: (profile?.goal as any) || "maintain",
//                 },
//                 {
//                   mode: "proteinPerKg",
//                   proteinPerKg: Number(proteinPerKg || 0),
//                 }
//               );
//             } else if (macroMethod === "percent") {
//               targets = computeTargets(
//                 {
//                   sex,
//                   weightKg: Number(weightKg || 0),
//                   heightCm: Number(heightCm || 0),
//                   age: Number(age || 0),
//                   activityLevel,
//                   goal: (profile?.goal as any) || "maintain",
//                 },
//                 { mode: "percent", proteinPct, carbPct, fatPct }
//               );
//             } else {
//               // pick training day as the default daily target for Home
//               const tFat = clamp01(1 - proteinPct - trainCarbPct);
//               targets = computeTargets(
//                 {
//                   sex,
//                   weightKg: Number(weightKg || 0),
//                   heightCm: Number(heightCm || 0),
//                   age: Number(age || 0),
//                   activityLevel,
//                   goal: (profile?.goal as any) || "maintain",
//                 },
//                 {
//                   mode: "percent",
//                   proteinPct,
//                   carbPct: trainCarbPct,
//                   fatPct: tFat,
//                 }
//               );
//             }

//             if (targets) {
//               patch.calorieGoal = targets.calorieGoal;
//               patch.proteinGoal = targets.proteinGoal;
//               patch.carbGoal = targets.carbGoal;
//               patch.fatGoal = targets.fatGoal;
//               patch.dailyCaloriesTarget = targets.calorieGoal;
//               patch.dailyProteinTarget = targets.proteinGoal;
//             }

//             await updateProfile(user.uid, patch);
//           }}
//         >
//           <Text style={styles.buttonText}>Save</Text>
//         </Pressable>
//       </Card>
//     </ScrollView>
//   );
// }

// /* ---------- small components ---------- */

// function PctField({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: number;
//   onChange: (v: number) => void;
// }) {
//   const { colors } = useTheme();
//   const pct = Math.round((Number(value) || 0) * 100);
//   return (
//     <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
//       <Text style={{ width: 140, color: colors.muted }}>{label}</Text>
//       <TextInput
//         value={String(pct)}
//         onChangeText={(txt) => onChange(pctToNum(txt))}
//         inputMode="numeric"
//         placeholderTextColor={colors.placeholder}
//         style={{
//           flex: 0,
//           width: 90,
//           borderWidth: 1,
//           borderColor: colors.inputBorder,
//           borderRadius: 12,
//           paddingHorizontal: 12,
//           paddingVertical: 10,
//           backgroundColor: colors.inputBg,
//           color: colors.text,
//         }}
//       />
//       <Text style={{ color: colors.muted }}>%</Text>
//     </View>
//   );
// }

// function SummaryCard({ label, value }: { label: string; value: number }) {
//   const { colors } = useTheme();
//   return (
//     <View
//       style={{
//         borderWidth: 1,
//         borderColor: colors.border,
//         backgroundColor: colors.card,
//         borderRadius: 16,
//         padding: 12,
//         minWidth: 130,
//       }}
//     >
//       <Text
//         style={{
//           color: colors.muted,
//           fontSize: 12,
//           textTransform: "uppercase",
//         }}
//       >
//         {label}
//       </Text>
//       <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
//         {Math.round(Number(value || 0))}
//       </Text>
//     </View>
//   );
// }
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useMemo as useMemoHook,
} from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  Easing,
  Platform,
} from "react-native";
import Card from "../../components/Card";
import { useAuth } from "@/content/AuthContext";
import {
  ensureProfile,
  subscribeProfile,
  updateProfile,
  type Profile,
} from "@/services/profile";
import { computeTargets } from "@/utils/macros";
import { kgToLb, lbToKg } from "@/utils/units";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/content/ThemeProvider";

/* ---------- helpers ---------- */

const clamp01 = (x: number) => Math.max(0, Math.min(1, Number(x) || 0));
const pctToNum = (v: number | string) => clamp01((Number(v) || 0) / 100);

function toISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function commaSplit(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function joinComma(arr?: string[]) {
  return (arr || []).join(", ");
}

const isIOS = Platform.OS === "ios";

function pruneUndefinedDeep<T>(val: T): T {
  if (Array.isArray(val)) {
    // Clean each element, and ensure no `undefined` props inside objects
    return val.map((v) => pruneUndefinedDeep(v)) as unknown as T;
  }
  if (val && typeof val === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(val as any)) {
      if (v === undefined) continue; // drop undefined keys
      const cleaned = pruneUndefinedDeep(v);
      if (cleaned !== undefined) out[k] = cleaned; // keep only defined
    }
    return out;
  }
  return val;
}
/* ---------- screen ---------- */

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  // local editable state (seeded from profile in hydrate)
  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState<string>("25");
  const [heightCm, setHeightCm] = useState<string>("175");

  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [weightInput, setWeightInput] = useState<string>("75"); // in unit
  const [targetWeight, setTargetWeight] = useState<string>("70"); // in unit
  const [targetDate, setTargetDate] = useState<string>(toISO(new Date()));

  const [activityLevel, setActivityLevel] = useState<
    "sedentary" | "light" | "moderate" | "active" | "athlete"
  >("moderate");
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<string>("3");
  const [stepsGoal, setStepsGoal] = useState<string>("8000");

  // macro method
  const [macroMethod, setMacroMethod] = useState<
    "proteinPerKg" | "percent" | "cycling"
  >("proteinPerKg");

  // method: protein per kg
  const [proteinPerKg, setProteinPerKg] = useState<string>("1.8");

  // method: percent (base)
  const [proteinPct, setProteinPct] = useState<number>(0.3);
  const [carbPct, setCarbPct] = useState<number>(0.4);
  const [fatPct, setFatPct] = useState<number>(0.3);

  // method: cycling (we’ll vary carbs; protein fixed, fat = 1 - p - c)
  const [trainCarbPct, setTrainCarbPct] = useState<number>(0.45);
  const [restCarbPct, setRestCarbPct] = useState<number>(0.35);

  // diet & cooking prefs
  const [dietType, setDietType] = useState<
    | "balanced"
    | "mediterranean"
    | "high-protein"
    | "vegetarian"
    | "vegan"
    | "keto"
  >("balanced");
  const [allergies, setAllergies] = useState<string>("");
  const [dislikes, setDislikes] = useState<string>("");
  const [cookMins, setCookMins] = useState<string>("20");
  const [cookSkill, setCookSkill] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [budgetPerMeal, setBudgetPerMeal] = useState<string>("5");

  // meals schedule
  const DEFAULT_MEALS = [
    { label: "breakfast", time: "08:00" },
    { label: "lunch", time: "12:30" },
    { label: "dinner", time: "19:00" },
    { label: "snacks", time: "" },
  ] as const;
  type MealLabel = (typeof DEFAULT_MEALS)[number]["label"];
  type Meal = { label: MealLabel; time?: string };

  const [meals, setMeals] = useState<Meal[]>([...DEFAULT_MEALS]);

  // equipment / place / injuries
  const EQUIP = [
    "none",
    "bands",
    "dumbbells",
    "barbell",
    "kettlebells",
    "machines",
    "cable",
    "pullupbar",
  ] as const;
  const [equipment, setEquipment] = useState<string[]>([]);
  const [workoutPlace, setWorkoutPlace] = useState<"home" | "gym">("home");
  const [injuries, setInjuries] = useState<string>("");

  /* ---------- animation ---------- */
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  /* ---------- themed styles ---------- */

  const styles = useMemoHook(
    () => ({
      screen: { flex: 1, backgroundColor: colors.background },
      content: { padding: 16, paddingBottom: 110, gap: 16 },
      card: {
        padding: 16,
        borderRadius: 18,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        ...(isIOS
          ? {
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
            }
          : { elevation: 2 }),
      },
      sectionHeader: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        marginBottom: 8,
      },
      titleLg: {
        fontSize: 28,
        fontWeight: "800" as const,
        letterSpacing: -0.2,
        color: colors.text,
      },
      subtitle: { color: colors.muted, fontSize: 13 },
      inputWrap: { gap: 6, flex: 1 },
      label: { color: colors.muted, fontSize: 12, letterSpacing: 0.3 },
      input: {
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.inputBg,
        color: colors.text,
      },
      inputFocused: {
        borderColor: colors.chipActiveBg,
      },
      ghost: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: "transparent",
      },
      chip: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: "transparent",
      },
      chipActive: {
        backgroundColor: colors.chipActiveBg,
        borderColor: colors.chipActiveBg,
      },
      chipText: { color: colors.text, fontWeight: "600" as const },
      chipActiveText: {
        color: colors.chipActiveText,
        fontWeight: "700" as const,
      },
      muted: { color: colors.muted },
      text: { color: colors.text },
      cardTitle: {
        fontWeight: "800" as const,
        fontSize: 16,
        color: colors.text,
      },
      sectionGap: { gap: 14 },
      row: { flexDirection: "row" as const, gap: 10 },
      wrap: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 10,
      },
      smallHint: { color: colors.muted, fontSize: 12 },
      summaryCard: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 12,
        minWidth: 130,
      },
      stickySaveBar: {
        position: "absolute" as const,
        left: 0,
        right: 0,
        bottom: 0,
        padding: 14,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      button: {
        backgroundColor: colors.buttonBg,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 18,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      buttonText: {
        color: colors.buttonText,
        fontWeight: "800" as const,
        letterSpacing: 0.3,
      },
      skeleton: {
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.inputBg,
        opacity: 0.6,
      },
    }),
    [colors]
  );

  /* ---------- percentage auto-balance (percent method) ---------- */

  function setSplit(
    which: "proteinPct" | "carbPct" | "fatPct",
    nextVal: number
  ) {
    const next = clamp01(nextVal);
    const current = { proteinPct, carbPct, fatPct };
    const others = Object.entries(current)
      .filter(([k]) => k !== which)
      .map(([key, val]) => ({ key, val: val as number }));
    const sumOthers = others[0].val + others[1].val;
    const targetOthers = 1 - next;

    let n1: number, n2: number;
    if (sumOthers <= 0) {
      n1 = targetOthers / 2;
      n2 = targetOthers / 2;
    } else {
      const scale = targetOthers / sumOthers;
      n1 = others[0].val * scale;
      n2 = others[1].val * scale;
    }

    if (which === "proteinPct") {
      setProteinPct(next);
      if (others[0].key === "carbPct") setCarbPct(n1);
      else setFatPct(n1);
      if (others[1].key === "fatPct") setFatPct(n2);
      else setCarbPct(n2);
    } else if (which === "carbPct") {
      setCarbPct(next);
      if (others[0].key === "proteinPct") setProteinPct(n1);
      else setFatPct(n1);
      if (others[1].key === "fatPct") setFatPct(n2);
      else setProteinPct(n2);
    } else {
      setFatPct(next);
      if (others[0].key === "proteinPct") setProteinPct(n1);
      else setCarbPct(n1);
      if (others[1].key === "carbPct") setCarbPct(n2);
      else setProteinPct(n2);
    }
  }

  /* ---------- hydrate ---------- */
  useEffect(() => {
    if (!user?.uid) return;
    let unsub: undefined | (() => void);

    (async () => {
      await ensureProfile(user.uid, user.email ? { email: user.email } : {});
      unsub = subscribeProfile(user.uid, (p) => {
        setProfile(p);

        const unit = p?.weightUnit === "lb" ? "lb" : "kg";

        setSex((p?.sex as any) || "male");
        setAge(String(p?.age ?? 25));
        setHeightCm(String(p?.heightCm ?? 175));

        setWeightUnit(unit);
        const wkg = Number(p?.weightKg ?? 75);
        const tkg = Number(p?.targetWeightKg ?? 70);
        setWeightInput(
          unit === "lb"
            ? String(Math.round(kgToLb(wkg)))
            : String(Math.round(wkg))
        );
        setTargetWeight(
          unit === "lb"
            ? String(Math.round(kgToLb(tkg)))
            : String(Math.round(tkg))
        );
        setTargetDate(p?.targetDate || toISO(new Date()));

        setActivityLevel((p?.activityLevel as any) || "moderate");
        setTrainingDaysPerWeek(String((p as any)?.trainingDaysPerWeek ?? 3));
        setStepsGoal(String((p as any)?.stepsGoal ?? 8000));

        setMacroMethod((p?.macroMethod as any) || "proteinPerKg");
        setProteinPerKg(String(p?.proteinPerKg ?? 1.8));
        setProteinPct(p?.proteinPct ?? 0.3);
        setCarbPct(p?.carbPct ?? 0.4);
        setFatPct(p?.fatPct ?? 0.3);
        setTrainCarbPct((p as any)?.cycling?.trainingCarbPct ?? 0.45);
        setRestCarbPct((p as any)?.cycling?.restCarbPct ?? 0.35);

        setDietType((p as any)?.diet?.type ?? "balanced");
        setAllergies(joinComma((p as any)?.diet?.allergies));
        setDislikes(joinComma((p as any)?.diet?.dislikes));
        setCookMins(String((p as any)?.cooking?.minutes ?? 20));
        setCookSkill(((p as any)?.cooking?.skill as any) || "beginner");
        setBudgetPerMeal(String((p as any)?.cooking?.budgetPerMealUSD ?? 5));

        // ---- normalize meals ----
        const ALLOWED: readonly MealLabel[] = [
          "breakfast",
          "lunch",
          "dinner",
          "snacks",
        ] as const;

        const rawSched = Array.isArray((p as any)?.meals?.schedule)
          ? (p as any).meals.schedule
          : DEFAULT_MEALS;

        const sched: Meal[] = rawSched.map((m: any) => {
          const lbl: MealLabel = ALLOWED.includes(m?.label)
            ? (m.label as MealLabel)
            : "snacks";
          return { label: lbl, time: (m?.time || "").trim() || undefined };
        });

        setMeals(sched);

        setEquipment((p as any)?.equipment ?? []);
        setWorkoutPlace((p as any)?.workoutPlace ?? "home");
        setInjuries(((p as any)?.injuries || []).join(", "));
      });
    })();

    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, [user?.uid]);

  /* ---------- derived ---------- */

  const weightKg = useMemo(() => {
    const w = Number(weightInput || 0);
    return weightUnit === "lb" ? lbToKg(w) : w;
  }, [weightInput, weightUnit]);
  const targetWeightKg = useMemo(() => {
    const w = Number(targetWeight || 0);
    return weightUnit === "lb" ? lbToKg(w) : w;
  }, [targetWeight, weightUnit]);

  // preview(s)
  const baseParams = useMemo(
    () => ({
      sex,
      weightKg: Number(weightKg || 0),
      heightCm: Number(heightCm || 0),
      age: Number(age || 0),
      activityLevel,
      goal: (profile?.goal as any) || "maintain",
    }),
    [sex, weightKg, heightCm, age, activityLevel, profile?.goal]
  );

  const preview = useMemo(() => {
    if (!baseParams.weightKg || !baseParams.heightCm || !baseParams.age)
      return null;

    if (macroMethod === "proteinPerKg") {
      return computeTargets(baseParams, {
        mode: "proteinPerKg",
        proteinPerKg: Number(proteinPerKg || 0),
      });
    }

    if (macroMethod === "percent") {
      return computeTargets(baseParams, {
        mode: "percent",
        proteinPct,
        carbPct,
        fatPct,
      });
    }

    // cycling: show two previews (training/rest)
    const trainingFat = clamp01(1 - proteinPct - trainCarbPct);
    const restFat = clamp01(1 - proteinPct - restCarbPct);
    const training = computeTargets(baseParams, {
      mode: "percent",
      proteinPct,
      carbPct: trainCarbPct,
      fatPct: trainingFat,
    });
    const rest = computeTargets(baseParams, {
      mode: "percent",
      proteinPct,
      carbPct: restCarbPct,
      fatPct: restFat,
    });
    return { training, rest };
  }, [
    baseParams,
    macroMethod,
    proteinPerKg,
    proteinPct,
    carbPct,
    fatPct,
    trainCarbPct,
    restCarbPct,
  ]);

  /* ---------- UI bits ---------- */

  const Pill = ({
    active,
    onPress,
    children,
  }: {
    active: boolean;
    onPress: () => void;
    children: React.ReactNode;
  }) => {
    const scale = useRef(new Animated.Value(1)).current;
    return (
      <Pressable
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
        }
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <Animated.View
          style={[
            styles.chip,
            active && styles.chipActive,
            { transform: [{ scale }] },
          ]}
        >
          <Text style={active ? styles.chipActiveText : styles.chipText}>
            {children}
          </Text>
        </Animated.View>
      </Pressable>
    );
  };

  const Segmented = ({
    value,
    options,
    setValue,
  }: {
    value: string;
    options: string[];
    setValue: (v: any) => void;
  }) => (
    <View
      style={{
        flexDirection: "row" as const,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        padding: 4,
        backgroundColor: colors.card,
      }}
    >
      {options.map((o) => {
        const active = value === o;
        return (
          <Pressable
            key={o}
            onPress={() => setValue(o)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: active ? colors.chipActiveBg : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.chipActiveText : colors.text,
                fontWeight: active ? "700" : "600",
                textTransform: "capitalize",
              }}
            >
              {o.replace("-", " ")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const Field = ({
    label,
    style,
    ...props
  }: { label?: string; style?: any } & React.ComponentProps<
    typeof TextInput
  >) => {
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.inputWrap}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          {...props}
          placeholderTextColor={colors.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, focused && styles.inputFocused, style]}
        />
      </View>
    );
  };

  /* ---------- render ---------- */

  if (!profile) {
    // Sleek skeleton state
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <Animated.View style={{ opacity: fadeIn }}>
          <View style={[styles.card, { gap: 12 }]}>
            <View style={[styles.skeleton, { width: 160, height: 22 }]} />
            <View style={[styles.skeleton, { width: 120 }]} />
          </View>
          <View style={{ height: 12 }} />
          {[...Array(4)].map((_, i) => (
            <View key={i} style={[styles.card, { gap: 10 }]}>
              <View style={[styles.skeleton, { width: 110 }]} />
              <View style={[styles.skeleton, { width: "100%", height: 44 }]} />
              <View style={[styles.skeleton, { width: "70%", height: 44 }]} />
            </View>
          ))}
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Animated.View style={{ flex: 1, opacity: fadeIn }}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={[styles.sectionHeader]}>
            <View>
              <Text style={styles.titleLg}>Profile</Text>
              <Text style={styles.subtitle}>Personalization & goals</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <ThemeToggle />
              <Text style={styles.muted}>{user?.email}</Text>
            </View>
          </View>

          {/* Basics */}
          <Card style={[styles.card]}>
            <View style={[styles.sectionHeader]}>
              <Text style={styles.cardTitle}>Basics</Text>
              <Segmented
                value={sex}
                options={["male", "female"]}
                setValue={(v) => setSex(v)}
              />
            </View>

            <View style={styles.row}>
              <Field
                label="Age"
                value={age}
                onChangeText={setAge}
                placeholder="years"
                inputMode="numeric"
              />
              <Field
                label="Height"
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="cm"
                inputMode="numeric"
              />
            </View>

            <View style={[styles.row, { alignItems: "flex-end" }]}>
              <Field
                label="Weight"
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder={weightUnit}
                inputMode="decimal"
                style={{ flex: 1 }}
              />
              <Pressable
                style={styles.ghost}
                onPress={() => {
                  if (weightUnit === "kg") {
                    setWeightInput(
                      String(Math.round(kgToLb(Number(weightInput || 0))))
                    );
                    setWeightUnit("lb");
                  } else {
                    setWeightInput(
                      String(Math.round(lbToKg(Number(weightInput || 0))))
                    );
                    setWeightUnit("kg");
                  }
                }}
              >
                <Text style={styles.text}>{weightUnit.toUpperCase()}</Text>
              </Pressable>
            </View>
          </Card>

          {/* Goals & Activity */}
          <Card style={[styles.card]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Goals & Activity</Text>
            </View>

            <View style={styles.row}>
              <Field
                label="Target weight"
                value={targetWeight}
                onChangeText={setTargetWeight}
                placeholder={weightUnit}
                inputMode="decimal"
              />
              <Field
                label="Target date"
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={[styles.sectionGap, { marginTop: 6 }]}>
              <Text style={styles.label}>Activity level</Text>
              <View style={styles.wrap}>
                {(
                  [
                    "sedentary",
                    "light",
                    "moderate",
                    "active",
                    "athlete",
                  ] as const
                ).map((lvl) => (
                  <Pill
                    key={lvl}
                    active={activityLevel === lvl}
                    onPress={() => setActivityLevel(lvl)}
                  >
                    {lvl[0].toUpperCase() + lvl.slice(1)}
                  </Pill>
                ))}
              </View>
            </View>

            <View style={{ height: 10 }} />
            <View style={styles.row}>
              <Field
                label="Training days / week"
                value={trainingDaysPerWeek}
                onChangeText={setTrainingDaysPerWeek}
                inputMode="numeric"
                placeholder="e.g., 4"
              />
              <Field
                label="Steps goal / day"
                value={stepsGoal}
                onChangeText={setStepsGoal}
                inputMode="numeric"
                placeholder="e.g., 8000"
              />
            </View>
          </Card>

          {/* Macros */}
          <Card style={[styles.card]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Macros</Text>
              <Segmented
                value={macroMethod}
                options={["proteinPerKg", "percent", "cycling"]}
                setValue={(v) => setMacroMethod(v)}
              />
            </View>

            {macroMethod === "proteinPerKg" && (
              <View style={styles.row}>
                <Field
                  label="Protein (g/kg)"
                  value={proteinPerKg}
                  onChangeText={setProteinPerKg}
                  placeholder="e.g., 1.8"
                  inputMode="decimal"
                />
              </View>
            )}

            {macroMethod === "percent" && (
              <View style={{ gap: 10 }}>
                <PctField
                  label="Protein %"
                  value={proteinPct}
                  onChange={(v) => setSplit("proteinPct", v)}
                />
                <PctField
                  label="Carbs %"
                  value={carbPct}
                  onChange={(v) => setSplit("carbPct", v)}
                />
                <PctField
                  label="Fat %"
                  value={fatPct}
                  onChange={(v) => setSplit("fatPct", v)}
                />
                <Text style={styles.smallHint}>
                  Values auto-balance to 100%.
                </Text>
              </View>
            )}

            {macroMethod === "cycling" && (
              <View style={{ gap: 12 }}>
                <Text style={styles.smallHint}>
                  Protein is fixed. Carbs vary; Fat adjusts automatically.
                </Text>
                <PctField
                  label="Protein % (both days)"
                  value={proteinPct}
                  onChange={(v) => setProteinPerBothDays(v, setProteinPct)}
                />
                <PctField
                  label="Training day Carbs %"
                  value={trainCarbPct}
                  onChange={(v) => setTrainCarbPct(clamp01(v))}
                />
                <PctField
                  label="Rest day Carbs %"
                  value={restCarbPct}
                  onChange={(v) => setRestCarbPct(clamp01(v))}
                />
              </View>
            )}

            {/* Live preview */}
            {preview && (
              <>
                {macroMethod !== "cycling" ? (
                  <View style={[styles.wrap, { marginTop: 10 }]}>
                    <SummaryCard
                      label="Calories"
                      value={(preview as any).calorieGoal}
                    />
                    <SummaryCard
                      label="Protein (g)"
                      value={(preview as any).proteinGoal}
                    />
                    <SummaryCard
                      label="Carbs (g)"
                      value={(preview as any).carbGoal}
                    />
                    <SummaryCard
                      label="Fat (g)"
                      value={(preview as any).fatGoal}
                    />
                  </View>
                ) : (
                  <>
                    <Text style={[styles.muted, { marginTop: 10 }]}>
                      Training day
                    </Text>
                    <View style={styles.wrap}>
                      <SummaryCard
                        label="Calories"
                        value={(preview as any).training.calorieGoal}
                      />
                      <SummaryCard
                        label="Protein (g)"
                        value={(preview as any).training.proteinGoal}
                      />
                      <SummaryCard
                        label="Carbs (g)"
                        value={(preview as any).training.carbGoal}
                      />
                      <SummaryCard
                        label="Fat (g)"
                        value={(preview as any).training.fatGoal}
                      />
                    </View>
                    <Text style={[styles.muted, { marginTop: 10 }]}>
                      Rest day
                    </Text>
                    <View style={styles.wrap}>
                      <SummaryCard
                        label="Calories"
                        value={(preview as any).rest.calorieGoal}
                      />
                      <SummaryCard
                        label="Protein (g)"
                        value={(preview as any).rest.proteinGoal}
                      />
                      <SummaryCard
                        label="Carbs (g)"
                        value={(preview as any).rest.carbGoal}
                      />
                      <SummaryCard
                        label="Fat (g)"
                        value={(preview as any).rest.fatGoal}
                      />
                    </View>
                  </>
                )}
              </>
            )}
          </Card>

          {/* Diet & Cooking */}
          <Card style={[styles.card]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Diet & Cooking</Text>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={styles.label}>Diet type</Text>
              <View style={styles.wrap}>
                {(
                  [
                    "balanced",
                    "mediterranean",
                    "high-protein",
                    "vegetarian",
                    "vegan",
                    "keto",
                  ] as const
                ).map((v) => (
                  <Pill
                    key={v}
                    active={dietType === v}
                    onPress={() => setDietType(v)}
                  >
                    {v.replace("-", " ")}
                  </Pill>
                ))}
              </View>
            </View>

            <View style={{ height: 10 }} />
            <Field
              label="Allergies / intolerances"
              value={allergies}
              onChangeText={setAllergies}
              placeholder="comma separated (e.g., peanuts, lactose)"
            />
            <Field
              label="Dislikes"
              value={dislikes}
              onChangeText={setDislikes}
              placeholder="comma separated"
            />

            <View style={styles.row}>
              <Field
                label="Cooking time"
                value={cookMins}
                onChangeText={setCookMins}
                placeholder="minutes"
                inputMode="numeric"
              />
              <Field
                label="Budget per meal"
                value={budgetPerMeal}
                onChangeText={setBudgetPerMeal}
                placeholder="USD"
                inputMode="decimal"
              />
            </View>

            <View style={{ gap: 10, marginTop: 6 }}>
              <Text style={styles.label}>Cooking skill</Text>
              <View style={styles.wrap}>
                {(["beginner", "intermediate", "advanced"] as const).map(
                  (s) => (
                    <Pill
                      key={s}
                      active={cookSkill === s}
                      onPress={() => setCookSkill(s)}
                    >
                      {s}
                    </Pill>
                  )
                )}
              </View>
            </View>
          </Card>

          {/* Meal schedule */}
          <Card style={[styles.card]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Meal Schedule</Text>
              <Text style={styles.smallHint}>Used for smart reminders.</Text>
            </View>

            <View style={{ gap: 10 }}>
              {meals.map((m, idx) => (
                <View key={m.label} style={styles.row}>
                  <View
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: colors.card,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        textTransform: "capitalize",
                        fontWeight: "600",
                      }}
                    >
                      {m.label}
                    </Text>
                  </View>
                  <Field
                    label="Time"
                    value={m.time || ""}
                    onChangeText={(t: string) => {
                      const arr = meals.slice();
                      arr[idx] = { ...arr[idx], time: t };
                      setMeals(arr);
                    }}
                    placeholder="HH:MM"
                  />
                </View>
              ))}
            </View>
          </Card>

          {/* Equipment & Constraints */}
          <Card style={[styles.card]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Equipment & Constraints</Text>
            </View>

            <Text style={styles.label}>Equipment</Text>
            <View style={styles.wrap}>
              {EQUIP.map((e) => {
                const active = equipment.includes(e);
                return (
                  <Pill
                    key={e}
                    active={active}
                    onPress={() =>
                      setEquipment((prev) =>
                        active ? prev.filter((x) => x !== e) : [...prev, e]
                      )
                    }
                  >
                    {e}
                  </Pill>
                );
              })}
            </View>

            <View style={{ height: 10 }} />
            <Text style={styles.label}>Place</Text>
            <View style={styles.wrap}>
              {(["home", "gym"] as const).map((p) => (
                <Pill
                  key={p}
                  active={workoutPlace === p}
                  onPress={() => setWorkoutPlace(p)}
                >
                  {p}
                </Pill>
              ))}
            </View>

            <View style={{ height: 10 }} />
            <Field
              label="Injuries / avoid"
              value={injuries}
              onChangeText={setInjuries}
              placeholder="comma separated (optional)"
            />
            <Text style={styles.smallHint}>
              Used to tailor exercise selection and substitutions.
            </Text>
          </Card>

          {/* Preview spacer so Save bar doesn't overlap */}
          <View style={{ height: 24 }} />
        </ScrollView>
      </Animated.View>

      {/* Sticky Save Bar */}
      <View style={styles.stickySaveBar}>
        <Pressable
          style={styles.button}
          onPress={async () => {
            if (!user?.uid) return;
            // compute fat% for cycling snapshots (for storage)
            const trainingFat = clamp01(1 - proteinPct - trainCarbPct);
            const restFat = clamp01(1 - proteinPct - restCarbPct);

            const patch: Partial<Profile> & Record<string, any> = {
              email: user.email || undefined,
              sex,
              age: Number(age || 0),
              heightCm: Number(heightCm || 0),
              weightUnit,
              weightKg: Number(weightKg || 0),
              targetWeightKg: Number(targetWeightKg || 0),
              targetDate: targetDate || undefined,

              activityLevel,
              trainingDaysPerWeek: Number(trainingDaysPerWeek || 0),
              stepsGoal: Number(stepsGoal || 0),

              macroMethod,
              proteinPerKg: Number(proteinPerKg || 0),
              proteinPct,
              carbPct,
              fatPct,
              cycling: {
                trainingCarbPct: trainCarbPct,
                restCarbPct: restCarbPct,
                trainingFatPct: trainingFat,
                restFatPct: restFat,
              },

              diet: {
                type: dietType,
                allergies: commaSplit(allergies),
                dislikes: commaSplit(dislikes),
              },
              meals: {
                schedule: meals.map((m) => ({
                  label: m.label,
                  time: (m.time || "").trim() || undefined,
                })),
              },
              cooking: {
                minutes: Number(cookMins || 0),
                skill: cookSkill,
                budgetPerMealUSD: Number(budgetPerMeal || 0),
              },

              equipment,
              workoutPlace,
              injuries: commaSplit(injuries),

              updatedAt: Date.now(),
            };

            // also compute + store daily targets to keep Home in sync
            let targets: null | {
              calorieGoal: number;
              proteinGoal: number;
              carbGoal: number;
              fatGoal: number;
            } = null;

            if (macroMethod === "proteinPerKg") {
              targets = computeTargets(
                {
                  sex,
                  weightKg: Number(weightKg || 0),
                  heightCm: Number(heightCm || 0),
                  age: Number(age || 0),
                  activityLevel,
                  goal: (profile?.goal as any) || "maintain",
                },
                {
                  mode: "proteinPerKg",
                  proteinPerKg: Number(proteinPerKg || 0),
                }
              );
            } else if (macroMethod === "percent") {
              targets = computeTargets(
                {
                  sex,
                  weightKg: Number(weightKg || 0),
                  heightCm: Number(heightCm || 0),
                  age: Number(age || 0),
                  activityLevel,
                  goal: (profile?.goal as any) || "maintain",
                },
                { mode: "percent", proteinPct, carbPct, fatPct }
              );
            } else {
              // pick training day as the default daily target for Home
              const tFat = clamp01(1 - proteinPct - trainCarbPct);
              targets = computeTargets(
                {
                  sex,
                  weightKg: Number(weightKg || 0),
                  heightCm: Number(heightCm || 0),
                  age: Number(age || 0),
                  activityLevel,
                  goal: (profile?.goal as any) || "maintain",
                },
                {
                  mode: "percent",
                  proteinPct,
                  carbPct: trainCarbPct,
                  fatPct: tFat,
                }
              );
            }

            if (targets) {
              patch.calorieGoal = targets.calorieGoal;
              patch.proteinGoal = targets.proteinGoal;
              patch.carbGoal = targets.carbGoal;
              patch.fatGoal = targets.fatGoal;
              patch.dailyCaloriesTarget = targets.calorieGoal;
              patch.dailyProteinTarget = targets.proteinGoal;
            }

            const safePatch = pruneUndefinedDeep(patch);
            await updateProfile(user.uid, safePatch);
          }}
        >
          <Text style={styles.buttonText}>Save changes</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------- small components ---------- */

function PctField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  const pct = Math.round((Number(value) || 0) * 100);
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
      }}
    >
      <Text style={{ width: 150, color: colors.muted }}>{label}</Text>
      <TextInput
        value={String(pct)}
        onChangeText={(txt) => onChange(pctToNum(txt))}
        inputMode="numeric"
        placeholderTextColor={colors.placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 0,
          width: 90,
          borderWidth: 1,
          borderColor: focused ? colors.chipActiveBg : colors.inputBorder,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.inputBg,
          color: colors.text,
        }}
      />
      <Text style={{ color: colors.muted }}>%</Text>
    </View>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 12,
        minWidth: 130,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
        {Math.round(Number(value || 0))}
      </Text>
    </View>
  );
}

/* ---------- tiny helpers ---------- */
function setProteinPerBothDays(v: number, setProteinPct: (n: number) => void) {
  setProteinPct(clamp01(v));
}
