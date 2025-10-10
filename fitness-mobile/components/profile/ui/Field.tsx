// components/profile/ui/Field.tsx
import React from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Pressable,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import Glass from "./Glass";

type Props = TextInputProps & {
  label?: string;
  helperText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  prefix?: string;
  suffix?: string;
  containerStyle?: ViewStyle;
};

export default function Field({
  label,
  helperText,
  icon,
  prefix,
  suffix,
  containerStyle,
  style,
  ...inputProps
}: Props) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[{ gap: 8 }, containerStyle]}>
      {!!label && (
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
          {label}
        </Text>
      )}
      <Glass
        tint={isDark ? "dark" : "light"}
        intensity={26}
        radius={14}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 14,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {!!icon && (
            <Ionicons
              name={icon}
              size={16}
              color={colors.muted}
              style={{ marginRight: 2 }}
            />
          )}

          {!!prefix && (
            <Text style={{ color: colors.muted, fontWeight: "700" }}>
              {prefix}
            </Text>
          )}

          <TextInput
            placeholderTextColor={colors.muted}
            style={[
              {
                flex: 1,
                color: colors.text,
                fontWeight: "700",
                paddingVertical: 6,
              },
              style as any,
            ]}
            {...inputProps}
          />

          {!!suffix && (
            <Text style={{ color: colors.muted, fontWeight: "700" }}>
              {suffix}
            </Text>
          )}
        </View>
      </Glass>

      {!!helperText && (
        <Text style={{ color: colors.muted, fontSize: 11 }}>{helperText}</Text>
      )}
    </View>
  );
}
