// components/workouts/ui/Field.tsx
import React from "react";
import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export function Field(
  props: { icon: keyof typeof Ionicons.glyphMap } & React.ComponentProps<
    typeof TextInput
  >
) {
  const { colors } = useTheme();
  const { icon, style, ...rest } = props;
  return (
    <View
      style={[
        {
          flex: 1,
          height: 44,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: colors.inputBg,
          flexDirection: "row",
          alignItems: "center",
        },
        style as any,
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        placeholderTextColor={colors.placeholder}
        style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 16 }}
        {...rest}
      />
    </View>
  );
}
