// import React from "react";
// import { Redirect } from "expo-router";
// import { useAuth } from "@/content/AuthProvider";
// import { View, Text } from "react-native";

// export default function Index() {
//   const { user, loading } = useAuth();
//   if (loading) {
//     return (
//       <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
//         <Text>Loading…</Text>
//       </View>
//     );
//   }
//   return <Redirect href={user ? "/(tabs)/home" : "/(auth)/login"} />;
// }

// mobile/app/index.tsx
import { Redirect } from "expo-router";
import { useAuth } from "@/content/AuthContext";

export default function Index() {
  const { user, initializing } = useAuth();
  if (initializing) return null; // or splash
  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />;
}
