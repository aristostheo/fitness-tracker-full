// components/ui/BottomTabSpacer.tsx
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// If you want the exact tab height from RN Navigation you can also use:
// import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

export default function BottomTabSpacer({ extra = 12 }: { extra?: number }) {
  const insets = useSafeAreaInsets();
  const height = 58 + Math.max(0, insets.bottom - 8); // same base as tabBarHeight above
  return <View style={{ height: height + extra }} />;
}
