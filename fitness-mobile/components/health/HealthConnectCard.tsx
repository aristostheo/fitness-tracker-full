// // components/health/HealthConnectCard.tsx
// import React, { useState } from "react";
// import { View, Text, Pressable, ActivityIndicator } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import Card from "@/components/Card";
// import { useTheme } from "@/content/ThemeProvider";
// import {
//   initHealthKit,
//   getTodaySteps,
//   getTodayActiveEnergy,
//   getLatestBodyMass,
// } from "@/services/healthkit";

// export default function HealthConnectCard() {
//   const { colors } = useTheme();
//   const [connected, setConnected] = useState<boolean | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [steps, setSteps] = useState<number | null>(null);
//   const [kcal, setKcal] = useState<number | null>(null);
//   const [kg, setKg] = useState<number | null>(null);

//   const connect = async () => {
//     setLoading(true);
//     const ok = await initHealthKit();
//     setConnected(ok);
//     if (ok) {
//       const [s, e, w] = await Promise.all([
//         getTodaySteps(),
//         getTodayActiveEnergy(),
//         getLatestBodyMass(),
//       ]);
//       setSteps(s);
//       setKcal(e);
//       setKg(w);
//     }
//     setLoading(false);
//   };

//   return (
//     <Card
//       style={{
//         padding: 12,
//         gap: 10,
//         borderWidth: 1,
//         borderColor: colors.border,
//       }}
//     >
//       <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
//         <Ionicons name="heart-circle-outline" size={20} color={colors.text} />
//         <Text style={{ color: colors.text, fontWeight: "800" }}>
//           Apple Health
//         </Text>
//       </View>

//       {connected ? (
//         <View style={{ gap: 6 }}>
//           <Text style={{ color: colors.muted, fontSize: 12 }}>Connected</Text>
//           <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
//             <Tile label="Steps (today)" value={steps ?? 0} />
//             <Tile label="Active kcal (today)" value={kcal ?? 0} />
//             <Tile label="Weight (kg)" value={kg ?? 0} />
//           </View>
//           <Pressable
//             onPress={connect}
//             style={{
//               alignSelf: "flex-start",
//               paddingVertical: 8,
//               paddingHorizontal: 12,
//               borderRadius: 10,
//               borderWidth: 1,
//               borderColor: colors.border,
//             }}
//           >
//             {loading ? (
//               <ActivityIndicator />
//             ) : (
//               <Text style={{ color: colors.text, fontWeight: "700" }}>
//                 Refresh
//               </Text>
//             )}
//           </Pressable>
//         </View>
//       ) : (
//         <Pressable
//           onPress={connect}
//           style={{
//             alignSelf: "flex-start",
//             paddingVertical: 8,
//             paddingHorizontal: 12,
//             borderRadius: 10,
//             borderWidth: 1,
//             borderColor: colors.border,
//           }}
//         >
//           {loading ? (
//             <ActivityIndicator />
//           ) : (
//             <Text style={{ color: colors.text, fontWeight: "700" }}>
//               Connect
//             </Text>
//           )}
//         </Pressable>
//       )}
//     </Card>
//   );
// }

// function Tile({ label, value }: { label: string; value: number }) {
//   return (
//     <View
//       style={{
//         padding: 10,
//         borderRadius: 12,
//         borderWidth: 1,
//         borderColor: "rgba(255,255,255,0.12)",
//         minWidth: 140,
//       }}
//     >
//       <Text style={{ opacity: 0.7, fontSize: 12 }}>{label}</Text>
//       <Text style={{ fontWeight: "900", fontSize: 18 }}>{value}</Text>
//     </View>
//   );
// }
