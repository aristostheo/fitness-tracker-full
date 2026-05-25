// components/home/AISuggestionCard.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

export type AISuggestion = {
  id: string;
  title: string;
  body: string;
  pill?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
};

export function AISuggestionCard({
  tokens,
  suggestion,
  reduceMotion,
  style,
  priority = "normal",
}: {
  tokens: {
    card: string;
    card2: string;
    text: string;
    muted: string;
    hairline: string;
    tint: string;
    ringB: string;
  };
  suggestion: AISuggestion;
  reduceMotion: boolean;
  style?: ViewStyle;
  priority?: "urgent" | "normal" | "secondary";
}) {
  const icon = suggestion.icon || "sparkles";
  const accent = useMemo(
    () => (priority === "urgent" ? tokens.ringB : tokens.tint),
    [priority, tokens.ringB, tokens.tint]
  );

  return (
    <LinearGradient
      colors={[withAlpha(tokens.card, 1), withAlpha(tokens.card2, 1)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor:
          priority === "urgent" ? withAlpha(accent, 0.38) : tokens.hairline,
        ...(style as any),
      }}
    >
      <BlurView intensity={18} tint="default">
        <View
          style={{
            padding: priority === "urgent" ? 16 : 13,
            gap: priority === "urgent" ? 11 : 8,
            borderLeftWidth: priority === "urgent" ? 4 : 0,
            borderLeftColor: withAlpha(accent, 0.95),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flex: 1,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(accent, 0.14),
                  borderWidth: 1,
                  borderColor: withAlpha(accent, 0.22),
                }}
              >
                <Ionicons name={icon} size={18} color={accent} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: tokens.text,
                    fontWeight: "900",
	                    fontSize: priority === "urgent" ? 16 : 14,
                  }}
                >
                  {suggestion.title}
                </Text>
                {suggestion.pill ? (
                  <View
                    style={{
                      marginTop: 6,
                      alignSelf: "flex-start",
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: withAlpha(tokens.ringB, 0.12),
                      borderWidth: 1,
                      borderColor: withAlpha(tokens.ringB, 0.18),
                    }}
                  >
                    <Text
                      style={{
                        color: tokens.text,
                        fontWeight: "900",
                        fontSize: 12,
                      }}
                    >
                      {suggestion.pill}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {suggestion.onAction && suggestion.actionLabel ? (
              <Pressable
                onPress={suggestion.onAction}
                accessibilityRole="button"
                accessibilityLabel={suggestion.actionLabel}
                accessibilityHint="Applies the AI suggestion"
                hitSlop={10}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 16,
                    backgroundColor: withAlpha(accent, 0.14),
                    borderWidth: 1,
                    borderColor: withAlpha(accent, 0.2),
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: tokens.text,
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    {suggestion.actionLabel}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={tokens.text}
                  />
                </View>
              </Pressable>
            ) : null}
          </View>

          <Text
            style={{
              color: tokens.muted,
              fontWeight: "700",
	            fontSize: priority === "urgent" ? 13 : 12,
	            lineHeight: priority === "urgent" ? 18 : 17,
            }}
          >
            {suggestion.body}
          </Text>
        </View>
      </BlurView>
    </LinearGradient>
  );
}
