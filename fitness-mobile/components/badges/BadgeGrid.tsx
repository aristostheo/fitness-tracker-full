import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BADGES, BadgeId } from "@/services/badges";
import { useTheme } from "@/content/ThemeProvider";

export function BadgeGrid({
  earned,
}: {
  earned: Array<{ id: string; earnedAt: number }>;
}) {
  const { colors } = useTheme();
  const earnedSet = new Set(earned.map((b) => b.id));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {(Object.keys(BADGES) as BadgeId[]).map((id) => {
        const def = BADGES[id];
        const got = earnedSet.has(id);
        const tint = got ? def.color : colors.border;
        return (
          <View
            key={id}
            style={{
              width: "23%",
              aspectRatio: 1,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: got ? `${def.color}1A` : "transparent",
            }}
          >
            <Ionicons
              name={def.icon}
              size={20}
              color={got ? def.color : colors.muted}
            />
            <Text
              numberOfLines={2}
              style={{
                marginTop: 6,
                textAlign: "center",
                fontSize: 10,
                color: got ? colors.text : colors.muted,
                fontWeight: got ? "800" : "600",
              }}
            >
              {def.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
