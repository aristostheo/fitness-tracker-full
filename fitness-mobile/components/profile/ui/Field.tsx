// components/profile/ui/Field.tsx
import React, { forwardRef, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import Glass from "./Glass";

export type FieldProps = TextInputProps & {
  label?: string;
  helperText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  prefix?: string;
  suffix?: string;
  /** Outermost wrapper (label + field + helper) */
  containerStyle?: ViewStyle;
  /** Glass container (the pill around the input) */
  style?: ViewStyle;
  /** Actual TextInput style (font size, padding, etc.) */
  inputStyle?: TextStyle;
};

function FieldBase(
  {
    label,
    helperText,
    icon,
    prefix,
    suffix,
    containerStyle,
    style, // glass container
    inputStyle, // text input
    value,
    ...inputProps
  }: FieldProps,
  ref: React.Ref<TextInput>
) {
  const { colors, isDark } = useTheme();

  // Always coerce to string so the TextInput stays controlled
  const stringValue =
    typeof value === "string" ? value : value == null ? "" : String(value);

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
        style={[
          {
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
          },
          style, // caller controls width/flex here
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
            ref={ref}
            value={stringValue}
            placeholderTextColor={colors.muted}
            selectionColor={colors.primary}
            keyboardAppearance={isDark ? "dark" : "light"}
            blurOnSubmit={false} // keep focus on return
            style={[
              {
                flex: 1,
                minWidth: 0, // prevent clipping in flex rows
                color: colors.text,
                fontWeight: "700",
                paddingVertical: 6,
              },
              inputStyle,
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

// Forward ref so parent can .focus() next field on submit
const Field = memo(forwardRef<TextInput, FieldProps>(FieldBase));
export default Field;
