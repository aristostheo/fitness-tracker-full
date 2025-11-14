// components/profile/cards/BasicsCard.tsx
import React, { memo, useRef } from "react";
import { View, Text, TextInput, Platform, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { kgToLb, lbToKg } from "@/utils/units";

// Reanimated (Expo-compatible)
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Props = {
  sex: "male" | "female";
  setSex: (s: "male" | "female") => void;
  age: string | number | undefined;
  setAge: (v: string) => void;
  heightCm: string | number | undefined;
  setHeightCm: (v: string) => void;
  weightUnit: "kg" | "lb";
  setWeightUnit: (u: "kg" | "lb") => void;
  weightInput: string | number | undefined;
  setWeightInput: (v: string) => void;
};

// Small helpers
const onlyInt = (t: string) => t.replace(/[^0-9]/g, "");
const numeric = (t: string) => t.replace(/[^0-9.]/g, "");

// Pull color with safe fallback
const get = (obj: any, key: string, fallback: string) =>
  (obj && obj[key]) || fallback;

const LabeledInput = React.forwardRef<
  TextInput,
  {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    inputMode?:
      | "numeric"
      | "decimal"
      | "text"
      | "email"
      | "tel"
      | "search"
      | "url";
    returnKeyType?: "next" | "done";
    onSubmitEditing?: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
  }
>(
  (
    {
      label,
      value,
      onChangeText,
      placeholder,
      inputMode,
      returnKeyType,
      onSubmitEditing,
      icon = "ellipse-outline",
    },
    ref
  ) => {
    const { colors, isDark } = useTheme();
    const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    const bg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
    const text = get(colors, "text", isDark ? "#FFF" : "#111");

    return (
      <Animated.View
        entering={FadeInDown.duration(350)}
        style={{ flex: 1, gap: 6 }}
      >
        <Text style={{ fontSize: 12, opacity: 0.75, color: text }}>
          {label}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: Platform.select({ ios: 12, android: 8 }),
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Ionicons
            name={icon}
            size={16}
            style={{ marginRight: 8, opacity: 0.9 }}
            color={text}
          />
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={
              isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)"
            }
            inputMode={inputMode}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            style={{
              flex: 1,
              fontSize: 18,
              paddingVertical: 2,
              color: text,
            }}
          />
        </View>
      </Animated.View>
    );
  }
);
LabeledInput.displayName = "LabeledInput";

