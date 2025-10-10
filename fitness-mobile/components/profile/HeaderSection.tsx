import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

export default function HeaderSection({ email }: { email: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            letterSpacing: -0.2,
            color: colors.text,
          }}
        >
          Profile
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Personalization & goals
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ color: colors.muted }}>{email}</Text>
      </View>
    </View>
  );
}
