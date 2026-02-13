import React from "react";
import { View, TextInput, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export default function Field(
  props: {
    icon: keyof typeof Ionicons.glyphMap;
    label?: string;
  } & React.ComponentProps<typeof TextInput>
) {
  const { colors } = useTheme();
  const { icon, style, label, ...rest } = props;
  return (
    <View style={{ flex: 1 }}>
      {!!label && (
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <View
        style={{
          height: 44,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: colors.inputBg,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={colors.muted} />
        <TextInput
          placeholderTextColor={colors.placeholder}
          style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 16 }}
          {...rest}
        />
      </View>
    </View>
  );
}
