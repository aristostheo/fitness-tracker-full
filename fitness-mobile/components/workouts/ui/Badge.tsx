// components/workouts/ui/Badge.tsx
import React from "react";
import { View } from "react-native";
export function Badge({
  children,
  tint,
  border,
}: {
  children: React.ReactNode;
  tint: string;
  border: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: tint,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      {children}
    </View>
  );
}
