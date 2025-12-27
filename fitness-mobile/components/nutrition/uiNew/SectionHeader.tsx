import React from "react";
import { View, Text } from "react-native";

export function SectionHeader({
  title,
  subtitle,
  colors,
  right,
}: {
  title: string;
  subtitle?: string;
  colors: any;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.text,
            fontWeight: "900",
            fontSize: 16,
            letterSpacing: 0.2,
          }}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text
            style={{
              color: colors.muted,
              fontWeight: "800",
              fontSize: 12,
              marginTop: 4,
              lineHeight: 16,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {!!right && <View style={{ flexShrink: 0 }}>{right}</View>}
    </View>
  );
}