const Pill = ({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) => {
  const { colors, isDark } = useTheme();
  const text = get(colors, "text", isDark ? "#FFF" : "#111");
  const sv = useSharedValue(1);

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sv.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, rStyle]}>
      <Pressable
        onPressIn={() => (sv.value = withSpring(0.97))}
        onPressOut={() => (sv.value = withSpring(1))}
        onPress={() => {
          Haptics.selectionAsync();
          onPress?.();
        }}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 10,
            borderRadius: 999,
          },
          active
            ? {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(0,0,0,0.08)",
              }
            : { backgroundColor: "transparent" },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={14}
            style={{ marginRight: 6 }}
            color={active ? (isDark ? "#fff" : "#111") : text}
          />
        ) : null}
        <Text
          style={{
            fontWeight: "700",
            letterSpacing: 0.2,
            color: active ? (isDark ? "#fff" : "#111") : text,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

function BasicsCard({
  sex,
  setSex,
  age,
  setAge,
  heightCm,
  setHeightCm,
  weightUnit,
  setWeightUnit,
  weightInput,
  setWeightInput,
}: Props) {
  const { colors, isDark } = useTheme();

  // Theme tokens w/ fallbacks
  const text = get(colors, "text", isDark ? "#FFF" : "#111");
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const gradA = get(colors, "primary", isDark ? "#6E56CF" : "#6EA8FF");
  const gradB = get(colors, "tint", isDark ? "#3E63DD" : "#8FA8FF");
  const gradC = isDark ? "#1F2233" : "#E6ECFF";

  const ageRef = useRef<TextInput>(null);
  const heightRef = useRef<TextInput>(null);
  const weightRef = useRef<TextInput>(null);

  // Unit switch pulse
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const convertAndSetUnit = (to: "kg" | "lb") => {
    const raw = Number(weightInput || 0);
    if (Number.isFinite(raw)) {
      if (to === "lb" && weightUnit === "kg") {
        setWeightInput(String(Math.round(kgToLb(raw))));
      } else if (to === "kg" && weightUnit === "lb") {
        setWeightInput(String(Math.round(lbToKg(raw))));
      }
    }
    setWeightUnit(to);
    Haptics.selectionAsync();
    pulse.value = 0.94;
    pulse.value = withSpring(1, { damping: 10, stiffness: 120 });
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut}
      style={{
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: cardBorder,
      }}
    >
      {/* Gradient header follows theme */}
      <LinearGradient
        colors={[gradA, gradB, gradC]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingVertical: 14 }}
      >
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.18)"
                : "rgba(0,0,0,0.08)",
              marginRight: 12,
            }}
          >
            <Ionicons
              name="id-card-outline"
              size={20}
              color={isDark ? "#fff" : "#111"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: isDark ? "#fff" : "#111",
                fontWeight: "800",
                fontSize: 16,
                letterSpacing: 0.3,
              }}
            >
              Your Basics
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)",
                fontSize: 12,
              }}
            >
              Used to personalize your targets
            </Text>
          </View>
        </Animated.View>

        {/* Sex selector */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(320)}
          style={{
            marginTop: 12,
            flexDirection: "row",
            backgroundColor: isDark
              ? "rgba(0,0,0,0.15)"
              : "rgba(255,255,255,0.5)",
            borderRadius: 999,
            padding: 4,
          }}
        >
          <Pill
            active={sex === "male"}
            label="Male"
            icon="male-outline"
            onPress={() => setSex("male")}
          />
          <Pill
            active={sex === "female"}
            label="Female"
            icon="female-outline"
            onPress={() => setSex("female")}
          />
        </Animated.View>
      </LinearGradient>

      {/* Content glass surface */}
      <BlurView
        intensity={isDark ? 35 : 25}
        tint={isDark ? "dark" : "light"}
        style={{
          padding: 14,
          backgroundColor: isDark
            ? "rgba(20,22,26,0.45)"
            : "rgba(255,255,255,0.65)",
        }}
      >
        {/* Row: Age / Height */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <LabeledInput
            label="Age"
            value={age == null ? "" : String(age)}
            onChangeText={(t) => setAge(onlyInt(t))}
            placeholder="years"
            inputMode="numeric"
            returnKeyType="next"
            onSubmitEditing={() => heightRef.current?.focus()}
            icon="time-outline"
            ref={ageRef}
          />
          <LabeledInput
            label="Height"
            value={heightCm == null ? "" : String(heightCm)}
            onChangeText={(t) => setHeightCm(onlyInt(t))}
            placeholder="cm"
            inputMode="numeric"
            returnKeyType="next"
            onSubmitEditing={() => weightRef.current?.focus()}
            icon="resize-outline"
            ref={heightRef}
          />
        </View>

        {/* Weight + Unit segmented */}
        <View style={{ marginTop: 12, gap: 8 }}>
          <LabeledInput
            label={`Weight (${weightUnit.toUpperCase()})`}
            value={weightInput == null ? "" : String(weightInput)}
            onChangeText={(t) => setWeightInput(numeric(t))}
            placeholder={weightUnit}
            inputMode="decimal"
            returnKeyType="done"
            icon="barbell-outline"
            ref={weightRef}
          />

          <Animated.View
            style={[
              {
                flexDirection: "row",
                borderRadius: 999,
                padding: 4,
                borderWidth: 1,
                borderColor: cardBorder,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              },
              pulseStyle,
            ]}
            accessibilityRole="radiogroup"
            accessibilityLabel="Weight unit"
          >
            {/* KG */}
            <UnitChip
              label="KG"
              active={weightUnit === "kg"}
              icon="cube-outline"
              onPress={() => convertAndSetUnit("kg")}
            />
            {/* LB */}
            <UnitChip
              label="LB"
              active={weightUnit === "lb"}
              icon="layers-outline"
              onPress={() => convertAndSetUnit("lb")}
            />
          </Animated.View>

          <Text
            style={{
              fontSize: 12,
              opacity: 0.7,
              marginTop: 2,
              color: text,
            }}
          >
            Tip: Switching units converts your current value automatically.
          </Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

function UnitChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const text = get(colors, "text", isDark ? "#FFF" : "#111");
  const sv = useSharedValue(1);
  const bg = active
    ? isDark
      ? "rgba(255,255,255,0.18)"
      : "rgba(0,0,0,0.08)"
    : "transparent";

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sv.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, rStyle]}>
      <Pressable
        onPressIn={() => (sv.value = withSpring(0.97))}
        onPressOut={() => (sv.value = withSpring(1))}
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 8,
          borderRadius: 999,
          gap: 6,
          backgroundColor: bg,
        }}
      >
        <Ionicons
          name={icon}
          size={14}
          color={active ? (isDark ? "#fff" : "#111") : text}
        />
        <Text
          style={{
            fontWeight: "700",
            color: active ? (isDark ? "#fff" : "#111") : text,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default memo(BasicsCard);
