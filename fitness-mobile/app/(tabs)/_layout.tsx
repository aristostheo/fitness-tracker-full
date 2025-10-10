import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        // 👇 This makes each screen's base background follow the theme
        sceneContainerStyle: { backgroundColor: colors.background },
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === "index"
              ? "home-outline"
              : route.name === "workouts"
              ? "barbell-outline"
              : route.name === "nutrition"
              ? "fast-food-outline"
              : route.name === "insights"
              ? "analytics-outline"
              : "person-outline";
          return <Ionicons name={name as any} color={color} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts" }} />
      <Tabs.Screen name="nutrition" options={{ title: "Nutrition" }} />
      <Tabs.Screen name="insights" options={{ title: "Insights" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

// import React from "react";
// import { View, Text, Pressable, Platform } from "react-native";
// import { Tabs } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import { useTheme } from "@/content/ThemeProvider";

// type TabItem = {
//   name: string;
//   label: string;
//   icon: keyof typeof Ionicons.glyphMap;
// };

// function CustomTabBar({ state, descriptors, navigation }: any) {
//   const { colors, isDark } = useTheme();

//   const tabs: TabItem[] = [
//     { name: "index", label: "Home", icon: "home-outline" },
//     { name: "workouts", label: "Workouts", icon: "barbell-outline" },
//     { name: "nutrition", label: "Nutrition", icon: "restaurant-outline" },
//     { name: "insights", label: "Insights", icon: "stats-chart-outline" },
//     { name: "profile", label: "Profile", icon: "person-outline" },
//   ];

//   const border = colors.border;
//   const bg = colors.background;

//   return (
//     <View style={{ backgroundColor: bg }}>
//       <LinearGradient
//         colors={isDark ? [bg, bg] : [bg, bg]}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 0 }}
//         style={{ borderTopWidth: 1, borderTopColor: border }}
//       >
//         <View
//           style={{
//             flexDirection: "row",
//             paddingHorizontal: 8,
//             paddingTop: 6,
//             paddingBottom: Platform.OS === "ios" ? 18 : 12,
//             gap: 6,
//             backgroundColor: colors.card,
//             alignItems: "flex-end",
//           }}
//         >
//           {tabs.map((tab) => {
//             const route = state.routes.find((r: any) => r.name === tab.name);
//             if (!route) return null;
//             const isFocused = state.index === state.routes.indexOf(route);

//             const onPress = () => {
//               const event = navigation.emit({
//                 type: "tabPress",
//                 target: route.key,
//                 canPreventDefault: true,
//               });
//               if (!isFocused && !event.defaultPrevented) {
//                 navigation.navigate(route.name);
//               }
//             };

//             return (
//               <Pressable
//                 key={tab.name}
//                 accessibilityRole="button"
//                 accessibilityState={isFocused ? { selected: true } : {}}
//                 accessibilityLabel={
//                   descriptors[route.key]?.options.tabBarAccessibilityLabel
//                 }
//                 testID={descriptors[route.key]?.options.tabBarTestID}
//                 onPress={onPress}
//                 style={({ pressed }) => [
//                   {
//                     flex: 1,
//                     paddingVertical: 6,
//                     paddingHorizontal: 6,
//                     borderRadius: 12,
//                     alignItems: "center",
//                     justifyContent: "center",
//                     backgroundColor: isFocused
//                       ? isDark
//                         ? "rgba(255,255,255,0.06)"
//                         : "rgba(0,0,0,0.04)"
//                       : "transparent",
//                     opacity: pressed ? 0.9 : 1,
//                   },
//                 ]}
//               >
//                 <Ionicons
//                   name={tab.icon}
//                   size={20}
//                   color={isFocused ? colors.primary : colors.muted}
//                 />
//                 <View
//                   style={{
//                     marginTop: 4,
//                     maxWidth: "100%",
//                     paddingHorizontal: 2,
//                     alignItems: "center",
//                   }}
//                 >
//                   <Text
//                     numberOfLines={1} // keep on one line
//                     ellipsizeMode="clip" // no ellipsis ever
//                     adjustsFontSizeToFit // allow slight shrink on tiny screens
//                     minimumFontScale={0.85} // won’t shrink beyond ~15%
//                     style={{
//                       textAlign: "center",
//                       fontSize: 12,
//                       lineHeight: 14,
//                       fontWeight: isFocused ? "800" : "600",
//                       color: isFocused ? colors.primary : colors.text,
//                       includeFontPadding: false,
//                     }}
//                   >
//                     {tab.label}
//                   </Text>
//                 </View>
//               </Pressable>
//             );
//           })}
//         </View>
//       </LinearGradient>
//     </View>
//   );
// }

// export default function TabsLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarStyle: { display: "none" },
//       }}
//       tabBar={(props) => <CustomTabBar {...props} />}
//     >
//       <Tabs.Screen name="index" options={{ title: "Home" }} />
//       <Tabs.Screen name="workouts" options={{ title: "Workouts" }} />
//       <Tabs.Screen name="nutrition" options={{ title: "Nutrition" }} />
//       <Tabs.Screen name="insights" options={{ title: "Insights" }} />
//       <Tabs.Screen name="profile" options={{ title: "Profile" }} />
//     </Tabs>
//   );
// }
